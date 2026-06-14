import React, { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";

/*
 * TODO: replace these figures with the foundation's real numbers.
 * Inspired by the "Divine Works" stat grid on the HariPrabodham family sites.
 */
const stats = [
  { value: 50, suffix: "+", label: "Years of Seva" },
  { value: 500, suffix: "+", label: "Youth Members" },
  { value: 30, suffix: "+", label: "Events Each Year" },
  { value: 1000, suffix: "+", label: "Lives Touched" },
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
    <section className="relative py-24 px-6 md:px-20 bg-gradient-to-br from-accent via-primaryBrown to-primaryDark text-white text-center overflow-hidden">
      <Reveal>
        <p className="tracking-[0.3em] text-xs uppercase opacity-80">
          Our Reach
        </p>
        <h2 className="mt-3 mb-16 font-display text-4xl font-semibold text-onDark md:text-5xl">
          Seva in Numbers
        </h2>
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 100}>
            <div className="text-4xl md:text-5xl font-semibold">
              <Counter value={stat.value} suffix={stat.suffix} />
            </div>
            <p className="mt-2 text-sm md:text-base opacity-80 tracking-wide">
              {stat.label}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default Stats;
