import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HPAYGLogo from "../assets/common/HPAYF logo.webp";

const leftLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Parampara", to: "/parampara" },
];
const rightLinks = [
  { label: "Events", to: "/events" },
  { label: "Smruti", to: "/smruti" },
  { label: "Contact", to: "/contact" },
];

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

  const rowHeight = scrolled ? "h-16" : "h-20";
  const logoSize = scrolled ? "h-11 md:h-12" : "h-14 md:h-16";

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      <div
        className={`transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${barClasses}`}
      >
        <div
          className={`relative mx-auto flex max-w-7xl items-center px-6 md:px-10 ${rowHeight}`}
        >
          {/* LEFT */}
          <div className="flex items-center gap-8">
            <Link to="/" className="md:hidden" onClick={closeMenu}>
              <img src={HPAYGLogo} alt="HPAYG home" className="h-11 w-auto" />
            </Link>

            <nav
              className={`hidden gap-9 text-base font-semibold tracking-wide md:flex ${textColor}`}
            >
              {leftLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="transition-opacity duration-200 hover:opacity-70"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* CENTER LOGO */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 md:flex">
            <Link to="/">
              <img
                src={HPAYGLogo}
                alt="HariPrabodham"
                className={`w-auto object-contain transition-all duration-300 ${logoSize}`}
              />
            </Link>
          </div>

          {/* RIGHT */}
          <div className="ml-auto flex items-center gap-8">
            <nav
              className={`hidden gap-9 text-base font-semibold tracking-wide md:flex ${textColor}`}
            >
              {rightLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="transition-opacity duration-200 hover:opacity-70"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className={`text-2xl md:hidden ${textColor}`}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="border-t border-gold/20 bg-ivory/95 backdrop-blur-md md:hidden">
            <nav className="flex flex-col items-center gap-6 py-6 text-base font-semibold tracking-wide text-maroon">
              {[...leftLinks, ...rightLinks].map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={closeMenu}
                  className="transition-opacity duration-200 hover:opacity-70"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
