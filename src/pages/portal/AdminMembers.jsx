import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase, fetchAllRows } from "../../lib/supabaseClient";
import {
  MANDALS,
  MANDAL_CODES,
  mandalShort,
  todayISO,
  EDUCATION_LEVELS,
  EDUCATION_STATUSES,
  OCCUPATIONS,
} from "../../portal/constants";
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

// Column headers used in the bulk-import Excel template (mirrors the master
// sheet). "Roll No" is the AYG code; Mandal is auto-derived from its first two
// letters when a Mandal column isn't present.
const IMPORT_COLUMNS = [
  "Name",
  "Roll No",
  "Date of Birth",
  "Mobile",
  "Parent Mobile",
  "Education",
  "Education Status",
  "Occupation",
];

// Case-insensitive lookup of a cell value across possible header spellings.
const pickCell = (row, ...keys) => {
  for (const k of keys) {
    const hit = Object.keys(row).find(
      (rk) => rk.trim().toLowerCase() === k.toLowerCase()
    );
    if (hit && String(row[hit]).trim() !== "") return String(row[hit]).trim();
  }
  return "";
};

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
// Normalise a date-of-birth cell to YYYY-MM-DD. Handles ISO, DD/MM/YYYY,
// DD-MMM-YYYY and Excel serial numbers; returns "" if it can't parse.
const parseDob = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    if (n > 10000 && n < 60000) {
      return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);
    }
    return "";
  }
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{4})$/);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
};

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  name: "",
  mobile: "",
  parent_mobile: "",
  dob: "",
  education: "",
  study_status: "pursuing", // Education status
  occupation: "student",
  mandal: "",
  team: "",
  code: "",
  active: true,
};

export default function AdminMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMandal, setFilterMandal] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [adding, setAdding] = useState(false);

  const openAdd = () => {
    setMsg({ kind: "", text: "" });
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (m) => {
    setMsg({ kind: "", text: "" });
    setEditingId(m.id);
    // Normalise so the radios/select reliably match stored values even if an
    // import saved them with different casing/spacing (e.g. "Completed", "Job").
    setForm({
      name: m.name || "",
      mobile: m.mobile || "",
      parent_mobile: m.parent_mobile || "",
      dob: m.dob || "",
      education: (m.education || "").trim(),
      study_status: (m.study_status || "pursuing").toLowerCase(),
      occupation: (m.occupation || "student").toLowerCase(),
      mandal: m.mandal || "",
      team: "",
      code: m.code || "",
      active: m.active ?? true,
    });
    setFormOpen(true);
  };

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchAllRows(() =>
      supabase
        .from("members")
        .select("*")
        .order("mandal")
        .order("code", { ascending: true, nullsFirst: false })
        .order("name")
    );
    if (error) setMsg({ kind: "error", text: error.message });
    setMembers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addMember = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mandal) return;
    setAdding(true);
    setMsg({ kind: "", text: "" });

    // If a team was chosen, auto-assign the next AYG code within that team —
    // e.g. team HK01 whose highest is HK0105 → new member becomes HK0106.
    let code = null;
    if (form.team) {
      const nums = members
        .filter((m) => (m.code || "").slice(0, 4) === form.team)
        .map((m) => parseInt((m.code || "").slice(4), 10))
        .filter((n) => !Number.isNaN(n));
      const next = (nums.length ? Math.max(...nums) : 0) + 1;
      code = form.team + String(next).padStart(2, "0");
    }

    const { error } = await supabase.from("members").insert({
      name: form.name.trim(),
      mandal: form.mandal,
      mobile: form.mobile.trim() || null,
      parent_mobile: form.parent_mobile.trim() || null,
      dob: form.dob || null,
      education: form.education || null,
      study_status: form.study_status || null,
      occupation: form.occupation || null,
      team: form.team || null,
      code,
    });
    setAdding(false);
    if (error) {
      setMsg({ kind: "error", text: error.message });
      return;
    }
    setForm(EMPTY_FORM);
    setFormOpen(false);
    setMsg({
      kind: "success",
      text: code ? `Member added as ${code}.` : "Member added.",
    });
    load();
  };

  // Save edits to an existing member. The AYG code is editable directly here;
  // `team` is kept in sync with the code's first 4 chars.
  const updateMember = async (e) => {
    e.preventDefault();
    if (!editingId || !form.name.trim() || !form.mandal) return;
    setAdding(true);
    setMsg({ kind: "", text: "" });

    const code = form.code.trim();
    const { error } = await supabase
      .from("members")
      .update({
        name: form.name.trim(),
        mandal: form.mandal,
        mobile: form.mobile.trim() || null,
        parent_mobile: form.parent_mobile.trim() || null,
        dob: form.dob || null,
        education: form.education || null,
        study_status: form.study_status || null,
        occupation: form.occupation || null,
        code: code || null,
        team: code.length >= 6 ? code.slice(0, 4) : null,
        active: form.active,
      })
      .eq("id", editingId);
    setAdding(false);
    if (error) {
      setMsg({ kind: "error", text: error.message });
      return;
    }
    setFormOpen(false);
    setEditingId(null);
    setMsg({ kind: "success", text: "Member updated." });
    load();
  };

  const toggleActive = async (m) => {
    const { error } = await supabase
      .from("members")
      .update({ active: !m.active })
      .eq("id", m.id);
    if (error) setMsg({ kind: "error", text: error.message });
    else setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)));
  };

  const remove = async (m) => {
    const { error } = await supabase.from("members").delete().eq("id", m.id);
    if (error) setMsg({ kind: "error", text: error.message });
    else setMembers((ms) => ms.filter((x) => x.id !== m.id));
  };

  // Build + download a sample .xlsx so admins know the expected columns.
  const downloadSample = () => {
    const sample = [
      {
        Name: "Ramesh Patel",
        "Roll No": "SY1101",
        "Date of Birth": "2002-05-14",
        Mobile: "9876543210",
        "Parent Mobile": "9123456780",
        Education: "Graduate (B.Com, BSc, etc)",
        "Education Status": "Completed",
        Occupation: "Student",
      },
      {
        Name: "Suresh Shah",
        "Roll No": "SY1102",
        "Date of Birth": "1998-11-02",
        Mobile: "9876500000",
        "Parent Mobile": "",
        Education: "HSC (11th, 12th)",
        "Education Status": "Pursuing",
        Occupation: "Job",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample, { header: IMPORT_COLUMNS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    XLSX.writeFile(wb, "members-import-sample.xlsx");
  };

  // Bulk import from an Excel/CSV file. Reads the first sheet, maps columns to
  // member fields (case-insensitive headers), validates, then inserts.
  const runImport = async () => {
    if (!importFile) {
      setMsg({ kind: "error", text: "Choose an Excel or CSV file first." });
      return;
    }
    setImporting(true);
    setMsg({ kind: "", text: "" });
    try {
      const buf = await importFile.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Which optional columns the file actually contains — so we only update
      // those and never blank out fields the sheet didn't include.
      const headers = new Set(
        Object.keys(rows[0] || {}).map((k) => k.trim().toLowerCase())
      );
      const has = (...names) => names.some((n) => headers.has(n.toLowerCase()));
      const hasDob = has("Date of Birth", "DOB", "Date Of Birth");
      const hasMobile = has("Mobile", "Contact", "Contact Number");
      const hasParent = has("Parent Mobile", "Parent Contact");
      const hasEducation = has("Education", "Qualification", "Latest Studies");
      const hasStatus = has("Education Status", "Study Status", "Studies");
      const hasOccupation = has("Occupation", "Status");

      const valid = [];
      const bad = [];
      rows.forEach((row, i) => {
        const name = pickCell(row, "Name");
        const code = pickCell(row, "Roll No", "Code", "AYG Code");
        // Mandal column if present, otherwise derive from the Roll No prefix
        // (e.g. SY1101 → SY, AB0101 → AB).
        const mandal =
          pickCell(row, "Mandal").toUpperCase() ||
          (code.length >= 2 ? code.slice(0, 2).toUpperCase() : "");
        if (!name || !MANDAL_CODES.includes(mandal)) {
          bad.push(i + 2); // +1 for header row, +1 for 1-based numbering
          return;
        }

        // Same key set on every row so PostgREST builds one upsert statement.
        const rec = {
          name,
          mandal,
          code: code || null,
          team: code.length >= 6 ? code.slice(0, 4) : null,
        };
        if (hasDob)
          rec.dob = parseDob(pickCell(row, "Date of Birth", "DOB", "Date Of Birth")) || null;
        if (hasMobile)
          rec.mobile = pickCell(row, "Mobile", "Contact", "Contact Number") || null;
        if (hasParent)
          rec.parent_mobile = pickCell(row, "Parent Mobile", "Parent Contact") || null;
        if (hasEducation)
          rec.education =
            pickCell(row, "Education", "Qualification", "Latest Studies") || null;
        if (hasStatus) {
          const ss = pickCell(row, "Education Status", "Study Status", "Studies").toLowerCase();
          rec.study_status = ["pursuing", "completed"].includes(ss) ? ss : null;
        }
        if (hasOccupation) {
          const occ = pickCell(row, "Occupation", "Status").toLowerCase();
          rec.occupation = ["student", "job", "business"].includes(occ) ? occ : null;
        }
        valid.push(rec);
      });

      if (valid.length === 0) {
        setImporting(false);
        setMsg({
          kind: "error",
          text: "No valid rows found. Each row needs a Name and a Roll No (or Mandal). Download the sample for the exact columns.",
        });
        return;
      }

      // Upsert by code (Roll No): existing members are updated, new ones inserted.
      const { error } = await supabase
        .from("members")
        .upsert(valid, { onConflict: "code" });
      setImporting(false);
      if (error) {
        setMsg({ kind: "error", text: error.message });
        return;
      }
      setImportFile(null);
      setImportOpen(false);
      setMsg({
        kind: "success",
        text: `Imported / updated ${valid.length} member(s).${
          bad.length ? ` Skipped ${bad.length} invalid row(s): ${bad.join(", ")}.` : ""
        }`,
      });
      load();
    } catch (err) {
      setImporting(false);
      setMsg({ kind: "error", text: `Could not read the file: ${err.message}` });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter(
      (m) =>
        (!filterMandal || m.mandal === filterMandal) &&
        (!q ||
          m.name.toLowerCase().includes(q) ||
          (m.code || "").toLowerCase().includes(q))
    );
  }, [members, filterMandal, search]);

  // Teams for the mandal selected in the Add-member form. A team is the first 4
  // chars of the AYG code (e.g. HK01); its leader is the member ending in "01"
  // (HK0101). Falls back to the lowest code if no exact "01" exists.
  const teams = useMemo(() => {
    if (!form.mandal) return [];
    const byTeam = {};
    members.forEach((m) => {
      if (m.mandal !== form.mandal) return;
      const code = (m.code || "").trim();
      if (code.length < 6) return;
      const key = code.slice(0, 4);
      if (!byTeam[key]) byTeam[key] = { team: key, leader: null, list: [] };
      byTeam[key].list.push(m);
      if (code.slice(4) === "01") byTeam[key].leader = m;
    });
    return Object.values(byTeam)
      .map((t) => ({
        team: t.team,
        leader:
          t.leader ||
          [...t.list].sort((a, b) => (a.code || "").localeCompare(b.code || ""))[0],
      }))
      .sort((a, b) => a.team.localeCompare(b.team));
  }, [members, form.mandal]);

  // Back to page 1 whenever the filter narrows or widens the list.
  useEffect(() => {
    setPage(1);
  }, [filterMandal, search]);

  // Pagination — 20 per page over the filtered roster.
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const counts = useMemo(() => {
    const total = {};
    const active = {};
    members.forEach((m) => {
      total[m.mandal] = (total[m.mandal] || 0) + 1;
      if (m.active) active[m.mandal] = (active[m.mandal] || 0) + 1;
    });
    return { total, active };
  }, [members]);

  const activeTotal = members.filter((m) => m.active).length;

  return (
    <div>
      <PageHeader title="Members" subtitle="The attendance roster, grouped by mandal." />

      {msg.text && (
        <div className="mb-4">
          <Alert kind={msg.kind}>{msg.text}</Alert>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        {MANDALS.map((m) => (
          <span key={m.code} className="rounded-full bg-cream px-3 py-1 text-ink">
            {m.code}: <strong>{counts.total[m.code] || 0}</strong>
            <span className="text-textMuted"> ({counts.active[m.code] || 0} active)</span>
          </span>
        ))}
        <span className="rounded-full bg-maroon/10 px-3 py-1 font-semibold text-maroon">
          Total: {members.length}{" "}
          <span className="font-normal text-maroon/70">({activeTotal} active)</span>
        </span>
      </div>

      <div className="mb-6 flex flex-wrap justify-end gap-3">
        <PortalButton onClick={openAdd}>+ Add member</PortalButton>
        <PortalButton
          variant="outline"
          onClick={() => {
            setMsg({ kind: "", text: "" });
            setImportOpen(true);
          }}
        >
          Import from Excel
        </PortalButton>
      </div>

      {/* Add / Edit member modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Edit member" : "Add a member"}
      >
        <form onSubmit={editingId ? updateMember : addMember} className="space-y-3">
            <Field label="Name">
              <input required className={inputClass} value={form.name} onChange={set("name")} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact number">
                <input
                  type="tel"
                  className={inputClass}
                  value={form.mobile}
                  onChange={set("mobile")}
                />
              </Field>
              <Field label="Parent contact (optional)">
                <input
                  type="tel"
                  className={inputClass}
                  value={form.parent_mobile}
                  onChange={set("parent_mobile")}
                />
              </Field>
            </div>

            <Field label="Date of birth">
              <input
                type="date"
                className={`${inputClass} h-11`}
                value={form.dob}
                max={todayISO()}
                onChange={set("dob")}
              />
            </Field>

            <Field label="Education">
              <select className={inputClass} value={form.education} onChange={set("education")}>
                <option value="">Select…</option>
                {(EDUCATION_LEVELS.includes(form.education) || !form.education
                  ? EDUCATION_LEVELS
                  : [form.education, ...EDUCATION_LEVELS]
                ).map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Education status">
              <div className="flex gap-5 pt-1">
                {EDUCATION_STATUSES.map((s) => (
                  <label
                    key={s.value}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="radio"
                      name="study_status"
                      className="h-4 w-4 accent-maroon"
                      checked={form.study_status === s.value}
                      onChange={() => setForm((f) => ({ ...f, study_status: s.value }))}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Occupation">
              <div className="flex flex-wrap gap-5 pt-1">
                {OCCUPATIONS.map((o) => (
                  <label
                    key={o.value}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="radio"
                      name="occupation"
                      className="h-4 w-4 accent-maroon"
                      checked={form.occupation === o.value}
                      onChange={() => setForm((f) => ({ ...f, occupation: o.value }))}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Mandal">
              <select required className={inputClass} value={form.mandal} onChange={set("mandal")}>
                <option value="">Select…</option>
                {MANDALS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {mandalShort(m.code)}
                  </option>
                ))}
              </select>
            </Field>

            {editingId ? (
              <>
                <Field label="AYG code" hint="Controls roster ordering and team grouping.">
                  <input
                    className={inputClass}
                    value={form.code}
                    onChange={set("code")}
                    placeholder="e.g. HK0106"
                  />
                </Field>
                <Field label="Active">
                  <label className="inline-flex cursor-pointer items-center gap-2 pt-1 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-maroon"
                      checked={form.active}
                      onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    />
                    Active member
                  </label>
                </Field>
              </>
            ) : (
              <Field
                label="Team"
                hint={
                  !form.mandal
                    ? "Pick a mandal first to see its teams."
                    : "Listed by team leader. The new member gets the next code in that team."
                }
              >
                <select
                  className={inputClass}
                  value={form.team}
                  onChange={set("team")}
                  disabled={!form.mandal}
                >
                  <option value="">No team / unassigned</option>
                  {teams.map((t) => (
                    <option key={t.team} value={t.team}>
                      {t.team} — {t.leader?.name || "(no leader)"}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <PortalButton type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </PortalButton>
              <PortalButton type="submit" loading={adding}>
                {editingId ? "Save changes" : "Add member"}
              </PortalButton>
            </div>
          </form>
      </Modal>

      {/* Bulk import modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import members from Excel"
      >
        <div className="space-y-4">
          <p className="text-sm text-textSoft">
            Upload an <strong>.xlsx</strong>, <strong>.xls</strong> or{" "}
            <strong>.csv</strong> file. The first row must be column headers. Each
            row needs a <strong>Name</strong> and a <strong>Roll No</strong> (its
            first two letters set the mandal, e.g. SY1101 → SY).
          </p>
          <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-ink">
            Matched by <strong>Roll No</strong>: existing members are{" "}
            <strong>updated</strong>, new ones added — no duplicates. Only the
            columns in your file are changed, so you can upload just{" "}
            <em>Roll No + Education + Education Status + Occupation</em> to backfill
            those without touching anything else.
          </p>

          <div className="rounded-lg border border-sand bg-cream/40 px-4 py-3 text-sm">
            <p className="mb-1 font-semibold text-ink">Columns</p>
            <p className="text-textSoft">{IMPORT_COLUMNS.join(" · ")}</p>
            <button
              type="button"
              onClick={downloadSample}
              className="mt-2 font-semibold text-maroon hover:underline"
            >
              ↓ Download sample Excel
            </button>
          </div>

          <Field label="Choose file">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-maroon file:px-4 file:py-2 file:font-semibold file:text-onDark hover:file:bg-maroonDark"
            />
          </Field>
          {importFile && (
            <p className="text-xs text-textMuted">Selected: {importFile.name}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <PortalButton type="button" variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </PortalButton>
            <PortalButton onClick={runImport} loading={importing} disabled={!importFile}>
              Import
            </PortalButton>
          </div>
        </div>
      </Modal>

      {/* Roster list */}
      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl text-maroon">Roster</h2>
          <select
            className={`${inputClass} max-w-[200px]`}
            value={filterMandal}
            onChange={(e) => setFilterMandal(e.target.value)}
          >
            <option value="">All mandals</option>
            {MANDALS.map((m) => (
              <option key={m.code} value={m.code}>
                {mandalShort(m.code)}
              </option>
            ))}
          </select>
          <input
            placeholder="Search name or AYG code…"
            className={`${inputClass} max-w-[220px]`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="ml-auto text-sm text-textMuted">{filtered.length} shown</span>
        </div>

        {loading ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <TableShell minWidth="min-w-[620px]">
            <thead>
              <tr className={tableHeadRow}>
                <th className={thCell}>AYG Code</th>
                <th className={thCell}>Name</th>
                <th className={thCell}>Mandal</th>
                <th className={thCell}>Mobile</th>
                <th className={`${thCell} text-center`}>Active</th>
                <th className={`${thCell} text-right`}></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((m) => (
                <tr key={m.id} className="border-b border-sand/40 last:border-0 hover:bg-cream">
                  <td className={tdCell}>
                    {m.code ? (
                      <span className="rounded bg-cream px-1.5 py-0.5 font-mono text-[11px] text-textMuted">
                        {m.code}
                      </span>
                    ) : (
                      <span className="text-textMuted">—</span>
                    )}
                  </td>
                  <td className={`${tdCell} font-medium text-ink`}>{m.name}</td>
                  <td className={tdCell}>{m.mandal}</td>
                  <td className={`${tdCell} text-textSoft`}>{m.mobile || "—"}</td>
                  <td className={`${tdCell} text-center`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-maroon"
                      checked={m.active}
                      onChange={() => toggleActive(m)}
                    />
                  </td>
                  <td className={`${tdCell} text-right`}>
                    <button
                      onClick={() => openEdit(m)}
                      className="mr-3 text-xs font-semibold text-maroon hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(m)}
                      className="text-xs font-semibold text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-textMuted">
                    No members.
                  </td>
                </tr>
              )}
            </tbody>
          </TableShell>
        )}

        {!loading && total > 0 && (
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
      </Card>
    </div>
  );
}
