import React from "react";
import img1 from "../assets/home/diff-1.webp";
import img2 from "../assets/home/diff-2.webp";
import img3 from "../assets/home/diff-3.webp";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import Tilt from "./Tilt";

/* The three rows were near-identical blocks of markup differing only in copy,
   image and side. Driving them from data matches how the rest of the site does
   it (pillars, stats, quotes) and keeps the alternating layout in one place. */
const areas = [
  {
    title: "Youth & Women Empowerment",
    body: "Supporting leadership, character-building, and self-confidence in young people and women.",
    image: img1,
    alt: "Youth and women in a leadership workshop",
  },
  {
    title: "Community & Family Support",
    body: "One-to-one guidance and community programs that strengthen families and foster unity.",
    image: img2,
    alt: "Volunteers serving the local community",
  },
  {
    title: "Spiritual & Personal Development",
    body: "Daily meditation, self-reflection, and weekly assemblies encourage inner peace and moral growth.",
    image: img3,
    alt: "Youth gathered for a weekly assembly",
  },
];

export default function DifferenceSection() {
  return (
    <section className="w-full bg-white py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        {/* The eyebrow used to BE the <h2>, which left the section with no real
            title and a heading that read as a caption. Now it's a label above a
            proper heading, with the old intro copy demoted to the lede. */}
        <SectionHeading
          eyebrow="How We Make a Difference"
          title="Harmony through acceptance and selflessness"
          lede="His Divine Holiness Prabodh Swamiji Maharaj tirelessly endeavours to instil harmony within families, guiding them to live for one another."
          className="mb-16 md:mb-28"
        />

        <div className="space-y-16 md:space-y-28">
          {areas.map((area, i) => {
            const imageFirst = i % 2 === 1; // alternate sides down the page
            return (
              <Reveal
                key={area.title}
                variant={imageFirst ? "right" : "left"}
                className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-24"
              >
                <div className={imageFirst ? "lg:order-2" : "order-2 lg:order-none"}>
                  <h3 className="mb-4 font-display text-2xl font-medium text-maroon">
                    {area.title}
                  </h3>
                  <p className="max-w-md text-lg leading-relaxed text-textSoft">
                    {area.body}
                  </p>
                </div>

                <div
                  className={`flex ${
                    imageFirst
                      ? "lg:order-1 lg:justify-start"
                      : "order-1 lg:order-none lg:justify-end"
                  }`}
                >
                  <Tilt className="w-full max-w-[400px] overflow-hidden rounded-2xl shadow-xl transition-shadow duration-300 hover:shadow-2xl">
                    <img
                      src={area.image}
                      alt={area.alt}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </Tilt>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
