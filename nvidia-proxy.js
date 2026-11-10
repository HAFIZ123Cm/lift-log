// Cloudflare Worker: lets the Lift Log app talk to NVIDIA's free AI.
// NVIDIA blocks calls straight from web pages, so this passes them along.
const ALLOWED_ORIGIN = "https://hafiz123cm.github.io";
export default {
  async fetch(req) {
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
    const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": req.headers.get("Authorization") || "", "Content-Type": "application/json" },
      body: await req.text()
    });
    return new Response(r.body, { status: r.status, headers: { ...cors, "Content-Type": r.headers.get("Content-Type") || "application/json" } });
  }
};
