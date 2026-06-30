import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../portal/AuthContext";
import { MANDAL_CODES, mandalLabel } from "../../portal/constants";
import {
  Alert,
  Badge,
  Card,
  PageHeader,
  PortalButton,
  Spinner,
  TableShell,
  tableHeadRow,
  tdCell,
  thCell,
} from "../../portal/ui";

export default function AdminApprovals() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id, changes) => {
    setSavingId(id);
    setError("");
    const { error: err } = await supabase.from("profiles").update(changes).eq("id", id);
    if (err) setError(err.message);
    else setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...changes } : r)));
    setSavingId(null);
  };

  const toggleMandal = (r, code) => {
    const cur = r.assigned_locations || [];
    const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
    patch(r.id, { assigned_locations: next });
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");

  return (
    <div>
      <PageHeader
        title="Approvals & Roles"
        subtitle="Approve new karyakartas, set roles, and grant attendance access."
      />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {/* Pending approvals */}
      <Card className="mb-8">
        <h2 className="mb-4 font-display text-xl text-saffron">
          Pending approvals{" "}
          <Badge kind="pending">{pending.length}</Badge>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-textSoft">No pending requests right now.</p>
        ) : (
          <ul className="divide-y divide-sand/60">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-ink">{r.full_name || "(no name)"}</p>
                  <p className="text-xs text-textMuted">
                    {mandalLabel(r.mandal)} · {r.mobile || "no mobile"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <PortalButton
                    size="sm"
                    loading={savingId === r.id}
                    onClick={() => patch(r.id, { status: "approved" })}
                  >
                    Approve
                  </PortalButton>
                  <PortalButton
                    variant="danger"
                    size="sm"
                    disabled={savingId === r.id}
                    onClick={() => patch(r.id, { status: "rejected" })}
                  >
                    Reject
                  </PortalButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* All members */}
      <Card>
        <h2 className="mb-4 font-display text-xl text-maroon">All members</h2>
        <TableShell minWidth="min-w-[640px]">
          <thead>
            <tr className={tableHeadRow}>
              <th className={thCell}>Name</th>
              <th className={thCell}>Mandal</th>
              <th className={thCell}>Status</th>
              <th className={`${thCell} text-center`}>Admin</th>
              <th className={`${thCell} text-center`}>Attendance taker</th>
              <th className={thCell}>Assigned mandals</th>
            </tr>
          </thead>
          <tbody>
            {others.map((r) => {
              const isSelf = r.id === user?.id;
              return (
                <tr key={r.id} className="border-b border-sand/40 last:border-0 hover:bg-cream">
                  <td className={tdCell}>
                    <span className="font-medium text-ink">{r.full_name || "(no name)"}</span>
                    <span className="block text-xs text-textMuted">{r.mobile}</span>
                  </td>
                  <td className={tdCell}>{mandalLabel(r.mandal)}</td>
                  <td className={tdCell}>
                    <Badge kind={r.status}>{r.status}</Badge>
                  </td>
                  <td className={`${tdCell} text-center`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-maroon"
                      checked={r.role === "admin"}
                      disabled={savingId === r.id || isSelf}
                      title={isSelf ? "You can't change your own admin role" : ""}
                      onChange={(e) =>
                        patch(r.id, { role: e.target.checked ? "admin" : "karyakarta" })
                      }
                    />
                  </td>
                  <td className={`${tdCell} text-center`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-saffron"
                      checked={!!r.is_attendance_taker}
                      disabled={savingId === r.id}
                      onChange={(e) => patch(r.id, { is_attendance_taker: e.target.checked })}
                    />
                  </td>
                  <td className={tdCell}>
                    {r.is_attendance_taker ? (
                      <div className="flex flex-wrap gap-1">
                        {MANDAL_CODES.map((code) => {
                          const on = (r.assigned_locations || []).includes(code);
                          return (
                            <button
                              key={code}
                              disabled={savingId === r.id}
                              onClick={() => toggleMandal(r, code)}
                              className={`rounded px-1.5 py-0.5 text-xs font-semibold transition ${
                                on
                                  ? "bg-saffron text-onDark"
                                  : "bg-cream text-textMuted hover:bg-sand"
                              }`}
                            >
                              {code}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-textMuted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      </Card>
    </div>
  );
}
