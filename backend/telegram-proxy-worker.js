// Cloudflare Worker — Telegram Bot API relay.
//
// Some hosts (e.g. certain Hugging Face Spaces) can't reach api.telegram.org
// for outbound calls even though inbound webhooks work. Deploy this tiny Worker
// (free) and set the backend's TELEGRAM_API_BASE to the Worker URL, e.g.
//   TELEGRAM_API_BASE=https://smruti-tg.<your-subdomain>.workers.dev
// The backend then calls the Worker, which forwards to api.telegram.org.
//
// Deploy: Cloudflare dashboard → Workers & Pages → Create → Worker → paste this
// → Deploy. Only Telegram Bot API paths (/bot..., /file/bot...) are forwarded.

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only relay genuine Telegram Bot API paths; reject anything else.
    if (!url.pathname.startsWith("/bot") && !url.pathname.startsWith("/file/bot")) {
      return new Response("Not found", { status: 404 });
    }

    const target = "https://api.telegram.org" + url.pathname + url.search;
    const init = { method: request.method };

    const contentType = request.headers.get("content-type");
    if (contentType) init.headers = { "content-type": contentType };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    const resp = await fetch(target, init);
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        "content-type": resp.headers.get("content-type") || "application/json",
      },
    });
  },
};
