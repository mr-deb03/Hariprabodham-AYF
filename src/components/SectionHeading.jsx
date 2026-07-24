import React from "react";
import Reveal from "./Reveal";

/*
 * The one way a section introduces itself: eyebrow → heading → optional lede.
 *
 * Before this, every section hand-rolled its own eyebrow ("text-sm
 * tracking-widest opacity-80" in one place, "tracking-[0.3em] text-xs uppercase
 * opacity-80" in another), and a couple skipped the <h2> altogether — which
 * left screen readers walking a broken heading outline.
 *
 * tone="dark" is for sections sitting on .panel-gradient or a photo, where the
 * bronze eyebrow would disappear. Those use `sand`, which clears AA against the
 * scrimmed gradient (5.4:1) where gold does not (3.8:1 at best).
 */
export default function SectionHeading({
  eyebrow,
  title,
  lede,
  tone = "light",
  align = "center",
  as: Heading = "h2",
  className = "",
}) {
  const dark = tone === "dark";
  const centered = align === "center";

  return (
    <Reveal
      className={`${centered ? "text-center" : "text-left"} ${className}`}
    >
      {eyebrow && (
        <p
          className={
            dark
              ? "mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-sand"
              : "eyebrow mb-4"
          }
        >
          {eyebrow}
        </p>
      )}

      <Heading
        className={`font-display text-3xl font-semibold md:text-4xl lg:text-5xl ${
          dark ? "text-onDark" : "text-maroon"
        }`}
      >
        {title}
      </Heading>

      {lede && (
        <p className={`section-lede mt-5 ${centered ? "mx-auto" : ""}`}>
          {lede}
        </p>
      )}
    </Reveal>
  );
}
