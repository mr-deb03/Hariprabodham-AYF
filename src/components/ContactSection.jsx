import React, { useState } from "react";
import { FaEnvelope } from "react-icons/fa";
import Reveal from "./Reveal";

const ENQUIRY_EMAIL = "enquiry@hariprabodhambh.org";

const details = [
  {
    icon: FaEnvelope,
    title: "Email",
    lines: [ENQUIRY_EMAIL],
  },
];

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
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-800 outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-800 outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  required
                  value={form.message}
                  onChange={handleChange}
                  className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-gray-800 outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                  placeholder="How can we help?"
                />
              </div>

              <button type="submit" className="btn-primary w-full">
                Send Message
              </button>
            </form>
          </Reveal>

          {/* DETAILS */}
          <Reveal variant="right" delay={150} className="flex flex-col justify-center gap-6">
            {details.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex gap-5 rounded-2xl bg-white p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primaryBrown/10 text-xl text-primaryBrown">
                    <Icon />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-primaryBrown">
                      {item.title}
                    </h3>
                    {item.lines.map((line) => (
                      <p key={line} className="text-mutedBlue">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
