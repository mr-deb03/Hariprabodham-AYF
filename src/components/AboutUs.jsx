import React from "react";
import { FaBullseye, FaEye } from "react-icons/fa";
import Reveal from "./Reveal";
import aboutImage from "../assets/about_1.png";

/*
 * Content modelled on the Hariprabodham Parivar "About Us" page
 * (home.ydscanada.org/about-us.html), adapted to the Bhandup youth foundation.
 * TODO: have the team verify all wording before publishing.
 */

const AboutUs = () => {
  return (
    <>
      {/* WHO WE ARE */}
      <section className="bg-white py-24 px-6 md:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal variant="left">
            <p className="eyebrow mb-4">Who We Are</p>
            <h2 className="mb-6 text-3xl font-medium leading-tight text-primaryBrown md:text-4xl">
              The Hariprabodham Parivar
            </h2>
            <p className="mb-4 text-lg leading-relaxed text-gray-600">
              HariPrabodham Atmiya Youth Foundation, Bhandup is part of the global
              Hariprabodham Parivar &mdash; created through the vision and
              blessings of His Divine Holiness Guruhari Hariprasad Swamiji
              Maharaj, and guided today by His Divine Holiness Pragat Guruhari
              Prabodh Swamiji Maharaj.
            </p>
            <p className="text-lg leading-relaxed text-gray-600">
              Comprised entirely of devoted volunteers, we endeavour to uplift
              the individual, the family and society through positive living and
              spirituality &mdash; rooted in faith in Bhagwan Shree Swaminarayan.
            </p>
          </Reveal>

          <Reveal variant="right" delay={150} className="flex justify-center lg:justify-end">
            <div className="overflow-hidden rounded-3xl shadow-2xl">
              <img
                src={aboutImage}
                alt="HariPrabodham community gathering"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* SUHRADBHAV PHILOSOPHY */}
      <section className="bg-gradient-to-br from-accent via-primaryBrown to-primaryDark py-20 px-6 md:px-12 text-white">
        <Reveal className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-gold/90">
            Our Guiding Spirit
          </p>
          <h3 className="mb-6 font-display text-4xl text-onDark md:text-5xl">
            Suhradbhav
          </h3>
          <p className="text-lg italic leading-relaxed text-white/90 md:text-xl">
            &ldquo;Regardless of any shortcomings perceived in another, we seek
            only their virtues &mdash; accepting everyone wholeheartedly and
            finding joy in every situation.&rdquo;
          </p>
        </Reveal>
      </section>

      {/* MISSION & VISION */}
      <section className="bg-softGray py-24 px-6 md:px-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
          <Reveal variant="left" className="rounded-2xl bg-white p-10 shadow-sm">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primaryBrown/10 text-2xl text-primaryBrown">
              <FaBullseye />
            </div>
            <h3 className="mb-3 text-2xl font-semibold text-primaryBrown">
              Our Mission
            </h3>
            <p className="leading-relaxed text-gray-600">
              To serve the individual, family, society and environment with a
              wide range of humanitarian and spiritual activities, based on our
              deep-rooted faith in Bhagwan Shree Swaminarayan, to enable the
              highest quality of life.
            </p>
          </Reveal>

          <Reveal variant="right" delay={150} className="rounded-2xl bg-white p-10 shadow-sm">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primaryBrown/10 text-2xl text-primaryBrown">
              <FaEye />
            </div>
            <h3 className="mb-3 text-2xl font-semibold text-primaryBrown">
              Our Vision
            </h3>
            <p className="leading-relaxed text-gray-600">
              To serve society through spiritual services, cultural training and
              human services such as healthcare and education on a secular basis
              &mdash; promoting community development, family values, literacy,
              good health and self-sufficiency, and enabling a happy, peaceful
              and harmonious life.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
};

export default AboutUs;
