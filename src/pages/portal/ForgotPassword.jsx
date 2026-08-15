import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../portal/AuthContext";
import { Alert, Card, Field, PortalButton, inputClass } from "../../portal/ui";

/*
 * Step 1 of password recovery: ask for the email, send the link.
 *
 * The result message is deliberately the same whether or not that email has an
 * account. Saying "no account with that email" would turn this form into a way
 * for anyone to test which addresses are registered karyakartas.
 */
export default function ForgotPassword() {
  const { sendPasswordReset, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await sendPasswordReset(email.trim());
    setBusy(false);

    // Rate limiting is the one failure worth surfacing — otherwise someone who
    // taps twice sees a silent no-op and assumes it never sent.
    if (err && /rate|too many/i.test(err.message || "")) {
      setError("Too many attempts. Please wait a minute and try again.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-md py-6">
        <h1 className="mb-1 text-center font-display text-3xl text-maroon">
          Check your email
        </h1>
        <Card className="mt-6 text-center">
          <p className="text-4xl">📧</p>
          <p className="mt-3 text-textSoft">
            If an account exists for{" "}
            <span className="font-semibold text-ink">{email.trim()}</span>,
            we&apos;ve sent a link to reset the password. It expires in about an
            hour.
          </p>
          <p className="mt-3 text-sm text-textMuted">
            Nothing arrived? Check the spam folder, or ask a mandal admin to
            reset it for you.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/portal/login">
              <PortalButton variant="outline">Back to login</PortalButton>
            </Link>
            <PortalButton
              variant="outline"
              onClick={() => {
                setSent(false);
                setError("");
              }}
            >
              Try another email
            </PortalButton>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="mb-1 text-center font-display text-3xl text-maroon">
        Forgot password
      </h1>
      <p className="mb-6 text-center text-textSoft">
        We&apos;ll email you a link to set a new one.
      </p>

      <Card>
        {!configured && (
          <Alert kind="info">
            The portal isn&apos;t configured yet (missing Supabase keys).
          </Alert>
        )}
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" hint="The address you registered with.">
            <input
              type="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Alert>{error}</Alert>
          <PortalButton type="submit" loading={busy} className="w-full">
            Send reset link
          </PortalButton>
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-textSoft">
        Remembered it?{" "}
        <Link to="/portal/login" className="font-semibold text-maroon hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
