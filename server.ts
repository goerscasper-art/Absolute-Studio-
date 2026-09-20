import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

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
const HIGH_SCORES_FILE = path.join(DATA_DIR, 'high-scores.json');

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
if (!fs.existsSync(HIGH_SCORES_FILE)) {
  writeJsonFile(HIGH_SCORES_FILE, {});
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

// GET high scores for an app
app.get('/api/apps/:id/scores', (req, res) => {
  const { id } = req.params;
  const allScores = readJsonFile<Record<string, any[]>>(HIGH_SCORES_FILE, {});
  const scores = allScores[id] || [];
  scores.sort((a, b) => Number(b.score) - Number(a.score));
  res.json(scores);
});

// POST submit high score for an app
app.post('/api/apps/:id/scores', (req, res) => {
  const { id } = req.params;
  const { playerName, score, avatar } = req.body;
  if (score === undefined || score === null) {
    return res.status(400).json({ error: 'Score is required' });
  }

  const allScores = readJsonFile<Record<string, any[]>>(HIGH_SCORES_FILE, {});
  if (!allScores[id]) {
    allScores[id] = [];
  }

  const newEntry = {
    id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    playerName: playerName || 'Anonymous Player',
    score: Number(score),
    avatar: avatar || '',
    date: new Date().toISOString(),
  };

  allScores[id].push(newEntry);
  allScores[id].sort((a, b) => Number(b.score) - Number(a.score));
  allScores[id] = allScores[id].slice(0, 100);

  writeJsonFile(HIGH_SCORES_FILE, allScores);
  return res.json({ success: true, scores: allScores[id] });
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
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
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
    }
  }

  return res.status(500).json({
    error: `Real-time Gemini generation failed across models: ${lastError?.message || 'Unknown error'}. Please verify your API key.`,
  });
});

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
