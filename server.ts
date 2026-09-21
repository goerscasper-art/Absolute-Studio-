import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Cloudflare-friendly environment wrapper
const getApiKey = (req: any): string => {
  return (
    process.env.GEMINI_API_KEY || 
    (globalThis as any).GEMINI_API_KEY || 
    (req.env && req.env.GEMINI_API_KEY) || 
    ""
  );
};

// Handle frontend static files cleanly
app.use(express.static(path.join(__dirname, 'dist')));

// Sample API route using the safe wrapper
app.post('/api/chat', (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(401).json({ error: "Missing API Key configuration." });
  }
  // Your app logic goes here safely
  res.json({ success: true });
});

// Fallback all routes to index.html for single-page applications
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Cloudflare Worker export engine
export default {
  fetch(request: Request, env: any, ctx: any) {
    (globalThis as any).GEMINI_API_KEY = env.GEMINI_API_KEY;
    return app(request as any, res => res);
  }
};
