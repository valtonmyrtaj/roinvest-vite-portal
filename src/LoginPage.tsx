import { useState } from "react";
import { useAuth } from "./context/AuthContext";

type Tab = "magic" | "password";

export default function LoginPage() {
  const { signInWithMagicLink, signInWithPassword } = useAuth();

  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function getFriendlyError(message: string) {
    const n = message.toLowerCase();
    if (n.includes("rate limit") || n.includes("too many requests") || n.includes("email rate limit exceeded"))
      return "Please wait a moment before requesting another secure link.";
    if (n.includes("invalid email"))
      return "Please enter a valid email address.";
    if (n.includes("invalid login credentials") || n.includes("invalid password") || n.includes("wrong password"))
      return "Incorrect email or password.";
    if (n.includes("email not confirmed"))
      return "Please confirm your email address first.";
    return "Sign-in failed. Please try again.";
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);
    const result = await signInWithMagicLink(email.trim().toLowerCase());
    if (result.error) {
      setError(getFriendlyError(result.error));
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signInWithPassword(email.trim().toLowerCase(), password);
    if (result.error) {
      setError(getFriendlyError(result.error));
    }
    setLoading(false);
  }

  function switchTab(t: Tab) {
    setTab(t);
    setError(null);
    setSent(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f8fa] p-6">
      <div className="w-full max-w-md rounded-3xl border border-black/[0.06] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">

        {/* Logo */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <img src="/R003883.png" alt="Roinvest logo" className="h-6 w-6 object-contain" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-black/90">Roinvest</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-black/38">UF PARTNERS PORTAL</div>
          </div>
        </div>

        <h1 className="text-[24px] font-semibold text-black/90">Private access</h1>
        <p className="mt-2 text-[14px] text-black/55">
          Sign in with your approved email to access the investor dashboard.
        </p>

        {/* Tab switcher */}
        <div className="mt-6 flex rounded-2xl border border-black/[0.06] bg-black/[0.02] p-1">
          <button
            type="button"
            onClick={() => switchTab("password")}
            className="flex-1 rounded-xl py-2 text-[13px] font-medium transition-all"
            style={{
              backgroundColor: tab === "password" ? "#fff" : "transparent",
              color: tab === "password" ? "#003883" : "rgba(0,0,0,0.4)",
              boxShadow: tab === "password" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => switchTab("magic")}
            className="flex-1 rounded-xl py-2 text-[13px] font-medium transition-all"
            style={{
              backgroundColor: tab === "magic" ? "#fff" : "transparent",
              color: tab === "magic" ? "#003883" : "rgba(0,0,0,0.4)",
              boxShadow: tab === "magic" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            Magic link
          </button>
        </div>

        {/* Password form */}
        {tab === "password" && (
          <form onSubmit={handlePassword} className="mt-5 space-y-3">
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-[14px] outline-none transition focus:border-[#003883]"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-[14px] outline-none transition focus:border-[#003883]"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#003883] px-4 py-3 text-[14px] font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        {/* Magic link form */}
        {tab === "magic" && (
          <form onSubmit={handleMagicLink} className="mt-5 space-y-3">
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-[14px] outline-none transition focus:border-[#003883]"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#003883] px-4 py-3 text-[14px] font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}

        {sent && (
          <div className="mt-4 rounded-2xl border border-black/[0.06] bg-black/[0.025] px-4 py-3">
            <p className="text-[13px] text-black/55">Check your email for the secure sign-in link.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-black/[0.06] bg-black/[0.025] px-4 py-3">
            <p className="text-[13px] text-black/55">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
