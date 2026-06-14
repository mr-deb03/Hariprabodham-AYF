import React, { useEffect, useState } from "react";
import banner1 from "../assets/banner_3_1.png";
import banner2 from "../assets/banner_3_2.jpg";
import banner3 from "../assets/banner_3_3.png";
import banner4 from "../assets/banner_3_4.jpg";
import banner5 from "../assets/banner_3_5.png";
import banner6 from "../assets/banner_3_6.png";

// Hero slides — cycle automatically, no controls or indicators.
const slides = [banner1, banner2, banner3, banner4, banner5, banner6];
const SLIDE_INTERVAL = 5000; // ms

// Subtle floating particles (fixed positions/timing for calm, predictable motion)
const particles = [
  { left: "6%", top: "24%", size: 12, delay: "0s", dur: "10s" },
  { left: "16%", top: "68%", size: 8, delay: "1.5s", dur: "12s" },
  { left: "34%", top: "16%", size: 6, delay: "0.6s", dur: "9s" },
  { left: "52%", top: "78%", size: 10, delay: "2.2s", dur: "13s" },
  { left: "66%", top: "22%", size: 7, delay: "1s", dur: "11s" },
  { left: "78%", top: "60%", size: 14, delay: "0.3s", dur: "12s" },
  { left: "88%", top: "32%", size: 9, delay: "1.8s", dur: "10s" },
  { left: "94%", top: "74%", size: 6, delay: "2.6s", dur: "14s" },
];

export default function HeroBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="home" className="relative min-h-screen w-full overflow-hidden">
      {/* Full-bleed crossfading slides */}
      {slides.map((src, i) => (
        <img
          key={i}
          src={src}
          alt="His Divine Holiness Pragat Guruhari Prabodh Swamiji Maharaj"
          aria-hidden={i === index ? undefined : "true"}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Soft golden ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-80" />

      {/* Soft light veil at the top so the transparent navbar's maroon links stay legible */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-ivory/90 via-ivory/45 to-transparent" />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {particles.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}
      </div>
    </section>
  );
}
