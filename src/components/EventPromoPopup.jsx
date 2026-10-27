import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowRight, FaTimes } from "react-icons/fa";
import {
  GANESH_UTSAV_PATH,
  POSTER_HEIGHT,
  POSTER_WIDTH,
  ganeshUtsav,
  isSubmissionOpen,
} from "../data/ganeshUtsav2026";

/*
 * Site-wide popup promoting Ganesh Utsav 2026.
 *
 * Shows on every page load — a first visit, a return visit, or a refresh.
 * Once closed, or once the event page has been reached, it stays away while
 * the visitor moves around the site: following a menu link isn't a page load,
 * and reappearing on every click would get in the way. It stops appearing on
 * its own once submissions close.
 *
 * It waits for both a short delay and the poster having loaded, so a slow
 * connection never gets an empty frame that fills in a moment later.
 */

const OPEN_DELAY_MS = 1200;

// In memory rather than sessionStorage on purpose: a refresh wipes it, so the
// popup comes back. Module scope rather than component state so it holds if
// the layout remounts mid-visit, such as a trip into the portal and back.
let dismissedThisLoad = false;

// Sized from the poster's shape instead of letting the image dictate: as wide
// as fits, but capped so poster + button always fit the viewport height. dvh
// follows mobile browser bars; browsers without it get vh.
const VIEWPORT_H =
  typeof CSS !== "undefined" && CSS.supports?.("height", "100dvh")
    ? "100dvh"
    : "100vh";
const PANEL_WIDTH = `min(28rem, calc(100vw - 2rem), calc((${VIEWPORT_H} - 9rem) * ${POSTER_WIDTH} / ${POSTER_HEIGHT}))`;

export default function EventPromoPopup() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  // Focus goes back where it was on a plain close, but not when heading to the
  // event page — the old page is being replaced, and focusing into it could
  // scroll the window just as the new page mounts.
  const restoreFocusRef = useRef(true);

  const onEventPage = pathname === GANESH_UTSAV_PATH;

  useEffect(() => {
    // Already on the page it advertises — no need to point there again.
    if (onEventPage) {
      dismissedThisLoad = true;
      setOpen(false);
      return undefined;
    }
    if (dismissedThisLoad || !isSubmissionOpen()) return undefined;

    let cancelled = false;
    const posterLoaded = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      // A poster that fails to load isn't worth a popup with a hole in it.
      img.onerror = () => resolve(false);
      img.src = ganeshUtsav.poster;
    });
    const delay = new Promise((resolve) => setTimeout(resolve, OPEN_DELAY_MS));

    Promise.all([posterLoaded, delay]).then(([loaded]) => {
      if (!cancelled && loaded && !dismissedThisLoad) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [onEventPage]);

  const dismiss = useCallback(() => {
    dismissedThisLoad = true;
    setOpen(false);
  }, []);

  const goToEvent = () => {
    restoreFocusRef.current = false;
    dismissedThisLoad = true;
    setOpen(false);
    navigate(GANESH_UTSAV_PATH);
  };

  // Esc closes, Tab stays inside, the page behind doesn't scroll, and focus
  // starts on the close button.
  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    restoreFocusRef.current = true;

    const onKey = (e) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      const panel = panelRef.current;
      if (e.key !== "Tab" || !panel) return;

      // The poster is tabIndex -1 (the button below does the same job), so the
      // stops are the close button and the call to action.
      const stops = panel.querySelectorAll('button:not([tabindex="-1"])');
      if (!stops.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];

      if (!panel.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (
        restoreFocusRef.current &&
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, dismiss]);

  if (!open) return null;

  return (
    // on-dark switches the focus ring to gold; maroon would vanish against the
    // backdrop. z-[70] clears the navbar (50) and the registration dialog (60).
    <div
      className="on-dark fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"
      onMouseDown={dismiss}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="relative animate-fadeUp"
        style={{ width: PANEL_WIDTH }}
      >
        <h2 id="promo-title" className="sr-only">
          Ganesh Utsav 2026 — Best Reel and Photography Competitions. Entries
          close {ganeshUtsav.deadlineLabelEn}.
        </h2>

        {/* First in the DOM so it's the first Tab stop, though it's drawn
            over the poster's corner. */}
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute -right-3 -top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg text-ink shadow-card transition-transform duration-200 hover:scale-105"
        >
          <FaTimes aria-hidden="true" />
        </button>

        {/* The whole poster is clickable for pointer and touch users. It's
            kept out of the Tab order and the accessibility tree because the
            labelled button below does the same thing — two stops for one
            action is just noise when navigating by keyboard. */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={goToEvent}
          className="group block w-full overflow-hidden rounded-2xl shadow-2xl"
        >
          <img
            src={ganeshUtsav.poster}
            alt=""
            width={POSTER_WIDTH}
            height={POSTER_HEIGHT}
            className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </button>

        <button
          type="button"
          onClick={goToEvent}
          className="btn-primary mt-3 w-full"
        >
          View Event Details
          <FaArrowRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
