import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { PortalCenter, Spinner } from "./ui";

/**
 * Route guard for portal pages.
 *   <RequireAuth>            — any approved, logged-in karyakarta
 *   <RequireAuth admin>      — admins only
 *   <RequireAuth attendance> — admin OR an admin-selected attendance taker
 */
export default function RequireAuth({ admin = false, attendance = false, children }) {
  const { loading, session, profile, profileChecked, configured } = useAuth();
  const location = useLocation();

  if (!configured) {
    return (
      <PortalCenter>
        <h2 className="font-display text-2xl text-maroon">Portal not configured</h2>
        <p className="mt-2 text-textSoft">
          The Supabase connection isn&apos;t set up yet. Add the keys to{" "}
          <code>.env.local</code> and restart the dev server.
        </p>
      </PortalCenter>
    );
  }

  if (loading) {
    return (
      <PortalCenter>
        <Spinner className="h-8 w-8" />
      </PortalCenter>
    );
  }

  if (!session) {
    return <Navigate to="/portal/login" state={{ from: location.pathname }} replace />;
  }

  // Profile fetch for this user is still in flight.
  if (!profileChecked) {
    return (
      <PortalCenter>
        <Spinner className="h-8 w-8" />
      </PortalCenter>
    );
  }

  // Logged in, but no profile row exists (e.g. account predates the schema).
  if (!profile) {
    return (
      <PortalCenter>
        <h2 className="font-display text-2xl text-maroon">Profile not found</h2>
        <p className="mt-2 text-textSoft">
          Your login worked, but there&apos;s no portal profile linked to this
          account yet. Please contact a mandal admin.
        </p>
      </PortalCenter>
    );
  }

  if (profile.status !== "approved") {
    return <Navigate to="/portal/pending" replace />;
  }

  if (admin && profile.role !== "admin") {
    return <Navigate to="/portal" replace />;
  }

  if (attendance && !(profile.is_attendance_taker || profile.role === "admin")) {
    return <Navigate to="/portal" replace />;
  }

  return children;
}
