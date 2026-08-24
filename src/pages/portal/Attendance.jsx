import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, fetchAllRows } from "../../lib/supabaseClient";
import {
  pushToSheet,
  reportRow,
  saveReportRows,
} from "../../lib/attendanceReport";
import { useAuth } from "../../portal/AuthContext";
import {
  MANDAL_CODES,
  mandalShort,
  mandalsForDate,
  todayISO,
} from "../../portal/constants";
import {
  Alert,
  Card,
  PageHeader,
  PortalButton,
  Spinner,
  TableShell,
  inputClass,
  tableHeadRow,
  tdCell,
  thCell,
} from "../../portal/ui";

const PAGE_SIZE = 20;

// Long enough that ticking down a roster is one write rather than forty, short
// enough that nobody wonders whether it saved.
const AUTOSAVE_MS = 1200;

// The report snapshot is written on every save — it's one cheap idempotent
// upsert. The Google Sheet is not: the Apps Script keys rows by date+mandal but
// still costs a round trip, so it waits for the roster to stop changing. A
// normal sabha is one push; leaving the page sends whatever is still owed.
const SHEET_SETTLE_MS = 20000;

const clockOf = (d) =>
  d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

/*
 * Draft storage.
 *
 * Marks are written to localStorage the instant they are ticked, and removed
 * only once a write carrying them has succeeded. This is the difference
 * between "the sabha was counted" and "the sabha was counted and we still have
 * it": a taker's phone being locked, backgrounded or the tab discarded mid-roster
 * is the ordinary end of a sabha, not an edge case, and none of those reliably
 * run any teardown we could hook. A draft that outlives the tab is re-sent the
 * next time the page opens.
 *
 * Snapshots are kept JSON-serialisable (id arrays, not member objects and Sets)
 * so the same shape goes to localStorage and to writeSnapshot.
 */
const DRAFT_PREFIX = "hp.attendance.draft.";
const draftKey = (date, mandal) => `${DRAFT_PREFIX}${date}.${mandal}`;

const writeDraft = (snap) => {
  try {
    localStorage.setItem(draftKey(snap.date, snap.mandal), JSON.stringify(snap));
  } catch {
    /* private mode or quota — drafts are a safety net, never a dependency */
  }
};

const dropDraft = (snap) => {
  try {
    localStorage.removeItem(draftKey(snap.date, snap.mandal));
  } catch {
    /* see above */
  }
};

// A snapshot's roster. Drafts written before the report auto-finalised carried
// bare ids; those still write their marks correctly, they just can't produce a
// report row, so finalising is skipped for them rather than inventing names.
const rosterOf = (snap) =>
  Array.isArray(snap.members) ? snap.members : null;

const idsOf = (snap) =>
  rosterOf(snap)?.map((m) => m.id) ?? snap.memberIds ?? [];

const isDraft = (snap) =>
  Boolean(snap?.date && snap?.mandal) &&
  (Array.isArray(snap.members) || Array.isArray(snap.memberIds));

const readDraft = (date, mandal) => {
  try {
    const raw = localStorage.getItem(draftKey(date, mandal));
    const snap = raw ? JSON.parse(raw) : null;
    return isDraft(snap) ? snap : null;
  } catch {
    return null;
  }
};

const readAllDrafts = () => {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(DRAFT_PREFIX)) continue;
      const snap = JSON.parse(localStorage.getItem(k));
      if (isDraft(snap)) out.push(snap);
    }
  } catch {
    /* see above */
  }
  return out;
};

export default function Attendance() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  // Which mandals can this person mark?
  const markable = useMemo(
    () => (isAdmin ? MANDAL_CODES : profile?.assigned_locations || []),
    [isAdmin, profile]
  );

  const [date, setDate] = useState(todayISO());
  const [mandal, setMandal] = useState("");
  const [members, setMembers] = useState([]);
  const [present, setPresent] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  /*
   * Autosave.
   *
   * `revision` is bumped only by a human action, never by loading a roster —
   * otherwise opening a sheet would immediately write it straight back.
   *
   * pendingRef holds a SNAPSHOT of what needs writing (date, mandal, members,
   * present) rather than reading current state at write time. Two things depend
   * on that: a debounced write that fires after the user has switched mandal
   * still lands on the sheet it was made for, and a write in flight can't be
   * corrupted by edits arriving mid-request.
   */
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState({ state: "idle", text: "" });
  const pendingRef = useRef(null);
  const savingRef = useRef(false);
  const flushRef = useRef(() => {});

  const bump = () => setRevision((r) => r + 1);

  // Pick a sensible default mandal: one that meets on the selected day and that
  // the user is allowed to mark; otherwise the first markable one.
  useEffect(() => {
    if (mandal && markable.includes(mandal)) return;
    const todays = mandalsForDate(date).filter((m) => markable.includes(m));
    setMandal(todays[0] || markable[0] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markable]);

  const loadRoster = useCallback(async () => {
    if (!mandal) {
      setMembers([]);
      setPresent(new Set());
      return;
    }
    setLoading(true);
    setMsg({ kind: "", text: "" });
    // A freshly loaded sheet is by definition already saved. Resetting the
    // revision stops the autosave effect writing it straight back out.
    setRevision(0);
    setStatus({ state: "idle", text: "" });

    // Roster for this mandal — every member in the sheet (active and inactive),
    // ordered by AYG code so members run in sequence (HK0101, HK0102 … then
    // HK0201 …). Members without a code fall to the end.
    const { data: mem, error: memErr } = await fetchAllRows(() =>
      supabase
        .from("members")
        .select("id,name,mobile,code,active")
        .eq("mandal", mandal)
        .order("code", { ascending: true, nullsFirst: false })
        .order("name")
    );
    if (memErr) {
      setMsg({ kind: "error", text: memErr.message });
      setLoading(false);
      return;
    }
    setMembers(mem || []);

    // Existing session + records for this date+mandal (pre-fill present ticks)
    const { data: sess } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("session_date", date)
      .eq("mandal", mandal)
      .maybeSingle();

    if (sess?.id) {
      const { data: recs } = await supabase
        .from("attendance_records")
        .select("member_id,present")
        .eq("session_id", sess.id);
      setPresent(new Set((recs || []).filter((r) => r.present).map((r) => r.member_id)));
    } else {
      setPresent(new Set());
    }

    // A draft still on disk for this sheet means its marks never reached the
    // server. It is newer than anything we just read, so it wins — and bumping
    // the revision hands it straight to the autosave effect, which writes it
    // out and clears the draft.
    const draft = readDraft(date, mandal);
    if (draft) {
      setPresent(new Set(draft.presentIds));
      setMsg({
        kind: "info",
        text: "Restored marks from this device that hadn't reached the server yet — saving them now.",
      });
      setRevision((r) => r + 1);
    }

    setLoading(false);
  }, [date, mandal]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  // Jump back to the first page whenever the roster or filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, mandal, date]);

  const toggle = (id) => {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    bump();
  };

  const allPresent = () => {
    setPresent(new Set(members.map((m) => m.id)));
    bump();
  };
  const clearAll = () => {
    setPresent(new Set());
    bump();
  };

  // The actual write. Takes everything it needs as an argument so it can never
  // write current state to a snapshot's session, or vice versa.
  const writeSnapshot = useCallback(
    async (snap) => {
      const { data: sess, error: sErr } = await supabase
        .from("attendance_sessions")
        .upsert(
          { session_date: snap.date, mandal: snap.mandal, created_by: user.id },
          { onConflict: "session_date,mandal" }
        )
        .select("id")
        .single();
      if (sErr) return sErr;

      const now = new Date().toISOString();
      const presentIds = new Set(snap.presentIds);
      const rows = idsOf(snap).map((id) => ({
        session_id: sess.id,
        member_id: id,
        present: presentIds.has(id),
        marked_by: user.id,
        marked_at: now,
      }));
      const { error: rErr } = await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "session_id,member_id" });
      return rErr || null;
    },
    [user]
  );

  /*
   * Finalising used to be a button on the Report page, which meant a sabha
   * could be fully marked and still be absent from the saved-reports list —
   * marks and reports live in different tables. Now every successful save
   * writes the day's snapshot too, so "attendance marked" implies "report
   * saved" without anyone remembering to press anything.
   *
   * The Sheet mirror is queued rather than sent: see SHEET_SETTLE_MS.
   */
  const sheetOwedRef = useRef(new Map());
  const sheetTimerRef = useRef(null);
  const pushSheetRef = useRef(() => {});

  const finalize = useCallback(
    async (snap) => {
      const roster = rosterOf(snap);
      if (!roster) return;

      const row = reportRow({
        date: snap.date,
        mandal: snap.mandal,
        members: roster,
        presentIds: snap.presentIds,
        userId: user?.id,
      });
      // A failed snapshot isn't worth interrupting the taker for — the marks
      // themselves are already safe, and the next save re-finalises anyway.
      const err = await saveReportRows([row]);
      if (err) return;

      sheetOwedRef.current.set(`${snap.date}.${snap.mandal}`, row);
      if (sheetTimerRef.current) clearTimeout(sheetTimerRef.current);
      sheetTimerRef.current = setTimeout(
        () => pushSheetRef.current(),
        SHEET_SETTLE_MS
      );
    },
    [user]
  );

  // Send every owed row, grouped by date because the webhook takes one day at
  // a time. Called on the settle timer, and whenever the page is going away.
  const pushSheet = useCallback(async () => {
    if (sheetTimerRef.current) {
      clearTimeout(sheetTimerRef.current);
      sheetTimerRef.current = null;
    }
    const owed = [...sheetOwedRef.current.values()];
    if (owed.length === 0) return;
    sheetOwedRef.current.clear();

    const byDate = new Map();
    owed.forEach((row) => {
      const list = byDate.get(row.report_date) || [];
      list.push(row);
      byDate.set(row.report_date, list);
    });
    for (const [date_, rows] of byDate) {
      // eslint-disable-next-line no-await-in-loop
      await pushToSheet({ date: date_, savedBy: profile?.full_name || "", rows });
    }
  }, [profile]);

  pushSheetRef.current = pushSheet;

  /*
   * Drains pendingRef. Only ever one write in flight: anything that arrives
   * while one is running replaces the pending snapshot and is picked up by the
   * tail call below, so ticks can never be applied out of order.
   *
   * A failed write puts its snapshot back so the next attempt — automatic or
   * via Retry — still carries the marks. Losing a roster because the wifi
   * dropped for a second is the one outcome worth engineering against here.
   */
  const flush = useCallback(async () => {
    if (savingRef.current) return;
    const snap = pendingRef.current;
    if (!snap) return;

    pendingRef.current = null;
    savingRef.current = true;
    setStatus({ state: "saving", text: "" });

    const err = await writeSnapshot(snap);
    savingRef.current = false;

    if (err) {
      // Don't clobber a newer edit that landed while this was failing.
      if (!pendingRef.current) pendingRef.current = snap;
      setStatus({ state: "error", text: err.message || "Could not save." });
      return;
    }
    // Safely on the server — the draft has done its job.
    dropDraft(snap);

    if (pendingRef.current) {
      flushRef.current();
      return;
    }

    // Nothing further queued, so this is the roster as it stands: finalise it.
    finalize(snap);

    setStatus({
      state: "saved",
      text: `${snap.presentIds.length} present · ${idsOf(snap).length - snap.presentIds.length} absent · ${clockOf(new Date())}`,
    });
  }, [writeSnapshot, finalize]);

  flushRef.current = flush;

  // Debounce. Deps are [revision] on purpose: the effect closes over the state
  // as it was when a human last changed something, which is exactly the
  // snapshot we want to persist.
  useEffect(() => {
    if (revision === 0) return undefined;
    const snap = {
      date,
      mandal,
      // name and active ride along so the write can finalise the day's report
      // without re-fetching the roster.
      members: members.map((m) => ({ id: m.id, name: m.name, active: m.active })),
      presentIds: [...present],
    };
    pendingRef.current = snap;
    // To disk before the timer, not after the write. The window this closes is
    // exactly the one where marks used to vanish: ticked, but not yet sent.
    writeDraft(snap);
    setStatus({ state: "unsaved", text: "" });
    const id = setTimeout(() => flushRef.current(), AUTOSAVE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  // Switching date or mandal tears down the debounce above before it fires.
  // Write whatever was pending first — the snapshot carries its own date and
  // mandal, so it lands on the sheet it belongs to, not the one just opened.
  useEffect(() => {
    return () => {
      if (pendingRef.current) flushRef.current();
    };
  }, [date, mandal]);

  // Leaving the page for good — send whatever the Sheet is still owed rather
  // than letting the settle timer die with the component.
  useEffect(() => {
    return () => pushSheetRef.current();
  }, []);

  /*
   * The page going away mid-roster shouldn't drop the last few marks.
   *
   * `beforeunload` only ever warns, and on a phone it mostly doesn't fire at
   * all — locking the screen, switching apps, or the tab being discarded skip
   * it, and the pending debounce timer gets frozen with them. visibilitychange
   * and pagehide DO fire there, so they get the flush; beforeunload stays as a
   * desktop-only second line of defence. Should even this miss, the marks are
   * already on disk and the recovery pass below re-sends them.
   */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      flushRef.current();
      pushSheetRef.current();
    };
    const onPageHide = () => {
      flushRef.current();
      pushSheetRef.current();
    };
    const onLeave = (e) => {
      if (!pendingRef.current && !savingRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, []);

  /*
   * Recovery. Any draft still on disk is a sheet whose marks never reached the
   * server, from this session or a previous one. Re-send them once per mount —
   * a taker whose phone died mid-sabha gets their count back by doing nothing
   * more than opening this page.
   *
   * Drafts for mandals this person can no longer mark are left alone rather
   * than thrown at RLS; the sheet's own tab will pick them up if it opens.
   */
  const recoveredRef = useRef(false);
  useEffect(() => {
    if (recoveredRef.current || !user || markable.length === 0) return;
    recoveredRef.current = true;

    const stale = readAllDrafts().filter((s) => markable.includes(s.mandal));
    if (stale.length === 0) return;

    (async () => {
      const done = [];
      for (const snap of stale) {
        // Sequential on purpose: these share the one-write-in-flight discipline
        // the rest of the page keeps, and a stranded sheet is never urgent.
        // eslint-disable-next-line no-await-in-loop
        const err = await writeSnapshot(snap);
        if (err) continue;
        dropDraft(snap);
        // eslint-disable-next-line no-await-in-loop
        await finalize(snap);
        done.push(snap);
      }
      if (done.length === 0) return;
      setMsg({
        kind: "success",
        text: `Recovered unsaved attendance for ${done
          .map((d) => `${mandalShort(d.mandal)} (${d.date})`)
          .join(", ")}.`,
      });
    })();
  }, [user, markable, writeSnapshot, finalize]);

  const q = search.trim().toLowerCase();
  const filtered = members.filter(
    (m) =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.code || "").toLowerCase().includes(q)
  );

  // Pagination — 20 per page over the filtered roster.
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  if (markable.length === 0) {
    return (
      <Card>
        <p className="text-textSoft">
          You don&apos;t have any mandals assigned for attendance yet. Ask an admin to
          assign you.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark present / absent for a sabha." />

      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="block w-full sm:w-44">
            <span className="mb-1 block text-sm font-medium text-ink">Date</span>
            <input
              type="date"
              className={`${inputClass} h-11`}
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="block w-full sm:w-64">
            <span className="mb-1 block text-sm font-medium text-ink">Mandal / Sabha</span>
            <select
              className={`${inputClass} h-11`}
              value={mandal}
              onChange={(e) => setMandal(e.target.value)}
            >
              {markable.map((c) => (
                <option key={c} value={c}>
                  {mandalShort(c)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-textSoft">
              <span className="font-semibold text-green-700">{present.size} present</span>
              {"  ·  "}
              <span className="font-semibold text-red-700">
                {members.length - present.size} absent
              </span>
              {"  ·  "}
              {members.length} total
            </div>
            <div className="flex gap-2">
              <PortalButton variant="success" size="sm" onClick={allPresent}>
                Mark all present
              </PortalButton>
              <PortalButton variant="outline" size="sm" onClick={clearAll}>
                Clear
              </PortalButton>
            </div>
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-textSoft">
              No members in this mandal yet. Add them under Admin → Members.
            </p>
          ) : (
            <>
              <input
                placeholder="Search name or AYG code…"
                className={`${inputClass} mb-3`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <TableShell>
                <thead>
                  <tr className={tableHeadRow}>
                    <th className={thCell}>AYG Code</th>
                    <th className={thCell}>Name</th>
                    <th className={thCell}>Contact</th>
                    <th className={`${thCell} w-24 text-center`}>Present</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-textSoft">
                        No members match “{search}”.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((m) => {
                      const on = present.has(m.id);
                      return (
                        <tr
                          key={m.id}
                          onClick={() => toggle(m.id)}
                          className={`cursor-pointer border-b border-sand/40 transition last:border-0 ${
                            on ? "bg-green-50 hover:bg-green-100" : "hover:bg-cream"
                          }`}
                        >
                          <td className={tdCell}>
                            {m.code ? (
                              <span className="rounded bg-cream px-1.5 py-0.5 font-mono text-[11px] text-textMuted">
                                {m.code}
                              </span>
                            ) : (
                              <span className="text-textMuted">—</span>
                            )}
                          </td>
                          <td className={`${tdCell} font-medium text-ink`}>
                            {m.name}
                            {m.active === false && (
                              <span className="ml-2 rounded bg-cream px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-textMuted">
                                inactive
                              </span>
                            )}
                          </td>
                          <td className={`${tdCell} text-textMuted`}>{m.mobile || "—"}</td>
                          <td className={`${tdCell} text-center`}>
                            <input
                              type="checkbox"
                              className="pointer-events-none h-5 w-5 accent-green-600"
                              checked={on}
                              readOnly
                              tabIndex={-1}
                              aria-label={`Mark ${m.name} present`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </TableShell>

              {total > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-textMuted">
                    Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}
                  </span>
                  {pageCount > 1 && (
                    <div className="flex items-center gap-2">
                      <PortalButton
                        variant="outline"
                        size="sm"
                        disabled={safePage <= 1}
                        onClick={() => setPage(safePage - 1)}
                      >
                        ← Prev
                      </PortalButton>
                      <span className="px-1 text-textMuted">
                        Page {safePage} / {pageCount}
                      </span>
                      <PortalButton
                        variant="outline"
                        size="sm"
                        disabled={safePage >= pageCount}
                        onClick={() => setPage(safePage + 1)}
                      >
                        Next →
                      </PortalButton>
                    </div>
                  )}
                </div>
              )}

              {msg.text && (
                <div className="mt-4">
                  <Alert kind={msg.kind}>{msg.text}</Alert>
                </div>
              )}

              {/* Autosave status. A failed write keeps its marks and offers a
                  retry rather than pretending nothing happened — this is the
                  one screen where silently losing input costs a re-count of
                  the whole sabha. */}
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-sand/60 pt-4">
                {status.state === "saving" && (
                  <span className="flex items-center gap-2 text-sm text-textSoft">
                    <Spinner className="h-4 w-4" />
                    Saving…
                  </span>
                )}

                {status.state === "unsaved" && (
                  <span className="text-sm text-textMuted">Unsaved changes…</span>
                )}

                {status.state === "saved" && (
                  <span className="text-sm font-medium text-green-700">
                    ✓ Saved · {status.text}
                  </span>
                )}

                {status.state === "idle" && (
                  <span className="text-sm text-textMuted">
                    Changes save automatically.
                  </span>
                )}

                {status.state === "error" && (
                  <>
                    <span className="text-sm font-medium text-red-700">
                      Not saved — {status.text}
                    </span>
                    <PortalButton
                      variant="danger"
                      size="sm"
                      onClick={() => flushRef.current()}
                    >
                      Retry
                    </PortalButton>
                  </>
                )}

                {(status.state === "unsaved" || status.state === "idle") && (
                  <PortalButton
                    variant="outline"
                    size="sm"
                    disabled={status.state === "idle"}
                    onClick={() => flushRef.current()}
                  >
                    Save now
                  </PortalButton>
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
