import React, { useEffect, useRef, useState } from "react";
import {
  FaCloudUploadAlt,
  FaTelegramPlane,
  FaCheckCircle,
  FaUser,
  FaIdBadge,
} from "react-icons/fa";
import Reveal from "./Reveal";

/*
 * Smruti — "memory" photo retrieval.
 *
 * The visitor submits their details + a clear face photo. The backend stashes
 * the selfie under a one-time token and returns a Telegram deep link
 * (t.me/<bot>?start=<token>). The visitor opens it and presses Start; the bot
 * then matches their face across the Google Drive event albums and sends the
 * matched photos straight into the Telegram chat.
 *
 * This component only handles the FRONTEND: collecting + validating the data,
 * POSTing it (multipart/form-data), and surfacing the returned Telegram link.
 *
 * Set the backend URL via the REACT_APP_SMRUTI_ENDPOINT env var. Until it is
 * set, the form runs in DEMO mode: it validates and shows the success flow
 * without actually sending anything.
 */
const SMRUTI_ENDPOINT = process.env.REACT_APP_SMRUTI_ENDPOINT;
// Cloudflare Worker route that delivers the matched photos over WhatsApp.
// When set, photos are sent straight to the visitor's number and no Telegram
// step is needed. Blank → fall back to the Telegram deep-link flow.
const SMRUTI_WA_ENDPOINT = process.env.REACT_APP_SMRUTI_WA_ENDPOINT || "";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

const emptyForm = {
  firstName: "",
  lastName: "",
  ayfCode: "",
  mobile: "",
};

// Accept a 10-digit Indian mobile, optionally with +91 / 0 / spaces.
const isValidMobile = (v) => {
  const d = String(v || "").replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(d) || /^91[6-9]\d{9}$/.test(d);
};

const steps = [
  {
    icon: FaUser,
    title: "Share your details",
    text: "Tell us your name and AYF code so we know who to look for.",
  },
  {
    icon: FaCloudUploadAlt,
    title: "Upload a clear selfie",
    text: "Use a recent, well-lit photo where your face is clearly visible and facing the camera.",
  },
  {
    icon: FaTelegramPlane,
    title: "Receive them on Telegram",
    text: "Tap the Telegram button, press Start, and we'll send your matched photos right into the chat.",
  },
];

export default function SmrutiForm() {
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [error, setError] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [sentToWhatsApp, setSentToWhatsApp] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) {
      setError("Please upload a photo of your face.");
      return;
    }
    if (SMRUTI_WA_ENDPOINT && !isValidMobile(form.mobile)) {
      setError("Please enter a valid 10-digit WhatsApp number.");
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
        const result = await res.json().catch(() => ({}));
        setTelegramUrl(result.telegramUrl || "");

        // Hand the token to the Worker, which matches the faces and sends the
        // photos to WhatsApp. It acks straight away and delivers in the
        // background, so we don't block on face matching here.
        if (SMRUTI_WA_ENDPOINT && result.token) {
          const waRes = await fetch(SMRUTI_WA_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: result.token,
              mobile: form.mobile,
              name: form.firstName,
            }),
          });
          if (!waRes.ok) throw new Error("Could not queue your WhatsApp delivery.");
          setSentToWhatsApp(true);
        }
      } else {
        // DEMO mode — no backend wired yet. Simulate processing so the flow
        // can be previewed. Remove once REACT_APP_SMRUTI_ENDPOINT is set.
        // eslint-disable-next-line no-console
        console.warn(
          "Smruti: REACT_APP_SMRUTI_ENDPOINT is not set — running in demo mode, nothing was sent."
        );
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setTelegramUrl("");
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
    setTelegramUrl("");
    setSentToWhatsApp(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <section className="bg-softGray section">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        {/* LEFT — how it works */}
        <Reveal variant="left">
          <p className="eyebrow mb-4">Smruti · Memories</p>
          <h2 className="mb-6 font-display text-3xl font-semibold text-maroon md:text-4xl lg:text-5xl">
            Find your photos from our gatherings
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-textSoft">
            Upload a clear photo of yourself and we'll search our event albums
            for pictures of you — then deliver them to you on Telegram.
          </p>

          {/* An <ol>, not a stack of divs — this is a sequence, and the rule
              running between the markers makes that legible at a glance. */}
          <ol className="relative space-y-7">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const last = i === steps.length - 1;
              return (
                <li key={step.title} className="relative flex gap-5">
                  {!last && (
                    <span
                      aria-hidden="true"
                      className="absolute left-6 top-12 h-[calc(100%+0.5rem)] w-px bg-bronze/25"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primaryBrown/10 text-xl text-primaryBrown ring-4 ring-softGray"
                  >
                    <Icon />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-maroon">
                      <span className="text-bronze">{i + 1}.</span> {step.title}
                    </h3>
                    <p className="text-textSoft">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-10 rounded-xl bg-white/70 p-4 text-sm leading-relaxed text-textMuted">
            <FaIdBadge className="mr-2 inline text-primaryBrown" />
            Your photo is used only to identify you in our event albums, and is
            deleted once your photos are sent. We never share it with anyone else.
          </p>
        </Reveal>

        {/* RIGHT — form / success */}
        <Reveal variant="right" delay={150}>
          {status === "success" ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-white p-10 text-center shadow-lg">
              <FaCheckCircle className="mb-5 text-5xl text-green-500" />
              <h3 className="mb-3 text-2xl font-semibold text-primaryBrown">
                {sentToWhatsApp
                  ? `Thank you${form.firstName ? `, ${form.firstName}` : ""}!`
                  : `One last step${form.firstName ? `, ${form.firstName}` : ""}!`}
              </h3>

              {sentToWhatsApp ? (
                <>
                  <p className="max-w-sm leading-relaxed text-textSoft">
                    We're matching your face across our albums and will send
                    your photos to{" "}
                    <span className="font-semibold text-primaryBrown">
                      {form.mobile}
                    </span>{" "}
                    on WhatsApp shortly. It usually takes under a minute. 🙏
                  </p>
                  <p className="mt-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                    Nothing else to do — just keep an eye on WhatsApp.
                  </p>
                </>
              ) : (
                <>
                  <p className="max-w-sm leading-relaxed text-textSoft">
                    Tap below to open our Telegram bot and press{" "}
                    <span className="font-semibold text-primaryBrown">
                      Start
                    </span>
                    . We'll match your face across our albums and send your
                    photos right there. 🙏
                  </p>

                  {telegramUrl ? (
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={reset}
                      className="btn-primary mt-7 inline-flex items-center gap-2"
                    >
                      <FaTelegramPlane className="text-lg" />
                      Open my photos on Telegram
                    </a>
                  ) : (
                    <p className="mt-7 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      Telegram delivery isn't configured yet (demo mode).
                    </p>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={reset}
                className="btn-secondary mt-5"
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
                    className="mb-1 block text-sm font-medium text-ink"
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
                    className="w-full rounded-lg border border-bronze/20 px-4 py-3 text-ink outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-1 block text-sm font-medium text-ink"
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
                    className="w-full rounded-lg border border-bronze/20 px-4 py-3 text-ink outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ayfCode"
                  className="mb-1 block text-sm font-medium text-ink"
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
                  className="w-full rounded-lg border border-bronze/20 px-4 py-3 text-ink outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                  placeholder="e.g. HKXXXX"

                />
              </div>

              {SMRUTI_WA_ENDPOINT && (
                <div>
                  <label
                    htmlFor="mobile"
                    className="mb-1 block text-sm font-medium text-ink"
                  >
                    WhatsApp number
                  </label>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    value={form.mobile}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-bronze/20 px-4 py-3 text-ink outline-none transition focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20"
                    placeholder="10-digit mobile number"
                  />
                  <p className="mt-1 text-xs text-textMuted">
                    We'll send your matched photos to this number on WhatsApp.
                  </p>
                </div>
              )}

              {/* PHOTO UPLOAD */}
              <div>
                <span className="mb-1 block text-sm font-medium text-ink">
                  Upload selfie or photo
                </span>
                <label
                  htmlFor="photo"
                  className="flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed border-bronze/30 p-4 transition hover:border-primaryBrown"
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
                  <span className="text-sm text-textMuted">
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
              <label className="flex items-start gap-3 text-sm text-textSoft">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primaryBrown"
                />
                <span>
                  I consent to my photo being used to identify me in
                  HariPrabodham event albums and to receiving my matched photos
                  via Telegram.
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
