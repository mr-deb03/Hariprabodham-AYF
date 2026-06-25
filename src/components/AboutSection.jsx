import React from "react";
import aboutBg from "../assets/home/about-bg.webp";
import aboutImage from "../assets/home/about-photo.webp";
import Reveal from "./Reveal";
import Tilt from "./Tilt";

export default function AboutSection() {
  return (
    <section
      id="about"
      className="relative min-h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${aboutBg})` }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* LEFT: TEXT */}
          <Reveal variant="left" className="text-white">
            <p className="text-sm tracking-widest opacity-80 mb-6">
              ABOUT US
            </p>

            <p className="text-lg leading-relaxed text-white/90">
              <span className="font-semibold">
                HariPrabodham Atmiya Youth Foundation
              </span>{" "}
              is a Hindu spiritual and humanitarian organization founded on the principles of 
              Akshar–Purushottam Upasana. Inspired by devotion to Lord Swaminarayan, the organization 
              is dedicated to fostering spiritual awareness, moral values, and community upliftment 
              through faith, service, and unity.
              <br /><br />
              Founded in 1974 by{" "}
              <span className="font-semibold">
              His Divine Holiness Guruhari Hariprasad Swamiji
              </span>
              , HariPrabodham has expanded into a global movement with hundreds of centers across the world.
              <br /><br />
             Today, under the spiritual guidance of{" "}
              <span className="font-semibold">
                His Divine Holiness Pragat Guruhari Prabodh Swamiji Maharaj
              </span>
              , the organization continues to promote spiritual growth, cultural heritage, 
              youth empowerment, and selfless humanitarian service.
            </p>
          </Reveal>

          {/* RIGHT: IMAGE */}
          <Reveal variant="right" className="flex justify-center lg:justify-end" delay={150}>
            <Tilt className="rounded-3xl overflow-hidden shadow-2xl max-w-xl">
              <img
                src={aboutImage}
                alt="Spiritual guidance"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </Tilt>
          </Reveal>

        </div>
      </div>

      {/* Soft bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
