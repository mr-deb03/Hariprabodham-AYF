import React from "react";
import { FaFacebookF, FaInstagram, FaYoutube, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import logo from "../assets/HPAYF logo.png";
import Reveal from "./Reveal";

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
            <h4 className="font-semibold">Weekly Assembly:</h4>
            <p className="text-mutedBlue">
              Monday Youth Gathering: 8:30pm - 10:30pm
            </p>
            <p className="text-mutedBlue">
              Saturday Youth Goshti Sabha meet: 8:30pm - 10:30pm
            </p>
          </div>

          <div>
            <h4 className="font-semibold">
              Agrawal Next Science Private Tuitions
            </h4>
            <p className="text-mutedBlue">
              Above Naturals Ice-Cream,Patel Chowk Ghatkopar East Mumbai 400075
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Enquiries:</h4>
            <p className="text-mutedBlue">
              enquiry@hariprabodhambh.org
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">
              Find us on Social Media:
            </h4>

            {/* TODO: replace these base URLs with the org's actual social pages */}
            <div className="flex gap-5 text-xl text-primaryBrown">
              <a href="https://www.facebook.com" aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="hover:text-black">
                <FaFacebookF />
              </a>
              <a href="https://www.instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="hover:text-black">
                <FaInstagram />
              </a>
              <a href="https://www.youtube.com" aria-label="YouTube" target="_blank" rel="noopener noreferrer" className="hover:text-black">
                <FaYoutube />
              </a>
              <a href="https://x.com" aria-label="X (Twitter)" target="_blank" rel="noopener noreferrer" className="hover:text-black">
                <FaXTwitter />
              </a>
              <a href="https://www.linkedin.com" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer" className="hover:text-black">
                <FaLinkedinIn />
              </a>
            </div>
          </div>
        </div>

      </Reveal>

      <div className="text-center mt-16 text-sm text-mutedBlue">
        © 2025 HariPrabodham Atmiya Youth Forum Bhandup
      </div>
    </footer>
  );
};

export default Footer;