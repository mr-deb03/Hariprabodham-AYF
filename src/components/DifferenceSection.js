import React from "react";
import img1 from "../assets/diff-1.png";
import img2 from "../assets/diff-2.png";
import img3 from "../assets/diff-3.png";
import Reveal from "./Reveal";

export default function DifferenceSection() {
  return (
    <section className="w-full bg-white py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">

        {/* SECTION HEADER */}
        <Reveal className="text-center max-w-4xl mx-auto mb-16 md:mb-32">
          <h2 className="eyebrow mb-8">HOW WE MAKE A DIFFERENCE</h2>

          <p className="text-lg md:text-xl leading-relaxed text-gray-600">
            His Divine Holiness Prabodh Swamiji Maharaj tirelessly endeavours
            to instil harmony within families, guiding them to{" "}
            <span className="font-semibold text-maroon">
              live in harmony through acceptance and selflessness.
            </span>
          </p>
        </Reveal>

        {/* ROW 1 — LEFT TEXT / RIGHT IMAGE */}
        <Reveal variant="left" className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center mb-16 md:mb-32">
          <div>
            <h3 className="text-2xl font-medium text-primaryBrown mb-4">
              Youth & Women Empowerment
            </h3>
            <p className="text-lg text-gray-500 leading-relaxed max-w-md">
              Supporting leadership, character-building, and self-confidence
              in young people and women.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <ImageCard src={img1} alt="Youth & Women Empowerment" />
          </div>
        </Reveal>

        {/* ROW 2 — LEFT IMAGE / RIGHT TEXT */}
        <Reveal variant="right" className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center mb-16 md:mb-32">
          <div className="flex justify-center lg:justify-start">
            <ImageCard src={img2} alt="Community Service" />
          </div>

          <div>
            <h3 className="text-2xl font-medium text-primaryBrown mb-4">
              Community & Family Support
            </h3>
            <p className="text-lg text-gray-500 leading-relaxed max-w-md">
              One-to-one guidance and community programs that strengthen
              families and foster unity.
            </p>
          </div>
        </Reveal>

        {/* ROW 3 — LEFT TEXT / RIGHT IMAGE */}
        <Reveal variant="left" className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div>
            <h3 className="text-2xl font-medium text-primaryBrown mb-4">
              Spiritual & Personal Development
            </h3>
            <p className="text-lg text-gray-500 leading-relaxed max-w-md">
              Daily meditation, self-reflection, and weekly assemblies
              encourage inner peace and moral growth.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <ImageCard src={img3} alt="Spiritual Development" />
          </div>
        </Reveal>

      </div>
    </section>
  );
}

/* Reusable image card */
function ImageCard({ src, alt }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-xl w-full max-w-[400px]">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
