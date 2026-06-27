import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Reveal from "../components/Reveal";
import { getEventBySlug, formatEventDate } from "../data/events";

export default function EventDetail() {
  const { slug } = useParams();
  const event = getEventBySlug(slug);
  const [lightbox, setLightbox] = useState(null); // image index, or null

  const count = event ? event.images.length : 0;
  const close = () => setLightbox(null);
  const step = (dir) =>
    setLightbox((i) => (i === null ? i : (i + dir + count) % count));

  // Keyboard controls for the lightbox; lock body scroll while it's open.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowRight") setLightbox((i) => (i + 1) % count);
      else if (e.key === "ArrowLeft") setLightbox((i) => (i - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, count]);

  if (!event) {
    return (
      <>
        <PageHeader
          title="Event not found"
          subtitle="This gallery doesn't exist or has moved."
          current="Events"
        />
        <div className="bg-softGray py-24 text-center">
          <Link to="/events" className="btn-primary">
            ← Back to Events
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={event.title}
        subtitle={
          event.date
            ? `${formatEventDate(event.date)} · ${count} photos`
            : `${count} photos`
        }
        current={event.title}
      />

      <section className="bg-softGray py-16 px-6 md:px-12">
        <div className="mx-auto max-w-6xl">
          {/* Uniform photo grid — equal 4:3 tiles keep the layout tidy across
              any number of photos and mixed orientations. */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {event.images.map((src, i) => (
              <Reveal key={i} variant="zoom" delay={(i % 4) * 70}>
                <button
                  type="button"
                  onClick={() => setLightbox(i)}
                  className="group block aspect-[4/3] w-full overflow-hidden rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-primaryBrown/40"
                >
                  <img
                    src={src}
                    alt={`${event.title} ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </button>
              </Reveal>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link to="/events" className="btn-secondary">
              ← Back to Events
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute right-5 top-4 text-4xl leading-none text-white/80 transition hover:text-white"
          >
            ×
          </button>

          {count > 1 && (
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="absolute left-3 text-4xl text-white/70 transition hover:text-white md:left-8"
            >
              ‹
            </button>
          )}

          <img
            src={event.images[lightbox]}
            alt={`${event.title} ${lightbox + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />

          {count > 1 && (
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              className="absolute right-3 text-4xl text-white/70 transition hover:text-white md:right-8"
            >
              ›
            </button>
          )}

          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {lightbox + 1} / {count}
          </span>
        </div>
      )}
    </>
  );
}
