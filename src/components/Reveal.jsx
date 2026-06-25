import React, { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal wrapper: animates its children as they enter the viewport.
 * By default it re-animates every time the element scrolls back into view
 * (set `once` to animate only the first time). No library — uses IntersectionObserver.
 *
 * Props:
 *   as        - element/component to render (default "div")
 *   className - extra classes for the rendered element
 *   delay     - reveal delay in ms (handy for staggering siblings)
 *   variant   - entry animation: "up" (default), "down", "left", "right", "zoom", "fade"
 *   once      - if true, only reveal the first time (default false → repeats on scroll)
 *   amount    - how much of the element must be visible to trigger (0–1, default 0.15)
 */

// Hidden (pre-reveal) transform for each variant.
const hiddenByVariant = {
  up: "opacity-0 translate-y-[40px]",
  down: "opacity-0 -translate-y-[40px]",
  left: "opacity-0 -translate-x-[40px]",
  right: "opacity-0 translate-x-[40px]",
  zoom: "opacity-0 scale-95",
  fade: "opacity-0",
  flip: "opacity-0 [transform:perspective(1000px)_rotateX(22deg)_translateY(36px)]",
};

const VISIBLE = "opacity-100 translate-x-0 translate-y-0 scale-100";
// Variants whose revealed state needs a transform other than the default flat one.
const visibleByVariant = {
  flip: "opacity-100 [transform:perspective(1000px)_rotateX(0deg)_translateY(0px)]",
};

export default function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
  variant = "up",
  once = false,
  amount = 0.15,
  ...rest
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect users who prefer reduced motion: show immediately, no animation.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          // Re-arm so it animates again next time it scrolls into view.
          setVisible(false);
        }
      },
      {
        threshold: amount,
        // Start a touch before the element is fully in view for smoother timing.
        rootMargin: "0px 0px -8% 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, amount]);

  const hidden = hiddenByVariant[variant] || hiddenByVariant.up;
  const shown = visibleByVariant[variant] || VISIBLE;

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`transition-[transform,opacity] duration-[800ms] ease-out will-change-transform motion-reduce:transition-none ${
        visible ? shown : hidden
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
