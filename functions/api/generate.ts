export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { prompt, currentCode, appTitle } = body;

    const apiKey = (env && env.GEMINI_API_KEY) || request.headers.get('X-Gemini-Key') || '';
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
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

    const userPrompt = currentCode
      ? `CURRENT APP CODE:\n\`\`\`html\n${currentCode.slice(0, 20000)}\n\`\`\`\n\nUSER REQUEST FOR MODIFICATIONS / NEW FEATURES:\n${prompt}\n\nPlease update and enhance the application to fulfill the user request.`
      : `USER REQUEST:\n${prompt}\n\nPlease generate a brand new, complete, fully working application from scratch based on the above request.`;

    const payload = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 16384
      }
    };

    const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
    let rawText = '';
    let modelUsed = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!apiRes.ok) {
          const errData: any = await apiRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gemini API returned HTTP ${apiRes.status}`);
        }

        const data: any = await apiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text.trim()) {
          rawText = text;
          modelUsed = model;
          break;
        }
      } catch (e) {
        lastError = e;
      }
    }

    if (!rawText) {
      throw new Error(lastError?.message || 'Gemini API generation failed.');
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

    const finalTitle = titleMatch ? titleMatch[1].trim() : (appTitle || fallbackTitle);
    const finalDesc = descMatch ? descMatch[1].trim() : `AI-generated application for: ${prompt}`;
    const finalSummary = summaryMatch ? summaryMatch[1].trim() : `Successfully generated ${finalTitle} in real-time with ${modelUsed}.`;
    const finalNext = nextMatch ? nextMatch[1].split('|').map((s: string) => s.trim()).filter(Boolean) : ['Add sound effects', 'Add high score tracking', 'Improve responsive layout'];

    return new Response(JSON.stringify({
      appTitle: finalTitle,
      description: finalDesc,
      code: code || rawText,
      summaryOfChanges: finalSummary,
      suggestedNextPrompts: finalNext,
      modelUsed
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Gemini-Key',
    },
  });
}
