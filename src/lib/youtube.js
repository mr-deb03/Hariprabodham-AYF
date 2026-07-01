// YouTube Data API v3 helpers. The API key is referrer-restricted to the site
// domain (safe in the client, like a Maps key). Set in .env.local / Vercel:
//   REACT_APP_YT_API_KEY        — YouTube Data API v3 key
//   REACT_APP_YT_CHANNEL_ID     — channel id (UC…) or @handle, for public Media
//   REACT_APP_YT_MEMBER_PLAYLIST— unlisted "Karyakarta" playlist id, for portal
const API_KEY = process.env.REACT_APP_YT_API_KEY;
const PLAYLIST_ITEMS = "https://www.googleapis.com/youtube/v3/playlistItems";
const CHANNELS = "https://www.googleapis.com/youtube/v3/channels";

export const youtubeConfigured = Boolean(API_KEY);

// Accept either a raw playlist id or a full playlist URL (…?list=PL…).
export function parsePlaylistId(input) {
  const s = String(input || "").trim();
  const m = s.match(/[?&]list=([\w-]+)/);
  return m ? m[1] : s;
}

// A channel's uploads playlist is its id with the "UC" prefix swapped to "UU".
export function uploadsFromChannel(channelId) {
  return channelId && channelId.startsWith("UC") ? "UU" + channelId.slice(2) : "";
}

// Resolve a channel id (UC…) or @handle to its uploads playlist id.
export async function resolveUploadsPlaylist(channelIdOrHandle) {
  if (!API_KEY || !channelIdOrHandle) return "";
  const v = String(channelIdOrHandle).trim();
  const direct = uploadsFromChannel(v);
  if (direct) return direct;
  const handle = v.replace(/^@/, "");
  const url = `${CHANNELS}?part=contentDetails&forHandle=${encodeURIComponent(handle)}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const data = await res.json();
  return data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || "";
}

// Fetch videos of a playlist (uploads or any playlist) as a clean array.
// Skips removed/private placeholder items. Pages until `max` is reached.
export async function fetchPlaylistVideos(playlistId, max = 24) {
  const pid = parsePlaylistId(playlistId);
  if (!API_KEY || !pid) return [];
  const out = [];
  let pageToken = "";
  do {
    const url =
      `${PLAYLIST_ITEMS}?part=snippet,contentDetails&maxResults=50` +
      `&playlistId=${encodeURIComponent(pid)}&key=${API_KEY}` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `YouTube API error ${res.status}`);
    }
    const data = await res.json();
    (data.items || []).forEach((it) => {
      const id = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId;
      const title = it.snippet?.title || "";
      if (!id || title === "Private video" || title === "Deleted video") return;
      const t = it.snippet?.thumbnails || {};
      out.push({
        id,
        title,
        description: it.snippet?.description || "",
        thumbnail: (t.medium || t.high || t.default || {}).url || "",
        publishedAt: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || "",
      });
    });
    pageToken = data.nextPageToken || "";
  } while (pageToken && out.length < max);
  return out.slice(0, max);
}
