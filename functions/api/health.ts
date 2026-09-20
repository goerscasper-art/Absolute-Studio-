export async function onRequestGet() {
  return new Response(JSON.stringify({ status: 'ok', hasApiKey: true, platform: 'cloudflare-pages' }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
