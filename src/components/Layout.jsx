import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollManager from "./ScrollManager";

/* Shared chrome for every route: scroll handling, navbar, page, footer. */
export default function Layout() {
  return (
    <>
      <ScrollManager />
      <Navbar />
      {/* Backstop for any reveal/decoration that overshoots the right edge.
          `clip` rather than `hidden`: it contains the overflow without turning
          <main> into a scroll container, so sticky positioning and window
          scrolling still work. Scoped here rather than to a bare `main`
          selector — the portal has its own <main> and must stay scrollable. */}
      <main className="overflow-x-clip">
        {/* Lazy-loaded pages stream in here; chrome stays put meanwhile. */}
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
