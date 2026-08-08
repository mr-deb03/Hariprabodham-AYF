import React, { useEffect, useMemo, useState } from "react";
import { supabase, fetchAllRows } from "../../lib/supabaseClient";
import { MANDALS, mandalShort } from "../../portal/constants";
import { Card, Spinner } from "../../portal/ui";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// The `birthday-wishes` Supabase Edge Function (supabase/SETUP.md § 6). It
// sends the approved WhatsApp template via Meta's Cloud API — the daily cron
// fires on its own; the "Wish" button is just an on-demand nudge for today.
// Blank until the WhatsApp Business credentials exist.
const NOTIFY_ENDPOINT = process.env.REACT_APP_NOTIFY_ENDPOINT || "";

// dob is a `date` column → "YYYY-MM-DD". Pull month/day/year without timezone
// shifts (never new Date("YYYY-MM-DD"), which parses as UTC midnight).
function parts(dob) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dob || ""));
  if (!m) return null;
  return { year: +m[1], month: +m[2], day: +m[3] }; // month is 1-12
}

const ordinal = (d) => {
  const s = ["th", "st", "nd", "rd"];
  const v = d % 100;
  return d + (s[(v - 20) % 10] || s[v] || s[0]);
};

const hasMobile = (m) => String(m.mobile || "").replace(/\D/g, "").length >= 10;

export default function BirthdaySection() {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1); // 1-12
  // Opens on today's date — the day that actually needs attention. Switching to
  // "All dates" (or another month) browses the rest.
  const [selDay, setSelDay] = useState(String(now.getDate())); // "all" | "1".."31"
  const [selMandal, setSelMandal] = useState("all");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingId, setSendingId] = useState(null);
  const [notice, setNotice] = useState({ kind: "", text: "" });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error: err } = await fetchAllRows(() =>
        supabase
          .from("members")
          .select("id, name, dob, mandal, mobile")
          .not("dob", "is", null)
      );
      if (!alive) return;
      if (err) setError(err.message);
      setMembers(data || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const thisYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  // Day count for the selected month — day 0 of the next month is this
  // month's last day, so February follows the leap year correctly.
  const daysInMonth = useMemo(
    () => new Date(thisYear, selMonth, 0).getDate(),
    [thisYear, selMonth]
  );

  // Members whose birthday falls in the selected month (and day, if picked),
  // earliest day first.
  const list = useMemo(() => {
    return members
      .map((m) => ({ ...m, p: parts(m.dob) }))
      .filter(
        (m) =>
          m.p &&
          m.p.month === selMonth &&
          (selDay === "all" || m.p.day === Number(selDay)) &&
          (selMandal === "all" || m.mandal === selMandal)
      )
      .sort((a, b) => a.p.day - b.p.day || a.name.localeCompare(b.name));
  }, [members, selMonth, selDay, selMandal]);

  // What the current filters are showing, for the count / empty lines.
  const scopeLabel =
    selDay === "all"
      ? MONTHS[selMonth - 1]
      : `${selDay} ${MONTHS[selMonth - 1]}`;

  // Send now, rather than waiting for the morning cron. The function still
  // refuses anything that isn't actually today's birthday.
  const sendWish = async (m) => {
    setSendingId(m.id);
    setNotice({ kind: "", text: "" });
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(NOTIFY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data?.session?.access_token || ""}`,
        },
        body: JSON.stringify({ member_id: m.id }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.error || `Send failed (${res.status})`);
      const row = out?.results?.[0];
      if (row?.status === "failed") throw new Error(row.detail || "Send failed.");
      setNotice(
        row?.skipped
          ? { kind: "ok", text: `${m.name}: ${row.skipped}.` }
          : { kind: "ok", text: `Birthday wish sent to ${m.name}. 🎉` }
      );
    } catch (err) {
      setNotice({ kind: "error", text: err.message || "Send failed." });
    } finally {
      setSendingId(null);
    }
  };

  const selectClass =
    "rounded-lg border border-sand bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-maroon";

  return (
    <Card className="mt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-maroon">🎂 Birthdays</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selMandal}
            onChange={(e) => setSelMandal(e.target.value)}
            className={selectClass}
          >
            <option value="all">All mandals</option>
            {MANDALS.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name} · {m.code}
              </option>
            ))}
          </select>
          <select
            value={selMonth}
            onChange={(e) => {
              setSelMonth(Number(e.target.value));
              setSelDay("all"); // a day from the old month may not exist here
            }}
            className={selectClass}
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={selDay}
            onChange={(e) => setSelDay(e.target.value)}
            className={selectClass}
          >
            <option value="all">All dates</option>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status of the automated sender */}
      <p
        className={`mb-5 rounded-xl border p-3 text-xs ${
          NOTIFY_ENDPOINT
            ? "border-sand/70 bg-cream/40 text-textSoft"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {NOTIFY_ENDPOINT ? (
          <>
            🤖 Birthday wishes are sent{" "}
            <span className="font-medium text-ink">automatically each morning</span>{" "}
            on WhatsApp. Nobody is wished twice in the same year.
          </>
        ) : (
          <>
            ⚙️ Automatic WhatsApp wishes aren't switched on yet — add the WhatsApp
            Business credentials and deploy the <code>birthday-wishes</code>{" "}
            function (see <code>supabase/SETUP.md</code> § 6). Until then no
            wishes are sent.
          </>
        )}
      </p>

      {notice.text && (
        <p
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            notice.kind === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {notice.text}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-red-600">{error}</p>
      ) : list.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-3xl">🎈</p>
          <p className="mt-2 text-sm text-textSoft">
            No birthdays {selDay === "all" ? "in" : "on"} {scopeLabel}.
          </p>
          {selDay !== "all" && (
            <button
              type="button"
              onClick={() => setSelDay("all")}
              className="mt-3 text-sm font-medium text-maroon underline underline-offset-2 hover:opacity-70"
            >
              View all of {MONTHS[selMonth - 1]}
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-textSoft">
            {list.length} birthday{list.length === 1 ? "" : "s"}{" "}
            {selDay === "all" ? "in" : "on"} {scopeLabel}
          </p>
          {/* grid-cols-1 is load-bearing, not decoration. Without a base track
              the implicit column is sized `auto`, so it grows to the widest
              card's max-content — the "Today" card carrying the extra Send-now
              button — and drags every other card past the screen edge on a
              phone. grid-cols-1 compiles to repeat(1, minmax(0, 1fr)), and it
              is the minmax(0, …) that caps the track to the container. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((m) => {
              const isToday = m.p.month === todayMonth && m.p.day === todayDay;
              const turns = m.p.year ? thisYear - m.p.year : null;
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-4 rounded-2xl border p-4 shadow-soft transition ${
                    isToday
                      ? "border-saffron bg-saffron/5"
                      : "border-sand/70 bg-white"
                  }`}
                >
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-maroon leading-none text-white">
                    <span className="text-lg font-bold">{m.p.day}</span>
                    <span className="text-[10px] uppercase tracking-wide">
                      {MONTHS[m.p.month - 1].slice(0, 3)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{m.name}</p>
                    {m.mandal && (
                      <p className="truncate text-xs text-textSoft">
                        {mandalShort(m.mandal)}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs font-medium text-maroon">
                      {isToday
                        ? "Today 🎉"
                        : turns != null
                        ? `turns ${turns}`
                        : ordinal(m.p.day)}
                    </p>
                  </div>

                  {/* Optional nudge — only on the actual day, and only once the
                      automated sender is configured. */}
                  {isToday && NOTIFY_ENDPOINT && (
                    <button
                      type="button"
                      onClick={() => sendWish(m)}
                      disabled={!hasMobile(m) || sendingId === m.id}
                      title={
                        hasMobile(m)
                          ? "Send now instead of waiting for the morning run"
                          : "No mobile number"
                      }
                      className="shrink-0 rounded-full bg-maroon px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-maroonDark disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sendingId === m.id ? "…" : "Send now"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
