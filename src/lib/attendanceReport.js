import { supabase } from "./supabaseClient";
import { MANDAL_BY_CODE, dayNameOf } from "../portal/constants";

const SHEET_WEBHOOK = process.env.REACT_APP_REPORT_SHEET_WEBHOOK;

export const sheetConfigured = Boolean(SHEET_WEBHOOK);

/*
 * One definition of what a finalized report row is, shared by the two places
 * that produce one: the Attendance page (which finalizes automatically as marks
 * are saved) and the Report page's Save button. They used to compute the shape
 * separately, which is how they drifted apart on things like name ordering.
 */

// The absent list is the ACTIVE roster only — an inactive member who was never
// expected isn't "absent" — but anyone actually marked present is counted
// however they're filed. Names are sorted so a row doesn't churn just because
// the two callers order their rosters differently (by code vs. by name).
export function splitRoster(members, presentIds) {
  const present = new Set(presentIds);
  const byName = (a, b) => a.localeCompare(b);
  return {
    present: members
      .filter((m) => present.has(m.id))
      .map((m) => m.name)
      .sort(byName),
    absent: members
      .filter((m) => m.active && !present.has(m.id))
      .map((m) => m.name)
      .sort(byName),
  };
}

export function reportRowFromNames({ date, mandal, present, absent, userId }) {
  return {
    report_date: date,
    mandal,
    total: present.length + absent.length,
    present_count: present.length,
    absent_count: absent.length,
    present_names: present,
    absent_names: absent,
    finalized_by: userId || null,
    finalized_at: new Date().toISOString(),
  };
}

export function reportRow({ date, mandal, members, presentIds, userId }) {
  const { present, absent } = splitRoster(members, presentIds);
  return reportRowFromNames({ date, mandal, present, absent, userId });
}

export async function saveReportRows(rows) {
  if (!rows.length) return null;
  const { error } = await supabase
    .from("attendance_reports")
    .upsert(rows, { onConflict: "report_date,mandal" });
  return error || null;
}

// Best-effort mirror to the Google Sheet. Fire-and-forget (no-cors), because a
// sheet that's briefly behind is not worth failing a save over.
//
// Requires the Apps Script from supabase/report-sheet-appscript.gs at or after
// the keyed-write version: it overwrites the row for a date+mandal instead of
// appending, so re-sending a day corrects it rather than stacking duplicates.
export async function pushToSheet({ date, savedBy, rows }) {
  if (!SHEET_WEBHOOK || !rows.length) return;
  try {
    await fetch(SHEET_WEBHOOK, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        date,
        day: dayNameOf(date),
        savedBy: savedBy || "",
        rows: rows.map((r) => ({
          mandal: r.mandal,
          mandalName: MANDAL_BY_CODE[r.mandal]?.name,
          present: r.present_count,
          absent: r.absent_count,
          total: r.total,
          presentNames: r.present_names,
          absentNames: r.absent_names,
        })),
      }),
    });
  } catch {
    /* sheet export is best-effort */
  }
}
