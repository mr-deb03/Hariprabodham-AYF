import React from "react";
import { FaBullseye, FaEye } from "react-icons/fa";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import Tilt from "./Tilt";
import PhotoCarousel from "./PhotoCarousel";
import aboutUs from "../assets/about/about-us.webp";
import aboutUs1 from "../assets/about/about-us1.webp";

/*
 * Content modelled on the Hariprabodham Parivar "About Us" page
 * (home.ydscanada.org/about-us.html), adapted to the Bhandup youth foundation.
 * TODO: have the team verify all wording before publishing.
 */

const purpose = [
  {
    icon: FaBullseye,
    title: "Our Mission",
    body: "To serve the individual, family, society and environment with a wide range of humanitarian and spiritual activities, based on our deep-rooted faith in Bhagwan Shree Swaminarayan, to enable the highest quality of life.",
  },
  {
    icon: FaEye,
    title: "Our Vision",
    body: "To serve society through spiritual services, cultural training and human services such as healthcare and education on a secular basis — promoting community development, family values, literacy, good health and self-sufficiency, and enabling a happy, peaceful and harmonious life.",
  },
];

const AboutUs = () => {
  return (
    <>
      {/* WHO WE ARE */}
      <section className="bg-white section">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Who We Are"
              title="The Hariprabodham Parivar"
              align="left"
            />
            <Reveal variant="left" className="mt-6 space-y-4">
              <p className="text-lg leading-relaxed text-textSoft">
                HariPrabodham Atmiya Youth Foundation, Bhandup is part of the
                global Hariprabodham Parivar &mdash; created through the vision
                and blessings of His Divine Holiness Guruhari Hariprasad Swamiji
                Maharaj, and guided today by His Divine Holiness Pragat Guruhari
                Prabodh Swamiji Maharaj.
              </p>
              <p className="text-lg leading-relaxed text-textSoft">
                Comprised entirely of devoted volunteers, we endeavour to uplift
                the individual, the family and society through positive living
                and spirituality &mdash; rooted in faith in Bhagwan Shree
                Swaminarayan.
              </p>
            </Reveal>
          </div>

          <Reveal variant="right" delay={150} className="flex justify-center lg:justify-end">
            <Tilt className="w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl">
              <PhotoCarousel
                images={[aboutUs, aboutUs1]}
                alt="HariPrabodham community gathering"
                className="aspect-[3/2] w-full"
              />
            </Tilt>
          </Reveal>
        </div>
      </section>

      {/* SUHRADBHAV PHILOSOPHY — .panel-gradient carries the scrim that lifts
          this off the too-light crimson end of the logo gradient. */}
      <section className="panel-gradient on-dark relative overflow-hidden px-6 py-24 md:px-12">
        <figure className="mx-auto max-w-4xl text-center">
          <SectionHeading
            eyebrow="Our Guiding Spirit"
            title="Suhradbhav"
            tone="dark"
            as="h3"
          />
          <Reveal delay={100}>
            <blockquote className="mt-6 text-lg italic leading-relaxed text-white md:text-xl">
              &ldquo;Regardless of any shortcomings perceived in another, we seek
              only their virtues &mdash; accepting everyone wholeheartedly and
              finding joy in every situation.&rdquo;
            </blockquote>
          </Reveal>
        </figure>
      </section>

      {/* MISSION & VISION */}
      <section className="bg-softGray section">
        <SectionHeading
          eyebrow="Our Purpose"
          title="What we are working towards"
          className="mb-14"
        />

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
          {purpose.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal
                key={item.title}
                variant={i === 0 ? "left" : "right"}
                delay={i * 150}
                className="h-full"
              >
                <div className="flex h-full flex-col rounded-2xl bg-white p-10 shadow-soft transition-shadow duration-300 hover:shadow-card">
                  <span
                    aria-hidden="true"
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-maroon/10 text-2xl text-maroon"
                  >
                    <Icon />
                  </span>
                  <h3 className="mb-3 font-display text-2xl font-semibold text-maroon">
                    {item.title}
                  </h3>
                  <p className="leading-relaxed text-textSoft">{item.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default AboutUs;
