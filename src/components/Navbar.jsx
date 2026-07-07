import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HPAYGLogo from "../assets/common/HPAYF logo.webp";

// Browse links sit centered; Karyakarta (portal login) is a distinct CTA
// button pinned to the right so it doesn't read as a crammed extra link.
const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Parampara", to: "/parampara" },
  { label: "Events", to: "/events" },
  { label: "Media", to: "/media" },
  { label: "Smruti", to: "/smruti" },
  { label: "Contact", to: "/contact" },
];
const cta = { label: "Login", to: "/portal" };

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Transparent over the banner; frosts to ivory once scrolled.
  const barClasses = scrolled
    ? "bg-ivory/95 backdrop-blur-md shadow-soft"
    : "bg-transparent";

  // Maroon links throughout; a soft ivory glow keeps them legible over the
  // home hero image, and they read cleanly on the light page banners.
  const textColor = scrolled
    ? "text-maroon"
    : "text-maroon [text-shadow:0_1px_12px_rgba(255,248,240,0.95)]";

  // Bigger logo over the hero; on scroll the bar collapses to a compact row.
  const rowHeight = scrolled ? "h-16" : "h-20 lg:h-28";
  const logoSize = scrolled ? "h-11" : "h-14 lg:h-24";

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      <div
        className={`transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${barClasses}`}
      >
        <div
          className={`relative mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10 ${rowHeight}`}
        >
          {/* LOGO — left */}
          <Link to="/" onClick={closeMenu} className="shrink-0">
            <img
              src={HPAYGLogo}
              alt="HariPrabodham home"
              className={`w-auto object-contain transition-all duration-300 ${logoSize}`}
            />
          </Link>

          {/* NAV — centered (absolute so the logo/CTA widths don't shift it) */}
          <nav
            className={`absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 text-[15px] font-semibold tracking-wide lg:flex xl:gap-8 xl:text-base ${textColor}`}
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="transition-opacity duration-200 hover:opacity-70"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* RIGHT — Karyakarta CTA (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-4">
            <Link
              to={cta.to}
              className="hidden rounded-full border border-gold/40 bg-maroon px-5 py-2 text-[15px] font-semibold tracking-wide text-ivory shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-maroonDark hover:shadow-gold lg:inline-flex xl:text-base"
            >
              {cta.label}
            </Link>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className={`text-2xl lg:hidden ${textColor}`}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="border-t border-gold/20 bg-ivory/95 backdrop-blur-md lg:hidden">
            <nav className="flex flex-col items-center gap-6 py-8 text-base font-semibold tracking-wide text-maroon">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={closeMenu}
                  className="transition-opacity duration-200 hover:opacity-70"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to={cta.to}
                onClick={closeMenu}
                className="mt-2 rounded-full border border-gold/40 bg-maroon px-7 py-2.5 text-ivory shadow-soft transition-all duration-200 hover:bg-maroonDark"
              >
                {cta.label}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
