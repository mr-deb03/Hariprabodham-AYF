// Cloudflare Worker — Smruti Telegram bot handler.
//
// The face-matching backend (a Hugging Face Space) CAN'T make outbound calls to
// Telegram (its egress is blocked), but it serves matched photos fine over
// inbound HTTP. So this Worker owns ALL Telegram I/O: Telegram delivers updates
// here, we ask the backend to match faces (inbound to the Space, which works),
// then we send the resulting photos to the user via the Telegram Bot API.
//
//   Telegram ──webhook──► this Worker ──► HF Space /telegram/process  (match)
//                              └─────────► Telegram sendPhoto           (deliver)
//
// The photo URLs point back at the Space's /media/... — Telegram fetches the
// bytes itself (inbound to the Space), so nothing large leaves the Space.
//
// Set these in the Worker → Settings → Variables and Secrets:
//   BOT_TOKEN      — Telegram bot token from @BotFather (encrypt as a Secret)
//   HF_BASE        — https://<your-space>.hf.space   (no trailing slash)
//   SHARED_SECRET  — must equal the Space's TELEGRAM_WEBHOOK_SECRET
//   WEBHOOK_SECRET — (optional) if set, register the webhook with this
//                    secret_token and we reject updates that don't match it.
//
// Register the webhook once, from a machine that can reach Telegram:
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<worker-url>/&secret_token=<WEBHOOK_SECRET>"
//
// Optional: add a Cron Trigger (e.g. */30 * * * *) to keep the free Space awake
// — the scheduled() handler below pings its /health so users don't hit a cold
// start.

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Smruti bot is running.", { status: 200 });
    }
    // If a webhook secret is configured, only accept updates Telegram signs.
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
      return new Response("ok"); // ignore non-JSON pokes
    }

    // Ack Telegram immediately so it doesn't retry; do the slow work after.
    ctx.waitUntil(handleUpdate(update, env));
    return new Response("ok");
  },

  // Cron Trigger — keep the free HF Space warm so matching isn't a cold start.
  async scheduled(event, env, ctx) {
    if (env.HF_BASE) {
      ctx.waitUntil(fetch(`${env.HF_BASE}/health`).catch(() => {}));
    }
  },
};

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
        const res = await fetch(`${env.HF_BASE}/telegram/process`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-smruti-secret": env.SHARED_SECRET || "",
          },
          body: JSON.stringify({ token, chat_id: chatId }),
        });
        data = await res.json();
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
