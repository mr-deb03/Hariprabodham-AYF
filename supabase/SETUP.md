# Karyakarta Portal — Setup

The portal (login, approval, dashboard, profile) is built. It needs a free
Supabase project to store accounts and data. ~10 minutes, one time.

## 1. Create the Supabase project
1. Go to https://supabase.com → sign in with GitHub/Google → **New project**.
2. Name it (e.g. `hariprabodham-portal`), set a database password (save it), pick
   the region closest to Mumbai (e.g. `ap-south-1` / Singapore). Create.

## 2. Create the database tables
1. In the project: **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repo, copy everything, paste, **Run**.
   It should say "Success".
3. Repeat for `supabase/event_registrations.sql` — this one powers the
   **Register Now** form on the home-page featured-event banner. It must be run
   before the button will work; until then the form shows a "not connected yet"
   notice instead of saving. See §8 below.

## 3. (Recommended) Turn off email confirmation
So karyakartas can register without needing to click an email link — the
**admin approval** is the real gate.
- **Authentication → Sign In / Providers → Email** → turn **Confirm email** OFF → Save.
  (If you'd rather keep email confirmation on, that's fine too — they'll just
  have to confirm their email *and* be approved.)

## 4. Get the API keys into the app
1. **Project Settings → API**. Copy:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** key (`eyJ...`)
2. Paste them into `.env.local` at the repo root:
   ```
   REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJ...
   ```
3. Restart the dev server (`npm start`).
4. For the live site: add the SAME two variables in **Vercel → Project →
   Settings → Environment Variables**, then redeploy.

## 5. Make yourself the admin (one time)
1. Open the site → **Karyakarta** → **Register** with your own email.
2. Back in Supabase: **SQL Editor** → run (use your email):
   ```sql
   update public.profiles
   set role = 'admin', status = 'approved'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Now sign in — you'll see the **Admin** tab, where you approve everyone else
   and grant attendance access.

## 6. Automated WhatsApp birthday wishes (optional)

The dashboard's **Birthdays** card works with no setup — the "Wish 🎉" button
opens WhatsApp/SMS pre-filled and *you* tap send. To have wishes go out
**automatically every morning** from an official number, do the following.

> ⚠️ Meta only allows automated sending through the **WhatsApp Business API** —
> never from a personal WhatsApp account. Business-initiated messages must use
> an **approved template**, and recipients must have **opted in**.

1. **Get a WhatsApp Business number** — [Meta for Developers](https://developers.facebook.com/)
   → create an app → add **WhatsApp** → attach a phone number that is **not**
   registered on regular WhatsApp. Note the **Phone number ID** and generate a
   **permanent access token** (System User → assign the WABA → generate token).
2. **Create + get approval for a template** (WhatsApp Manager → Message
   Templates). Category **Utility** or **Marketing**, one body variable:
   ```
   Jai Swaminarayan {{1}}! 🎉 Wishing you a very happy birthday.
   May Pragat Guruhari Prabodh Swamiji Maharaj bless you. 🙏
   ```
   Approval usually takes minutes-to-hours. Note the template **name** + **language**.
3. **Run `birthday_wishes.sql`** in the SQL Editor — creates the de-dupe log and
   the daily cron. Replace `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>` first, and
   adjust the schedule (`30 3 * * *` = 09:00 IST).
4. **Deploy the function**: `supabase functions deploy birthday-wishes`
   (or paste `supabase/functions/birthday-wishes/index.ts` into the dashboard's
   Edge Functions editor).
5. **Set the secrets** (Project Settings → Edge Functions → Secrets):
   ```
   WHATSAPP_TOKEN            = <permanent access token>
   WHATSAPP_PHONE_NUMBER_ID  = <phone number id>
   WHATSAPP_TEMPLATE_NAME    = birthday_wish
   WHATSAPP_TEMPLATE_LANG    = en
   ```
6. **Point the portal at it** — set `REACT_APP_NOTIFY_ENDPOINT` to
   `https://<PROJECT_REF>.supabase.co/functions/v1/birthday-wishes` and redeploy
   the frontend. The "Wish 🎉" button now sends via the API instead of opening
   WhatsApp.

**How it behaves:** the cron runs daily, finds members whose `dob` is today (IST),
sends each the template, and logs to `birthday_wish_log` — so nobody is wished
twice in a year, even if the cron runs again. Members without a `mobile` or a
`dob` are skipped. Cost is Meta's per-message rate (~₹0.80 marketing / ~₹0.13
utility). Check results with:
```sql
select * from public.birthday_wish_log order by sent_at desc limit 20;
select * from cron.job_run_details order by start_time desc limit 5;
```

---

## 7. Auto-updating Instagram feed (optional)

The Media page pulls the latest YouTube uploads automatically, and this does the
same for Instagram. Until it's set up, the Instagram section shows the curated
reels hard-coded in `src/components/MediaGallery.jsx` — which is also the
fallback if the feed is ever unreachable, so keep a few good ones in that list.

> ⚠️ Two prerequisites you can't work around. **(a)** Instagram's Basic Display
> API — the old easy path for personal accounts — was shut down by Meta on
> 4 Dec 2024, and nothing replaced it for personal accounts. The account must be
> a **Business or Creator** account (Instagram app → Settings → Account type;
> it's free and reversible). **(b)** Reading a feed needs a long-lived access
> token, which is a secret — unlike the YouTube key it can **not** go in a
> `REACT_APP_*` variable, because anything there is readable by anyone who opens
> the site. That's why this needs an Edge Function at all.

1. **Convert the account** to Business or Creator, if it isn't already.
2. **Create a Meta app** — [Meta for Developers](https://developers.facebook.com/)
   → create an app → add the **Instagram** product → set up
   **Instagram API with Instagram Login**. Add the account as an Instagram
   tester and accept the invite from the Instagram app
   (Settings → Apps and websites → Tester invites).
3. **Generate a long-lived token** in the app dashboard and copy it. It's valid
   for 60 days — the function refreshes it from here on, so this is the only
   time you do it by hand.
4. **Run `instagram_feed.sql`** in the SQL Editor — creates the token store and
   a weekly refresh cron. Replace `<PROJECT_REF>` first.
5. **Deploy the function**, skipping the JWT check since it serves public data
   to an anonymous visitor:
   ```bash
   supabase functions deploy instagram-feed --no-verify-jwt
   ```
6. **Set the secret** (Project Settings → Edge Functions → Secrets):
   ```
   INSTAGRAM_TOKEN = <long-lived token>
   ```
   Only if you used the Facebook-Login flow instead of step 2, also set
   `INSTAGRAM_GRAPH_HOST = graph.facebook.com` and `INSTAGRAM_USER_ID = <ig user id>`.
7. **Point the site at it** — set `REACT_APP_IG_ENDPOINT` to
   `https://<PROJECT_REF>.supabase.co/functions/v1/instagram-feed` and redeploy
   the frontend.

**How it behaves:** the Media page asks the function for the 9 most recent
posts; the function caches for 15 minutes so Meta isn't hit on every page view.
On the first run it copies `INSTAGRAM_TOKEN` into the `instagram_token` table,
and from then on refreshes the token whenever it's within 10 days of expiring —
so the feed doesn't silently die 60 days after setup, which is the usual way
these break. If Meta errors, the function serves its last good response rather
than blanking the section, and the site falls back to the curated reels if the
function itself is unreachable. Check it with:
```bash
curl "https://<PROJECT_REF>.supabase.co/functions/v1/instagram-feed?limit=3"
```
```sql
select id, expires_at, updated_at from public.instagram_token;  -- never select the token
```

## 8. Event registrations (home-page banner)

Run `supabase/event_registrations.sql` (§2 step 3). Nothing else to configure —
it uses the same `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` the
portal already uses.

**How the duplicate rule works.** One registration per **mobile number per
event**. The number is normalised to its last 10 digits before comparison, so
`+91 98765 43210`, `098765-43210` and `9876543210` all count as the same
person. A repeat submission shows **"Already registered"**.

The check runs off a unique database index, not a lookup — the form just
inserts and reads the `23505` error back. That matters for two reasons: it
cannot race two people submitting the same number at the same moment, and the
browser never needs read access, so **a visitor can't enumerate the
registration list**. Only admins can read the table.

**Changing the event.** `EVENT_SLUG` and `EVENT_NAME` live at the top of
`src/components/Banner.jsx`. Registrations key off the slug, so a new event
needs a **new slug** — reusing an old one would tell everyone who registered
last time that they're already registered.

**Exporting the list.** SQL Editor:
```sql
select created_at, full_name, mobile, reference, group_name,
       occupation, education, education_status, specialization
from public.event_registrations
where event_slug = 'parayan-2026'
order by created_at;
```

**One caveat:** the form is public, so anyone can submit. The unique index caps
it at one row per real number, but nothing stops made-up numbers being entered.
If that becomes a problem, the fix is a captcha or moving submission behind an
Edge Function with rate limiting.

---

### What works after this
- Register → account is **pending** → can't get in until approved.
- Admin tab → **Approve / Reject**, make other admins, and tick **attendance taker**.
- Approved karyakartas → **Dashboard**, **Profile** settings.
- **Attendance** and **Satsang Videos** are the next phases (placeholders for now).
