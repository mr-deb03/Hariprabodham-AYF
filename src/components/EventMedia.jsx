import React, { useEffect } from "react";
import { FaYoutube, FaInstagram } from "react-icons/fa";
import Reveal from "./Reveal";

/*
 * Videos & posts from our social channels, embedded on the Events page.
 *
 * To add content, just paste links into the two arrays below:
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

export default function EventMedia() {
  const hasYouTube = YOUTUBE_VIDEO_IDS.length > 0;
  const hasInstagram = INSTAGRAM_POST_URLS.length > 0;

  // Load Instagram's embed script, then render the blockquotes. When several
  // embeds are on one page IG often renders only some on the first pass, so we
  // nudge it to (re)process a few times until all of them resolve.
  useEffect(() => {
    if (!hasInstagram) return;
    const SRC = "https://www.instagram.com/embed.js";
    const process = () => window.instgrm && window.instgrm.Embeds.process();
    if (!document.querySelector(`script[src="${SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SRC;
      script.async = true;
      script.onload = process;
      document.body.appendChild(script);
    }
    const timers = [300, 1200, 3000].map((delay) => setTimeout(process, delay));
    return () => timers.forEach(clearTimeout);
  }, [hasInstagram]);

  return (
    <section className="bg-white py-20 px-6 md:px-20">
      <div className="mx-auto max-w-6xl">
        {/* YouTube */}
        <Reveal
          as="h2"
          className="mb-3 text-center text-3xl font-medium text-primaryBrown md:text-4xl"
        >
          Watch our gatherings
        </Reveal>
        <Reveal className="mb-12 text-center text-mutedBlue">
          Moments from our events, festivals and seva — straight from our YouTube
          channel.
        </Reveal>

        {hasYouTube ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {YOUTUBE_VIDEO_IDS.map((id, index) => (
              <Reveal key={id} variant="zoom" delay={index * 100}>
                <div className="aspect-video overflow-hidden rounded-2xl shadow-lg">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${id}`}
                    title={`HariPrabodham AYF video ${index + 1}`}
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
        <Reveal
          as="h2"
          className="mb-3 mt-24 text-center text-3xl font-medium text-primaryBrown md:text-4xl"
        >
          From our Instagram
        </Reveal>
        <Reveal className="mb-12 text-center text-mutedBlue">
          Follow along for reels, updates and glimpses of youth life at
          HariPrabodham.
        </Reveal>

        {hasInstagram ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {INSTAGRAM_POST_URLS.map((url, index) => (
              <Reveal key={url} variant="zoom" delay={index * 100}>
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink={url}
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
