import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase, fetchAllRows } from "../../lib/supabaseClient";
import {
  Alert,
  Card,
  Field,
  Modal,
  PageHeader,
  PortalButton,
  Spinner,
  TableShell,
  inputClass,
  tableHeadRow,
  tdCell,
  thCell,
} from "../../portal/ui";
import {
  EDUCATION_LEVELS,
  EDUCATION_STATUSES,
  GROUPS,
  OCCUPATIONS,
  isValidMobile,
} from "../../lib/registrationOptions";

/*
 * Event registrations submitted through the home-page banner form.
 *
 * Read-only. Rows arrive from the public site and the RLS policy on
 * event_registrations grants select to admins only, so this page renders
 * nothing for anyone else — the route guard is the real gate, this is just
 * where the data surfaces.
 */

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Only these columns are editable. event_slug is left out deliberately: it is
// the de-duplication key, and moving a row between events could silently
// collide with an existing registration there.
const EDITABLE = [
  "full_name",
  "mobile",
  "reference",
  "group_name",
  "occupation",
  "education",
  "education_status",
  "specialization",
];

export default function AdminRegistrations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [event, setEvent] = useState("all");
  const [group, setGroup] = useState("all");
  const [q, setQ] = useState("");

  const [editing, setEditing] = useState(null); // row being edited
  const [draft, setDraft] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null); // row awaiting confirmation
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    // fetchAllRows pages past PostgREST's 1000-row cap — a popular event will
    // pass that, and a plain select would silently truncate.
    const { data, error: err } = await fetchAllRows(() =>
      supabase
        .from("event_registrations")
        .select("*")
        .order("created_at", { ascending: false })
    );
    if (err) setError(err.message);
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filter options come from the rows themselves rather than a hard-coded list,
  // so a past event's registrations stay browsable after the banner moves on.
  const events = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => seen.set(r.event_slug, r.event_name));
    return [...seen.entries()];
  }, [rows]);

  const groups = useMemo(
    () => [...new Set(rows.map((r) => r.group_name))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (event !== "all" && r.event_slug !== event) return false;
      if (group !== "all" && r.group_name !== group) return false;
      if (!needle) return true;
      return (
        r.full_name.toLowerCase().includes(needle) ||
        r.mobile.toLowerCase().includes(needle) ||
        r.reference.toLowerCase().includes(needle)
      );
    });
  }, [rows, event, group, q]);

  // Counts per group for the filtered set — the number the team actually asks
  // for when planning prasad and seating.
  const byGroup = useMemo(() => {
    const counts = new Map();
    filtered.forEach((r) =>
      counts.set(r.group_name, (counts.get(r.group_name) || 0) + 1)
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const openEdit = (row) => {
    setFormError("");
    setEditing(row);
    setDraft(Object.fromEntries(EDITABLE.map((k) => [k, row[k] ?? ""])));
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!isValidMobile(draft.mobile)) {
      setFormError("Enter a valid 10-digit mobile number.");
      return;
    }
    setFormError("");
    setSaving(true);

    const patch = Object.fromEntries(
      EDITABLE.map((k) => [k, typeof draft[k] === "string" ? draft[k].trim() : draft[k]])
    );
    const { error: err } = await supabase
      .from("event_registrations")
      .update(patch)
      .eq("id", editing.id);
    setSaving(false);

    if (err) {
      // Same unique index the public form hits. Changing a mobile to one that
      // is already registered for this event has to be refused, not silently
      // dropped.
      setFormError(
        err.code === "23505"
          ? "Another registration for this event already uses that mobile number."
          : err.message || "Could not save the changes."
      );
      return;
    }

    setRows((rs) => rs.map((r) => (r.id === editing.id ? { ...r, ...patch } : r)));
    setNotice(`Updated ${patch.full_name}.`);
    setEditing(null);
  };

  const confirmDelete = async () => {
    setBusy(true);
    const { error: err } = await supabase
      .from("event_registrations")
      .delete()
      .eq("id", deleting.id);
    setBusy(false);

    if (err) {
      setError(err.message);
      setDeleting(null);
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== deleting.id));
    setNotice(`Deleted ${deleting.full_name}.`);
    setDeleting(null);
  };

  const download = () => {
    const sheet = filtered.map((r) => ({
      Registered: fmtDate(r.created_at),
      Event: r.event_name,
      Name: r.full_name,
      Mobile: r.mobile,
      Group: r.group_name,
      Reference: r.reference,
      Occupation: r.occupation,
      Education: r.education,
      Status: r.education_status,
      Specialization: r.specialization,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheet);
    ws["!cols"] = [
      { wch: 20 }, { wch: 16 }, { wch: 28 }, { wch: 15 }, { wch: 22 },
      { wch: 20 }, { wch: 12 }, { wch: 26 }, { wch: 11 }, { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    const name = event === "all" ? "all-events" : event;
    XLSX.writeFile(wb, `registrations-${name}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Event Registrations"
        subtitle="Submitted through the Register button on the home page."
        actions={
          <>
            <PortalButton variant="outline" size="sm" onClick={load}>
              ↻ Refresh
            </PortalButton>
            <PortalButton
              variant="outline"
              size="sm"
              onClick={download}
              disabled={!filtered.length}
            >
              ↓ Download Excel
            </PortalButton>
          </>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Alert kind="success">{notice}</Alert>
        </div>
      )}

      {rows.length === 0 && !error ? (
        <Card>
          <div className="py-10 text-center">
            <p className="text-3xl">📝</p>
            <p className="mt-2 text-sm text-textSoft">
              No registrations yet. They'll appear here as soon as someone
              submits the form on the home page.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">Event</span>
                <select
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">All events</option>
                  {events.map(([slug, label]) => (
                    <option key={slug} value={slug}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">Group</span>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">All groups</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-[12rem] flex-1">
                <span className="mb-1 block text-sm font-medium text-ink">Search</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name, mobile or reference"
                  className={inputClass}
                />
              </label>
            </div>

            <p className="mt-4 text-sm text-textSoft">
              <span className="font-semibold text-ink">{filtered.length}</span>{" "}
              registration{filtered.length === 1 ? "" : "s"}
              {filtered.length !== rows.length && ` of ${rows.length}`}
            </p>

            {byGroup.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {byGroup.map(([g, n]) => (
                  <span
                    key={g}
                    className="rounded-full bg-cream px-3 py-1 text-xs text-ink"
                  >
                    {g} <span className="font-semibold">{n}</span>
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <TableShell minWidth="min-w-[62rem]">
              <thead>
                <tr className={tableHeadRow}>
                  <th className={thCell}>Registered</th>
                  <th className={thCell}>Name</th>
                  <th className={thCell}>Mobile</th>
                  <th className={thCell}>Group</th>
                  <th className={thCell}>Reference</th>
                  <th className={thCell}>Occupation</th>
                  <th className={thCell}>Education</th>
                  <th className={thCell}>Specialization</th>
                  <th className={`${thCell} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-sand/50 last:border-0">
                    <td className={`${tdCell} whitespace-nowrap text-xs text-textMuted`}>
                      {fmtDate(r.created_at)}
                    </td>
                    <td className={`${tdCell} font-medium text-ink`}>{r.full_name}</td>
                    <td className={tdCell}>
                      {/* Tap-to-call: this list gets used from a phone. */}
                      <a
                        href={`tel:${r.mobile.replace(/\s/g, "")}`}
                        className="whitespace-nowrap font-mono text-xs text-maroon hover:underline"
                      >
                        {r.mobile}
                      </a>
                    </td>
                    <td className={tdCell}>{r.group_name}</td>
                    <td className={tdCell}>{r.reference}</td>
                    <td className={tdCell}>{r.occupation}</td>
                    <td className={tdCell}>
                      {r.education}
                      <span className="ml-1 text-xs text-textMuted">
                        ({r.education_status})
                      </span>
                    </td>
                    <td className={tdCell}>{r.specialization}</td>
                    <td className={`${tdCell} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        <PortalButton
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(r)}
                        >
                          Edit
                        </PortalButton>
                        <PortalButton
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleting(r)}
                        >
                          Delete
                        </PortalButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-sm text-textSoft">
                      Nothing matches those filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </TableShell>
          </Card>
        </>
      )}

      {/* ── Edit ── */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit registration"
      >
        <form onSubmit={saveEdit} className="space-y-3">
          <p className="rounded-lg bg-cream px-3 py-2 text-xs text-textSoft">
            {editing?.event_name} · registered{" "}
            {editing ? fmtDate(editing.created_at) : ""}
          </p>

          <Field label="Youth's full name">
            <input
              required
              maxLength={120}
              className={inputClass}
              value={draft.full_name || ""}
              onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Mobile" hint="One registration per number, per event.">
              <input
                type="tel"
                required
                className={inputClass}
                value={draft.mobile || ""}
                onChange={(e) => setDraft({ ...draft, mobile: e.target.value })}
              />
            </Field>
            <Field label="Whose reference?">
              <input
                required
                maxLength={120}
                className={inputClass}
                value={draft.reference || ""}
                onChange={(e) => setDraft({ ...draft, reference: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Group">
              <select
                required
                className={inputClass}
                value={draft.group_name || ""}
                onChange={(e) => setDraft({ ...draft, group_name: e.target.value })}
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Occupation">
              <select
                required
                className={inputClass}
                value={draft.occupation || ""}
                onChange={(e) => setDraft({ ...draft, occupation: e.target.value })}
              >
                {OCCUPATIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Education">
              <select
                required
                className={inputClass}
                value={draft.education || ""}
                onChange={(e) => setDraft({ ...draft, education: e.target.value })}
              >
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Education status">
              <select
                required
                className={inputClass}
                value={draft.education_status || ""}
                onChange={(e) =>
                  setDraft({ ...draft, education_status: e.target.value })
                }
              >
                {EDUCATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Specialization / domain / profession">
            <input
              required
              maxLength={120}
              className={inputClass}
              value={draft.specialization || ""}
              onChange={(e) =>
                setDraft({ ...draft, specialization: e.target.value })
              }
            />
          </Field>

          {formError && <Alert>{formError}</Alert>}

          <div className="flex justify-end gap-2 pt-1">
            <PortalButton
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              Cancel
            </PortalButton>
            <PortalButton type="submit" loading={saving}>
              Save changes
            </PortalButton>
          </div>
        </form>
      </Modal>

      {/* ── Delete ── */}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete registration?"
        maxWidth="max-w-md"
      >
        <p className="text-sm text-textSoft">
          This removes{" "}
          <span className="font-semibold text-ink">{deleting?.full_name}</span> (
          {deleting?.mobile}) from{" "}
          <span className="font-semibold text-ink">{deleting?.event_name}</span>.
          It can&apos;t be undone — but the number becomes free to register
          again.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <PortalButton
            type="button"
            variant="outline"
            onClick={() => setDeleting(null)}
          >
            Cancel
          </PortalButton>
          <PortalButton variant="danger" loading={busy} onClick={confirmDelete}>
            Delete
          </PortalButton>
        </div>
      </Modal>
    </div>
  );
}
