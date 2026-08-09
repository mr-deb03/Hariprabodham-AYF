import React, { useCallback, useEffect, useState } from "react";
import Reveal from "./Reveal";
import Parallax from "./Parallax";
import EventRegistrationForm from "./EventRegistrationForm";
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
const SESSIONS = [
  { name: "Morning", time: "8:00 AM – 1:00 PM" },
  { name: "Evening", time: "6:00 PM – 10:00 PM" },
];

// EVENT_SLUG is the key registrations are stored and de-duplicated against, so
// it must stay stable for the life of the event — renaming it would let anyone
// already registered sign up a second time. EVENT_NAME is only the label.
const EVENT_SLUG = "parayan-2026";
const EVENT_NAME = "Parayan 2026";

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

/* Hairline rule with a centred diamond — the section divider used on temple
   invitations, and the one piece of ornament the banner gets. */
function Flourish({ className = "" }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3 ${className}`}>
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/70 md:w-14" />
      <span className="text-[10px] leading-none text-gold">&#10022;</span>
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/70 md:w-14" />
    </div>
  );
}

/*
 * The ticking clock owns its own state.
 *
 * It used to live in Banner, which meant the whole banner — including the
 * registration dialog rendered alongside it — re-rendered once a second while
 * someone was filling the form in. Keeping the interval down here means Banner
 * only re-renders when the dialog opens or closes.
 */
function Countdown() {
  const [left, setLeft] = useState(() => timeLeft(new Date()));

  useEffect(() => {
    const id = setInterval(() => setLeft(timeLeft(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  if (!left) return null;

  if (left.live) {
    return (
      <p className="w-full rounded-2xl border border-gold/40 bg-black/50 px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-sand backdrop-blur-sm">
        Happening now
      </p>
    );
  }

  const units = [
    { value: left.days, label: left.days === 1 ? "Day" : "Days" },
    { value: left.hours, label: "Hrs" },
    { value: left.minutes, label: "Min" },
    { value: left.seconds, label: "Sec" },
  ];

  return (
    <>
      {/* A figure that changes every second is unusable read aloud, so the
          boxes are hidden from assistive tech and this static line carries the
          same information at a sane granularity. It has no aria-live, so it is
          only read when the region is reached. */}
      <p className="sr-only">
        {units[0].value} days and {units[1].value} hours until the parayan
        begins.
      </p>

      {/* grid-cols-4 gives four equal minmax(0, 1fr) tracks, so the row can
          never push past the container even at 320px. tabular-nums stops the
          digits jittering the boxes as they tick. */}
      <div aria-hidden="true" className="grid w-full grid-cols-4 gap-2 sm:gap-3">
        {units.map((u) => (
          <div
            key={u.label}
            className="rounded-2xl border border-gold/30 bg-black/50 px-1 py-3 text-center shadow-soft backdrop-blur-sm"
          >
            <span className="block font-display text-3xl font-semibold tabular-nums leading-none text-white sm:text-4xl">
              {pad(u.value)}
            </span>
            <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-gold">
              {u.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

const Banner = () => {
  const [registerOpen, setRegisterOpen] = useState(false);

  // Stable identity, so opening the dialog doesn't hand it a fresh callback
  // that could restart its effects.
  const closeRegister = useCallback(() => setRegisterOpen(false), []);

  return (
    // The dialog is a sibling of the section, not a child. The section is
    // overflow-hidden for the parallax, and while that does not clip a
    // position:fixed descendant today, it would the moment any ancestor gained
    // a transform and became its containing block.
    <>
    {/* min-h rather than a fixed h: the section carries a title, dates, session
        times, a timer and a CTA, and a hard height would clip them on a phone. */}
    <section className="relative flex min-h-[32rem] items-center overflow-hidden py-20 md:min-h-[34rem]">
      {/* Parallax background — oversized so the scroll-drift never reveals an edge */}
      <Parallax speed={0.15} className="absolute inset-0">
        <div
          className="absolute -inset-y-[30%] inset-x-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${forest})` }}
        />
      </Parallax>

      {/* Directional scrim rather than a flat wash: on desktop the copy sits
          left, so the dark end follows it and the photograph stays readable on
          the right. Stacked layouts get an even veil instead. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/80 md:bg-gradient-to-r md:from-black/85 md:via-black/65 md:to-black/40"
      />

      <Reveal className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-6 text-center md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:text-left">

        {/* ── Event identity ── */}
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-gold md:text-xs">
            Featured Event
          </p>

          {/* Cormorant at display size; the gradient runs sand → gold →
              goldDark so the letterforms read as struck metal rather than flat
              yellow, and leading-[0.9] keeps the ascenders from opening a gap
              above the word.

              The md step holds at 7xl rather than following the ramp: md is
              where the two-column layout starts, so the text column is at its
              narrowest there and 8xl left only ~12px of headroom — enough to
              wrap if Cormorant fails to load and the wider Georgia fallback
              substitutes. */}
          <h2 className="mt-3 bg-gradient-to-br from-sand via-gold to-goldDark bg-clip-text font-display text-[4.25rem] font-semibold leading-[0.9] text-transparent drop-shadow-lg sm:text-7xl md:text-7xl lg:text-8xl xl:text-9xl">
            Parayan
          </h2>
          <p className="mt-1 font-display text-3xl font-medium tracking-[0.35em] text-gold/90 md:text-4xl">
            2026
          </p>

          <Flourish className="mx-auto mt-6 w-fit md:mx-0" />

          <time
            dateTime="2026-09-05/2026-09-06"
            className="mt-6 block font-display text-2xl font-medium text-white md:text-3xl"
          >
            {DATE_LABEL}
          </time>

          {/* Two sessions, two pills — a single run-on line of four timestamps
              was the hardest thing on the banner to parse at a glance. */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            {SESSIONS.map((s) => (
              <span
                key={s.name}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur-sm"
              >
                <span className="font-semibold text-sand">{s.name}</span>
                <span className="mx-1.5 text-white/40">·</span>
                {s.time}
              </span>
            ))}
          </div>
        </div>

        {/* ── Countdown + CTA ── */}
        <div className="flex w-full max-w-[340px] shrink-0 flex-col items-center gap-5 md:w-[340px]">
          <Countdown />

          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="btn-primary w-full"
          >
            Register Now →
          </button>
        </div>
      </Reveal>
    </section>

    <EventRegistrationForm
      eventSlug={EVENT_SLUG}
      eventName={EVENT_NAME}
      open={registerOpen}
      onClose={closeRegister}
    />
    </>
  );
};

export default Banner;
