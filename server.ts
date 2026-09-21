// Safe API key retriever
const getApiKey = (env: any): string => {
  return env.GEMINI_API_KEY || "";
};

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Route for the AI Studio Chat API
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const apiKey = getApiKey(env);
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "Missing API Key configuration." }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const body = await request.json();
        // Your logic connecting to Google AI Studio goes here
        return new Response(JSON.stringify({ success: true, message: "Connected successfully" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Natively hand off static website asset requests to Cloudflare's built-in ASSETS binding
    if (env.ASSETS) {
      return await env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};
