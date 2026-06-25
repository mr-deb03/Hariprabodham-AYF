import React, { useState } from "react";
import Reveal from "./Reveal";
import Tilt from "./Tilt";
import swaminarayanImg from "../assets/parampara/swaminarayan-bhagwan.webp";
import gunatitanandImg from "../assets/parampara/gunatitanand-swami.webp";
import shastrijiImg from "../assets/parampara/shastriji-maharaj.webp";
import yogijiImg from "../assets/parampara/yogiji-maharaj.webp";
import hariprasadImg from "../assets/parampara/hariprasad-swamiji.webp";
import prabodhImg from "../assets/parampara/prabodh-swamiji.webp";

/*
 * Guru lineage modelled on the Yogi Divine Society "Parampara" page.
 * When `image` is null an elegant placeholder portrait is shown instead.
 *
 * TODO: have the team verify dates, spellings and biographies before publishing.
 */
const lineage = [
  {
    name: "Bhagwan Shree Swaminarayan",
    short: "Swaminarayan Bhagwan",
    initials: "ॐ",
    era: "1781 – 1830 A.D.",
    birthName: "Ghanshyam Maharaj",
    birthplace: "Chhapaiya, Uttar Pradesh",
    image: swaminarayanImg,
    bio: "Initiated 500 monks at the age of 21, ended practices such as sati and infanticide, authored the first Gujarati prose in the Shikshapatri and Vachanamrut, established worship spaces open to all, and propagated the Vishishtadvaita philosophy and Nishkaam Dharma.",
  },
  {
    name: "Mool Aksharmurti Gunatitanand Swamiji",
    short: "Gunatitanand Swami",
    initials: "GS",
    era: "1785 – 1867 A.D.",
    birthName: "Mulji Sharma",
    birthplace: "Bhadra, Gujarat",
    image: gunatitanandImg,
    thumbY: "-16%",
    bio: "The first spiritual successor and manifestation of Brahman. He embodied service and devotion, built the Junagadh temple, and revealed the principle of Sakaar Brahman.",
  },
  {
    name: "Brahmaswaroop Shastriji Maharaj",
    short: "Shastriji Maharaj",
    initials: "SM",
    era: "1865 – 1951 A.D.",
    birthName: "Dungar Bhagat",
    birthplace: "Mahelav, Gujarat",
    image: shastrijiImg,
    bio: "The third successor, who propagated the worship of Shri Akshar-Purushottam and built five pinnacled temples, remaining resolute through years of societal contempt.",
  },
  {
    name: "Brahmaswaroop Yogiji Maharaj",
    short: "Yogiji Maharaj",
    initials: "YM",
    era: "1892 – 1971 A.D.",
    birthName: "Jinabhai",
    birthplace: "Dhari, Saurashtra",
    image: yogijiImg,
    bio: "The fourth successor, who initiated 51 educated youths as sadhus, spread the fellowship internationally, exemplified humility, and nurtured the principles of Samp, Suhradbhav and Ekta.",
  },
  {
    name: "His Divine Holiness Hariprasad Swamiji Maharaj",
    short: "Hariprasad Swamiji",
    initials: "HS",
    era: "1934 – 2021 A.D.",
    birthName: "Prabhudasbhai",
    birthplace: "Asoj, Gujarat",
    image: hariprasadImg,
    thumbX: "8%",
    bio: "The fifth successor, who founded the Yogi Divine Society and championed Atmiyata — spiritual affinity. Renowned as one of the most secular saints of the modern age, he inspired thousands of devoted youths.",
  },
  {
    name: "His Divine Holiness Pragat Guruhari Prabodh Swamiji Maharaj",
    short: "Prabodh Swamiji",
    initials: "PS",
    era: "1953 A.D. – Present",
    birthName: "Narotambhai Patel",
    birthplace: "Vanthali, Saurashtra",
    image: prabodhImg,
    bio: "The sixth successor and current spiritual guru. Ordained at the age of 18, he has authored nine books, composed 'Kariye Smruti Na Gaan', and emphasises empowering youth toward spiritually balanced, addiction-free lives.",
  },
];

function Portrait({ guru, big = false }) {
  if (guru.image) {
    if (big) {
      return (
        <img
          src={guru.image}
          alt={guru.name}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      );
    }
    // Thumbnail: zoom + per-guru nudge so each face is framed nicely.
    const tx = guru.thumbX || "0%";
    const ty = guru.thumbY || "0%";
    return (
      <img
        src={guru.image}
        alt={guru.name}
        loading="lazy"
        className="h-full w-full origin-top object-cover object-top"
        style={{ transform: `scale(1.6) translate(${tx}, ${ty})` }}
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#a86a4d] to-primaryBrown font-serif text-white">
      <span className={big ? "text-6xl md:text-7xl" : "text-lg"}>
        {guru.initials}
      </span>
    </div>
  );
}

export default function ParamparaLineage() {
  const [active, setActive] = useState(0);
  const guru = lineage[active];
  const go = (dir) =>
    setActive((a) => (a + dir + lineage.length) % lineage.length);

  return (
    <section className="relative overflow-hidden bg-softGray py-20 px-6 md:px-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primaryBrown/5" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-primaryBrown/5" />

      <div className="relative mx-auto max-w-6xl">
        <Reveal className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-gray-600">
            Bhagwan Swaminarayan manifested over two hundred years ago to
            establish a community dedicated to spiritual growth, selfless
            service, and interfaith harmony. That divine light continues today
            through an unbroken lineage of Gunatit gurus.
          </p>
        </Reveal>

        {/* PORTRAIT TABS */}
        <div className="mb-12 flex gap-6 overflow-x-auto px-2 py-4 md:justify-center">
          {lineage.map((g, i) => (
            <button
              key={g.name}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`flex shrink-0 flex-col items-center gap-2 transition-all duration-300 ${
                i === active ? "" : "opacity-60 hover:opacity-100"
              }`}
            >
              <span
                className={`block h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-softGray to-[#efe9e2] ring-offset-2 ring-offset-softGray transition-all duration-300 ${
                  i === active
                    ? "scale-110 ring-2 ring-primaryBrown"
                    : "ring-1 ring-primaryBrown/20"
                }`}
              >
                <Portrait guru={g} />
              </span>
              <span
                className={`w-24 text-center text-xs leading-tight ${
                  i === active
                    ? "font-semibold text-primaryBrown"
                    : "text-gray-500"
                }`}
              >
                {g.short}
              </span>
            </button>
          ))}
        </div>

        {/* DETAIL PANEL — re-keyed so it re-animates on every change */}
        <div
          key={active}
          className="animate-panel grid grid-cols-1 items-center gap-10 rounded-3xl bg-white p-8 shadow-lg md:grid-cols-2 md:p-12"
        >
          <Tilt className="mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-softGray to-[#efe9e2] shadow-xl">
            <Portrait guru={guru} big />
          </Tilt>

          <div>
            <span className="inline-block rounded-full bg-primaryBrown/10 px-3 py-1 text-xs font-medium text-primaryBrown">
              {guru.era}
            </span>
            <h3 className="mt-4 text-2xl font-semibold text-primaryBrown md:text-3xl">
              {guru.name}
            </h3>
            <p className="mt-2 text-sm text-mutedBlue">
              Born {guru.birthName} &middot; {guru.birthplace}
            </p>
            <p className="mt-5 leading-relaxed text-gray-600">{guru.bio}</p>

            {/* Prev / Next */}
            <div className="mt-8 flex items-center gap-4">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous guru"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-primaryBrown text-primaryBrown transition-colors duration-300 hover:bg-primaryBrown hover:text-white"
              >
                ←
              </button>
              <span className="text-sm text-gray-500">
                {active + 1} / {lineage.length}
              </span>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next guru"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-primaryBrown text-primaryBrown transition-colors duration-300 hover:bg-primaryBrown hover:text-white"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
