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
      <main>
        {/* Lazy-loaded pages stream in here; chrome stays put meanwhile. */}
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
