import React, { useEffect } from "react";

// Centered overlay dialog. Closes on backdrop click or Esc.
export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-6"
      onMouseDown={onClose}
    >
      <div
        className={`my-8 w-full ${maxWidth} rounded-2xl border border-sand/70 bg-white shadow-card`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-sand/70 px-5 py-4">
          <h3 className="font-display text-xl text-maroon">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-lg leading-none text-textMuted transition hover:bg-cream"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ className = "" }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-maroon/30 border-t-maroon ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PortalCenter({ children }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {children}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-sand/70 bg-white p-6 shadow-soft ${className}`}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-textMuted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-sand bg-white px-3 py-2 text-ink shadow-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30";

// Standard page heading used across every portal module so titles, spacing and
// the optional right-hand action area line up everywhere.
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-maroon">{title}</h1>
        {subtitle && <p className="mt-1 text-textSoft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const BTN_VARIANTS = {
  primary: "bg-maroon text-onDark shadow-soft hover:bg-maroonDark",
  outline: "border border-sand bg-white text-ink hover:bg-cream",
  success: "border border-green-300 bg-white text-green-700 hover:bg-green-50",
  danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
};

export function PortalButton({
  children,
  loading,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass} ${
        BTN_VARIANTS[variant] || BTN_VARIANTS.primary
      } ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <Spinner
          className={`h-4 w-4 ${variant === "primary" ? "border-onDark/40 border-t-onDark" : ""}`}
        />
      )}
      {children}
    </button>
  );
}

// Shared table chrome so every roster/list looks the same: rounded, bordered,
// horizontally scrollable on small screens, with a soft cream header row.
export function TableShell({ children, minWidth = "", className = "" }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-sand/70 ${className}`}>
      <table className={`w-full border-collapse text-left text-sm ${minWidth}`}>
        {children}
      </table>
    </div>
  );
}

export const tableHeadRow =
  "border-b border-sand bg-cream/60 text-xs uppercase tracking-wide text-textMuted";
export const thCell = "px-3 py-2.5 font-semibold";
export const tdCell = "px-3 py-2.5 align-middle";

const ALERT_STYLES = {
  error: "border-red-300 bg-red-50 text-red-800",
  success: "border-green-300 bg-green-50 text-green-800",
  info: "border-sand bg-cream text-ink",
};

export function Alert({ kind = "error", children }) {
  if (!children) return null;
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${ALERT_STYLES[kind]}`}>{children}</div>
  );
}

const BADGE_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  admin: "bg-logoBlue/10 text-logoBlue",
  karyakarta: "bg-cream text-ink",
};

export function Badge({ kind, children }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_STYLES[kind] || "bg-cream text-ink"}`}>
      {children}
    </span>
  );
}
