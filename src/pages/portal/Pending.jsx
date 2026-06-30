import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../portal/AuthContext";
import { Card, PortalButton, Spinner } from "../../portal/ui";

export default function Pending() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Not logged in (e.g. came here straight after registering with email
  // confirmation on) — show a gentle notice.
  if (!session) {
    return (
      <div className="mx-auto max-w-md py-6">
        <Card>
          <h1 className="mb-2 font-display text-2xl text-maroon">Awaiting approval</h1>
          <p className="text-textSoft">
            Your registration is in. An admin will approve your account shortly. Please
            sign in after you&apos;ve been approved.
          </p>
          <Link to="/portal/login" className="mt-5 inline-block font-semibold text-maroon hover:underline">
            Go to login →
          </Link>
        </Card>
      </div>
    );
  }

  // Approved already → straight to the dashboard.
  if (profile?.status === "approved") {
    return <Navigate to="/portal" replace />;
  }

  const rejected = profile?.status === "rejected";

  const recheck = async () => {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <Card>
        <h1 className="mb-2 font-display text-2xl text-maroon">
          {rejected ? "Account not approved" : "Awaiting admin approval"}
        </h1>
        <p className="text-textSoft">
          {rejected
            ? "Your account request was not approved. Please contact a mandal admin if you think this is a mistake."
            : "Thanks for registering! Your account is pending approval from an admin. You'll get access as soon as it's approved."}
        </p>
        {!rejected && (
          <PortalButton onClick={recheck} loading={checking} className="mt-5">
            Check again
          </PortalButton>
        )}
      </Card>
    </div>
  );
}
