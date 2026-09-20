import { GoogleGenAI } from '@google/genai';

export async function generateAppClientSide(prompt: string, currentCode?: string, appTitle?: string) {
  const apiKey = localStorage.getItem('gemini_api_key') || (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) || '';
  if (!apiKey) {
    throw new Error('Gemini API key is required for real AI generation on Cloudflare workers.dev. Please set your Gemini API key in Settings or click the API Key button in the top bar.');
  }

  const ai = new GoogleGenAI({ apiKey });

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
    ? `CURRENT APP CODE:\n\`\`\`html\n${currentCode.slice(0, 25000)}\n\`\`\`\n\nUSER REQUEST FOR MODIFICATIONS / NEW FEATURES:\n${prompt}`
    : `USER REQUEST:\n${prompt}\n\nPlease generate a brand new, complete, fully working application from scratch based on the above request.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${systemInstruction}\n\n${userPromptContent}`,
  });

  const rawText = response.text || '';
  
  let title = '';
  let description = '';
  let summary = '';
  let suggestedNextPrompts: string[] = [];
  let code = '';

  const titleMatch = rawText.match(/# TITLE:\s*([^\n\r]+)/i);
  if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '');

  const descMatch = rawText.match(/# DESCRIPTION:\s*([^\n\r]+)/i);
  if (descMatch) description = descMatch[1].trim().replace(/^["']|["']$/g, '');

  const summaryMatch = rawText.match(/# SUMMARY:\s*([^\n\r]+)/i);
  if (summaryMatch) summary = summaryMatch[1].trim().replace(/^["']|["']$/g, '');

  const nextMatch = rawText.match(/# NEXT:\s*([^\n\r]+)/i);
  if (nextMatch) {
    suggestedNextPrompts = nextMatch[1].split('|').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }

  const codeBlockMatch = rawText.match(/```(?:html|htm)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    code = codeBlockMatch[1].trim();
  } else {
    const htmlMatch = rawText.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i) || rawText.match(/(<html[\s\S]*<\/html>)/i);
    if (htmlMatch) code = htmlMatch[1].trim();
  }

  const cleanPromptTitle = prompt.slice(0, 32).replace(/^(make|build|create|generate|code|design)\s*(an?|the)?\s*/i, '').trim();
  const fallbackTitle = cleanPromptTitle ? cleanPromptTitle.charAt(0).toUpperCase() + cleanPromptTitle.slice(1) : 'Custom Application';

  title = title || fallbackTitle;
  description = description || `An interactive application built from: "${prompt}"`;
  summary = summary || `Synthesized custom application with real-time interactivity and Tailwind styling.`;
  if (suggestedNextPrompts.length === 0) {
    suggestedNextPrompts = ['Add search and filter', 'Add export feature', 'Add dark/light themes'];
  }

  if (code && !code.toLowerCase().includes('<!doctype html>')) {
    code = `<!DOCTYPE html>\n<html lang="en">\n${code}`;
    if (!code.includes('</html>')) code += '\n</html>';
  }

  return {
    appTitle: title,
    description,
    code: code || `<!DOCTYPE html><html><body class="bg-gray-900 text-white p-8"><h1>${title}</h1><p>${description}</p></body></html>`,
    summaryOfChanges: summary,
    suggestedNextPrompts,
    modelUsed: 'gemini-2.5-flash-client'
  };
}
