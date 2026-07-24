// Automated WhatsApp birthday wishes — Supabase Edge Function.
//
// Two ways in:
//   • Daily cron (see birthday_wishes.sql) posts {} with the service-role key →
//     finds every member whose birthday is TODAY and wishes them.
//   • The portal's "Wish 🎉" button posts {"member_id": "..."} with the signed-in
//     admin's JWT → wishes that one member on demand.
//
// Business-initiated WhatsApp messages MUST use an approved template, so this
// sends a template with one body variable: the member's first name.
//
// Secrets (Project Settings → Edge Functions → Secrets) — all BLANK until you
// create the WhatsApp Business number and template:
//   WHATSAPP_TOKEN            permanent access token from Meta
//   WHATSAPP_PHONE_NUMBER_ID  the WABA phone number id
//   WHATSAPP_TEMPLATE_NAME    e.g. birthday_wish
//   WHATSAPP_TEMPLATE_LANG    e.g. en  (must match the approved template)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH_VERSION = "v21.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// dob is a `date` → "YYYY-MM-DD". Parse without timezone shifts.
function dobParts(dob: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dob || ""));
  return m ? { year: +m[1], month: +m[2], day: +m[3] } : null;
}

// Normalise an Indian mobile to international digits (91XXXXXXXXXX), or "".
function toIntl(mobile: string) {
  const d = String(mobile || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) return "91" + d;
  if (d.length === 11 && d.startsWith("0")) return "91" + d.slice(1);
  return d;
}

async function sendWhatsApp(to: string, firstName: string) {
  const token = Deno.env.get("WHATSAPP_TOKEN") ?? "";
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
  const template = Deno.env.get("WHATSAPP_TEMPLATE_NAME") ?? "";
  const lang = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "en";

  if (!token || !phoneId || !template) {
    throw new Error(
      "WhatsApp is not configured — set WHATSAPP_TOKEN, " +
        "WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TEMPLATE_NAME."
    );
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          components: [
            { type: "body", parameters: [{ type: "text", text: firstName }] },
          ],
        },
      }),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `WhatsApp HTTP ${res.status}`);
  }
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (!auth) return json({ error: "missing authorization" }, 401);

  // Service role (the cron) is trusted; anything else must be an admin's JWT.
  const isCron = auth === serviceKey;
  const admin = createClient(url, serviceKey);

  if (!isCron) {
    const { data: userRes } = await admin.auth.getUser(auth);
    const uid = userRes?.user?.id;
    if (!uid) return json({ error: "invalid token" }, 401);
    const { data: profile } = await admin
      .from("profiles")
      .select("role, status")
      .eq("id", uid)
      .single();
    if (profile?.role !== "admin" || profile?.status !== "approved") {
      return json({ error: "admins only" }, 403);
    }
  }

  const payload = await req.json().catch(() => ({}));
  const memberId: string | undefined = payload?.member_id;

  // Today in IST — birthdays should flip at midnight India time, not UTC.
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  const todayMonth = ist.getUTCMonth() + 1;
  const todayDay = ist.getUTCDate();
  const year = ist.getUTCFullYear();

  // Pull candidates: one member (manual) or everyone with a DOB (cron).
  let q = admin
    .from("members")
    .select("id, name, dob, mobile, active")
    .not("dob", "is", null);
  if (memberId) q = q.eq("id", memberId);
  const { data: members, error } = await q;
  if (error) return json({ error: error.message }, 500);

  // A wish only ever goes out ON the member's birthday — that holds for the
  // cron AND for a manual "wish now", so nobody is greeted early or late.
  const targets = (members ?? []).filter((m) => m.active !== false);

  // Skip anyone already wished this year (the cron may run more than once).
  const { data: done } = await admin
    .from("birthday_wish_log")
    .select("member_id")
    .eq("year", year)
    .eq("channel", "whatsapp")
    .eq("status", "sent");
  const alreadyWished = new Set((done ?? []).map((r) => r.member_id));

  const results: Array<Record<string, unknown>> = [];
  for (const m of targets) {
    const p = dobParts(m.dob);
    if (!p || p.month !== todayMonth || p.day !== todayDay) {
      // The cron sees mostly non-birthdays — only report it when someone
      // explicitly asked for this member, so the UI can explain the refusal.
      if (memberId) {
        results.push({ id: m.id, name: m.name, skipped: "not their birthday today" });
      }
      continue;
    }
    if (alreadyWished.has(m.id)) {
      results.push({ id: m.id, name: m.name, skipped: "already wished" });
      continue;
    }
    const to = toIntl(m.mobile);
    if (!to) {
      results.push({ id: m.id, name: m.name, skipped: "no mobile" });
      continue;
    }

    const firstName = (m.name || "").trim().split(/\s+/)[0] || m.name;
    let status = "sent";
    let detail: string | null = null;
    try {
      await sendWhatsApp(to, firstName);
    } catch (e) {
      status = "failed";
      detail = e instanceof Error ? e.message : String(e);
    }

    // Record the attempt; upsert so a retry can flip failed → sent.
    await admin.from("birthday_wish_log").upsert(
      { member_id: m.id, year, channel: "whatsapp", status, detail },
      { onConflict: "member_id,year,channel" }
    );
    results.push({ id: m.id, name: m.name, status, detail });
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  console.log(`[birthday] ${sent} sent, ${failed} failed, ${results.length} considered`);
  return json({ ok: true, date: `${year}-${todayMonth}-${todayDay}`, sent, failed, results });
});
