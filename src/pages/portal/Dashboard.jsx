import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../portal/AuthContext";
import { mandalLabel } from "../../portal/constants";
import { Badge } from "../../portal/ui";

// Literal class strings — Tailwind can't see dynamically built class names.
const ACCENTS = {
  maroon: "text-maroon",
  saffron: "text-saffron",
  logoBlue: "text-logoBlue",
};

function Tile({ to, title, desc, accent = "maroon", disabled, badge }) {
  const body = (
    <div
      className={`flex h-full flex-col rounded-2xl border border-sand/70 bg-white p-6 shadow-soft transition ${
        disabled ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className={`font-display text-xl ${ACCENTS[accent] || ACCENTS.maroon}`}>{title}</h3>
        {badge && <Badge>{badge}</Badge>}
      </div>
      <p className="mt-2 text-sm text-textSoft">{desc}</p>
    </div>
  );
  if (disabled || !to) return body;
  return (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const canAttend = profile?.is_attendance_taker || isAdmin;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-maroon">
          Jai Swaminarayan{profile?.full_name ? `, ${profile.full_name}` : ""} 🙏
        </h1>
        <p className="mt-1 text-textSoft">
          Mandal: <span className="font-medium text-ink">{mandalLabel(profile?.mandal)}</span>
          {"  ·  "}
          <Badge kind={isAdmin ? "admin" : "karyakarta"}>{profile?.role}</Badge>
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          to="/portal/profile"
          title="My Profile"
          desc="Update your name, mobile number and mandal."
        />
        {canAttend && (
          <Tile
            to="/portal/attendance"
            title="Attendance"
            desc="Mark present/absent for today's sabha."
            accent="saffron"
          />
        )}
        {canAttend && (
          <Tile
            to="/portal/report"
            title="Report"
            desc="End-of-day present/absent report, ready to share."
            accent="saffron"
          />
        )}
        {isAdmin && (
          <Tile
            to="/portal/admin/approvals"
            title="Approvals & Roles"
            desc="Approve karyakartas, set admins and attendance access."
            accent="logoBlue"
          />
        )}
        {isAdmin && (
          <Tile
            to="/portal/admin/members"
            title="Members"
            desc="Manage the attendance roster and bulk-import members."
            accent="logoBlue"
          />
        )}
        <Tile
          to="/portal/videos"
          title="Satsang Videos"
          desc="Private videos for registered karyakartas."
        />
      </div>
    </div>
  );
}
