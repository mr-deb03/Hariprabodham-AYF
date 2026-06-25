import React, { useEffect, useState } from "react";

/**
 * Simple crossfading photo carousel — auto-advances, no controls or indicators
 * (matches the hero style). Give it a sized wrapper via `className` (e.g. an
 * aspect ratio); the images fill it with object-cover and crossfade.
 *
 * Props:
 *   images   - array of image srcs
 *   alt      - alt text applied to each slide
 *   interval - ms between slides (default 4000)
 *   className- classes for the (relatively-positioned) wrapper
 */
export default function PhotoCarousel({
  images,
  alt = "",
  interval = 4000,
  className = "",
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % images.length),
      interval
    );
    return () => clearInterval(id);
  }, [images.length, interval]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={alt}
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          aria-hidden={i === index ? undefined : "true"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
