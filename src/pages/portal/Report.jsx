import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase, fetchAllRows } from "../../lib/supabaseClient";
import { useAuth } from "../../portal/AuthContext";
import {
  MANDAL_CODES,
  MANDAL_BY_CODE,
  dayNameOf,
  mandalShort,
  todayISO,
} from "../../portal/constants";
import {
  Alert,
  Card,
  PageHeader,
  PortalButton,
  Spinner,
  inputClass,
} from "../../portal/ui";

const SHEET_WEBHOOK = process.env.REACT_APP_REPORT_SHEET_WEBHOOK;

export default function Report() {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === "admin";

  const visible = useMemo(
    () => (isAdmin ? MANDAL_CODES : profile?.assigned_locations || []),
    [isAdmin, profile]
  );

  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setCopied(false);
    setMsg({ kind: "", text: "" });

    const out = await Promise.all(
      visible.map(async (mandal) => {
        // Pull the whole roster (active + inactive) so anyone marked present
        // shows up, but keep the "absent" list focused on the active roster so
        // it isn't flooded with inactive members who were never expected.
        const { data: mem } = await fetchAllRows(() =>
          supabase
            .from("members")
            .select("id,name,active")
            .eq("mandal", mandal)
            .order("name")
        );
        const members = mem || [];
        const activeCount = members.filter((m) => m.active).length;

        const { data: sess } = await supabase
          .from("attendance_sessions")
          .select("id")
          .eq("session_date", date)
          .eq("mandal", mandal)
          .maybeSingle();

        if (!sess?.id) {
          return { mandal, taken: false, total: activeCount, present: [], absent: [] };
        }

        const { data: recs } = await supabase
          .from("attendance_records")
          .select("member_id,present")
          .eq("session_id", sess.id);
        const presentIds = new Set((recs || []).filter((r) => r.present).map((r) => r.member_id));

        const present = members.filter((m) => presentIds.has(m.id)).map((m) => m.name);
        const absent = members
          .filter((m) => m.active && !presentIds.has(m.id))
          .map((m) => m.name);
        return { mandal, taken: true, total: present.length + absent.length, present, absent };
      })
    );
    setRows(out);

    // Has this date already been saved?
    const { data: snaps } = await supabase
      .from("attendance_reports")
      .select("finalized_at")
      .eq("report_date", date)
      .order("finalized_at", { ascending: false })
      .limit(1);
    setSavedAt(snaps?.[0]?.finalized_at || null);
    setLoading(false);
  }, [date, visible]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("attendance_reports")
      .select("report_date,present_count,absent_count,finalized_at")
      .order("report_date", { ascending: false })
      .limit(300);
    const byDate = {};
    (data || []).forEach((r) => {
      const d =
        byDate[r.report_date] ||
        (byDate[r.report_date] = {
          date: r.report_date,
          present: 0,
          absent: 0,
          mandals: 0,
          finalized_at: r.finalized_at,
        });
      d.present += r.present_count;
      d.absent += r.absent_count;
      d.mandals += 1;
      if (r.finalized_at > d.finalized_at) d.finalized_at = r.finalized_at;
    });
    setHistory(Object.values(byDate).slice(0, 20));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const totals = rows.reduce(
    (a, r) => ({
      present: a.present + r.present.length,
      absent: a.absent + (r.taken ? r.absent.length : 0),
    }),
    { present: 0, absent: 0 }
  );

  const taken = rows.filter((r) => r.taken);

  const buildText = () => {
    const lines = [`HariPrabodham Attendance — ${date} (${dayNameOf(date)})`, ""];
    rows.forEach((r) => {
      const m = MANDAL_BY_CODE[r.mandal];
      if (!r.taken) {
        lines.push(`${m.name} (${r.mandal}): not taken`);
        return;
      }
      lines.push(`${m.name} (${r.mandal}): ${r.present.length}/${r.total} present`);
      if (r.absent.length) lines.push(`  Absent: ${r.absent.join(", ")}`);
    });
    lines.push("", `Total present: ${totals.present} · Total absent: ${totals.absent}`);
    return lines.join("\n");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // --- Save (finalize) an immutable snapshot + optional Google Sheet export ---
  const save = async () => {
    if (!taken.length) {
      setMsg({ kind: "error", text: "Nothing to save — no attendance taken for this date yet." });
      return;
    }
    setSaving(true);
    setMsg({ kind: "", text: "" });

    const snapshot = taken.map((r) => ({
      report_date: date,
      mandal: r.mandal,
      total: r.total,
      present_count: r.present.length,
      absent_count: r.absent.length,
      present_names: r.present,
      absent_names: r.absent,
      finalized_by: user?.id || null,
      finalized_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("attendance_reports")
      .upsert(snapshot, { onConflict: "report_date,mandal" });
    if (error) {
      setSaving(false);
      setMsg({ kind: "error", text: error.message });
      return;
    }

    // Best-effort append to the Google Sheet (fire-and-forget; no-cors).
    if (SHEET_WEBHOOK) {
      try {
        await fetch(SHEET_WEBHOOK, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            date,
            day: dayNameOf(date),
            savedBy: profile?.full_name || "",
            rows: taken.map((r) => ({
              mandal: r.mandal,
              mandalName: MANDAL_BY_CODE[r.mandal]?.name,
              present: r.present.length,
              absent: r.absent.length,
              total: r.total,
              presentNames: r.present,
              absentNames: r.absent,
            })),
          }),
        });
      } catch {
        /* sheet export is best-effort */
      }
    }

    setSaving(false);
    setSavedAt(new Date().toISOString());
    setMsg({
      kind: "success",
      text: `Report saved for ${taken.length} mandal(s)${SHEET_WEBHOOK ? " and sent to the Google Sheet" : ""}.`,
    });
    loadHistory();
  };

  // Real .xlsx: a Summary sheet + a detail sheet with one row per member,
  // so it's sortable/filterable in Excel instead of names crammed in a cell.
  const downloadExcel = () => {
    const day = dayNameOf(date);
    const mandalName = (code) =>
      `${MANDAL_BY_CODE[code]?.name || code} (${code})`;

    const summary = taken.map((r) => ({
      Mandal: mandalName(r.mandal),
      Present: r.present.length,
      Absent: r.absent.length,
      Total: r.total,
    }));
    summary.push({
      Mandal: "TOTAL",
      Present: totals.present,
      Absent: totals.absent,
      Total: totals.present + totals.absent,
    });

    const detail = [];
    taken.forEach((r) => {
      r.present.forEach((n) =>
        detail.push({ Date: date, Day: day, Mandal: mandalName(r.mandal), Name: n, Status: "Present" })
      );
      r.absent.forEach((n) =>
        detail.push({ Date: date, Day: day, Mandal: mandalName(r.mandal), Name: n, Status: "Absent" })
      );
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    wsSummary["!cols"] = [{ wch: 26 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    const wsDetail = XLSX.utils.json_to_sheet(detail, {
      header: ["Date", "Day", "Mandal", "Name", "Status"],
    });
    wsDetail["!cols"] = [{ wch: 12 }, { wch: 11 }, { wch: 26 }, { wch: 30 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsDetail, "Attendance");
    XLSX.writeFile(wb, `attendance-${date}.xlsx`);
  };

  const downloadPdf = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 40;
    const maroon = [128, 24, 30];

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...maroon);
    doc.text("HariPrabodham Attendance", margin, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(110, 110, 110);
    doc.text(`${date} (${dayNameOf(date)})`, margin, 66);

    const mandalName = (code) => `${MANDAL_BY_CODE[code]?.name || code} (${code})`;

    // Summary table
    autoTable(doc, {
      startY: 82,
      head: [["Mandal", "Present", "Absent", "Total"]],
      body: taken.map((r) => [mandalName(r.mandal), r.present.length, r.absent.length, r.total]),
      foot: [["TOTAL", totals.present, totals.absent, totals.present + totals.absent]],
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: maroon, halign: "left" },
      footStyles: { fillColor: [245, 240, 235], textColor: [20, 20, 20], fontStyle: "bold" },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" } },
    });

    // One detail table per mandal — a member per row with a Present/Absent tag.
    taken.forEach((r) => {
      const body = [
        ...r.present.map((n, i) => [i + 1, n, "Present"]),
        ...r.absent.map((n, i) => [r.present.length + i + 1, n, "Absent"]),
      ];
      autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY || 82) + 22,
        head: [
          [
            {
              content: `${mandalName(r.mandal)}  —  ${r.present.length}/${r.total} present`,
              colSpan: 3,
              styles: { halign: "left", fillColor: maroon, fontSize: 11 },
            },
          ],
          ["#", "Name", "Status"],
        ],
        body,
        theme: "striped",
        styles: { fontSize: 9.5, cellPadding: 4 },
        headStyles: { fillColor: maroon },
        columnStyles: {
          0: { cellWidth: 32, halign: "center" },
          2: { cellWidth: 72, halign: "center" },
        },
        margin: { left: margin, right: margin },
        tableWidth: pageW - margin * 2,
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 2) {
            const present = data.cell.raw === "Present";
            data.cell.styles.textColor = present ? [21, 128, 61] : [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
    });

    doc.save(`attendance-${date}.pdf`);
  };

  return (
    <div>
      <PageHeader
        title="Attendance Report"
        subtitle="Present / absent by mandal for a day."
        actions={
          <label className="block w-44">
            <span className="mb-1 block text-sm font-medium text-ink">Date</span>
            <input
              type="date"
              className={`${inputClass} h-11`}
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        }
      />

      {msg.text && (
        <div className="mb-4">
          <Alert kind={msg.kind}>{msg.text}</Alert>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <Card className="mb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                <span className="font-display text-2xl text-green-700">{totals.present}</span>
                <span className="text-textSoft"> present</span>
                <span className="mx-2 text-sand">|</span>
                <span className="font-display text-2xl text-red-700">{totals.absent}</span>
                <span className="text-textSoft"> absent</span>
                <span className="ml-2 text-textMuted">({dayNameOf(date)})</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <PortalButton variant={copied ? "success" : "outline"} size="sm" onClick={copy}>
                  {copied ? "Copied ✓" : "Copy (WhatsApp)"}
                </PortalButton>
                <PortalButton variant="outline" size="sm" onClick={downloadExcel} disabled={!taken.length}>
                  Excel
                </PortalButton>
                <PortalButton variant="outline" size="sm" onClick={downloadPdf} disabled={!taken.length}>
                  PDF
                </PortalButton>
                <PortalButton size="sm" onClick={save} loading={saving} disabled={!taken.length}>
                  Save report
                </PortalButton>
              </div>
            </div>
            {savedAt && (
              <p className="mt-2 text-xs text-textMuted">
                Saved snapshot on {new Date(savedAt).toLocaleString()}.
              </p>
            )}
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            {rows.map((r) => (
              <Card key={r.mandal}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-xl text-maroon">{mandalShort(r.mandal)}</h3>
                  {r.taken ? (
                    <span className="text-sm text-textSoft">
                      <span className="font-semibold text-green-700">{r.present.length}</span>
                      {" / "}
                      {r.total}
                    </span>
                  ) : (
                    <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-textMuted">
                      not taken
                    </span>
                  )}
                </div>

                {r.taken && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="mb-1 font-semibold text-green-700">Present</p>
                      {r.present.length ? (
                        <ul className="space-y-0.5 text-ink">
                          {r.present.map((n) => (
                            <li key={n}>{n}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-textMuted">—</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 font-semibold text-red-700">Absent</p>
                      {r.absent.length ? (
                        <ul className="space-y-0.5 text-ink">
                          {r.absent.map((n) => (
                            <li key={n}>{n}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-textMuted">—</p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {rows.length === 0 && (
            <Alert kind="info">No mandals to show. (Ask an admin to assign you mandals.)</Alert>
          )}

          {history.length > 0 && (
            <Card className="mt-6">
              <h2 className="mb-3 font-display text-xl text-maroon">Saved reports</h2>
              <ul className="divide-y divide-sand/50 text-sm">
                {history.map((h) => (
                  <li key={h.date}>
                    <button
                      onClick={() => setDate(h.date)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-cream"
                    >
                      <span className="font-medium text-ink">
                        {h.date}{" "}
                        <span className="text-textMuted">({dayNameOf(h.date)})</span>
                      </span>
                      <span className="text-textSoft">
                        <span className="font-semibold text-green-700">{h.present}</span> present ·{" "}
                        <span className="font-semibold text-red-700">{h.absent}</span> absent ·{" "}
                        {h.mandals} mandal(s)
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
