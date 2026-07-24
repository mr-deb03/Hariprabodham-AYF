import React, { useEffect, useState } from "react";
import { FaYoutube, FaInstagram } from "react-icons/fa";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import {
  fetchPlaylistVideos,
  resolveUploadsPlaylist,
  youtubeConfigured,
} from "../lib/youtube";
import { fetchInstagramPosts, instagramConfigured } from "../lib/instagram";

// When a channel + API key are configured the gallery auto-pulls the latest
// public uploads; otherwise it falls back to the hand-picked ids below.
const YT_CHANNEL = process.env.REACT_APP_YT_CHANNEL_ID;

/*
 * Videos & posts from our social channels, embedded on the Events page.
 *
 * Both sections auto-update when configured — YouTube via the Data API key,
 * Instagram via the `instagram-feed` Edge Function (see supabase/SETUP.md § 7).
 * The arrays below are the fallback shown when a feed isn't set up or is
 * temporarily unreachable, so it's worth keeping a few good ones here:
 *   - YOUTUBE_VIDEO_IDS: the 11-char id from a video URL
 *       https://www.youtube.com/watch?v=ABCDEFGHIJK  ->  "ABCDEFGHIJK"
 *       https://youtu.be/ABCDEFGHIJK                 ->  "ABCDEFGHIJK"
 *   - INSTAGRAM_POST_URLS: the full reel/post permalink
 *       https://www.instagram.com/reel/XXXXXXXXX/
 *       https://www.instagram.com/p/XXXXXXXXX/
 *
 * Leave a list empty and that section shows a "follow us" card instead.
 */
const YOUTUBE_VIDEO_IDS = [
  "UFGRd1287FA",
  "mUTqsR4eoJc",
  "Ayr0rBxX-14",
  "2tIScsxtmb4",
  "Xo6lOHsLiqk",
  "n_GyitM03XY",
];

const INSTAGRAM_POST_URLS = [
  "https://www.instagram.com/reel/DZh_Xu9qTay/",
  "https://www.instagram.com/reel/DWR2wGfivqb/",
  "https://www.instagram.com/reel/DUvSA5KEzjL/",
  "https://www.instagram.com/reel/DUiPKn1E_zZ/",
  "https://www.instagram.com/reel/DShTJeSCnFR/",
];

const YOUTUBE_CHANNEL = "https://www.youtube.com/@hariprabodhamayf";
const INSTAGRAM_PROFILE = "https://www.instagram.com/hariprabodhamayf";

function FollowCard({ href, icon: Icon, label, color }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-3 rounded-2xl bg-white p-8 text-lg font-medium text-primaryBrown shadow-lg transition hover:shadow-2xl"
    >
      <Icon className={`text-3xl ${color}`} />
      {label}
    </a>
  );
}

export default function MediaGallery() {
  // null until a fetch resolves; falls back to the curated ids on empty/error.
  const [ytFetched, setYtFetched] = useState(null);
  const [igFetched, setIgFetched] = useState(null);

  useEffect(() => {
    if (!youtubeConfigured || !YT_CHANNEL) return;
    let active = true;
    (async () => {
      try {
        const uploads = await resolveUploadsPlaylist(YT_CHANNEL);
        const items = uploads ? await fetchPlaylistVideos(uploads, 12) : [];
        if (active && items.length) setYtFetched(items);
      } catch {
        /* keep the curated fallback */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!instagramConfigured) return;
    let active = true;
    (async () => {
      try {
        const posts = await fetchInstagramPosts(9);
        if (active && posts.length) setIgFetched(posts);
      } catch {
        /* keep the curated fallback */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const ytList =
    ytFetched && ytFetched.length
      ? ytFetched
      : YOUTUBE_VIDEO_IDS.map((id) => ({ id, title: "HariPrabodham AYF video" }));

  const igList =
    igFetched && igFetched.length
      ? igFetched
      : INSTAGRAM_POST_URLS.map((permalink) => ({ id: permalink, permalink }));

  const hasYouTube = ytList.length > 0;
  const hasInstagram = igList.length > 0;

  // Re-run the embed processing whenever the post list actually changes — the
  // fetched feed swaps the blockquotes out after mount, and IG only renders
  // what was in the DOM the last time it was asked to process.
  const igKey = igList.map((p) => p.id).join(",");

  // Load Instagram's embed script, then render the blockquotes. When several
  // embeds are on one page IG often renders only some on the first pass, so we
  // nudge it to (re)process a few times until all of them resolve.
  useEffect(() => {
    if (!igKey) return;
    const SRC = "https://www.instagram.com/embed.js";
    const process = () => window.instgrm && window.instgrm.Embeds.process();
    if (!document.querySelector(`script[src="${SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SRC;
      script.async = true;
      script.onload = process;
      document.body.appendChild(script);
    } else {
      process();
    }
    const timers = [300, 1200, 3000].map((delay) => setTimeout(process, delay));
    return () => timers.forEach(clearTimeout);
  }, [igKey]);

  return (
    <section className="bg-white py-20 px-6 md:px-20">
      <div className="mx-auto max-w-6xl">
        {/* YouTube */}
        <SectionHeading
          eyebrow="Video"
          title="Watch our gatherings"
          lede="Moments from our events, festivals and seva — straight from our YouTube channel."
          className="mb-12"
        />

        {hasYouTube ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {ytList.map((v, index) => (
              <Reveal key={v.id} variant="flip" delay={index * 100}>
                <div className="aspect-video overflow-hidden rounded-2xl shadow-lg">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${v.id}`}
                    title={v.title || `HariPrabodham AYF video ${index + 1}`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <FollowCard
              href={YOUTUBE_CHANNEL}
              icon={FaYoutube}
              color="text-red-600"
              label="Watch us on YouTube"
            />
          </Reveal>
        )}

        {/* Instagram */}
        <SectionHeading
          eyebrow="Social"
          title="From our Instagram"
          lede="Follow along for reels, updates and glimpses of youth life at HariPrabodham."
          className="mb-12 mt-24"
        />

        {hasInstagram ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {igList.map((post, index) => (
              <Reveal key={post.id} variant="flip" delay={index * 100}>
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink={post.permalink}
                  data-instgrm-version="14"
                  style={{ width: "100%", margin: 0 }}
                />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <FollowCard
              href={INSTAGRAM_PROFILE}
              icon={FaInstagram}
              color="text-pink-600"
              label="Follow us on Instagram"
            />
          </Reveal>
        )}
      </div>
    </section>
  );
}
