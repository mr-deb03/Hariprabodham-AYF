import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../portal/AuthContext";
import { MANDALS } from "../../portal/constants";
import { Alert, Card, Field, PortalButton, inputClass } from "../../portal/ui";

const empty = { fullName: "", mobile: "", mandal: "", email: "", password: "" };

export default function Register() {
  const { signUp, configured } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const { data, error: err } = await signUp({
      email: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      mandal: form.mandal,
    });
    setBusy(false);
    if (err) {
      setError(err.message || "Could not register.");
      return;
    }
    // If email confirmation is OFF, a session is created immediately — but the
    // account is still "pending", so send them to the pending screen. If
    // confirmation is ON there's no session yet, so show the success notice.
    if (data?.session) {
      navigate("/portal/pending", { replace: true });
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md py-6">
        <Card>
          <h1 className="mb-2 font-display text-2xl text-maroon">Registration received</h1>
          <p className="text-textSoft">
            Your account has been created and is <strong>awaiting admin approval</strong>.
            If you were asked to confirm your email, please do that first. You&apos;ll be
            able to sign in once an admin approves your account.
          </p>
          <Link
            to="/portal/login"
            className="mt-5 inline-block font-semibold text-maroon hover:underline"
          >
            Go to login →
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="mb-1 text-center font-display text-3xl text-maroon">
        Karyakarta Registration
      </h1>
      <p className="mb-6 text-center text-textSoft">
        Create your account. An admin will approve it before access is granted.
      </p>

      <Card>
        {!configured && (
          <Alert kind="info">The portal isn&apos;t configured yet (missing Supabase keys).</Alert>
        )}
        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name">
            <input required className={inputClass} value={form.fullName} onChange={set("fullName")} />
          </Field>
          <Field label="Mobile number">
            <input
              required
              type="tel"
              className={inputClass}
              value={form.mobile}
              onChange={set("mobile")}
              autoComplete="tel"
            />
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
          <Field label="Email">
            <input
              required
              type="email"
              className={inputClass}
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
            />
          </Field>
          <Field label="Password" hint="At least 6 characters.">
            <input
              required
              type="password"
              className={inputClass}
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
            />
          </Field>
          <Alert>{error}</Alert>
          <PortalButton type="submit" loading={busy} className="w-full">
            Register
          </PortalButton>
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-textSoft">
        Already have an account?{" "}
        <Link to="/portal/login" className="font-semibold text-maroon hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
