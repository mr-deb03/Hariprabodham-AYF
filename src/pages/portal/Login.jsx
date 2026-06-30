import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../portal/AuthContext";
import { Alert, Card, Field, PortalButton, inputClass } from "../../portal/ui";

export default function Login() {
  const { signIn, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/portal";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await signIn({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError(err.message || "Could not sign in.");
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="mb-1 text-center font-display text-3xl text-maroon">Karyakarta Login</h1>
      <p className="mb-6 text-center text-textSoft">Sign in to your portal account.</p>

      <Card>
        {!configured && (
          <Alert kind="info">The portal isn&apos;t configured yet (missing Supabase keys).</Alert>
        )}
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Alert>{error}</Alert>
          <PortalButton type="submit" loading={busy} className="w-full">
            Sign in
          </PortalButton>
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-textSoft">
        New karyakarta?{" "}
        <Link to="/portal/register" className="font-semibold text-maroon hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
