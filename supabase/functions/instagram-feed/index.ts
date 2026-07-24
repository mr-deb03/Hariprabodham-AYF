// Instagram feed — Supabase Edge Function.
//
// Why this exists at all, when YouTube needs no backend: a YouTube Data API key
// can be referrer-restricted, so it's safe in the bundle. Instagram has no such
// key — reading a feed needs a long-lived access token, which is a bearer
// secret. Anything in REACT_APP_* is readable by anyone who opens the site, so
// the token has to live here and the browser asks us instead of Meta.
//
// This also keeps the token alive. Long-lived Instagram tokens expire 60 days
// out, so a feed configured once and forgotten goes dark — exactly the failure
// this feature is meant to prevent. When the stored token is near expiry we
// refresh it and write the new one back to `instagram_token`
// (see supabase/instagram_feed.sql).
//
// Secrets (Project Settings → Edge Functions → Secrets):
//   INSTAGRAM_TOKEN       long-lived token. Seeds the table on first run; after
//                         that the stored (auto-refreshed) token wins.
//   INSTAGRAM_USER_ID     optional — defaults to "me" (Instagram Login flow).
//   INSTAGRAM_GRAPH_HOST  optional — graph.instagram.com (default, Instagram
//                         Login) or graph.facebook.com (Facebook Login flow).
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Deploy with --no-verify-jwt: this serves public data to an anonymous site.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IG_HOST = "graph.instagram.com";
const GRAPH_VERSION = "v21.0";
const FIELDS = "id,permalink,caption,media_type,media_url,thumbnail_url,timestamp";

const CACHE_TTL_MS = 15 * 60 * 1000; // Meta rate-limits; the feed isn't live data
const CACHE_SIZE = 25; // cache one generous page, then slice per request
const REFRESH_AT_DAYS_LEFT = 10;
const TOKEN_TTL_FALLBACK = 60 * 24 * 3600; // Meta's documented 60 days, in seconds

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors, ...extra },
  });

type Post = {
  id: string;
  permalink: string;
  caption: string;
  mediaType: string;
  thumbnail: string;
  timestamp: string;
};

function db() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return url && key ? createClient(url, key) : null;
}

// Read the stored token, seeding the table from INSTAGRAM_TOKEN the first time.
// Falls back to the bare secret when the table doesn't exist — the feed works
// straight away, it just won't auto-refresh until instagram_feed.sql is run.
async function loadToken(admin: ReturnType<typeof db>) {
  const seed = Deno.env.get("INSTAGRAM_TOKEN") ?? "";
  if (!admin) return { token: seed, expiresAt: null as string | null, stored: false };

  const { data, error } = await admin
    .from("instagram_token")
    .select("access_token, expires_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.log("[instagram] token table unavailable:", error.message);
    return { token: seed, expiresAt: null, stored: false };
  }
  if (data?.access_token) {
    return { token: data.access_token, expiresAt: data.expires_at, stored: true };
  }
  if (!seed) return { token: "", expiresAt: null, stored: false };

  await admin.from("instagram_token").upsert({ id: 1, access_token: seed });
  console.log("[instagram] seeded token table from INSTAGRAM_TOKEN");
  // expires_at null → the next step refreshes and learns the real expiry.
  return { token: seed, expiresAt: null, stored: true };
}

async function refreshIfNeeded(
  admin: ReturnType<typeof db>,
  host: string,
  tok: { token: string; expiresAt: string | null; stored: boolean }
) {
  // Only Instagram-Login tokens refresh this way. Facebook-Login setups use a
  // System User token that doesn't expire, so there's nothing to do.
  if (!admin || !tok.stored || !tok.token || host !== IG_HOST) return tok.token;

  if (tok.expiresAt) {
    const daysLeft = (new Date(tok.expiresAt).getTime() - Date.now()) / 86_400_000;
    if (daysLeft > REFRESH_AT_DAYS_LEFT) return tok.token;
  }

  try {
    const res = await fetch(
      `https://${IG_HOST}/refresh_access_token?grant_type=ig_refresh_token` +
        `&access_token=${encodeURIComponent(tok.token)}`
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.access_token) {
      throw new Error(body?.error?.message || `HTTP ${res.status}`);
    }
    const expiresAt = new Date(
      Date.now() + (body.expires_in ?? TOKEN_TTL_FALLBACK) * 1000
    ).toISOString();
    await admin.from("instagram_token").upsert({
      id: 1,
      access_token: body.access_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
    console.log(`[instagram] token refreshed, now expires ${expiresAt}`);
    return body.access_token as string;
  } catch (e) {
    // Meta refuses to refresh a token younger than 24h — that's expected right
    // after setup. Keep using the current one; it's still valid for weeks.
    console.log("[instagram] token refresh skipped:", e instanceof Error ? e.message : e);
    return tok.token;
  }
}

async function fetchMedia(host: string, userId: string, token: string): Promise<Post[]> {
  // graph.instagram.com is unversioned; graph.facebook.com needs the version.
  const base =
    host === IG_HOST
      ? `https://${host}/${userId}/media`
      : `https://${host}/${GRAPH_VERSION}/${userId}/media`;

  const res = await fetch(
    `${base}?fields=${FIELDS}&limit=${CACHE_SIZE}&access_token=${encodeURIComponent(token)}`
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `Instagram HTTP ${res.status}`);
  }
  return (body.data ?? [])
    .filter((m: Record<string, string>) => m?.permalink)
    .map((m: Record<string, string>) => ({
      id: m.id,
      permalink: m.permalink,
      caption: m.caption ?? "",
      mediaType: m.media_type ?? "",
      thumbnail: m.thumbnail_url || m.media_url || "",
      timestamp: m.timestamp ?? "",
    }));
}

let cache: { at: number; posts: Post[] } | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ ok: false, error: "GET only" }, 405);
  }

  const url = new URL(req.url);
  const asked = parseInt(url.searchParams.get("limit") ?? "12", 10);
  const limit = Math.min(Math.max(Number.isFinite(asked) ? asked : 12, 1), CACHE_SIZE);
  const force = url.searchParams.get("refresh") === "1";

  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return json({ ok: true, cached: true, posts: cache.posts.slice(0, limit) }, 200, {
      "Cache-Control": "public, max-age=900",
    });
  }

  const admin = db();
  const tok = await loadToken(admin);
  if (!tok.token) {
    return json(
      { ok: false, error: "Instagram is not configured — set the INSTAGRAM_TOKEN secret." },
      503
    );
  }

  const host = Deno.env.get("INSTAGRAM_GRAPH_HOST") || IG_HOST;
  const userId = Deno.env.get("INSTAGRAM_USER_ID") || "me";
  const token = await refreshIfNeeded(admin, host, tok);

  try {
    const posts = await fetchMedia(host, userId, token);
    cache = { at: Date.now(), posts };
    console.log(`[instagram] fetched ${posts.length} post(s)`);
    return json({ ok: true, cached: false, posts: posts.slice(0, limit) }, 200, {
      "Cache-Control": "public, max-age=900",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log("[instagram] fetch failed:", message);
    // Serve stale rather than nothing — a expired-token blip shouldn't blank
    // the site's feed while someone re-authorises.
    if (cache) {
      return json({ ok: true, cached: true, stale: true, posts: cache.posts.slice(0, limit) });
    }
    return json({ ok: false, error: message }, 502);
  }
});
