import React from "react";
import Reveal from "./Reveal";
import forest from "../assets/forest.jpeg";

const Banner = () => {
  return (
    <section
      className="relative h-[45vh] bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${forest})` }}
    >
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
        <a href="#contact" className="btn-primary">
          Register Now →
        </a>
      </Reveal>
    </section>
  );
};

export default Banner;
