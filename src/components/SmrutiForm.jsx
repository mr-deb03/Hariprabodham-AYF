import React, { useEffect, useRef, useState } from "react";
import {
  FaCloudUploadAlt,
  FaWhatsapp,
  FaCheckCircle,
  FaUser,
  FaIdBadge,
} from "react-icons/fa";
import Reveal from "./Reveal";

/*
 * Smruti — "memory" photo retrieval.
 *
 * The visitor submits their details + a clear face photo. A backend then:
 *   1. computes a face embedding from the uploaded photo,
 *   2. scans the connected Google Drive event albums for matching faces,
 *   3. sends the matched photos to the visitor's WhatsApp number.
 *
 * This component only handles the FRONTEND: collecting + validating the data
 * and POSTing it (as multipart/form-data) to that backend.
 *
 * Set the backend URL via the REACT_APP_SMRUTI_ENDPOINT env var (in a .env
 * file). Until it is set, the form runs in DEMO mode: it validates and shows
 * the success flow without actually sending anything.
 */
const SMRUTI_ENDPOINT = process.env.REACT_APP_SMRUTI_ENDPOINT;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

const emptyForm = {
  firstName: "",
  lastName: "",
  ayfCode: "",
  whatsapp: "",
};

const steps = [
  {
    icon: FaUser,
    title: "Share your details",
    text: "Tell us your name, AYF code and the WhatsApp number where you'd like your photos.",
  },
  {
    icon: FaCloudUploadAlt,
    title: "Upload a clear selfie",
    text: "Use a recent, well-lit photo where your face is clearly visible and facing the camera.",
  },
  {
    icon: FaWhatsapp,
    title: "Receive your memories",
    text: "We match your face across our event albums and send your photos right to your WhatsApp.",
  },
];

export default function SmrutiForm() {
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Release the object URL when the preview changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG or PNG).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("That image is too large — please upload one under 10 MB.");
      return;
    }
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const validWhatsapp = (value) => {
    // Allow an optional leading + and 8–15 digits (spaces/dashes ignored).
    const digits = value.replace(/[\s-]/g, "");
    return /^\+?\d{8,15}$/.test(digits);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) {
      setError("Please upload a photo of your face.");
      return;
    }
    if (!validWhatsapp(form.whatsapp)) {
      setError("Please enter a valid WhatsApp number with country code.");
      return;
    }
    if (!consent) {
      setError("Please tick the consent box so we can match and send your photos.");
      return;
    }

    setError("");
    setStatus("submitting");

    try {
      if (SMRUTI_ENDPOINT) {
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        data.append("photo", photo);
        data.append("consent", "true");

        const res = await fetch(SMRUTI_ENDPOINT, { method: "POST", body: data });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
      } else {
        // DEMO mode — no backend wired yet. Simulate processing so the flow
        // can be previewed. Remove once REACT_APP_SMRUTI_ENDPOINT is set.
        // eslint-disable-next-line no-console
        console.warn(
          "Smruti: REACT_APP_SMRUTI_ENDPOINT is not set — running in demo mode, nothing was sent."
        );
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError("Something went wrong while submitting. Please try again.");
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setForm(emptyForm);
    setPhoto(null);
    setPreview("");
    setConsent(false);
    setStatus("idle");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <section className="bg-softGray py-24 px-6 md:px-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        {/* LEFT — how it works */}
        <Reveal variant="left">
          <p className="eyebrow mb-4">Smruti · Memories</p>
          <h2 className="mb-6 text-3xl font-medium text-primaryBrown md:text-4xl">
            Find your photos from our gatherings
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-gray-600">
            Upload a clear photo of yourself and we'll search our event albums
            for pictures of you — then deliver them straight to your WhatsApp.
          </p>

          <div className="space-y-7">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primaryBrown/10 text-xl text-primaryBrown">
                    <Icon />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primaryBrown">
                      {step.title}
                    </h3>
                    <p className="text-mutedBlue">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-10 rounded-xl bg-white/70 p-4 text-sm leading-relaxed text-gray-500">
            <FaIdBadge className="mr-2 inline text-primaryBrown" />
            Your photo is used only to identify you in our event albums. We
            never share it with anyone else.
          </p>
        </Reveal>

        {/* RIGHT — form / success */}
        <Reveal variant="right" delay={150}>
          {status === "success" ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-white p-10 text-center shadow-lg">
              <FaCheckCircle className="mb-5 text-5xl text-green-500" />
              <h3 className="mb-3 text-2xl font-semibold text-primaryBrown">
                Thank you{form.firstName ? `, ${form.firstName}` : ""}!
              </h3>
              <p className="max-w-sm leading-relaxed text-gray-600">
                We've received your details. Once we've matched your photos from
                our albums, we'll send them to your WhatsApp
                {form.whatsapp ? ` at ${form.whatsapp}` : ""}.
              </p>
              <button
                type="button"
                onClick={reset}
                className="btn-secondary mt-8"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl bg-white p-8 shadow-lg"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={form.firstName}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-800 outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={form.lastName}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-800 outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ayfCode"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  AYF code
                </label>
                <input
                  id="ayfCode"
                  name="ayfCode"
                  type="text"
                  required
                  value={form.ayfCode}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-800 outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                  placeholder="e.g. AYF-1234"
                />
              </div>

              <div>
                <label
                  htmlFor="whatsapp"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  WhatsApp number
                </label>
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  required
                  value={form.whatsapp}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-800 outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                  placeholder="+91 98765 43210"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Include your country code — this is where we'll send your photos.
                </p>
              </div>

              {/* PHOTO UPLOAD */}
              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Upload selfie or photo
                </span>
                <label
                  htmlFor="photo"
                  className="flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed border-gray-300 p-4 transition hover:border-primaryBrown"
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt="Selected face preview"
                      className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-primaryBrown/30"
                    />
                  ) : (
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primaryBrown/10 text-3xl text-primaryBrown">
                      <FaCloudUploadAlt />
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    {photo ? (
                      <>
                        <span className="font-medium text-primaryBrown">
                          {photo.name}
                        </span>
                        <br />
                        Tap to choose a different photo.
                      </>
                    ) : (
                      <>
                        Tap to upload a photo with a{" "}
                        <span className="font-medium text-primaryBrown">
                          clear, front-facing face
                        </span>
                        . JPG or PNG, up to 10 MB.
                      </>
                    )}
                  </span>
                  <input
                    id="photo"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handlePhoto}
                    className="hidden"
                  />
                </label>
              </div>

              {/* CONSENT */}
              <label className="flex items-start gap-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primaryBrown"
                />
                <span>
                  I consent to my photo being used to identify me in
                  HariPrabodham event albums and to receiving my matched photos
                  via WhatsApp.
                </span>
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? "Submitting…" : "Find my photos"}
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
