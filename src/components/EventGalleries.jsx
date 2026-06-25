import React from "react";
import { Link } from "react-router-dom";
import Reveal from "./Reveal";
import Tilt from "./Tilt";
import events, { formatEventDate } from "../data/events";

/* Photo galleries of past events. Each card links to /events/:slug where all
 * the photos for that event are shown. Driven by the folders in assets/events. */
export default function EventGalleries() {
  if (!events.length) return null;

  return (
    <section className="bg-white py-20 px-6 md:px-20">
      <div className="mx-auto max-w-6xl">
        <Reveal
          as="h2"
          className="mb-3 text-center text-3xl font-medium text-primaryBrown md:text-4xl"
        >
          Event Galleries
        </Reveal>
        <Reveal className="mb-12 text-center text-mutedBlue">
          Relive the moments — tap an event to see all its photos.
        </Reveal>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev, i) => (
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
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {ev.date && (
                      <span className="absolute left-4 top-4 rounded-full bg-primaryBrown px-3 py-1 text-xs font-medium text-white shadow">
                        {formatEventDate(ev.date)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 p-5">
                    <h3 className="text-lg font-medium tracking-wide text-primaryBrown">
                      {ev.title}
                    </h3>
                    <span className="shrink-0 text-sm text-mutedBlue">
                      {ev.images.length} photos →
                    </span>
                  </div>
                </Tilt>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
