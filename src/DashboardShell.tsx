import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  BarChart3,
  Building2,
  Megaphone,
  Activity,
  FileText,
  Database,
  Bell,
  LogOut,
  BadgeCheck,
  Clock3,
  AlertCircle,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";

const ACCENT = "#003883";

export type PageKey =
  | "overview"
  | "sales"
  | "units"
  | "marketing"
  | "crm"
  | "reports"
  | "input";

type UserRole = "sales_director" | "investor";

type DashboardShellProps = {
  children: ReactNode;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  userName: string;
  userRole: UserRole;
};

const navItems: { key: PageKey; label: string; icon: any }[] = [
  { key: "overview",  label: "Overview",          icon: LayoutGrid },
  { key: "sales",     label: "Sales",              icon: BarChart3  },
  { key: "units",     label: "Units",              icon: Building2  },
  { key: "marketing", label: "Marketing",          icon: Megaphone  },
  { key: "crm",       label: "CRM Activity",       icon: Activity   },
  { key: "reports",   label: "Executive Reports",  icon: FileText   },
  { key: "input",     label: "Data Input",         icon: Database   },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = "sold" | "reserved" | "expired" | "other";

interface Notification {
  id: string;
  type: NotifType;
  unitDisplay: string;
  changed_at: string;
  change_reason: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);
  if (minutes < 2)  return "tani";
  if (minutes < 60) return `${minutes} minuta më parë`;
  if (hours < 24)   return `${hours} orë më parë`;
  if (days === 1)   return "dje";
  return `${days} ditë më parë`;
}

function notifType(rec: { new_data: Record<string, unknown>; previous_data: Record<string, unknown> }): NotifType {
  const newStatus  = rec.new_data?.status  as string | undefined;
  const prevStatus = rec.previous_data?.status as string | undefined;
  if (newStatus === "E shitur")    return "sold";
  if (newStatus === "E rezervuar") return "reserved";
  if (newStatus === "Në dispozicion" && prevStatus === "E rezervuar") return "expired";
  return "other";
}

const NOTIF_META: Record<NotifType, { icon: React.ComponentType<any>; color: string; bg: string; title: string }> = {
  sold:     { icon: BadgeCheck,  color: "#3c7a57", bg: "#edf7f1", title: "Njësi e shitur"       },
  reserved: { icon: Clock3,      color: "#b0892f", bg: "#fff8e8", title: "Njësi e rezervuar"    },
  expired:  { icon: AlertCircle, color: "#b14b4b", bg: "#fbeeee", title: "Rezervimi skadoi"     },
  other:    { icon: Pencil,      color: "#003883", bg: "#eaf0fa", title: "Ndryshim i të dhënave" },
};

const LS_READ_KEY = "roinvest_notif_read_at";

// ─── NotificationPanel ────────────────────────────────────────────────────────

function NotificationPanel({
  notifications,
  onMarkRead,
  onClose,
}: {
  notifications: Notification[];
  onMarkRead: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -6 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="absolute right-0 top-[calc(100%+10px)] z-50 w-[360px] overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3.5">
        <span className="text-[13px] font-semibold text-black/80">Njoftimet</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkRead}
            className="text-[11.5px] text-[#003883] transition hover:opacity-70"
            style={{ fontWeight: 500 }}
          >
            Shëno të gjitha si të lexuara
          </button>
          <button onClick={onClose} className="rounded-md p-0.5 text-black/30 transition hover:bg-black/[0.04] hover:text-black/60">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Bell size={24} className="mb-2 text-black/15" />
            <p className="text-[12.5px] text-black/30">Asnjë njoftim</p>
          </div>
        ) : (
          notifications.map((n) => {
            const meta = NOTIF_META[n.type];
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                className="flex gap-3 border-b border-black/[0.04] px-4 py-3 last:border-0 hover:bg-[#f8f8fa]"
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: meta.bg }}
                >
                  <Icon size={14} style={{ color: meta.color }} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-black/80">{meta.title}</p>
                  <p className="mt-0.5 text-[12px] text-black/45">
                    Njësia <span className="font-medium text-black/65">{n.unitDisplay}</span>
                    {n.change_reason ? ` · ${n.change_reason}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-black/28">{timeAgo(n.changed_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ─── AvatarPanel ──────────────────────────────────────────────────────────────

function AvatarPanel({
  userName,
  userLabel,
  userInitials,
  onSignOut,
  onClose,
}: {
  userName: string;
  userLabel: string;
  userInitials: string;
  onSignOut: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -6 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="absolute right-0 top-[calc(100%+10px)] z-50 w-[210px] overflow-hidden rounded-[14px] border border-black/[0.07] bg-white shadow-xl"
    >
      {/* User info */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: ACCENT, fontSize: 11, fontWeight: 600 }}
        >
          {userInitials || "U"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-black/80">{userName}</p>
          <p className="truncate text-[11px] text-black/38">{userLabel}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-black/[0.06]" />

      {/* Logout */}
      <div className="p-1.5">
        <button
          onClick={() => { onSignOut(); onClose(); }}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[12.5px] text-red-500 transition hover:bg-red-50"
          style={{ fontWeight: 500 }}
        >
          <LogOut size={13} strokeWidth={2} />
          Dilni
        </button>
      </div>
    </motion.div>
  );
}

// ─── DashboardShell ───────────────────────────────────────────────────────────

export default function DashboardShell({
  children,
  currentPage,
  onNavigate,
  userName,
  userRole,
}: DashboardShellProps) {
  const { signOut } = useAuth();

  // Bell state
  const [bellOpen, setBellOpen]           = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastReadAt, setLastReadAt]       = useState<number>(
    () => Number(localStorage.getItem(LS_READ_KEY) ?? 0)
  );
  const bellRef = useRef<HTMLDivElement>(null);

  // Avatar state
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const visibleNavItems = navItems.filter((item) => {
    if (userRole === "investor") {
      return ["overview", "sales", "units", "reports"].includes(item.key);
    }
    return true;
  });

  const userLabel    = userRole === "sales_director" ? "Sales Director" : "Investor Access";
  const userInitials = userName
    .split(" ").filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase()).join("");

  // Redirect if page not allowed
  useEffect(() => {
    const allowed = visibleNavItems.map((i) => i.key);
    if (!allowed.includes(currentPage)) onNavigate("overview");
  }, [currentPage, onNavigate, userRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("unit_history")
      .select("id, changed_at, change_reason, previous_data, new_data, units(unit_id)")
      .order("changed_at", { ascending: false })
      .limit(20);
    if (error || !data) return;
    const mapped: Notification[] = (data as any[]).map((rec) => ({
      id:          rec.id,
      type:        notifType(rec),
      unitDisplay: rec.units?.unit_id ?? rec.id.slice(0, 8),
      changed_at:  rec.changed_at,
      change_reason: rec.change_reason ?? "",
    }));
    setNotifications(mapped);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current   && !bellRef.current.contains(e.target as Node))   setBellOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkRead = () => {
    const now = Date.now();
    setLastReadAt(now);
    localStorage.setItem(LS_READ_KEY, String(now));
  };

  const unreadCount = notifications.filter(
    (n) => new Date(n.changed_at).getTime() > lastReadAt &&
           Date.now() - new Date(n.changed_at).getTime() < 86_400_000
  ).length;

  return (
    <div className="min-h-screen bg-[#f8f8fa] text-black">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 flex h-screen w-[260px] flex-col border-r border-black/[0.05] bg-[#fcfcfd]">
        <div className="flex h-[74px] items-center border-b border-black/[0.05] px-4">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
            <img src="/R003883.png" alt="Roinvest logo" className="h-6 w-6 object-contain" />
          </div>
        </div>

        <nav className="flex flex-col gap-2.5 px-5 py-7">
          {visibleNavItems.map((item) => {
            const Icon     = item.icon;
            const isActive = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex items-center gap-3 rounded-xl px-5 py-3.5 text-left transition-all ${
                  isActive ? "bg-[#eef3fb] text-[#003883]" : "text-black/38 hover:bg-black/[0.03] hover:text-black/65"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[12.5px] leading-tight" style={{ fontWeight: isActive ? 550 : 450 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-black/[0.05] px-4 py-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-black/22">UF Partners Portal</div>
          <div className="mt-1 text-[11px] text-black/32">v1.0 · Mar 2026</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ml-[260px] min-h-screen">
        <header className="flex h-[74px] items-center justify-between border-b border-black/[0.05] bg-[#fcfcfd] px-7">
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
              <img src="/R003883.png" alt="Roinvest logo" className="h-6 w-6 object-contain" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] text-black/88" style={{ fontWeight: 600 }}>Roinvest</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-black/34">UF Partners Portal</span>
            </div>
          </div>

          {/* Right: bell + avatar */}
          <div className="flex items-center gap-3">

            {/* Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => { setBellOpen((o) => !o); setAvatarOpen(false); }}
                className="relative rounded-lg p-2 text-black/35 transition hover:bg-black/[0.04] hover:text-black/60"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span
                    className="absolute right-1 top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                    style={{ backgroundColor: "#b14b4b", lineHeight: 1 }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {bellOpen && (
                  <NotificationPanel
                    notifications={notifications}
                    onMarkRead={handleMarkRead}
                    onClose={() => setBellOpen(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => { setAvatarOpen((o) => !o); setBellOpen(false); }}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-black/[0.03]"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  <span className="text-[11px] font-semibold">{userInitials || "U"}</span>
                </div>
                <div className="leading-tight">
                  <div className="text-[12.5px] text-black/82" style={{ fontWeight: 550 }}>{userName}</div>
                  <div className="mt-0.5 text-[11px] text-black/34">{userLabel}</div>
                </div>
              </button>

              <AnimatePresence>
                {avatarOpen && (
                  <AvatarPanel
                    userName={userName}
                    userLabel={userLabel}
                    userInitials={userInitials}
                    onSignOut={signOut}
                    onClose={() => setAvatarOpen(false)}
                  />
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        <main className="min-h-[calc(100vh-74px)]">{children}</main>
      </div>
    </div>
  );
}
