import React from "react";
import Reveal from "./Reveal";
import Tilt from "./Tilt";

/*
 * TODO: replace with authentic, verified quotes (and confirm attributions)
 * before publishing. These are placeholders modelled on the reference site's
 * inspirational-quote section.
 */
const quotes = [
  {
    text:
      "True service begins the moment we forget ourselves and live for the happiness of others.",
    author: "His Divine Holiness Guruhari Hariprasad Swamiji",
  },
  {
    text:
      "When the heart is filled with Atmiyata, every soul becomes our own and every act becomes worship.",
    author: "His Divine Holiness Pragat Guruhari Prabodh Swamiji Maharaj",
  },
];

const Quotes = () => {
  return (
    <section className="bg-sacred py-24 px-6 md:px-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-2">
        {quotes.map((quote, index) => (
          <Reveal
            key={quote.author}
            variant={index % 2 === 0 ? "left" : "right"}
            delay={index * 120}
            className="h-full"
          >
            <Tilt className="glass relative h-full rounded-3xl p-10 shadow-soft transition-shadow duration-300 hover:shadow-card">

              <span
                aria-hidden="true"
                className="absolute left-6 top-2 font-display text-7xl leading-none text-gold/40"
              >
                &ldquo;
              </span>
              <blockquote className="relative z-10 text-lg italic leading-relaxed text-gray-700 md:text-xl">
                {quote.text}
              </blockquote>
              <figcaption className="mt-6 text-sm font-semibold tracking-wide text-primaryBrown">
                — {quote.author}
              </figcaption>
            </Tilt>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default Quotes;
