// Cloudflare Worker — Smruti delivery relay (Telegram bot + WhatsApp sender).
//
// The face-matching backend (a Hugging Face Space) CAN'T make outbound calls,
// but it serves matched photos fine over inbound HTTP. So this Worker owns all
// outbound messaging: it asks the Space to match faces (inbound to the Space,
// which works) and then delivers the photos.
//
// ROUTES
//   POST /                  Telegram webhook  → matches + sends via Telegram
//   POST /smruti/whatsapp   called by the website form → sends via WhatsApp
//   GET  /                  health text
//   cron                    pings the Space's /warm to keep the model loaded
//
// VARIABLES (Worker → Settings → Variables and Secrets)
//   Shared:
//     HF_BASE        https://<your-space>.hf.space   (no trailing slash)
//     SHARED_SECRET  must equal the Space's TELEGRAM_WEBHOOK_SECRET
//   Telegram:
//     BOT_TOKEN      bot token from @BotFather                      (Secret)
//     WEBHOOK_SECRET optional; register the webhook with this secret_token
//   WhatsApp (your own self-hosted API):
//     WA_API_URL     base URL of your service, e.g. https://wa.example.com
//     WA_API_KEY     your API key                                   (Secret)
//     WA_AUTH_HEADER header name for the key   (default "Authorization")
//     WA_AUTH_PREFIX prefix before the key     (default "Bearer ", may be "")
//     WA_TEXT_PATH   send-text path            (default "/send-message")
//     WA_IMAGE_PATH  send-image path           (default "/send-image")
//     ALLOWED_ORIGIN site origin for CORS      (default "*")

const DEFAULTS = {
  textPath: "/send-message",
  imagePath: "/send-image",
  authHeader: "Authorization",
  authPrefix: "Bearer ",
};

const corsHeaders = (env) => ({
  "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const json = (body, status, env) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });

// ───────────────────────────────────────────────────────────────────────────
// YOUR WHATSAPP API — adjust the JSON field names below to match your service.
// Everything else (URL, key, header, paths) comes from the Worker variables.
// ───────────────────────────────────────────────────────────────────────────
function waBodyForText(number, message) {
  return { number, message };
}
function waBodyForImage(number, imageUrl, caption) {
  return { number, imageUrl, caption };
}

async function waCall(env, path, body) {
  const base = (env.WA_API_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("WA_API_URL is not set");
  const headers = { "Content-Type": "application/json" };
  if (env.WA_API_KEY) {
    const name = env.WA_AUTH_HEADER || DEFAULTS.authHeader;
    const prefix =
      env.WA_AUTH_PREFIX === undefined ? DEFAULTS.authPrefix : env.WA_AUTH_PREFIX;
    headers[name] = prefix + env.WA_API_KEY;
  }
  const res = await fetch(base + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`WhatsApp API ${res.status}: ${detail}`);
  }
  return res.json().catch(() => ({}));
}

const waText = (env, number, message) =>
  waCall(env, env.WA_TEXT_PATH || DEFAULTS.textPath, waBodyForText(number, message));

const waImage = (env, number, imageUrl, caption) =>
  waCall(
    env,
    env.WA_IMAGE_PATH || DEFAULTS.imagePath,
    waBodyForImage(number, imageUrl, caption)
  );

// Normalise an Indian mobile to plain international digits (919876543210).
function toIntl(mobile) {
  const d = String(mobile || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) return "91" + d;
  if (d.length === 11 && d.startsWith("0")) return "91" + d.slice(1);
  return d;
}

// Ask the Space to match the selfie stashed under `token` and hand back URLs.
async function matchPhotos(env, token, who) {
  const res = await fetch(`${env.HF_BASE}/telegram/process`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-smruti-secret": env.SHARED_SECRET || "",
    },
    body: JSON.stringify({ token, chat_id: who || null }),
  });
  if (!res.ok) throw new Error(`match failed (${res.status})`);
  return res.json();
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders(env) });
    }
    if (request.method !== "POST") {
      return new Response("Smruti relay is running.", { status: 200 });
    }

    // ---- WhatsApp delivery, triggered by the website form ----------------
    if (url.pathname === "/smruti/whatsapp") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "bad json" }, 400, env);
      }
      const token = String(body?.token || "").trim();
      const number = toIntl(body?.mobile);
      const name = String(body?.name || "").trim() || "there";
      if (!token || !number) {
        return json({ ok: false, error: "token and mobile required" }, 400, env);
      }
      // Ack immediately — matching can take a while on a cold Space, and the
      // browser shouldn't hang. Delivery continues in the background.
      ctx.waitUntil(deliverWhatsApp(env, token, number, name));
      return json({ ok: true, queued: true }, 202, env);
    }

    // ---- Telegram webhook (registered at the Worker root) ----------------
    if (env.WEBHOOK_SECRET) {
      const got = request.headers.get("x-telegram-bot-api-secret-token") || "";
      if (got !== env.WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
    }
    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("ok");
    }
    ctx.waitUntil(handleUpdate(update, env));
    return new Response("ok");
  },

  // Cron Trigger — keep the free HF Space warm so matching isn't a cold start.
  // Must hit /warm, not /health: /health answers without touching the face model
  // or the album index, so it proves the server is up but leaves it cold.
  async scheduled(event, env, ctx) {
    if (env.HF_BASE) {
      ctx.waitUntil(fetch(`${env.HF_BASE}/warm`).catch(() => {}));
    }
  },
};

async function deliverWhatsApp(env, token, number, name) {
  try {
    await waText(
      env,
      number,
      `Jai Swaminarayan ${name}! 🙏 Matching your photos across our gathering albums — one moment…`
    );
  } catch (e) {
    console.log("[smruti][wa] greeting failed:", e.message);
  }

  let data;
  try {
    data = await matchPhotos(env, token, number);
  } catch (e) {
    console.log("[smruti][wa] match failed:", e.message);
    await waText(
      env,
      number,
      "Sorry, we couldn't reach our photo server just now. Please try again in a few minutes. 🙏"
    ).catch(() => {});
    return;
  }

  const photos = data?.photos || [];
  if (!photos.length) {
    // "expired" / "none" / "error" all carry a human-readable message.
    await waText(env, number, data?.text || "No matching photos found.").catch(
      () => {}
    );
    return;
  }

  // Send each photo; caption only the first so the album isn't noisy.
  let sent = 0;
  for (let i = 0; i < photos.length; i++) {
    try {
      await waImage(
        env,
        number,
        photos[i],
        i === 0
          ? `Here ${photos.length === 1 ? "is" : "are"} your ${photos.length} photo${
              photos.length === 1 ? "" : "s"
            } from our gatherings 🙏`
          : ""
      );
      sent++;
    } catch (e) {
      console.log(`[smruti][wa] photo ${i + 1} failed:`, e.message);
    }
  }
  console.log(`[smruti][wa] sent ${sent}/${photos.length} to ${number}`);
}

async function handleUpdate(update, env) {
  const msg = update.message || update.edited_message;
  const chatId = msg && msg.chat && msg.chat.id;
  if (!chatId) return;

  const firstName = (msg.from && msg.from.first_name) || "there";
  const text = (msg.text || "").trim();

  const call = (method, payload) =>
    fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  const send = (t) => call("sendMessage", { chat_id: chatId, text: t });

  // The deep link arrives as "/start <token>".
  if (text.startsWith("/start")) {
    const token = text.split(/\s+/)[1] || "";
    if (token) {
      await send(
        `Jai Swaminarayan ${firstName}! 🙏 Matching your photos across our ` +
          `gathering albums — one moment…`
      );

      let data;
      try {
        data = await matchPhotos(env, token, chatId);
      } catch {
        await send(
          "Sorry, I couldn't reach our photo server just now. Please try again " +
            "in a minute. 🙏"
        );
        return;
      }

      if (data && data.text) await send(data.text);

      const photos = (data && data.photos) || [];
      for (let i = 0; i < photos.length; i += 10) {
        const chunk = photos.slice(i, i + 10); // Telegram: max 10 per album
        if (chunk.length === 1) {
          await call("sendPhoto", { chat_id: chatId, photo: chunk[0] });
        } else {
          await call("sendMediaGroup", {
            chat_id: chatId,
            media: chunk.map((u) => ({ type: "photo", media: u })),
          });
        }
      }
      return;
    }
  }

  // Anything else → point them back to the website form (the entry point).
  await send(
    `Jai Swaminarayan ${firstName}! 🙏\n\n` +
      `To receive your photos, open the Smruti photo finder on our website, ` +
      `upload a selfie, then tap "Open my photos on Telegram". I'll send your ` +
      `matched photos right here.`
  );
}
