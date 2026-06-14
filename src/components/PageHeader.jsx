import React from "react";
import { Link } from "react-router-dom";
import Reveal from "./Reveal";

/* Light, warm banner used at the top of inner pages (About, Parampara, Contact). */
export default function PageHeader({ title, subtitle, current }) {
  return (
    <section className="relative flex h-[42vh] min-h-[320px] items-center justify-center overflow-hidden bg-sacred px-6 pt-24 text-center">
      {/* Soft golden ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-70" />

      {/* Decorative warm blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gold/10" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-saffron/10" />

      <Reveal className="relative z-10">
        <h1 className="font-display text-5xl font-semibold text-maroon md:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-xl text-lg text-textSoft">{subtitle}</p>
        )}

        {/* Breadcrumb */}
        <nav className="mt-6 flex items-center justify-center gap-2 text-sm text-textSoft">
          <Link to="/" className="transition-colors hover:text-gold">
            Home
          </Link>
          <span className="text-gold">/</span>
          <span className="font-medium text-maroon">{current}</span>
        </nav>
      </Reveal>
    </section>
  );
}
