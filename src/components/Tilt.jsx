import React, { useRef } from "react";

/**
 * Interactive 3D tilt: the wrapped card rotates toward the cursor with a
 * perspective transform, giving a sense of depth. Snappy follow, smooth
 * return, and disabled for reduced-motion / touch (no mousemove).
 *
 * Props:
 *   className - classes for the tilting element (put the card styling here)
 *   max       - max rotation in degrees (default 9)
 *   lift      - hover lift in px (default 8)
 */
export default function Tilt({ children, className = "", max = 9, lift = 8 }) {
  const ref = useRef(null);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleMove = (e) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = "transform 0.08s ease-out, box-shadow 0.3s ease-out";
    el.style.transform = `perspective(1000px) rotateX(${(-py * max).toFixed(
      2
    )}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-${lift}px)`;
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.5s ease-out, box-shadow 0.3s ease-out";
    el.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`[transform-style:preserve-3d] will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}
