import React, { useEffect, useState } from "react";
import Reveal from "./Reveal";
import Parallax from "./Parallax";
import forest from "../assets/home/forest.jpeg";

/*
 * Featured event on the home page.
 *
 * Month is 0-indexed in the Date constructor, so 8 is September. The countdown
 * targets the first morning session; EVENT_END is the close of the second
 * evening session, after which the banner stops advertising a countdown.
 */
const EVENT_START = new Date(2026, 8, 5, 8, 0, 0); // Sat 5 Sep 2026, 08:00
const EVENT_END = new Date(2026, 8, 6, 22, 0, 0); //  Sun 6 Sep 2026, 22:00

const DATE_LABEL = "5 & 6 September 2026";
const TIME_LABEL = "8:00 AM – 1:00 PM  ·  6:00 PM – 10:00 PM";

// TODO: still the Guru Purnima form — swap for the Parayan 2026 registration
// link once it exists.
const REGISTER_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScpJBfZCT-yeI7tbTMrdOt8yPErBOmYg6PpXeb5pei02Y3TlA/viewform";

const pad = (n) => String(n).padStart(2, "0");

/*
 * Time left until the first session, split into days/hours/minutes/seconds.
 *
 * Returns null once the event is over so the timer disappears rather than
 * counting into negative numbers, and { live: true } while it is running.
 * Derived from a single millisecond delta so the four figures can never
 * disagree with each other mid-tick.
 */
function timeLeft(now) {
  if (now >= EVENT_END) return null;
  if (now >= EVENT_START) return { live: true };

  const ms = EVENT_START - now;
  return {
    live: false,
    days: Math.floor(ms / 86400000),
    hours: Math.floor(ms / 3600000) % 24,
    minutes: Math.floor(ms / 60000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

const Banner = () => {
  const [left, setLeft] = useState(() => timeLeft(new Date()));

  useEffect(() => {
    const id = setInterval(() => setLeft(timeLeft(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const units = left && !left.live
    ? [
        { value: left.days, label: left.days === 1 ? "Day" : "Days" },
        { value: left.hours, label: "Hrs" },
        { value: left.minutes, label: "Min" },
        { value: left.seconds, label: "Sec" },
      ]
    : [];

  return (
    // min-h rather than a fixed h: the section now carries dates, timings and a
    // countdown, and on a narrow phone a hard 45vh would clip them.
    <section className="relative flex min-h-[45vh] items-center overflow-hidden py-16">
      {/* Parallax background — oversized so the scroll-drift never reveals an edge */}
      <Parallax speed={0.15} className="absolute inset-0">
        <div
          className="absolute -inset-y-[30%] inset-x-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${forest})` }}
        />
      </Parallax>

      {/* Overlay */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" />

      <Reveal className="relative z-10 flex w-full flex-col items-center justify-center gap-8 px-8 text-center md:flex-row md:justify-between md:px-20 md:text-left">

        {/* Title — palette gold rather than raw Tailwind yellows, and the
            eyebrow at full strength (sand) instead of a faded off-brand tint */}
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-sand">
            Featured Event
          </p>
          <h2 className="bg-gradient-to-r from-gold via-sand to-gold bg-clip-text font-display text-5xl font-semibold text-transparent drop-shadow-lg md:text-7xl">
            Parayan
            <span className="ml-3 text-3xl md:text-5xl">2026</span>
          </h2>

          {/* <time> so the date is machine-readable; the dateTime span covers
              both days of the parayan. */}
          <time
            dateTime="2026-09-05/2026-09-06"
            className="mt-4 block text-lg font-medium text-white"
          >
            {DATE_LABEL}
          </time>
          <p className="mt-1 text-sm text-sand md:text-base">{TIME_LABEL}</p>
        </div>

        {/* Countdown + CTA */}
        <div className="flex w-full shrink-0 flex-col items-center gap-4 md:w-auto">
          {left?.live && (
            <p className="rounded-full border border-gold/40 bg-black/40 px-5 py-2 text-sm font-semibold uppercase tracking-wider text-sand">
              Happening now
            </p>
          )}

          {units.length > 0 && (
            <>
              {/* A figure that changes every second is unusable read aloud, so
                  the boxes are hidden from assistive tech and this static line
                  carries the same information at a sane granularity. It has no
                  aria-live, so it is only read when the region is reached. */}
              <p className="sr-only">
                {units[0].value} days and {units[1].value} hours until the
                parayan begins.
              </p>

              {/* grid-cols-4 gives four equal minmax(0, 1fr) tracks, so the row
                  can never push past the container even at 320px. tabular-nums
                  stops the digits jittering the boxes as they tick. The md width
                  is explicit because this column is w-auto from md up, and a
                  bare w-full would collapse the grid to min-content there. */}
              <div
                aria-hidden="true"
                className="grid w-full max-w-[300px] grid-cols-4 gap-2 md:w-[300px]"
              >
                {units.map((u) => (
                  <div
                    key={u.label}
                    className="rounded-xl border border-gold/40 bg-black/40 px-1 py-2 text-center backdrop-blur-sm"
                  >
                    <span className="block font-display text-2xl font-semibold tabular-nums leading-none text-white md:text-3xl">
                      {pad(u.value)}
                    </span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-sand">
                      {u.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          <a
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Register Now →
          </a>
        </div>
      </Reveal>
    </section>
  );
};

export default Banner;
