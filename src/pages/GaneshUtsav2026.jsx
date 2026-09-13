import React from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarAlt,
  FaCamera,
  FaExternalLinkAlt,
  FaMapMarkerAlt,
  FaTrophy,
  FaVideo,
} from "react-icons/fa";
import PageHeader from "../components/PageHeader";
import Reveal from "../components/Reveal";
import SectionHeading from "../components/SectionHeading";
import {
  POSTER_HEIGHT,
  POSTER_WIDTH,
  ganeshUtsav,
  isSubmissionOpen,
} from "../data/ganeshUtsav2026";

/*
 * Ganesh Utsav 2026 — the page the site-wide popup lands on.
 *
 * In Hindi, to match the poster and the announcement it comes from. Eyebrows
 * stay in English on purpose: .eyebrow is uppercase with wide letter-spacing,
 * and tracking pulls Devanagari letters apart, breaking the headline stroke
 * that joins them.
 */

const COMPETITIONS = [
  {
    icon: FaVideo,
    title: "श्रेष्ठ गणेश उत्सव रील प्रतियोगिता",
    body: "दिन 1 से दिन 5 तक की विभिन्न प्रवृत्तियों के वीडियो कैप्चर करें और उन्हें जोड़कर एक रोचक, रचनात्मक एवं आकर्षक रील तैयार करें।",
    steps: ["Shoot", "Edit", "Share"],
  },
  {
    icon: FaCamera,
    title: "श्रेष्ठ गणेश उत्सव फोटोग्राफी प्रतियोगिता",
    body: "पाँचों दिनों की विभिन्न प्रवृत्तियों के खूबसूरत पल, भावनाएँ, उत्सव और भक्ति को कैप्चर करें और अपनी सर्वश्रेष्ठ तस्वीरें प्रस्तुत करें।",
    steps: ["Click", "Capture", "Inspire"],
  },
];

// As listed in the announcement, where chess and carrom follow day 2.
const DAYS = [
  { day: 1, items: ["गणेश आगमन एवं उत्सव"] },
  {
    day: 2,
    items: [
      "नैवेद्य, आरती एवं भजन संध्या",
      "मूर्ति निर्माण प्रतियोगिता",
      "शतरंज प्रतियोगिता",
      "कैरम प्रतियोगिता",
    ],
  },
  { day: 3, items: ["रक्तदान प्रवृत्ति"] },
  { day: 4, items: ["गणेश उत्सव की विभिन्न प्रवृत्तियाँ एवं समारोह"] },
  { day: 5, items: ["गणेश विसर्जन"] },
];

const FACTS = [
  { icon: FaMapMarkerAlt, label: "स्थान", value: ganeshUtsav.venue },
  {
    icon: FaCalendarAlt,
    label: "प्रस्तुति की अंतिम तिथि",
    value: ganeshUtsav.deadlineLabel,
  },
  {
    icon: FaTrophy,
    label: "पुरस्कार",
    value: "विजेताओं के लिए आकर्षक पुरस्कार!",
  },
];

function SubmitLink() {
  return (
    <a
      href={ganeshUtsav.formUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-primary"
    >
      अपनी Reel / Photos सबमिट करें
      <FaExternalLinkAlt aria-hidden="true" className="text-sm" />
      <span className="sr-only">(नए टैब में खुलता है)</span>
    </a>
  );
}

// Replaces the submit button once the deadline passes, rather than leaving a
// live link to a form that should no longer be taking entries.
function SubmissionsClosed({ onDark = false }) {
  return (
    <p
      className={`inline-block rounded-2xl px-5 py-3 font-semibold ${
        onDark ? "bg-black/25 text-onDark" : "bg-cream text-maroon"
      }`}
    >
      प्रस्तुतियाँ {ganeshUtsav.deadlineLabel} को बंद हो गईं। भाग लेने के लिए
      धन्यवाद!
    </p>
  );
}

export default function GaneshUtsav2026() {
  // Checked at render. Nobody sits on this page across midnight on the 18th,
  // and any reload after it shows the closed state — no ticking clock needed.
  const open = isSubmissionOpen();

  return (
    <div lang="hi">
      <PageHeader
        title={ganeshUtsav.title}
        subtitle={ganeshUtsav.subtitle}
        current={ganeshUtsav.title}
      />

      {/* ── Poster + essentials ── */}
      <section className="bg-white section">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14">
          <Reveal variant="zoom">
            <img
              src={ganeshUtsav.poster}
              alt={ganeshUtsav.posterAlt}
              width={POSTER_WIDTH}
              height={POSTER_HEIGHT}
              decoding="async"
              className="mx-auto block h-auto w-full max-w-sm rounded-3xl shadow-card md:max-w-none"
            />
          </Reveal>

          <Reveal className="flex flex-col gap-6">
            <div>
              <p lang="en" className="eyebrow mb-3">
                Upcoming Event
              </p>
              <h2 className="font-display text-3xl font-semibold text-maroon md:text-4xl">
                {ganeshUtsav.tagline}
              </h2>
            </div>

            <p className="text-lg text-textSoft">
              इस गणेश उत्सव में आइए, भक्ति, उमंग, ऊर्जा और खूबसूरत पलों को अपने
              कैमरे में सहेजें और हमेशा के लिए यादगार बनाएँ!
            </p>

            <dl className="divide-y divide-sand rounded-2xl border border-sand bg-ivory">
              {FACTS.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-4 px-5 py-4">
                  <Icon
                    aria-hidden="true"
                    className="mt-1.5 shrink-0 text-lg text-maroon"
                  />
                  <div>
                    <dt className="text-sm text-textMuted">{label}</dt>
                    <dd className="font-semibold text-ink">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <p className="text-textSoft">
              दिन 1 से दिन 5 तक विभिन्न प्रवृत्तियाँ {ganeshUtsav.venue} में
              आयोजित होंगी। इन प्रवृत्तियों के खूबसूरत पलों को अपनी रील एवं
              फोटोग्राफी के माध्यम से कैप्चर करें।
            </p>

            <div>{open ? <SubmitLink /> : <SubmissionsClosed />}</div>
          </Reveal>
        </div>
      </section>

      {/* ── The two competitions ── */}
      <section className="bg-softGray section">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Two Competitions"
            title="हम आपके लिए ला रहे हैं दो शानदार प्रतियोगिताएँ"
            lede="आपका कैमरा • आपकी रचनात्मकता • आपका पल"
            className="mb-12"
          />

          <div className="grid gap-8 md:grid-cols-2">
            {COMPETITIONS.map((c, i) => {
              const Icon = c.icon;
              return (
                <Reveal key={c.title} delay={i * 120} className="h-full">
                  <article className="flex h-full flex-col rounded-3xl bg-white p-7 shadow-card md:p-9">
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-maroon text-2xl text-onDark">
                        <Icon aria-hidden="true" />
                      </span>
                      <span
                        lang="en"
                        className="text-sm font-semibold uppercase tracking-[0.2em] text-bronze"
                      >
                        Competition {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-6 font-display text-2xl font-semibold text-maroon md:text-3xl">
                      {c.title}
                    </h3>
                    <p className="mt-3 flex-1 text-textSoft">{c.body}</p>
                    <p
                      lang="en"
                      className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-goldText"
                    >
                      {c.steps.join(" · ")}
                    </p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── What to capture, day by day ── */}
      <section className="bg-white section">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Day 1 – Day 5"
            title="इन पलों को कैप्चर करें"
            lede={`रील एवं फोटोग्राफी के लिए नीचे दी गई गतिविधियों के खूबसूरत पलों को कैप्चर करें, जो ${ganeshUtsav.venue} में आयोजित होंगी।`}
            className="mb-12"
          />

          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {DAYS.map((d, i) => (
              <Reveal as="li" key={d.day} delay={i * 80} className="h-full">
                <div className="h-full rounded-2xl border border-sand bg-ivory p-5">
                  <p className="inline-block rounded-full bg-maroon px-3 py-1 text-sm font-semibold text-onDark">
                    दिन {d.day}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {d.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-ink">
                        <span
                          aria-hidden="true"
                          className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Prizes, deadline, submit ── */}
      <section className="on-dark bg-gradient-to-br from-maroon to-maroonDark section text-center">
        <Reveal className="mx-auto max-w-2xl">
          <FaTrophy aria-hidden="true" className="mx-auto block text-4xl text-gold" />
          <h2 className="mt-5 font-display text-3xl font-semibold text-onDark md:text-4xl">
            विजेताओं के लिए आकर्षक पुरस्कार!
          </h2>
          <p className="mt-4 text-lg text-sand">
            प्रस्तुति की अंतिम तिथि:{" "}
            <strong className="font-semibold text-onDark">
              {ganeshUtsav.deadlineLabel}
            </strong>
          </p>

          <div className="mt-8">
            {open ? <SubmitLink /> : <SubmissionsClosed onDark />}
          </div>

          <p className="mt-12 font-display text-2xl text-sand md:text-3xl">
            गणपति बप्पा मोरया! मंगल मूर्ति मोरया!
          </p>

          <p className="mt-8 text-sm text-sand">आयोजन</p>
          <p
            lang="en"
            className="mt-1 font-display text-xl font-semibold text-onDark md:text-2xl"
          >
            Hariprabodham Atmiya Youth Foundation
          </p>

          <Link
            to="/events"
            lang="en"
            className="mt-10 inline-block text-sm font-semibold text-sand underline-offset-4 transition-colors duration-200 hover:text-onDark hover:underline"
          >
            ← All events
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
