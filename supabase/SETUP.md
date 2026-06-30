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

---

### What works after this
- Register → account is **pending** → can't get in until approved.
- Admin tab → **Approve / Reject**, make other admins, and tick **attendance taker**.
- Approved karyakartas → **Dashboard**, **Profile** settings.
- **Attendance** and **Satsang Videos** are the next phases (placeholders for now).
