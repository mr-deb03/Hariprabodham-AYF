import React from "react";
import Reveal from "./Reveal";
import Tilt from "./Tilt";
import logo from "../assets/common/HPAYF logo.webp";
import seva from "../assets/home/seva.png";
import smruti from "../assets/home/smruti.png";
import suhradbhav from "../assets/home/suhradbhav.png";
import swadharma from "../assets/home/swadharma.png";

const pillars = [
  {
    title: "Seva",
    icon: seva,
    borderColor: "border-accent",
    description: "Selfless service with the right understanding is true Seva.",
    position: "left-10 top-10", // decorative position on large screens
  },
  {
    title: "Smruti",
    icon: smruti,
    borderColor: "border-mutedBlue",
    description: "Living in the divine memory of Swamiji every moment.",
    position: "right-10 top-10",
  },
  {
    title: "Suhradbhav",
    icon: suhradbhav,
    borderColor: "border-primaryBrown",
    description: "True spiritual bonding with others from the heart.",
    position: "left-10 bottom-10",
  },
  {
    title: "Swadharma",
    icon: swadharma,
    borderColor: "border-primaryDark",
    description: "Remaining detached from objects, situations, and people.",
    position: "right-10 bottom-10",
  },
];

function PillarCard({ pillar, className = "" }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-lg p-6 flex gap-5 items-start ${className}`}
    >
      <div
        className={`shrink-0 w-16 h-16 rounded-full border-2 ${pillar.borderColor} flex items-center justify-center`}
      >
        <img
          src={pillar.icon}
          alt={pillar.title}
          className="w-9 h-9 object-contain"
        />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-800">{pillar.title}</h3>
        <p className="text-gray-500 mt-2">{pillar.description}</p>
      </div>
    </div>
  );
}

const FourPillars = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-softGray overflow-hidden py-20 px-6">

      {/* Decorative Background Blobs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#e6d6c2] rounded-full opacity-60 pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[700px] h-[500px] bg-[#e2c9a6] rounded-full opacity-60 pointer-events-none" />

      {/* Heading */}
      <Reveal className="text-center mb-12 relative z-10">
        <p className="eyebrow">Values</p>
        <h2 className="mt-3 font-display text-4xl font-semibold text-maroon md:text-5xl">
          Our Four Akshar Pillars
        </h2>
      </Reveal>

      {/* MOBILE / TABLET: logo + stacked grid of cards */}
      <div className="lg:hidden relative z-10 w-full max-w-3xl">
        <div className="flex justify-center mb-10">
          <img
            src={logo}
            alt="HariPrabodham Logo"
            className="w-28 sm:w-32 object-contain"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 justify-items-center">
          {pillars.map((pillar, index) => (
            <Reveal
              key={pillar.title}
              variant="flip"
              delay={index * 100}
              className="w-full max-w-[420px]"
            >
              <Tilt className="w-full">
                <PillarCard pillar={pillar} className="w-full" />
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>

      {/* DESKTOP: decorative lotus layout with corner cards */}
      <Reveal className="hidden lg:flex relative w-full max-w-6xl h-[520px] items-center justify-center">

        {/* Connecting Lotus Frame */}
        <div className="absolute w-[600px] h-[600px] flex items-center justify-center opacity-60 pointer-events-none">
          <svg
            viewBox="0 0 600 600"
            className="w-full h-full"
            fill="none"
            stroke="#d6a77a"
            strokeWidth="2"
          >
            {/* Petals stop short of the centre so they do not cross the logo */}

            {/* Top Curve */}
            <path d="M300 80
                    C420 140 420 230 300 200
                    C180 230 180 140 300 80 Z" />

            {/* Bottom Curve */}
            <path d="M300 520
                    C420 460 420 370 300 400
                    C180 370 180 460 300 520 Z" />

            {/* Left Curve */}
            <path d="M80 300
                    C140 180 230 180 200 300
                    C230 420 140 420 80 300 Z" />

            {/* Right Curve */}
            <path d="M520 300
                    C460 180 370 180 400 300
                    C370 420 460 420 520 300 Z" />
          </svg>
        </div>

        {/* Center Logo */}
        <div className="absolute z-10">
          <img
            src={logo}
            alt="HariPrabodham Logo"
            className="w-40 object-contain"
          />
        </div>

        {/* Corner cards */}
        {pillars.map((pillar) => (
          <PillarCard
            key={pillar.title}
            pillar={pillar}
            className={`absolute w-[420px] ${pillar.position}`}
          />
        ))}
      </Reveal>
    </section>
  );
};

export default FourPillars;
