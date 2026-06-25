import React, { useEffect, useRef, useState } from "react";

/**
 * Translates its children vertically as the page scrolls, for a parallax
 * depth effect. The offset is proportional to how far the element's centre is
 * from the viewport centre, so layers with different `speed` values drift at
 * different rates. Disabled for reduced-motion. rAF-throttled.
 *
 * Props:
 *   speed     - drift factor; positive recedes (moves with scroll, slower),
 *               negative moves opposite. ~0.1–0.3 is subtle (default 0.2).
 *   className - classes for the wrapper.
 */
export default function Parallax({
  children,
  speed = 0.2,
  className = "",
  ...rest
}) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      setOffset((elementCenter - viewportCenter) * -speed);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <div
      ref={ref}
      style={{ transform: `translate3d(0, ${offset.toFixed(1)}px, 0)` }}
      className={`will-change-transform ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
