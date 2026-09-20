export async function generateAppClientSide(prompt: string, currentCode?: string, appTitle?: string) {
  const apiKey =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') : null) ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) ||
    '';

  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set your Gemini API key in the top bar or settings.');
  }

  const systemInstruction = `You are the lead AI code generator in Google AI Studio / Studio Build.
Your goal is to build COMPLETE, PRODUCTION-READY, FULLY FUNCTIONAL, BEAUTIFULLY STYLED standalone web applications from user prompts.

CRITICAL DIRECTIVES:
1. DARK THEME BY DEFAULT (MANDATORY): The entire application must be crafted in an elegant, modern dark theme. Use dark backgrounds (e.g. \`bg-[#121212]\` or \`bg-slate-900\`), dark card surfaces (e.g. \`bg-[#1e1e1e]\` or \`bg-slate-800\`), subtle dark borders (\`border-[#333333]\` or \`border-slate-700\`), and high-contrast readable text (\`text-slate-100\` or \`text-[#f3f3f3]\`).
2. STANDALONE HTML: The output code MUST be a single, complete, executable HTML5 file (starting with <!DOCTYPE html> and ending with </html>).
3. MODERN STYLING: Always include Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>. Include tailwind dark config. Use attractive, high-contrast accent colors, clean card containers, responsive layouts, and smooth transitions.
4. ICONS: Always include Lucide icons via CDN: <script src="https://unpkg.com/lucide@latest"></script> and call lucide.createIcons() after the DOM is rendered.
5. COMPLETE WORKING JAVASCRIPT: Write 100% complete, bug-free JavaScript in a <script> tag. All buttons, inputs, sliders, games, canvas MUST work immediately when clicked.
6. NO PLACEHOLDERS: Do NOT leave any "TODO" or empty stubs. Output the entire working app.

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
...
</html>
\`\`\``;

  const userPromptContent = currentCode
    ? `CURRENT APP CODE:\n\`\`\`html\n${currentCode.slice(0, 20000)}\n\`\`\`\n\nUSER REQUEST FOR MODIFICATIONS / NEW FEATURES:\n${prompt}\n\nPlease update and enhance the application to fulfill the user request.`
    : `USER REQUEST:\n${prompt}\n\nPlease generate a brand new, complete, fully working application from scratch based on the above request.`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPromptContent }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 16384
    }
  };

  const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
  let rawText = '';
  let usedModel = '';
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text.trim()) {
        rawText = text;
        usedModel = model;
        break;
      }
    } catch (err: any) {
      console.warn(`[Client Gemini] Model ${model} failed:`, err.message || err);
      lastError = err;
    }
  }

  if (!rawText) {
    throw new Error(lastError?.message || 'Gemini AI was unable to generate the application. Please verify your internet connection or API key.');
  }

  const titleMatch = rawText.match(/# TITLE:\s*([^\n\r]+)/i);
  const descMatch = rawText.match(/# DESCRIPTION:\s*([^\n\r]+)/i);
  const summaryMatch = rawText.match(/# SUMMARY:\s*([^\n\r]+)/i);
  const nextMatch = rawText.match(/# NEXT:\s*([^\n\r]+)/i);

  let code = '';
  const codeBlockMatch = rawText.match(/```(?:html|htm)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    code = codeBlockMatch[1].trim();
  } else {
    const htmlMatch = rawText.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i) || rawText.match(/(<html[\s\S]*<\/html>)/i);
    if (htmlMatch) code = htmlMatch[1].trim();
  }

  const cleanTitle = prompt.slice(0, 32).replace(/^(make|build|create|generate|code|design)\s*(an?|the)?\s*/i, '').trim();
  const fallbackTitle = cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : 'Generated App';

  const title = titleMatch ? titleMatch[1].trim() : (appTitle || fallbackTitle);
  const description = descMatch ? descMatch[1].trim() : `AI-generated application for: ${prompt}`;
  const summary = summaryMatch ? summaryMatch[1].trim() : `Successfully generated ${title} in real time using ${usedModel}.`;
  const suggestedNextPrompts = nextMatch
    ? nextMatch[1].split('|').map((s) => s.trim()).filter(Boolean)
    : ['Add high score leaderboard', 'Add sound effects and audio', 'Add dark/light toggle'];

  if (code && !code.toLowerCase().includes('<!doctype html>')) {
    code = '<!DOCTYPE html>\n<html lang="en" class="dark">\n' + code;
    if (!code.includes('</html>')) code += '\n</html>';
  }

  return {
    appTitle: title,
    description,
    code: code || rawText,
    summaryOfChanges: summary,
    suggestedNextPrompts,
    modelUsed: usedModel
  };
}
