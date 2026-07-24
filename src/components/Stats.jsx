import React, { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

/* Figures supplied by the foundation. */
const stats = [
  { value: 30, suffix: "+", label: "Years of Seva" },
  { value: 1000, suffix: "+", label: "Youth Members" },
  { value: 15, suffix: "+", label: "Events Each Year" },
  { value: 5000, suffix: "+", label: "Lives Touched" },
];

/* Counts up from 0 to `value` the first time it scrolls into view. */
function Counter({ value, suffix = "", duration = 2000 }) {
  const ref = useRef(null);
  const startedRef = useRef(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setCount(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || startedRef.current) return;
        startedRef.current = true;

        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
          setCount(Math.round(eased * value));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.unobserve(entry.target);
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

const Stats = () => {
  return (
    <section className="panel-gradient on-dark section relative overflow-hidden text-center text-white">
      <SectionHeading
        eyebrow="Our Reach"
        title="Seva in Numbers"
        tone="dark"
        className="mb-16"
      />

      <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-12 md:grid-cols-4">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 100}>
            {/* dd before dt: the number is the visual anchor, but the label is
                what names it — so the pair is ordered for sight and reversed
                with flex-col-reverse for the accessibility tree. */}
            <div className="flex flex-col">
              <dd className="text-4xl font-semibold md:text-5xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </dd>
              {/* was opacity-80, which dropped these labels below AA on the
                  gradient's crimson end even with the scrim */}
              <dt className="mt-2 text-sm tracking-wide text-white md:text-base">
                {stat.label}
              </dt>
            </div>
          </Reveal>
        ))}
      </dl>
    </section>
  );
};

export default Stats;
