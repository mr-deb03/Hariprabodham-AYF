import React, { useEffect, useState } from "react";
import { useAuth } from "../../portal/AuthContext";
import { MANDALS } from "../../portal/constants";
import { supabase } from "../../lib/supabaseClient";
import { Alert, Badge, Card, Field, PageHeader, PortalButton, inputClass } from "../../portal/ui";

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ full_name: "", mobile: "", mandal: "" });
  const [status, setStatus] = useState({ kind: "", msg: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        mobile: profile.mobile || "",
        mandal: profile.mandal || "",
      });
    }
  }, [profile]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setStatus({ kind: "", msg: "" });
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        mobile: form.mobile.trim(),
        mandal: form.mandal,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      setStatus({ kind: "error", msg: error.message });
      return;
    }
    await refreshProfile();
    setStatus({ kind: "success", msg: "Profile saved." });
  };

  const isAdmin = profile?.role === "admin";

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Profile Settings" subtitle="Keep your details up to date." />

      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-textMuted">{user?.email}</span>
          <Badge kind={isAdmin ? "admin" : "karyakarta"}>{profile?.role}</Badge>
          <Badge kind={profile?.status}>{profile?.status}</Badge>
          {profile?.is_attendance_taker && <Badge kind="approved">attendance taker</Badge>}
        </div>

        <form onSubmit={save} className="space-y-4">
          <Field label="Full name">
            <input required className={inputClass} value={form.full_name} onChange={set("full_name")} />
          </Field>
          <Field label="Mobile number">
            <input required type="tel" className={inputClass} value={form.mobile} onChange={set("mobile")} />
          </Field>
          <Field label="Mandal / Sabha">
            <select required className={inputClass} value={form.mandal} onChange={set("mandal")}>
              <option value="">Select your mandal…</option>
              {MANDALS.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name} ({m.city}){m.day ? ` — ${m.day}` : ""}
                </option>
              ))}
            </select>
          </Field>
          {status.msg && <Alert kind={status.kind}>{status.msg}</Alert>}
          <PortalButton type="submit" loading={busy}>
            Save changes
          </PortalButton>
        </form>
      </Card>
    </div>
  );
}
