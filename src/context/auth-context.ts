import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type ApprovedUser = {
  email: string;
  full_name: string | null;
  role: "sales_director" | "investor";
  status: "active" | "inactive";
};

export type AuthContextType = {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
