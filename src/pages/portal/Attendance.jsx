import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, fetchAllRows } from "../../lib/supabaseClient";
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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

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
    setLoading(false);
  }, [date, mandal]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  // Jump back to the first page whenever the roster or filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, mandal, date]);

  const toggle = (id) =>
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allPresent = () => setPresent(new Set(members.map((m) => m.id)));
  const clearAll = () => setPresent(new Set());

  const save = async () => {
    setSaving(true);
    setMsg({ kind: "", text: "" });

    // 1) Upsert the session, get its id
    const { data: sess, error: sErr } = await supabase
      .from("attendance_sessions")
      .upsert(
        { session_date: date, mandal, created_by: user.id },
        { onConflict: "session_date,mandal" }
      )
      .select("id")
      .single();
    if (sErr) {
      setMsg({ kind: "error", text: sErr.message });
      setSaving(false);
      return;
    }

    // 2) Upsert a record per member
    const now = new Date().toISOString();
    const rows = members.map((m) => ({
      session_id: sess.id,
      member_id: m.id,
      present: present.has(m.id),
      marked_by: user.id,
      marked_at: now,
    }));
    const { error: rErr } = await supabase
      .from("attendance_records")
      .upsert(rows, { onConflict: "session_id,member_id" });
    setSaving(false);
    if (rErr) {
      setMsg({ kind: "error", text: rErr.message });
      return;
    }
    setMsg({
      kind: "success",
      text: `Saved — ${present.size} present, ${members.length - present.size} absent.`,
    });
  };

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

              <div className="mt-5">
                <PortalButton onClick={save} loading={saving}>
                  Save attendance
                </PortalButton>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
