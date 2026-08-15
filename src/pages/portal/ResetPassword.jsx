import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../portal/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import {
  Alert,
  Card,
  Field,
  PortalButton,
  Spinner,
  inputClass,
} from "../../portal/ui";

const MIN_LENGTH = 8;

/*
 * Step 2 of password recovery: the page the emailed link opens.
 *
 * The link carries its token in the URL fragment. supabase-js consumes that on
 * load (detectSessionInUrl is on by default), turns it into a short-lived
 * recovery session and fires PASSWORD_RECOVERY — that session is what
 * authorises updateUser below. So this page has three states: still waiting for
 * that to happen, ready, or the link was bad/expired and no session appeared.
 */
export default function ResetPassword() {
  const { updatePassword, configured } = useAuth();
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!configured) {
      setChecking(false);
      return undefined;
    }
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setChecking(false);
      }
    });

    // The event may already have fired before this component mounted, so check
    // for an existing session too rather than waiting forever.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setReady(true);
      setChecking(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setError("");
    setBusy(true);
    const { error: err } = await updatePassword(password);
    setBusy(false);

    if (err) {
      setError(err.message || "Could not update the password.");
      return;
    }
    setDone(true);
  };

  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md py-6">
        <h1 className="mb-1 text-center font-display text-3xl text-maroon">
          Password updated
        </h1>
        <Card className="mt-6 text-center">
          <p className="text-4xl">✅</p>
          <p className="mt-3 text-textSoft">
            You&apos;re signed in with the new password. Keep it somewhere safe
            — nobody, not even an admin, can look it up for you.
          </p>
          <PortalButton className="mt-6" onClick={() => navigate("/portal")}>
            Go to the portal
          </PortalButton>
        </Card>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-md py-6">
        <h1 className="mb-1 text-center font-display text-3xl text-maroon">
          Link expired
        </h1>
        <Card className="mt-6 text-center">
          <p className="text-4xl">⌛</p>
          <p className="mt-3 text-textSoft">
            This reset link is no longer valid. They can only be used once, and
            they expire about an hour after being sent.
          </p>
          <Link to="/portal/forgot-password">
            <PortalButton className="mt-6">Send a new link</PortalButton>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="mb-1 text-center font-display text-3xl text-maroon">
        Set a new password
      </h1>
      <p className="mb-6 text-center text-textSoft">
        Choose something you&apos;ll remember — at least {MIN_LENGTH}{" "}
        characters.
      </p>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password">
            <input
              type="password"
              required
              minLength={MIN_LENGTH}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              required
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Alert>{error}</Alert>
          <PortalButton type="submit" loading={busy} className="w-full">
            Update password
          </PortalButton>
        </form>
      </Card>
    </div>
  );
}
