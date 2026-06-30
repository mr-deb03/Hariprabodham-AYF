// Weekly forum / mandal definitions shared across the portal.
//   HK = Harikrupa (Ghatkopar)   — Monday
//   GK = Gurukrupa (Mulund)      — Wednesday
//   SY/BR/DS/CR = Bhandup mandals — Thursday
export const MANDALS = [
  // Weekly forums with a fixed meeting day (drives the attendance auto-suggest).
  { code: "HK", name: "Harikrupa", city: "Ghatkopar", day: "Monday" },
  { code: "GK", name: "Gurukrupa", city: "Mulund", day: "Wednesday" },
  { code: "SY", name: "Samanvay", city: "Bhandup", day: "Thursday" },
  { code: "BR", name: "Brahmdarshan", city: "Bhandup", day: "Thursday" },
  { code: "DS", name: "Dasatva", city: "Bhandup", day: "Thursday" },
  { code: "CR", name: "Charanruj", city: "Bhandup", day: "Thursday" },
  // Other mandals (no fixed weekday here — the taker just picks the mandal).
  { code: "PD", name: "PrabhuDarshan", city: "Nerul", day: "" },
  { code: "SD", name: "Suhradam", city: "Badlapur", day: "" },
  { code: "SK", name: "Santkrupa", city: "Dombivli", day: "" },
  { code: "SM", name: "Sarvamangal", city: "Vikhroli", day: "" },
  { code: "AB", name: "AksharBhrahm", city: "Rajasthan", day: "" },
];

export const MANDAL_BY_CODE = Object.fromEntries(MANDALS.map((m) => [m.code, m]));
export const MANDAL_CODES = MANDALS.map((m) => m.code);

// Member detail categories — mirror the master-data sheet.
export const EDUCATION_LEVELS = [
  "SSC",
  "HSC (11th, 12th)",
  "Diploma",
  "Graduate (B.Com, BSc, etc)",
  "Engineering (BE, B.Tech, etc)",
  "Post Graduate (M.Com, MSc, etc)",
  "Other",
];

// Stored lowercase in the DB; shown with the label.
export const EDUCATION_STATUSES = [
  { value: "pursuing", label: "Pursuing" },
  { value: "completed", label: "Completed" },
];

export const OCCUPATIONS = [
  { value: "student", label: "Student" },
  { value: "job", label: "Job" },
  { value: "business", label: "Business" },
];

export const mandalLabel = (code) => {
  const m = MANDAL_BY_CODE[code];
  return m ? `${m.name} (${m.city}) · ${m.code}` : code || "—";
};

export const mandalShort = (code) => {
  const m = MANDAL_BY_CODE[code];
  return m ? `${m.name} · ${m.code}` : code || "—";
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Today's date as a local YYYY-MM-DD string (not UTC).
export const todayISO = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const dayNameOf = (isoDate) =>
  DAY_NAMES[new Date(`${isoDate}T00:00:00`).getDay()];

// Mandal codes that meet on the same weekday as the given date.
export const mandalsForDate = (isoDate) => {
  const day = dayNameOf(isoDate);
  return MANDALS.filter((m) => m.day === day).map((m) => m.code);
};
