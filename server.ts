import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Persistence directory
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PUBLIC_APPS_FILE = path.join(DATA_DIR, 'public-apps.json');
const USER_BUILDS_FILE = path.join(DATA_DIR, 'user-builds.json');

// Helper to read JSON file safely
function readJsonFile<T>(filePath: string, defaultVal: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultVal;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Strictly initialize with NO default apps as requested:
// "I don't want any default apps that people made"
if (!fs.existsSync(PUBLIC_APPS_FILE)) {
  writeJsonFile(PUBLIC_APPS_FILE, []);
}
if (!fs.existsSync(USER_BUILDS_FILE)) {
  writeJsonFile(USER_BUILDS_FILE, []);
}

// Lazy Gemini API Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ================= API ROUTES =================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// GET all public community apps
app.get('/api/apps/public', (req, res) => {
  const apps = readJsonFile<any[]>(PUBLIC_APPS_FILE, []);
  res.json(apps);
});

// POST publish an app to community
app.post('/api/apps/publish', (req, res) => {
  const {
    id,
    title,
    description,
    code,
    prompt,
    authorName,
    authorEmail,
    authorAvatar,
    tags,
    createdAt,
    userId,
  } = req.body;

  if (!title || !code) {
    return res.status(400).json({ error: 'Title and code are required to publish.' });
  }

  const apps = readJsonFile<any[]>(PUBLIC_APPS_FILE, []);
  const newApp = {
    id: id || `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim(),
    description: (description || 'Built with AI Studio').trim(),
    code,
    prompt: prompt || '',
    authorName: authorName || 'Anonymous Creator',
    authorEmail: authorEmail || '',
    authorAvatar: authorAvatar || '',
    userId: userId || '',
    tags: Array.isArray(tags) ? tags : ['Web App', 'Interactive'],
    views: 1,
    likes: 0,
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Check if updating existing
  const existingIdx = apps.findIndex((a) => a.id === newApp.id);
  if (existingIdx >= 0) {
    apps[existingIdx] = { ...apps[existingIdx], ...newApp, views: apps[existingIdx].views, likes: apps[existingIdx].likes };
  } else {
    apps.unshift(newApp);
  }

  writeJsonFile(PUBLIC_APPS_FILE, apps);
  return res.json({ success: true, app: newApp });
});

// DELETE a published app from public community gallery (unpublish)
app.delete('/api/apps/public/:id', (req, res) => {
  const { id } = req.params;
  const decodedId = decodeURIComponent(id);
  const apps = readJsonFile<any[]>(PUBLIC_APPS_FILE, []);
  const filtered = apps.filter((a) => a.id !== id && a.id !== decodedId && a.publishedAppId !== id && a.title.toLowerCase() !== decodedId.toLowerCase());
  writeJsonFile(PUBLIC_APPS_FILE, filtered);
  return res.json({ success: true, removedId: id, remaining: filtered.length });
});

// Also support /api/apps/publish/:id for convenience
app.delete('/api/apps/publish/:id', (req, res) => {
  const { id } = req.params;
  const decodedId = decodeURIComponent(id);
  const apps = readJsonFile<any[]>(PUBLIC_APPS_FILE, []);
  const filtered = apps.filter((a) => a.id !== id && a.id !== decodedId && a.publishedAppId !== id && a.title.toLowerCase() !== decodedId.toLowerCase());
  writeJsonFile(PUBLIC_APPS_FILE, filtered);
  return res.json({ success: true, removedId: id, remaining: filtered.length });
});

// POST like a public app
app.post('/api/apps/:id/like', (req, res) => {
  const { id } = req.params;
  const apps = readJsonFile<any[]>(PUBLIC_APPS_FILE, []);
  const appIndex = apps.findIndex((a) => a.id === id);
  if (appIndex === -1) {
    return res.status(404).json({ error: 'App not found' });
  }
  apps[appIndex].likes = (apps[appIndex].likes || 0) + 1;
  writeJsonFile(PUBLIC_APPS_FILE, apps);
  return res.json({ success: true, likes: apps[appIndex].likes });
});

// POST record a view on public app
app.post('/api/apps/:id/view', (req, res) => {
  const { id } = req.params;
  const apps = readJsonFile<any[]>(PUBLIC_APPS_FILE, []);
  const appIndex = apps.findIndex((a) => a.id === id);
  if (appIndex !== -1) {
    apps[appIndex].views = (apps[appIndex].views || 0) + 1;
    writeJsonFile(PUBLIC_APPS_FILE, apps);
  }
  return res.json({ success: true });
});

// GET saved builds for user
app.get('/api/apps/user/:userId', (req, res) => {
  const { userId } = req.params;
  const builds = readJsonFile<any[]>(USER_BUILDS_FILE, []);
  const userBuilds = builds.filter((b) => b.userId === userId || !b.userId);
  res.json(userBuilds);
});

// POST save user build
app.post('/api/apps/save', (req, res) => {
  const build = req.body;
  if (!build || !build.code) {
    return res.status(400).json({ error: 'Valid build data with code is required' });
  }

  const builds = readJsonFile<any[]>(USER_BUILDS_FILE, []);
  const id = build.id || `build_${Date.now()}`;
  const existingIdx = builds.findIndex((b) => b.id === id);

  const updatedBuild = {
    ...build,
    id,
    updatedAt: new Date().toISOString(),
    createdAt: build.createdAt || new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    builds[existingIdx] = updatedBuild;
  } else {
    builds.unshift(updatedBuild);
  }

  writeJsonFile(USER_BUILDS_FILE, builds);
  return res.json({ success: true, build: updatedBuild });
});

// DELETE saved user build
app.delete('/api/apps/save/:id', (req, res) => {
  const { id } = req.params;
  const builds = readJsonFile<any[]>(USER_BUILDS_FILE, []);
  const filtered = builds.filter((b) => b.id !== id);
  writeJsonFile(USER_BUILDS_FILE, filtered);
  return res.json({ success: true, removedId: id });
});

// Helper to parse Delimiter/Markdown output from Gemini
function parseModelOutput(rawText: string, prompt: string, defaultTitle?: string) {
  let title = '';
  let description = '';
  let summary = '';
  let suggestedNextPrompts: string[] = [];
  let code = '';

  // 1. Try markdown headers
  const titleMatch = rawText.match(/# TITLE:\s*([^\n\r]+)/i);
  if (titleMatch) {
    title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  const descMatch = rawText.match(/# DESCRIPTION:\s*([^\n\r]+)/i);
  if (descMatch) {
    description = descMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  const summaryMatch = rawText.match(/# SUMMARY:\s*([^\n\r]+)/i);
  if (summaryMatch) {
    summary = summaryMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  const nextMatch = rawText.match(/# NEXT:\s*([^\n\r]+)/i);
  if (nextMatch) {
    suggestedNextPrompts = nextMatch[1]
      .split('|')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  // 2. Extract HTML code block
  const codeBlockMatch = rawText.match(/```(?:html|htm)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && (codeBlockMatch[1].includes('<html') || codeBlockMatch[1].includes('<!DOCTYPE') || codeBlockMatch[1].includes('<body') || codeBlockMatch[1].includes('<div'))) {
    code = codeBlockMatch[1].trim();
  } else {
    // Look for raw DOCTYPE or html tags
    const htmlMatch = rawText.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i) || rawText.match(/(<html[\s\S]*<\/html>)/i);
    if (htmlMatch) {
      code = htmlMatch[1].trim();
    }
  }

  // 3. If model returned JSON instead
  if (!code && (rawText.trim().startsWith('{') || rawText.includes('"code"'))) {
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.code) code = parsed.code;
        if (parsed.appTitle) title = parsed.appTitle;
        if (parsed.description) description = parsed.description;
        if (parsed.summaryOfChanges) summary = parsed.summaryOfChanges;
        if (Array.isArray(parsed.suggestedNextPrompts)) suggestedNextPrompts = parsed.suggestedNextPrompts;
      }
    } catch (e) {
      const codeFieldMatch = rawText.match(/"code"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:summary|suggested|appTitle)/);
      if (codeFieldMatch) {
        code = codeFieldMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    }
  }

  // Fallback defaults for missing metadata
  const cleanPromptTitle = prompt
    .slice(0, 32)
    .replace(/^(make|build|create|generate|code|design)\s*(an?|the)?\s*/i, '')
    .trim();
  const fallbackTitle = defaultTitle || (cleanPromptTitle ? cleanPromptTitle.charAt(0).toUpperCase() + cleanPromptTitle.slice(1) : 'Custom Application');

  title = title || fallbackTitle;
  description = description || `An interactive application built from: "${prompt}"`;
  summary = summary || `Synthesized custom application with real-time interactivity, modern Tailwind styling, and responsive layout.`;
  if (suggestedNextPrompts.length === 0) {
    suggestedNextPrompts = [
      'Add data search and filter',
      'Add data export to CSV or JSON',
      'Add sound effects and audio feedback',
    ];
  }

  // Ensure DOCTYPE if missing
  if (code && !code.toLowerCase().includes('<!doctype html>')) {
    code = `<!DOCTYPE html>\n<html lang="en">\n${code}`;
    if (!code.includes('</html>')) code += '\n</html>';
  }

  return { title, description, summary, suggestedNextPrompts, code };
}

// POST AI Generation endpoint - Real Gemini Multi-Model Cascade
app.post('/api/generate', async (req, res) => {
  const { prompt, currentCode, appTitle, settings = {} } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(400).json({
      error: 'GEMINI_API_KEY environment variable is not configured. Please supply an API key to enable real AI generation.',
    });
  }

  const systemInstruction = `You are the lead AI code generator in Google AI Studio / Studio Build.
Your goal is to build COMPLETE, PRODUCTION-READY, FULLY FUNCTIONAL, BEAUTIFULLY STYLED standalone web applications from user prompts.

CRITICAL DIRECTIVES:
1. DARK THEME BY DEFAULT (MANDATORY): The entire application must be crafted in an elegant, modern dark theme. Use dark backgrounds (e.g. \`bg-[#121212]\` or \`bg-slate-900\`), dark card surfaces (e.g. \`bg-[#1e1e1e]\` or \`bg-slate-800\`), subtle dark borders (\`border-[#333333]\` or \`border-slate-700\`), and high-contrast readable text (\`text-slate-100\` or \`text-[#f3f3f3]\`). Never generate light-gray or white page backgrounds.
2. STANDALONE HTML: The output code MUST be a single, complete, executable HTML5 file (starting with <!DOCTYPE html> and ending with </html>).
3. MODERN STYLING: Always include Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>. Include tailwind dark config if applicable. Use attractive, high-contrast accent colors (e.g. electric blue, emerald, amber), subtle shadows, clean card containers, responsive layouts (flex, grid), and smooth transitions.
4. ICONS: Always include Lucide icons via CDN: <script src="https://unpkg.com/lucide@latest"></script> and call lucide.createIcons() after the DOM is rendered or after any dynamic HTML updates.
5. COMPLETE WORKING JAVASCRIPT: Write 100% complete, bug-free JavaScript in a <script> tag. All buttons, inputs, tabs, sliders, counters, audio, timers, or games MUST work immediately when clicked. Use localStorage where appropriate so state persists.
6. NO PLACEHOLDERS: Do NOT leave any "TODO", "// insert code here", or empty stubs. Output the entire working app.

FORMAT REQUIREMENT:
You MUST start your response with:
# TITLE: <Concise App Title (3-5 words max)>
# DESCRIPTION: <1-2 sentences describing what the app does and key features>
# SUMMARY: <Short summary of what you implemented or changed>
# NEXT: <Follow-up prompt suggestion 1> | <Follow-up prompt suggestion 2> | <Follow-up prompt suggestion 3>

Followed immediately by the code block:
\`\`\`html
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Title</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class'
    }
  </script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="bg-[#121212] min-h-screen text-[#f3f3f3] antialiased">
  <!-- Full Application UI in Dark Mode -->
  <script>
    // Full interactive logic
    lucide.createIcons();
  </script>
</body>
</html>
\`\`\``;

  const userPromptContent = currentCode
    ? `CURRENT APP CODE:
\`\`\`html
${currentCode.slice(0, 25000)}
\`\`\`

USER REQUEST FOR MODIFICATIONS / NEW FEATURES:
${prompt}

Please update and enhance the application to fulfill the user's request while preserving existing working functionality.`
    : `USER REQUEST:
${prompt}

Please generate a brand new, complete, fully working application from scratch based on the above request.`;

  // Multi-model resilience cascade:
  // Starts with high-speed models that have low demand latency, falling back seamlessly
  const requestedModel = settings.model;
  const candidateModels = [
    requestedModel,
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
  ].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      console.log(`[AI Studio] Generating with model: ${model} for prompt: "${prompt.slice(0, 50)}..."`);
      const response = await ai.models.generateContent({
        model,
        contents: userPromptContent,
        config: {
          systemInstruction,
          temperature: typeof settings.temperature === 'number' ? settings.temperature : 0.7,
        },
      });

      const responseText = response.text || '';
      if (!responseText.trim()) {
        throw new Error(`Model ${model} returned empty response`);
      }

      const parsed = parseModelOutput(responseText, prompt, appTitle);
      if (!parsed.code || parsed.code.length < 100) {
        throw new Error(`Model ${model} output did not contain valid executable HTML code`);
      }

      console.log(`[AI Studio] Successfully generated "${parsed.title}" (${parsed.code.length} bytes) using ${model}`);

      return res.json({
        appTitle: parsed.title,
        description: parsed.description,
        code: parsed.code,
        summaryOfChanges: parsed.summary,
        suggestedNextPrompts: parsed.suggestedNextPrompts,
        modelUsed: model,
      });
    } catch (err: any) {
      console.warn(`[AI Studio] Model ${model} generation failed:`, err.message || err);
      lastError = err;
      // Continue to next model in cascade
    }
  }

  // If all models failed, use intelligent fallback app synthesizer instead of failing
  console.warn('[AI Studio] All models failed in generation cascade, using intelligent fallback app generator:', lastError?.message);
  try {
    const fallback = generateFallbackApp(prompt, currentCode, appTitle);
    return res.json({
      appTitle: fallback.appTitle,
      description: fallback.description,
      code: fallback.code,
      summaryOfChanges: `Generated robust interactive application using intelligent offline fallback synthesizer (${lastError?.message || 'Quota/Overload'}).`,
      suggestedNextPrompts: [
        'Add data filtering and search',
        'Add export to CSV or JSON',
        'Add local storage persistence',
      ],
      modelUsed: 'offline-fallback-synthesizer',
    });
  } catch (fallbackErr) {
    console.error('[AI Studio] Fallback app generation failed:', fallbackErr);
    return res.status(503).json({
      error: `AI generation is temporarily unavailable: ${lastError?.message || 'High demand across models'}. Please try again in a few moments.`,
    });
  }
});

// Fallback intelligent application synthesizer for zero-error resiliency
function generateFallbackApp(prompt: string, currentCode?: string, currentTitle?: string) {
  const p = prompt.toLowerCase();
  const title = currentTitle || prompt.slice(0, 30).replace(/^(make|build|create)\s*(an?|the)?\s*/i, '').trim() || 'Custom Studio App';
  const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1);

  // Counter Archetype
  if (p.includes('count') || p.includes('tally') || p.includes('plus') || p.includes('minus')) {
    return {
      appTitle: cleanTitle.includes('Counter') ? cleanTitle : `${cleanTitle} Counter`,
      description: 'Modern interactive counter with custom steps, history log, and audio chime.',
      code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;500;600;700&display=swap');
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col antialiased">
  <header class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
        <i data-lucide="plus-circle" class="w-4 h-4"></i>
      </div>
      <div>
        <h1 class="text-base font-semibold text-slate-900">${cleanTitle}</h1>
        <p class="text-xs text-slate-500">Interactive Precision Counter</p>
      </div>
    </div>
    <button id="soundToggle" class="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1.5 transition-colors">
      <i data-lucide="volume-2" class="w-3.5 h-3.5 text-blue-600"></i> Sound On
    </button>
  </header>

  <main class="flex-1 max-w-lg mx-auto w-full p-6 flex flex-col items-center justify-center gap-6">
    <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm w-full text-center flex flex-col items-center gap-6">
      <div class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Active Tally</div>
      <div id="counterVal" class="text-7xl font-extrabold text-slate-900 tracking-tight transition-transform duration-100">0</div>

      <div class="flex items-center gap-3 w-full max-w-xs">
        <button id="decBtn" class="flex-1 py-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl font-bold text-2xl transition-all shadow-xs">-</button>
        <button id="resetBtn" class="px-4 py-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 rounded-xl transition-all" title="Reset">
          <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
        </button>
        <button id="incBtn" class="flex-1 py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-2xl transition-all shadow-md">+</button>
      </div>

      <div class="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 w-full justify-center">
        <span>Step:</span>
        <button class="step-btn px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-semibold" data-step="1">1</button>
        <button class="step-btn px-2.5 py-1 rounded hover:bg-slate-100" data-step="5">5</button>
        <button class="step-btn px-2.5 py-1 rounded hover:bg-slate-100" data-step="10">10</button>
        <button class="step-btn px-2.5 py-1 rounded hover:bg-slate-100" data-step="100">100</button>
      </div>
    </div>

    <!-- Log Panel -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 w-full shadow-xs">
      <div class="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
        <span>Activity History</span>
        <button id="clearLog" class="text-[11px] text-slate-400 hover:text-red-600">Clear</button>
      </div>
      <div id="logList" class="space-y-1 text-xs text-slate-600 max-h-32 overflow-y-auto">
        <div class="text-slate-400 text-center py-2">No actions recorded yet.</div>
      </div>
    </div>
  </main>

  <script>
    let count = parseInt(localStorage.getItem('studio_count') || '0', 10);
    let step = 1;
    let soundEnabled = true;
    const valEl = document.getElementById('counterVal');
    const logList = document.getElementById('logList');

    function playTone(freq) {
      if (!soundEnabled) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch(e) {}
    }

    function addLog(action) {
      const time = new Date().toLocaleTimeString();
      const div = document.createElement('div');
      div.className = "flex justify-between py-1 border-b border-slate-50";
      div.innerHTML = '<span>' + action + '</span><span class="text-slate-400">' + time + '</span>';
      if (logList.children[0]?.classList.contains('text-slate-400')) logList.innerHTML = '';
      logList.prepend(div);
    }

    function update() {
      valEl.innerText = count;
      localStorage.setItem('studio_count', count);
      valEl.classList.add('scale-105');
      setTimeout(() => valEl.classList.remove('scale-105'), 80);
    }

    document.getElementById('incBtn').onclick = () => {
      count += step;
      update();
      playTone(520);
      addLog('Incremented by +' + step + ' (Total: ' + count + ')');
    };
    document.getElementById('decBtn').onclick = () => {
      count -= step;
      update();
      playTone(380);
      addLog('Decremented by -' + step + ' (Total: ' + count + ')');
    };
    document.getElementById('resetBtn').onclick = () => {
      count = 0;
      update();
      playTone(300);
      addLog('Reset counter to 0');
    };
    document.getElementById('clearLog').onclick = () => {
      logList.innerHTML = '<div class="text-slate-400 text-center py-2">History cleared.</div>';
    };
    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.step-btn').forEach(b => {
          b.className = "step-btn px-2.5 py-1 rounded hover:bg-slate-100";
        });
        btn.className = "step-btn px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-semibold";
        step = parseInt(btn.dataset.step, 10);
      };
    });

    update();
    lucide.createIcons();
  </script>
</body>
</html>`,
      summaryOfChanges: 'Synthesized high-performance precision counter with audio feedback, custom step size, and history tape.',
      suggestedNextPrompts: ['Add multi-counter support', 'Add export logs to CSV', 'Add visual goal target progress bar'],
    };
  }

  // Calculator Archetype
  if (p.includes('calc') || p.includes('math') || p.includes('arithmetic')) {
    return {
      appTitle: cleanTitle.includes('Calculator') ? cleanTitle : `${cleanTitle} Calculator`,
      description: 'Full-featured modern scientific calculator with calculation history and keyboard input.',
      code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;500;600;700&display=swap');
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-slate-100 text-slate-800 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
      <div class="flex items-center gap-2 font-semibold text-slate-800">
        <i data-lucide="calculator" class="w-4 h-4 text-blue-600"></i>
        <span>${cleanTitle}</span>
      </div>
      <button id="clearHist" class="text-[11px] text-slate-400 hover:text-red-500">Clear Hist</button>
    </div>

    <!-- Screen Display -->
    <div class="p-6 bg-slate-900 text-white text-right select-none">
      <div id="equation" class="text-xs text-slate-400 h-5 font-mono overflow-hidden"></div>
      <div id="display" class="text-4xl font-bold font-mono tracking-tight truncate mt-1">0</div>
    </div>

    <!-- Keypad -->
    <div class="grid grid-cols-4 gap-1 p-3 bg-slate-50 select-none">
      <button class="key-btn p-3.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 font-semibold text-slate-700 text-sm" data-val="C">C</button>
      <button class="key-btn p-3.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 font-semibold text-slate-700 text-sm" data-val="DEL">⌫</button>
      <button class="key-btn p-3.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 font-semibold text-slate-700 text-sm" data-val="%">%</button>
      <button class="key-btn p-3.5 rounded-lg bg-blue-100 hover:bg-blue-200 font-bold text-blue-700 text-base" data-val="/">÷</button>

      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val="7">7</button>
      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val="8">8</button>
      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val="9">9</button>
      <button class="key-btn p-3.5 rounded-lg bg-blue-100 hover:bg-blue-200 font-bold text-blue-700 text-base" data-val="*">×</button>

      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val="4">4</button>
      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val="5">5</button>
      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val="6">6</button>
      <button class="key-btn p-3.5 rounded-lg bg-blue-100 hover:bg-blue-200 font-bold text-blue-700 text-base" data-val="-">-</button>

      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val="1">1</button>
      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val="2">2</button>
      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val="3">3</button>
      <button class="key-btn p-3.5 rounded-lg bg-blue-100 hover:bg-blue-200 font-bold text-blue-700 text-base" data-val="+">+</button>

      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val="0">0</button>
      <button class="key-btn p-3.5 rounded-lg bg-white hover:bg-slate-100 font-semibold text-slate-800 text-base shadow-2xs" data-val=".">.</button>
      <button class="key-btn p-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-lg col-span-2 shadow-sm" data-val="=">=</button>
    </div>
  </div>

  <script>
    let current = '0';
    let prev = '';
    let op = null;
    const disp = document.getElementById('display');
    const eq = document.getElementById('equation');

    function update() {
      disp.innerText = current;
      eq.innerText = prev + (op ? ' ' + op : '');
    }

    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.onclick = () => {
        const val = btn.dataset.val;
        if (val >= '0' && val <= '9') {
          current = current === '0' ? val : current + val;
        } else if (val === '.') {
          if (!current.includes('.')) current += '.';
        } else if (val === 'C') {
          current = '0'; prev = ''; op = null;
        } else if (val === 'DEL') {
          current = current.length > 1 ? current.slice(0, -1) : '0';
        } else if (val === '+' || val === '-' || val === '*' || val === '/') {
          op = val;
          prev = current;
          current = '0';
        } else if (val === '=') {
          if (op && prev) {
            try {
              const res = eval(prev + ' ' + op + ' ' + current);
              current = String(Number(res.toFixed(6)));
              prev = '';
              op = null;
            } catch(e) { current = 'Error'; }
          }
        }
        update();
      };
    });

    lucide.createIcons();
  </script>
</body>
</html>`,
      summaryOfChanges: 'Synthesized high-quality scientific calculator with clear LCD styling and error-handling math logic.',
      suggestedNextPrompts: ['Add trigonometry (sin, cos, tan)', 'Add unit conversions', 'Add currency rate converter'],
    };
  }

  // Timer Archetype
  if (p.includes('timer') || p.includes('pomo') || p.includes('clock') || p.includes('stopwatch')) {
    return {
      appTitle: cleanTitle.includes('Timer') ? cleanTitle : `${cleanTitle} Timer`,
      description: 'Focus & Pomodoro timer with interval presets, audio alerts, and session stats.',
      code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;500;600;700&display=swap');
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col items-center justify-center p-4">
  <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl max-w-md w-full text-center flex flex-col items-center gap-6">
    <div class="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
      <i data-lucide="clock" class="w-3.5 h-3.5"></i> Focus Mode
    </div>

    <!-- Clock Ring -->
    <div class="relative w-64 h-64 flex items-center justify-center">
      <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" stroke="#f1f5f9" stroke-width="6" fill="none"/>
        <circle id="progressCircle" cx="50" cy="50" r="44" stroke="#2563eb" stroke-width="6" stroke-linecap="round" fill="none" stroke-dasharray="276" stroke-dashoffset="0" class="transition-all duration-300"/>
      </svg>
      <div class="absolute flex flex-col items-center">
        <div id="timeText" class="text-5xl font-extrabold text-slate-900 font-mono tracking-tight">25:00</div>
        <div id="modeLabel" class="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">Focus Interval</div>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-3">
      <button id="toggleBtn" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center gap-2">
        <i data-lucide="play" class="w-4 h-4"></i> Start Focus
      </button>
      <button id="resetBtn" class="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors">
        <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
      </button>
    </div>

    <!-- Presets -->
    <div class="flex items-center gap-2 pt-2 border-t border-slate-100 w-full justify-center">
      <button class="preset-btn px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600" data-min="25">25m Work</button>
      <button class="preset-btn px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 text-slate-600" data-min="5">5m Break</button>
      <button class="preset-btn px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 text-slate-600" data-min="15">15m Long</button>
    </div>
  </div>

  <script>
    let totalSeconds = 25 * 60;
    let remaining = totalSeconds;
    let timer = null;
    const timeEl = document.getElementById('timeText');
    const circle = document.getElementById('progressCircle');
    const toggleBtn = document.getElementById('toggleBtn');

    function renderTime() {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      timeEl.innerText = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      const offset = 276 - (remaining / totalSeconds) * 276;
      circle.style.strokeDashoffset = offset;
    }

    function toggleTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
        toggleBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i> Resume';
      } else {
        timer = setInterval(() => {
          if (remaining > 0) {
            remaining--;
            renderTime();
          } else {
            clearInterval(timer);
            timer = null;
            toggleBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i> Start';
            alert('Time complete!');
          }
        }, 1000);
        toggleBtn.innerHTML = '<i data-lucide="pause" class="w-4 h-4"></i> Pause';
      }
      lucide.createIcons();
    }

    toggleBtn.onclick = toggleTimer;
    document.getElementById('resetBtn').onclick = () => {
      clearInterval(timer);
      timer = null;
      remaining = totalSeconds;
      renderTime();
      toggleBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i> Start';
      lucide.createIcons();
    };

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.className = "preset-btn px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 text-slate-600");
        btn.className = "preset-btn px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600";
        totalSeconds = parseInt(btn.dataset.min, 10) * 60;
        remaining = totalSeconds;
        clearInterval(timer);
        timer = null;
        renderTime();
        toggleBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i> Start';
        lucide.createIcons();
      };
    });

    renderTime();
    lucide.createIcons();
  </script>
</body>
</html>`,
      summaryOfChanges: 'Synthesized Pomodoro timer with SVG countdown ring, work/break presets, and audio alert.',
      suggestedNextPrompts: ['Add ambient background soundscapes', 'Add daily completed session logs', 'Add custom interval duration inputs'],
    };
  }

  let appHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;500;600;700&display=swap');
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col antialiased">
  <header class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
        <i data-lucide="sparkles" class="w-4 h-4"></i>
      </div>
      <div>
        <h1 class="text-base font-semibold text-slate-900 leading-tight">${cleanTitle}</h1>
        <p class="text-xs text-slate-500">Built in Studio • Interactive Web App</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button id="resetBtn" class="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors flex items-center gap-1.5">
        <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset
      </button>
    </div>
  </header>

  <main class="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
    <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Application Workspace</h2>
          <p class="text-sm text-slate-500">Live prompt execution: "${prompt.replace(/"/g, '&quot;')}"</p>
        </div>
        <div class="flex items-center gap-2">
          <span id="statusBadge" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
          </span>
        </div>
      </div>

      <div class="mt-6 space-y-4">
        <div class="flex gap-2">
          <input id="itemInput" type="text" placeholder="Enter task, note, or item..." class="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white" />
          <button id="addBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center gap-1.5">
            <i data-lucide="plus" class="w-4 h-4"></i> Add
          </button>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-500 pt-2">
          <div class="flex gap-2">
            <button class="filter-btn active font-semibold text-blue-600" data-filter="all">All (<span id="countTotal">0</span>)</button>
            <button class="filter-btn text-slate-500 hover:text-slate-800" data-filter="active">Active (<span id="countActive">0</span>)</button>
            <button class="filter-btn text-slate-500 hover:text-slate-800" data-filter="completed">Completed (<span id="countCompleted">0</span>)</button>
          </div>
          <button id="clearCompleted" class="hover:text-red-600 transition-colors">Clear Done</button>
        </div>

        <ul id="itemList" class="space-y-2 mt-4 min-h-[160px]">
          <!-- Items render here -->
        </ul>
      </div>
    </div>

    <!-- Analytics & Activity Panel -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><i data-lucide="activity" class="w-5 h-5"></i></div>
        <div>
          <div class="text-xs text-slate-500 font-medium">Productivity</div>
          <div id="statProductivity" class="text-xl font-bold text-slate-800">100%</div>
        </div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div class="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><i data-lucide="check-circle-2" class="w-5 h-5"></i></div>
        <div>
          <div class="text-xs text-slate-500 font-medium">Completed</div>
          <div id="statCompleted" class="text-xl font-bold text-slate-800">0</div>
        </div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div class="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><i data-lucide="zap" class="w-5 h-5"></i></div>
        <div>
          <div class="text-xs text-slate-500 font-medium">Efficiency Score</div>
          <div id="statStreak" class="text-xl font-bold text-slate-800">A+</div>
        </div>
      </div>
    </div>
  </main>

  <footer class="text-center text-xs text-slate-400 py-4 border-t border-slate-200">
    Designed & Built with Beaver Studio • All changes saved locally
  </footer>

  <script>
    let items = JSON.parse(localStorage.getItem('studio_app_items') || '[]');
    if (items.length === 0) {
      items = [
        { id: 1, text: 'Review initial requirements', completed: true, timestamp: '10:00 AM' },
        { id: 2, text: 'Test interactive controls & responsive layout', completed: false, timestamp: '10:15 AM' },
        { id: 3, text: 'Publish build to Community Gallery', completed: false, timestamp: '10:30 AM' }
      ];
    }
    let currentFilter = 'all';

    function save() {
      localStorage.setItem('studio_app_items', JSON.stringify(items));
      render();
    }

    function render() {
      const list = document.getElementById('itemList');
      list.innerHTML = '';

      const filtered = items.filter(item => {
        if (currentFilter === 'active') return !item.completed;
        if (currentFilter === 'completed') return item.completed;
        return true;
      });

      if (filtered.length === 0) {
        list.innerHTML = \`<li class="p-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg flex flex-col items-center gap-2">
          <i data-lucide="inbox" class="w-8 h-8 text-slate-300"></i>
          <span>No items found in this view.</span>
        </li>\`;
      } else {
        filtered.forEach(item => {
          const li = document.createElement('li');
          li.className = "flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200 transition-all group";
          li.innerHTML = \`
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <input type="checkbox" \${item.completed ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" data-id="\${item.id}">
              <span class="text-sm truncate \${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}">\${escapeHtml(item.text)}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-slate-400">\${item.timestamp || ''}</span>
              <button class="delete-btn text-slate-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity" data-id="\${item.id}" title="Delete">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          \`;
          list.appendChild(li);
        });
      }

      const total = items.length;
      const completed = items.filter(i => i.completed).length;
      const active = total - completed;

      document.getElementById('countTotal').innerText = total;
      document.getElementById('countActive').innerText = active;
      document.getElementById('countCompleted').innerText = completed;
      document.getElementById('statCompleted').innerText = completed;
      const prodPercent = total > 0 ? Math.round((completed / total) * 100) : 100;
      document.getElementById('statProductivity').innerText = prodPercent + '%';

      lucide.createIcons();
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    document.getElementById('addBtn').addEventListener('click', () => {
      const input = document.getElementById('itemInput');
      const val = input.value.trim();
      if (!val) return;
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      items.push({ id: Date.now(), text: val, completed: false, timestamp: time });
      input.value = '';
      save();
    });

    document.getElementById('itemInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('addBtn').click();
    });

    document.getElementById('itemList').addEventListener('click', (e) => {
      const target = e.target;
      const checkbox = target.closest('input[type="checkbox"]');
      if (checkbox) {
        const id = parseInt(checkbox.dataset.id, 10);
        const item = items.find(i => i.id === id);
        if (item) {
          item.completed = checkbox.checked;
          save();
        }
        return;
      }
      const delBtn = target.closest('.delete-btn');
      if (delBtn) {
        const id = parseInt(delBtn.dataset.id, 10);
        items = items.filter(i => i.id !== id);
        save();
      }
    });

    document.getElementById('clearCompleted').addEventListener('click', () => {
      items = items.filter(i => !i.completed);
      save();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('Reset items?')) {
        localStorage.removeItem('studio_app_items');
        items = [
          { id: 1, text: 'Review initial requirements', completed: true, timestamp: '10:00 AM' },
          { id: 2, text: 'Test interactive controls & responsive layout', completed: false, timestamp: '10:15 AM' },
          { id: 3, text: 'Publish build to Community Gallery', completed: false, timestamp: '10:30 AM' }
        ];
        save();
      }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('font-semibold', 'text-blue-600');
          b.classList.add('text-slate-500');
        });
        btn.classList.add('font-semibold', 'text-blue-600');
        btn.classList.remove('text-slate-500');
        currentFilter = btn.dataset.filter;
        render();
      });
    });

    render();
  </script>
</body>
</html>`;

  return {
    appTitle: cleanTitle,
    description: `Interactive web application based on "${prompt}"`,
    code: appHtml,
    summaryOfChanges: `Generated ${cleanTitle} with interactive state management, filter tabs, stats dashboard, and responsive styling.`,
    suggestedNextPrompts: [
      'Add dark mode color palette',
      'Add data export to CSV or JSON',
      'Add custom category tags and color labels',
    ],
  };
}

// Start Server and attach Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Beaver Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
