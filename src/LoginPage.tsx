import { useState } from "react";
import { useAuth } from "./context/useAuth";

type Tab = "magic" | "password";

type LoginPageProps = {
  onLoginSuccess: () => void;
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
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
      return "Prisni pak para se të kërkoni një link tjetër të sigurt.";
    if (n.includes("invalid email"))
      return "Vendosni një adresë emaili të vlefshme.";
    if (n.includes("invalid login credentials") || n.includes("invalid password") || n.includes("wrong password"))
      return "Emaili ose fjalëkalimi nuk është i saktë.";
    if (n.includes("email not confirmed"))
      return "Konfirmoni fillimisht adresën tuaj të emailit.";
    return "Hyrja dështoi. Provoni përsëri.";
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
    } else {
      onLoginSuccess();
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
        <div className="mb-6 flex flex-col items-start">
          <img src="/selesta-living-full.png" alt="Selesta Living" className="h-7 w-[214px] max-w-full object-contain object-left" />
        </div>

        <h1 className="text-[24px] font-semibold text-[#333333]">Qasje private</h1>
        <p className="mt-2 text-[14px] text-black/55">
          Hyni me emailin e aprovuar për të hapur panelin e investitorit.
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
            Fjalëkalimi
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
            Link me email
          </button>
        </div>

        {/* Password form */}
        {tab === "password" && (
          <form onSubmit={handlePassword} className="mt-5 space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-[14px] outline-none transition focus:border-[#003883]"
              required
            />
            <input
              type="password"
              placeholder="Fjalëkalimi"
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
              {loading ? "Duke hyrë..." : "Hyr"}
            </button>
          </form>
        )}

        {/* Magic link form */}
        {tab === "magic" && (
          <form onSubmit={handleMagicLink} className="mt-5 space-y-3">
            <input
              type="email"
              placeholder="Email"
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
              {loading ? "Duke dërguar..." : "Dërgo linkun në email"}
            </button>
          </form>
        )}

        {sent && (
          <div className="mt-4 rounded-2xl border border-black/[0.06] bg-black/[0.025] px-4 py-3">
            <p className="text-[13px] text-black/55">Kontrolloni emailin për linkun e sigurt të hyrjes.</p>
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
