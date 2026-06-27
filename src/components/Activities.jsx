import React from "react";
import {
  FaUsers,
  FaStar,
  FaFutbol,
  FaHandsHelping,
  FaFemale,
  FaChild,
} from "react-icons/fa";
import Reveal from "./Reveal";
import Tilt from "./Tilt";

/*
 * Activity categories modelled on the Hariprabodham Parivar about page.
 * TODO: confirm which of these the Bhandup foundation actively runs.
 */
const activities = [
  {
    icon: FaUsers,
    title: "Weekly Sabha",
    text: "A platform for spiritual growth and community bonding through discourses, motivational talks, and interactive discussions.",
  },
  {
    icon: FaStar,
    title: "Cultural Festivals",
    text: "Annakut, Diwali, Ram Navmi, Hari Jayanti, Janmashtami and Guru Purnima celebrated with dramas, songs and community feasts.",
  },
  {
    icon: FaFutbol,
    title: "Sports & Wellness",
    text: "Cricket, volleyball, table tennis, chess and carrom that promote health, leadership and camaraderie.",
  },
  {
    icon: FaHandsHelping,
    title: "Community Service",
    text: "Environmental care, cleanliness drives, and food & clothing drives that keep our community connected and thriving.",
  },
  {
    icon: FaFemale,
    title: "Women's Empowerment",
    text: "Encouraging self-sufficiency and independence through social, professional and creative gatherings.",
  },
  {
    icon: FaChild,
    title: "Kids' Empowerment",
    text: "Camps, motivational games, and arts & crafts that nurture a child's imagination, creativity and confidence.",
  },
];

const Activities = () => {
  return (
    <section className="bg-white py-24 px-6 md:px-12">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-16 text-center">
          <p className="eyebrow mb-4">What We Do</p>
          <h2 className="text-3xl font-medium text-primaryBrown md:text-4xl">
            Our Activities
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {activities.map((item, index) => {
            const Icon = item.icon;
            // When the last row has exactly 2 cards, nudge them to the middle
            // two columns (cols 2-3) at desktop width instead of left-aligned.
            const trailing = activities.length % 4;
            const centered =
              trailing === 2 && index === activities.length - trailing
                ? "lg:col-start-2"
                : "";
            return (
              <Reveal
                key={item.title}
                variant="zoom"
                delay={(index % 4) * 100}
                className={`group h-full ${centered}`}
              >
                <Tilt className="h-full rounded-2xl border border-gray-100 bg-softGray p-8 shadow-sm transition-shadow duration-300 hover:shadow-xl">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primaryBrown/10 text-2xl text-primaryBrown transition-colors duration-300 group-hover:bg-primaryBrown group-hover:text-white">
                    <Icon />
                  </div>
                  <h3 className="mb-3 text-lg font-semibold text-primaryBrown">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {item.text}
                  </p>
                </Tilt>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Activities;
