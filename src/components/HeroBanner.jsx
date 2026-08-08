import React, { useEffect, useState } from "react";
import banner1 from "../assets/home/banner1.webp";
import banner2 from "../assets/home/banner2.webp";
import banner3 from "../assets/home/banner3.webp";
import banner4 from "../assets/home/banner4.webp";
import banner5 from "../assets/home/banner5.webp";
import banner6 from "../assets/home/banner6.webp";

// Hero slides — cycle automatically, no controls or indicators.
const slides = [banner1, banner2, banner3, banner4, banner5, banner6];
const SLIDE_INTERVAL = 5000; // ms

// The banners are shot to 16:9 and must never be cropped — the frame follows
// the image, not the viewport. On a portrait phone that means a short hero;
// that is the accepted trade for showing every slide whole.
const HERO_FRAME = "relative aspect-[16/9] w-full overflow-hidden";

export default function HeroBanner() {
  const [index, setIndex] = useState(0);
  // Defer downloading the other slides until after first paint so the first
  // (above-the-fold) image loads first instead of competing with the rest.
  const [loadRest, setLoadRest] = useState(false);
  // Auto-advancing content must be pausable (WCAG 2.2.2). Hovering or
  // keyboard-focusing the hero halts the cycle, and readers who asked for
  // reduced motion never get an automatic change at all — previously only the
  // crossfade honoured that setting while the slides kept moving regardless.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setLoadRest(true);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || paused) return undefined;

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <section
      id="home"
      aria-roledescription="carousel"
      aria-label="HariPrabodham highlights"
      className={HERO_FRAME}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Crossfading slides — each fills the 16:9 frame edge-to-edge. */}
      {slides.map((src, i) => (
        <img
          key={i}
          src={i === 0 || loadRest ? src : undefined}
          alt="His Divine Holiness Pragat Guruhari Prabodh Swamiji Maharaj"
          aria-hidden={i === index ? undefined : "true"}
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
            src === banner5
              ? "object-bottom origin-bottom scale-110"
              : "object-center"
          } ${i === index ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      {/* Soft golden ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-80" />

      {/* Soft light veil at the top so the transparent navbar's maroon logo and
          hamburger stay legible over whichever slide is showing. It used to be
          desktop-only, which left the mobile hamburger sitting on a busy photo
          with nothing but a text-shadow behind it. Held to 96px on mobile — the
          navbar's 80px plus a short fade — because the 16:9 hero is only ~220px
          tall on a phone and a taller veil would wash out half the image. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ivory/90 via-ivory/45 to-transparent md:h-44" />
    </section>
  );
}
