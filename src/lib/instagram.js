// Instagram feed helper — the counterpart to lib/youtube.js.
//
// Unlike YouTube there's no client-safe key: Instagram needs a long-lived
// access token, which is a secret and can't ship in the bundle. So this calls
// our own endpoint (the `instagram-feed` Supabase Edge Function) and that holds
// the token. Set in .env.local / the host's env vars:
//   REACT_APP_IG_ENDPOINT — https://<PROJECT_REF>.supabase.co/functions/v1/instagram-feed
const ENDPOINT = process.env.REACT_APP_IG_ENDPOINT;

export const instagramConfigured = Boolean(ENDPOINT);

// Latest posts as [{ id, permalink, caption, mediaType, thumbnail, timestamp }].
// Throws on a failed fetch so the caller can fall back to its curated list.
export async function fetchInstagramPosts(max = 12) {
  if (!ENDPOINT) return [];
  const sep = ENDPOINT.includes("?") ? "&" : "?";
  const res = await fetch(`${ENDPOINT}${sep}limit=${max}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Instagram feed error ${res.status}`);
  }
  return (data.posts || []).filter((p) => p && p.permalink).slice(0, max);
}
