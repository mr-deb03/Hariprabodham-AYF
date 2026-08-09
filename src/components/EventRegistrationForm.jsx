import React, { useEffect, useRef, useState } from "react";
import { FaCheckCircle, FaInfoCircle } from "react-icons/fa";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

/*
 * On-site event registration, replacing the Google Form the banner used to
 * link out to. Fields mirror that form exactly.
 *
 * Duplicates are caught by the unique index on (event_slug, mobile_key) in
 * supabase/event_registrations.sql, not by querying first. Two reasons:
 * a check-then-insert races two people submitting the same number at once, and
 * it would need public SELECT on the table — which would let anyone read the
 * whole registration list from the browser. Instead we just insert and read
 * SQLSTATE 23505 off the failure.
 */

// Straight from the Google Form. The mandal names overlap portal/constants.js
// but this list is not the same thing — it carries VIP and PARENT, which are
// not mandals — so it stays declared here rather than derived from MANDALS.
const OCCUPATIONS = ["Student", "Job", "Business"];

const EDUCATION_LEVELS = [
  "VIII-IX (School)",
  "SSC",
  "HSC (11th, 12th)",
  "Diploma",
  "Graduate (B.com, BSc, etc)",
  "Engineering (BE, B.Tech, etc)",
  "Medical (MBBS, BAMS, BDS, etc)",
  "Architect (B.Arch)",
  "Post-Graduate",
  "PhD",
  "Other",
];

const EDUCATION_STATUSES = ["Pursuing", "Completed"];

const GROUPS = [
  "Harikrupa (Ghatkopar)",
  "Sarvamangal (Vikhroli)",
  "Brahmdarshan",
  "Charanruj",
  "Dasatva",
  "Samanvay",
  "Gurukrupa (Mulund)",
  "Santkrupa (Dombivli)",
  "Suhradam (Badlapur)",
  "PrabhuDarshan (Nerul)",
  "AksharBhrahm (Rajasthan)",
  "VIP",
  "PARENT",
];

const EMPTY = {
  reference: "",
  full_name: "",
  mobile: "",
  occupation: "",
  education: "",
  education_status: "",
  specialization: "",
  group_name: "",
};

// Same rule as the Smruti form: a 10-digit Indian mobile, optionally carrying
// +91 / 0 / spaces / dashes.
const digitsOf = (v) => String(v || "").replace(/\D/g, "");
const isValidMobile = (v) => {
  const d = digitsOf(v);
  return /^[6-9]\d{9}$/.test(d) || /^91[6-9]\d{9}$/.test(d) || /^0[6-9]\d{9}$/.test(d);
};

const field =
  "w-full rounded-lg border border-bronze/25 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors duration-200 focus:border-primaryBrown focus:ring-2 focus:ring-primaryBrown/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";
const required = <span aria-hidden="true" className="text-red-600"> *</span>;

/*
 * Radio group drawn as chips.
 *
 * The inputs are real radios kept in the accessibility tree via sr-only rather
 * than divs with click handlers, so keyboard and screen-reader behaviour is the
 * browser's. They deliberately carry no `required` attribute: a clipped 1px
 * control cannot host a validation bubble, so Chrome would refuse to submit
 * while showing the user nothing. These two groups are validated in submit()
 * instead, where the message lands in the same place as every other error.
 *
 * peer-focus-visible puts the focus ring on the visible chip, since the input
 * it belongs to is invisible.
 */
function ChipGroup({ name, legend, options, value, onChange }) {
  return (
    <fieldset>
      <legend className={labelClass}>
        {legend}
        {required}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={o}
              checked={value === o}
              onChange={onChange}
              className="peer sr-only"
            />
            <span
              className={`block rounded-full border px-3 py-1.5 text-sm transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-maroon ${
                value === o
                  ? "border-maroon bg-maroon text-onDark"
                  : "border-bronze/25 bg-white text-ink hover:bg-cream"
              }`}
            >
              {o}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function EventRegistrationForm({
  eventSlug,
  eventName,
  open,
  onClose,
}) {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("idle"); // idle|saving|success|duplicate|error
  const [error, setError] = useState("");
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  // Esc to close, and lock the page behind the dialog so the banner doesn't
  // scroll under it on touch.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Start clean each time it opens, so a previous success or duplicate notice
  // doesn't greet the next person.
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setStatus("idle");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    // The two chip groups can't rely on the `required` attribute — see
    // ChipGroup — so they're checked here, before the mobile format.
    if (!form.occupation) {
      setError("Please choose an occupation.");
      return;
    }
    if (!form.education_status) {
      setError("Please choose an education status.");
      return;
    }
    if (!isValidMobile(form.mobile)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!supabaseConfigured) {
      setError("Registration isn't connected yet. Please try again later.");
      setStatus("error");
      return;
    }

    setError("");
    setStatus("saving");

    const { error: err } = await supabase.from("event_registrations").insert({
      event_slug: eventSlug,
      event_name: eventName,
      reference: form.reference.trim(),
      full_name: form.full_name.trim(),
      mobile: form.mobile.trim(),
      occupation: form.occupation,
      education: form.education,
      education_status: form.education_status,
      specialization: form.specialization.trim(),
      group_name: form.group_name,
    });

    if (!err) {
      setStatus("success");
      return;
    }
    // 23505 = unique_violation. The only unique constraint on this table is
    // (event_slug, mobile_key), so this can only mean one thing.
    if (err.code === "23505") {
      setStatus("duplicate");
      return;
    }
    // Anything else is ours to fix, not the visitor's — a raw PostgREST string
    // ("Could not find the table 'public.event_registrations' in the schema
    // cache") means nothing to them. Keep the detail in the console.
    console.error("Event registration failed:", err);
    setStatus("error");
    setError(
      "Something went wrong while saving your registration. Please try again in a moment."
    );
  };

  const done = status === "success" || status === "duplicate";

  return (
    /*
     * The overlay never scrolls — the panel does, internally.
     *
     * Previously the overlay was the scroll container AND carried
     * backdrop-blur. A blurred backdrop has to be re-sampled every scroll
     * frame, and the page underneath is full of will-change:transform layers
     * from every Reveal, which made chips and fields flicker out mid-scroll on
     * real devices. No blur, and a fixed overlay with a capped-height panel,
     * removes both causes. overscroll-contain stops the scroll chaining into
     * the page behind once the form hits its end.
     */
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-card"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-sand/70 px-5 py-4">
          <div>
            <h2 id="reg-title" className="font-display text-xl text-maroon">
              Register for {eventName}
            </h2>
            <p className="mt-0.5 text-xs text-textSoft">
              To be filled by the respective karyakarta.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close registration form"
            className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-textMuted transition-colors duration-200 hover:bg-cream"
          >
            ✕
          </button>
        </div>

        {/* min-h-0 is what lets a flex child actually overflow rather than
            stretching its parent past the max-height. */}
        {done ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-10 text-center">
            {status === "success" ? (
              <>
                <FaCheckCircle aria-hidden="true" className="mx-auto text-4xl text-green-600" />
                <h3 className="mt-4 font-display text-xl text-maroon">
                  Registration confirmed
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-textSoft">
                  {form.full_name} is registered for {eventName}. Jai
                  Swaminarayan 🙏
                </p>
              </>
            ) : (
              <>
                <FaInfoCircle aria-hidden="true" className="mx-auto text-4xl text-saffronText" />
                <h3 className="mt-4 font-display text-xl text-maroon">
                  Already registered
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-textSoft">
                  The mobile number {form.mobile} is already registered for{" "}
                  {eventName}. There's no need to register again.
                </p>
              </>
            )}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={onClose} className="btn-primary">
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY);
                  setStatus("idle");
                }}
                className="btn-secondary"
              >
                Register someone else
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5"
          >
            <div>
              <label htmlFor="reg-reference" className={labelClass}>
                Whose reference?{required}
              </label>
              <input
                id="reg-reference"
                name="reference"
                required
                maxLength={120}
                value={form.reference}
                onChange={set}
                className={field}
                placeholder="Karyakarta's name"
              />
            </div>

            <div>
              <label htmlFor="reg-name" className={labelClass}>
                Youth's full name{required}
              </label>
              <input
                id="reg-name"
                name="full_name"
                required
                maxLength={120}
                value={form.full_name}
                onChange={set}
                className={field}
                placeholder="First name · Middle name · Surname"
              />
            </div>

            <div>
              <label htmlFor="reg-mobile" className={labelClass}>
                Youth's mobile number{required}
              </label>
              <input
                id="reg-mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                value={form.mobile}
                onChange={set}
                className={field}
                placeholder="10-digit mobile number"
              />
              <p className="mt-1.5 text-xs text-textMuted">
                One registration per mobile number.
              </p>
            </div>

            <ChipGroup
              name="occupation"
              legend="Occupation"
              options={OCCUPATIONS}
              value={form.occupation}
              onChange={set}
            />

            <div>
              <label htmlFor="reg-education" className={labelClass}>
                Education{required}
              </label>
              <select
                id="reg-education"
                name="education"
                required
                value={form.education}
                onChange={set}
                className={field}
              >
                <option value="">Select education</option>
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <ChipGroup
              name="education_status"
              legend="Education status"
              options={EDUCATION_STATUSES}
              value={form.education_status}
              onChange={set}
            />

            <div>
              <label htmlFor="reg-specialization" className={labelClass}>
                Specialization / domain / profession{required}
              </label>
              <input
                id="reg-specialization"
                name="specialization"
                required
                maxLength={120}
                value={form.specialization}
                onChange={set}
                className={field}
                placeholder="e.g. Computer Engineering, Accountant"
              />
            </div>

            <div>
              <label htmlFor="reg-group" className={labelClass}>
                Group name{required}
              </label>
              <select
                id="reg-group"
                name="group_name"
                required
                value={form.group_name}
                onChange={set}
                className={field}
              >
                <option value="">Select group</option>
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "saving"}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "saving" ? "Registering…" : "Submit registration"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
