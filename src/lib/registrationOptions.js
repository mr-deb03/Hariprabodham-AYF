/*
 * Choice lists for the event registration form.
 *
 * Taken verbatim from the Google Form this replaced. Shared between the public
 * form (components/EventRegistrationForm) and the admin editor
 * (pages/portal/AdminRegistrations) so an option can never exist in one and not
 * the other — an admin editing a row must be able to pick whatever a visitor
 * could have submitted.
 *
 * The mandal names overlap portal/constants.js but this is not the same list:
 * it carries VIP and PARENT, which are not mandals. Keep them separate.
 */

export const OCCUPATIONS = ["Student", "Job", "Business"];

export const EDUCATION_LEVELS = [
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

export const EDUCATION_STATUSES = ["Pursuing", "Completed"];

export const GROUPS = [
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

// Accepts a 10-digit Indian mobile, optionally carrying +91 / 0 / spaces /
// dashes. Mirrors the CHECK constraint in supabase/event_registrations.sql,
// only stricter — it also requires the leading 6-9.
export const digitsOf = (v) => String(v || "").replace(/\D/g, "");

export const isValidMobile = (v) => {
  const d = digitsOf(v);
  return (
    /^[6-9]\d{9}$/.test(d) || /^91[6-9]\d{9}$/.test(d) || /^0[6-9]\d{9}$/.test(d)
  );
};
