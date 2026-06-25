import React from "react";
import Reveal from "./Reveal";
import Parallax from "./Parallax";
import forest from "../assets/home/forest.jpeg";

const Banner = () => {
  return (
    <section className="relative h-[45vh] overflow-hidden">
      {/* Parallax background — oversized so the scroll-drift never reveals an edge */}
      <Parallax speed={0.15} className="absolute inset-0">
        <div
          className="absolute -inset-y-[30%] inset-x-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${forest})` }}
        />
      </Parallax>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      <Reveal className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-8 text-center md:flex-row md:justify-between md:px-20 md:text-left">

        {/* Title */}
        <div>
          <p className="mb-2 text-sm tracking-[0.3em] text-yellow-200/90 uppercase">
            Featured Event
          </p>
          <h2 className="font-serif text-5xl font-semibold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg md:text-7xl">
            Guru Purnima
            <span className="ml-3 text-3xl md:text-5xl">2026</span>
          </h2>
        </div>

        {/* CTA */}
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLScpJBfZCT-yeI7tbTMrdOt8yPErBOmYg6PpXeb5pei02Y3TlA/viewform"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          Register Now →
        </a>
      </Reveal>
    </section>
  );
};

export default Banner;
