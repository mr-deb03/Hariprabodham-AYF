import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import PageHeader from "../components/PageHeader";
import EventGalleries from "../components/EventGalleries";
import Reveal from "../components/Reveal";
import {
  GANESH_UTSAV_PATH,
  POSTER_HEIGHT,
  POSTER_WIDTH,
  ganeshUtsav,
  isSubmissionOpen,
} from "../data/ganeshUtsav2026";

/*
 * Upcoming competition, above the past-event galleries.
 *
 * The site-wide popup can be dismissed, so this is the way back to the event
 * page afterwards. Like the popup, it drops off once submissions close.
 */
function UpcomingHighlight() {
  if (!isSubmissionOpen()) return null;

  return (
    <section className="bg-softGray px-6 py-14 md:px-12">
      <Reveal className="mx-auto max-w-6xl">
        <Link
          to={GANESH_UTSAV_PATH}
          className="group grid items-center gap-6 rounded-3xl bg-white p-5 shadow-card transition-shadow duration-300 hover:shadow-2xl sm:grid-cols-[9rem_minmax(0,1fr)] md:grid-cols-[11rem_minmax(0,1fr)_auto] md:gap-8 md:p-6"
        >
          {/* Not lazy: this sits directly under the page header, above the
              fold, where lazy-loading only delays the one image in view. */}
          <img
            src={ganeshUtsav.poster}
            alt=""
            width={POSTER_WIDTH}
            height={POSTER_HEIGHT}
            decoding="async"
            className="mx-auto block h-auto w-36 rounded-2xl shadow-soft sm:w-full"
          />
          <div lang="hi" className="text-center sm:text-left">
            <p lang="en" className="eyebrow mb-2">
              Upcoming · Entries close {ganeshUtsav.deadlineLabelEn}
            </p>
            <h2 className="font-display text-3xl font-semibold text-maroon md:text-4xl">
              {ganeshUtsav.title}
            </h2>
            <p className="mt-2 text-lg text-textSoft">{ganeshUtsav.subtitle}</p>
          </div>
          <span className="btn-primary justify-self-center sm:col-span-2 md:col-span-1 md:justify-self-end">
            View details
            <FaArrowRight aria-hidden="true" />
          </span>
        </Link>
      </Reveal>
    </section>
  );
}

export default function EventsPage() {
  return (
    <>
      <PageHeader
        title="Events"
        subtitle="Photos and highlights from our gatherings, festivals and seva activities."
        current="Events"
      />
      <UpcomingHighlight />
      <EventGalleries />
    </>
  );
}
