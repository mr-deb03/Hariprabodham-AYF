import React, { useCallback, useEffect, useMemo, useState } from "react";
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

export default function Report() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const visible = useMemo(
    () => (isAdmin ? MANDAL_CODES : profile?.assigned_locations || []),
    [isAdmin, profile]
  );

  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setCopied(false);

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

        // Present: anyone marked present (active or inactive).
        const present = members.filter((m) => presentIds.has(m.id)).map((m) => m.name);
        // Absent: active members who weren't marked present.
        const absent = members
          .filter((m) => m.active && !presentIds.has(m.id))
          .map((m) => m.name);
        return { mandal, taken: true, total: present.length + absent.length, present, absent };
      })
    );
    setRows(out);
    setLoading(false);
  }, [date, visible]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = rows.reduce(
    (a, r) => ({
      present: a.present + r.present.length,
      absent: a.absent + (r.taken ? r.absent.length : 0),
    }),
    { present: 0, absent: 0 }
  );

  const buildText = () => {
    const lines = [`HariPrabodham Attendance — ${date} (${dayNameOf(date)})`, ""];
    rows.forEach((r) => {
      const m = MANDAL_BY_CODE[r.mandal];
      if (!r.taken) {
        lines.push(`${m.name} (${r.mandal}): not taken`);
        return;
      }
      lines.push(
        `${m.name} (${r.mandal}): ${r.present.length}/${r.total} present`
      );
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
              <PortalButton variant={copied ? "success" : "primary"} size="sm" onClick={copy}>
                {copied ? "Copied ✓" : "Copy report (WhatsApp)"}
              </PortalButton>
            </div>
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
        </>
      )}
    </div>
  );
}
