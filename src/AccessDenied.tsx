import { useAuth } from "./context/useAuth";

export default function AccessDenied() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f8fa] p-6">
      <div className="w-full max-w-md rounded-3xl border border-black/[0.06] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="text-[24px] font-semibold text-black/90">
          Access denied
        </h1>
        <p className="mt-3 text-[14px] text-black/58">
          This email is not authorized for the UF Partners portal.
        </p>
        <p className="mt-2 text-[13px] text-black/45">
          Signed in as: {user?.email ?? "Unknown"}
        </p>

        <button
          onClick={() => signOut()}
          className="mt-6 rounded-2xl bg-[#003883] px-4 py-3 text-[14px] font-medium text-white transition hover:opacity-95"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
