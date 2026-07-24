import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaInstagram, FaYoutube, FaMapMarkerAlt, FaUserPlus } from "react-icons/fa";
import Reveal from "./Reveal";
import { CENTERS, INSTAGRAM_PROFILE, YOUTUBE_CHANNEL } from "../lib/centers";

// Kept out of the rendered page deliberately — the address is no longer shown
// anywhere on the site, but the form still needs somewhere to deliver to.
const ENQUIRY_EMAIL = "enquiry@hariprabodhambh.org";

const ContactSection = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // No backend on this static site, so we open the visitor's email client
  // pre-filled. TODO: swap for Formspree / EmailJS to send without leaving the page.
  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Website enquiry from ${form.name || "visitor"}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    );
    window.location.href = `mailto:${ENQUIRY_EMAIL}?subject=${subject}&body=${body}`;
  };

  const inputClass =
    "w-full rounded-lg border border-bronze/20 px-4 py-3 text-ink outline-none transition-colors duration-200 focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20";

  return (
    <section id="contact" className="bg-softGray py-24 px-6 md:px-12">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-16 text-center">
          <p className="eyebrow mb-4">Contact</p>
          <h2 className="text-3xl font-medium text-primaryBrown md:text-4xl">
            Get in Touch
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* FORM */}
          <Reveal variant="left">
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl bg-white p-8 shadow-lg"
            >
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium text-ink">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  required
                  value={form.message}
                  onChange={handleChange}
                  className={`${inputClass} resize-none`}
                  placeholder="How can we help?"
                />
              </div>

              <button type="submit" className="btn-primary w-full">
                Send Message
              </button>
            </form>
          </Reveal>

          {/* DETAILS — three cards, sized to balance the form's height */}
          <Reveal variant="right" delay={150} className="flex flex-col gap-6">
            {/* Weekly assemblies */}
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="mb-4 flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primaryBrown/10 text-xl text-primaryBrown"
                >
                  <FaMapMarkerAlt />
                </span>
                <div>
                  <h3 className="font-semibold text-primaryBrown">
                    Come to a weekly sabha
                  </h3>
                  <p className="text-sm text-mutedBlue">
                    Youth assemblies run every week at:
                  </p>
                </div>
              </div>
              <ul className="flex flex-wrap gap-2">
                {CENTERS.map((center) => (
                  <li
                    key={center}
                    className="rounded-full bg-primaryBrown/10 px-3 py-1 text-sm text-mutedBlue"
                  >
                    {center}
                  </li>
                ))}
              </ul>
            </div>

            {/* Social */}
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h3 className="mb-1 font-semibold text-primaryBrown">Follow along</h3>
              <p className="mb-5 text-sm text-mutedBlue">
                Reels, updates and glimpses of youth life at HariPrabodham.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={INSTAGRAM_PROFILE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-3 rounded-xl border border-bronze/20 px-5 py-3 font-medium text-primaryBrown transition-colors duration-200 hover:border-gold hover:bg-gold/10"
                >
                  <FaInstagram aria-hidden="true" className="text-xl text-pink-600" />
                  Instagram
                </a>
                <a
                  href={YOUTUBE_CHANNEL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-3 rounded-xl border border-bronze/20 px-5 py-3 font-medium text-primaryBrown transition-colors duration-200 hover:border-gold hover:bg-gold/10"
                >
                  <FaYoutube aria-hidden="true" className="text-xl text-red-600" />
                  YouTube
                </a>
              </div>
            </div>

            {/* Karyakarta CTA */}
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primaryBrown/10 text-xl text-primaryBrown"
                >
                  <FaUserPlus />
                </span>
                <div>
                  <h3 className="mb-1 font-semibold text-primaryBrown">
                    Already a karyakarta?
                  </h3>
                  <p className="mb-4 text-sm text-mutedBlue">
                    Register for the portal to access attendance, satsang videos
                    and member tools.
                  </p>
                  <Link
                    to="/portal/register"
                    className="inline-flex min-h-[44px] items-center rounded-xl border-2 border-gold px-5 py-3 font-semibold text-primaryBrown transition-colors duration-200 hover:bg-gold/15"
                  >
                    Register for the portal
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
