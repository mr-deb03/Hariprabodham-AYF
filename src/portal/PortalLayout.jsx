import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import HPAYFLogo from "../assets/common/HPAYF logo.webp";

const tab = "rounded-lg px-3 py-1.5 text-sm font-medium transition";
const tabActive = "bg-maroon text-onDark";
const tabIdle = "text-ink hover:bg-cream";
const linkClass = ({ isActive }) => `${tab} ${isActive ? tabActive : tabIdle}`;

// Up to two initials from the full name, falling back to the email.
function initialsOf(name, email) {
  const src = (name || "").trim();
  if (src) {
    const parts = src.split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  }
  return (email?.[0] || "?").toUpperCase();
}

// Avatar + name in the top-right corner, opening a small account dropdown.
function AccountMenu() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = profile?.full_name || "Karyakarta";
  const initials = initialsOf(profile?.full_name, user?.email);

  const logout = async () => {
    setOpen(false);
    await signOut();
    navigate("/portal/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-sand bg-white py-1 pl-1 pr-2 transition hover:bg-cream"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-maroon text-sm font-semibold text-onDark">
          {initials}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink sm:block">
          {name}
        </span>
        <svg
          className={`h-4 w-4 text-textMuted transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-sand bg-white shadow-card"
        >
          <div className="flex items-center gap-3 border-b border-sand/70 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon text-sm font-semibold text-onDark">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              <p className="truncate text-xs text-textMuted">{user?.email}</p>
            </div>
          </div>
          <NavLink
            to="/portal/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-ink transition hover:bg-cream"
            role="menuitem"
          >
            Profile settings
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
            role="menuitem"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function Chrome() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const canAttend = profile?.is_attendance_taker || isAdmin;
  const approved = profile?.status === "approved";

  const handleLogout = async () => {
    await signOut();
    navigate("/portal/login");
  };

  return (
    <div className="min-h-screen bg-sacred">
      <header className="sticky top-0 z-30 border-b border-sand/70 bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={HPAYFLogo}
              alt="HariPrabodham AYF"
              className="h-10 w-auto sm:h-11"
            />
            <span className="font-display text-lg font-semibold text-maroon">
              Karyakarta Portal
            </span>
          </Link>

          {!session && (
            <Link
              to="/"
              className={`${tab} ${tabIdle} inline-flex items-center gap-1`}
            >
              ← Back to home
            </Link>
          )}

          {session && approved && (
            <div className="flex flex-wrap items-center gap-2">
              <nav className="flex flex-wrap items-center gap-1">
                <NavLink end to="/portal" className={linkClass}>
                  Dashboard
                </NavLink>
                {canAttend && (
                  <NavLink to="/portal/attendance" className={linkClass}>
                    Attendance
                  </NavLink>
                )}
                {canAttend && (
                  <NavLink to="/portal/report" className={linkClass}>
                    Report
                  </NavLink>
                )}
                {isAdmin && (
                  <NavLink to="/portal/admin/approvals" className={linkClass}>
                    Approvals
                  </NavLink>
                )}
                {isAdmin && (
                  <NavLink to="/portal/admin/members" className={linkClass}>
                    Members
                  </NavLink>
                )}
              </nav>
              <AccountMenu />
            </div>
          )}

          {session && !approved && (
            <button onClick={handleLogout} className={`${tab} ${tabIdle}`}>
              Logout
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function PortalLayout() {
  return (
    <AuthProvider>
      <Chrome />
    </AuthProvider>
  );
}
