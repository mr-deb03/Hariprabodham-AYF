import { createClient } from "@supabase/supabase-js";

// Set these in .env.local (and in Vercel's Environment Variables for production):
//   REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
//   REACT_APP_SUPABASE_ANON_KEY=eyJ...
const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// The rest of the site keeps working even before the portal is configured;
// portal screens check `supabaseConfigured` and show a friendly notice.
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

// PostgREST caps every response at the project's `max-rows` (1000 by default),
// so a plain select silently truncates large tables. This pages through in
// 1000-row chunks and returns the full result set.
//   makeQuery: () => supabase.from("members").select("*").order("name")
// (must return a *fresh* builder each call — a builder can only run once.)
export async function fetchAllRows(makeQuery, chunk = 1000) {
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await makeQuery().range(from, from + chunk - 1);
    if (error) return { data: out, error };
    out.push(...(data || []));
    if (!data || data.length < chunk) break;
    from += chunk;
  }
  return { data: out, error: null };
}
