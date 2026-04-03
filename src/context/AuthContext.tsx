import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type ApprovedUser = {
  email: string;
  full_name: string | null;
  role: "sales_director" | "investor";
  status: "active" | "inactive";
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  approvedUser: ApprovedUser | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [approvedUser, setApprovedUser] = useState<ApprovedUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadApprovedUser(email?: string | null) {
    if (!email) {
      setApprovedUser(null);
      return;
    }

    const { data, error } = await supabase
      .from("approved_users")
      .select("email, full_name, role, status")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error || !data || data.status !== "active") {
      setApprovedUser(null);
      return;
    }

    setApprovedUser(data as ApprovedUser);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      await loadApprovedUser(data.session?.user?.email ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      await loadApprovedUser(nextSession?.user?.email ?? null);
      setLoading(false);
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

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}