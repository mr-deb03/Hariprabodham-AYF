import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase, supabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // True once a profile fetch for the current user has finished (whether or not
  // a row was found). Lets guards tell "still loading" from "no profile row".
  const [profileChecked, setProfileChecked] = useState(false);
  // The user id we've already loaded a profile for. Used to ignore the
  // token-refresh / tab-focus auth events that fire with the *same* user.
  const loadedUserId = useRef(null);

  const loadProfile = useCallback(async (userId, { silent = false } = {}) => {
    if (!userId) {
      setProfile(null);
      setProfileChecked(true);
      return;
    }
    // On a background refresh we already have a profile on screen, so don't
    // flip back to the loading spinner — just refresh the data underneath.
    if (!silent) setProfileChecked(false);
    // maybeSingle() returns null (not a 406) when the row is missing.
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data || null);
    setProfileChecked(true);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      loadedUserId.current = data.session?.user?.id ?? null;
      await loadProfile(data.session?.user?.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!active) return;
      const nextId = sess?.user?.id ?? null;
      setSession(sess);
      // Supabase fires this on every token refresh and tab-focus re-validation,
      // not just real sign-in/out. Only (re)load the profile when the user
      // actually changes — otherwise we'd flash the spinner and re-trigger every
      // page's data fetch on each tab switch.
      if (nextId !== loadedUserId.current) {
        loadedUserId.current = nextId;
        await loadProfile(nextId);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = ({ email, password, fullName, mobile, mandal }) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, mobile, mandal } },
    });

  const signIn = ({ email, password }) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => supabase.auth.signOut();

  /*
   * Emails a one-time recovery link. redirectTo must also be listed under
   * Authentication -> URL Configuration -> Redirect URLs in the Supabase
   * dashboard, or the link lands on the site with an "invalid redirect" error
   * instead of a session. Derived from window.location.origin so localhost and
   * production each send people back to themselves.
   */
  const sendPasswordReset = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal/reset-password`,
    });

  // Only works while a session exists. Following the emailed link creates a
  // temporary recovery session, which is what authorises this call.
  const updatePassword = (password) => supabase.auth.updateUser({ password });

  const refreshProfile = () => loadProfile(session?.user?.id, { silent: true });

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileChecked,
    configured: supabaseConfigured,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
