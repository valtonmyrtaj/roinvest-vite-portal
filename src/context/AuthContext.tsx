import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext, type ApprovedUser } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [approvedUser, setApprovedUser] = useState<ApprovedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const latestAuthSyncRequestIdRef = useRef(0);

  async function loadApprovedUser(email?: string | null): Promise<ApprovedUser | null> {
    if (!email) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("approved_users")
        .select("email, full_name, role, status")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (error || !data || data.status !== "active") {
        return null;
      }

      return data as ApprovedUser;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async (nextSession: Session | null) => {
      const requestId = ++latestAuthSyncRequestIdRef.current;
      if (!mounted) return;

      setLoading(true);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      const nextApprovedUser = await loadApprovedUser(nextSession?.user?.email ?? null);

      if (!mounted || requestId !== latestAuthSyncRequestIdRef.current) return;

      setApprovedUser(nextApprovedUser);
      setLoading(false);
    };

    void supabase.auth
      .getSession()
      .then(({ data }) => syncAuthState(data.session ?? null))
      .catch(() => {
        if (mounted && latestAuthSyncRequestIdRef.current === 0) {
          setApprovedUser(null);
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Defer follow-up Supabase reads until the auth callback releases its lock.
      setTimeout(() => {
        void syncAuthState(nextSession ?? null);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    []
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error: error?.message ?? null };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      approvedUser,
      loading,
      signInWithMagicLink,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [
      session,
      user,
      approvedUser,
      loading,
      signInWithMagicLink,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
