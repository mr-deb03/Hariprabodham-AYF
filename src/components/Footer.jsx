import React from "react";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import logo from "../assets/common/HPAYF logo.webp";
import Reveal from "./Reveal";
import {
  CENTERS as centers,
  FACEBOOK_PAGE,
  INSTAGRAM_PROFILE,
  YOUTUBE_CHANNEL,
} from "../lib/centers";

// URLs come from lib/centers so the footer and the contact page can't drift.
const socials = [
  { label: "Instagram", href: INSTAGRAM_PROFILE, icon: FaInstagram },
  { label: "YouTube", href: YOUTUBE_CHANNEL, icon: FaYoutube },
  { label: "Facebook", href: FACEBOOK_PAGE, icon: FaFacebookF },
];

const Footer = () => {
  return (
    <footer className="bg-softGray py-16 px-6 md:px-20 text-primaryBrown">
      
      <Reveal className="flex flex-col md:flex-row justify-between gap-12">

        {/* Left */}
        <div>
          <img src={logo} alt="Logo" className="w-40" />
        </div>

        {/* Middle */}
        <div className="space-y-4 max-w-md">
          <div>
            <h4 className="font-semibold">Our Weekly Assembly Centers</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {centers.map((center) => (
                <span
                  key={center}
                  className="rounded-full bg-primaryBrown/10 px-3 py-1 text-sm text-mutedBlue"
                >
                  {center}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">
              Find us on Social Media:
            </h4>

            {/* Bare icons gave these a tap area barely bigger than the glyph;
                the 44x44 box is the minimum comfortable target on touch. */}
            <div className="flex gap-2 text-xl text-primaryBrown">
              {socials.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:bg-primaryBrown/10 hover:text-maroonDark"
                >
                  <Icon aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

      </Reveal>

      <div className="text-center mt-16 text-sm text-mutedBlue">
        © 2025 HariPrabodham Atmiya Youth Foundation
      </div>
    </footer>
  );
};

export default Footer;