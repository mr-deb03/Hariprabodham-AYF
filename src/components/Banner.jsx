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

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/*
 * Counts whole calendar days, not 24-hour blocks — someone looking at this on
 * the evening of the 4th should read "Tomorrow", not "0 days to go". Returns
 * null once the event is over so the chip disappears rather than counting into
 * negative numbers.
 */
function countdownLabel(now) {
  if (now >= EVENT_END) return null;
  if (now >= EVENT_START) return "Happening now";

  const days = Math.round(
    (startOfDay(EVENT_START) - startOfDay(now)) / 86400000
  );
  if (days <= 0) return "Starts today";
  if (days === 1) return "Tomorrow";
  return `${days} days to go`;
}

const Banner = () => {
  const [countdown, setCountdown] = useState(() => countdownLabel(new Date()));

  // Hourly is plenty for a day-granularity counter, and it means a tab left
  // open overnight still rolls over to the right number.
  useEffect(() => {
    const id = setInterval(
      () => setCountdown(countdownLabel(new Date())),
      60 * 60 * 1000
    );
    return () => clearInterval(id);
  }, []);

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
        <div className="flex shrink-0 flex-col items-center gap-4">
          {countdown && (
            <p className="rounded-full border border-gold/40 bg-black/40 px-5 py-2 text-sm font-semibold uppercase tracking-wider text-sand">
              {countdown}
            </p>
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
