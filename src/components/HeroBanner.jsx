import React, { useEffect, useState } from "react";
import banner1 from "../assets/home/banner1.webp";
import banner2 from "../assets/home/banner2.webp";
import banner3 from "../assets/home/banner3.webp";

// Hero slides — cycle automatically, no controls or indicators.
const slides = [banner1, banner2, banner3];
const SLIDE_INTERVAL = 5000; // ms

export default function HeroBanner() {
  const [index, setIndex] = useState(0);
  // Defer downloading the other slides until after first paint so the first
  // (above-the-fold) image loads first instead of competing with the rest.
  const [loadRest, setLoadRest] = useState(false);

  useEffect(() => {
    setLoadRest(true);
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="home" className="relative aspect-[16/9] w-full overflow-hidden">
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
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Soft golden ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-80" />

      {/* Soft light veil at the top (desktop only) so the transparent navbar's
          maroon links stay legible. Hidden on mobile per request. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-44 bg-gradient-to-b from-ivory/90 via-ivory/45 to-transparent md:block" />
    </section>
  );
}
