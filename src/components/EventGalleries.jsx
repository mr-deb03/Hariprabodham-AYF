import React from "react";
import { Link } from "react-router-dom";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import Tilt from "./Tilt";
import events, { formatEventDate } from "../data/events";

/* Photo galleries of past events. Each card links to /events/:slug where all
 * the photos for that event are shown. Driven by the folders in assets/events.
 *
 * The most recent event leads at full width; the rest follow in a grid. A flat
 * grid gave every gathering identical weight, so nothing drew the eye and the
 * newest album was as buried as the oldest. */

function DateBadge({ date }) {
  if (!date) return null;
  return (
    <span className="absolute left-4 top-4 rounded-full bg-maroon px-3 py-1 text-xs font-medium text-white shadow">
      {formatEventDate(date)}
    </span>
  );
}

function PhotoCount({ count }) {
  return (
    <span className="shrink-0 text-sm text-textSoft">
      {count} {count === 1 ? "photo" : "photos"}{" "}
      <span aria-hidden="true">&rarr;</span>
    </span>
  );
}

export default function EventGalleries() {
  if (!events.length) return null;

  const [featured, ...rest] = events;

  return (
    <section className="bg-white section">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Gallery"
          title="Event Galleries"
          lede="Relive the moments — tap an event to see all its photos."
          className="mb-12"
        />

        {/* FEATURED */}
        <Reveal className="group mb-10 block">
          <Link to={`/events/${featured.slug}`} className="block">
            <Tilt className="overflow-hidden rounded-3xl bg-white shadow-card transition-shadow duration-300 hover:shadow-2xl">
              <div className="relative aspect-[16/7] overflow-hidden">
                <img
                  src={featured.thumbnail}
                  alt={featured.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <DateBadge date={featured.date} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 p-6 md:p-8">
                <div>
                  <p className="eyebrow mb-1">Most recent</p>
                  <h3 className="font-display text-2xl font-semibold text-maroon md:text-3xl">
                    {featured.title}
                  </h3>
                </div>
                <PhotoCount count={featured.images.length} />
              </div>
            </Tilt>
          </Link>
        </Reveal>

        {/* THE REST */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((ev, i) => (
              <Reveal
                key={ev.slug}
                variant="flip"
                delay={i * 100}
                className="group h-full"
              >
                <Link to={`/events/${ev.slug}`} className="block h-full">
                  <Tilt className="h-full overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl">
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={ev.thumbnail}
                        alt={ev.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <DateBadge date={ev.date} />
                    </div>
                    <div className="flex items-center justify-between gap-3 p-5">
                      <h3 className="font-display text-lg font-medium tracking-wide text-maroon">
                        {ev.title}
                      </h3>
                      <PhotoCount count={ev.images.length} />
                    </div>
                  </Tilt>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
