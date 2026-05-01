import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  CreditCard,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "./context/useAuth";
import { operationalAlerts } from "./lib/api";
import type {
  OperationalAlert,
  OperationalAlertType,
} from "./lib/api/operationalAlerts";

const ACCENT = "#003883";

export type PageKey =
  | "overview"
  | "sales"
  | "units"
  | "marketing"
  | "crm"
  | "reports"
  | "input";

type UserRole = "sales_director" | "investor" | "cfo";

type DashboardShellProps = {
  children: ReactNode;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  userName: string;
  userRole: UserRole;
};

const navItems: { key: PageKey; label: string; icon: LucideIcon }[] = [
  { key: "overview",  label: "Pasqyra",           icon: LayoutGrid },
  { key: "sales",     label: "Shitjet",            icon: BarChart3  },
  { key: "units",     label: "Njësitë",            icon: Building2  },
  { key: "marketing", label: "Marketingu",         icon: Megaphone  },
  { key: "crm",       label: "Aktiviteti CRM",     icon: Activity   },
  { key: "reports",   label: "Raportet",           icon: FileText   },
  { key: "input",     label: "Të dhënat",          icon: Database   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string, nowTs: number): string {
  const diff = nowTs - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);
  if (minutes < 2)  return "tani";
  if (minutes < 60) return `${minutes} minuta më parë`;
  if (hours < 24)   return `${hours} orë më parë`;
  if (days === 1)   return "dje";
  return `${days} ditë më parë`;
}

function formatAlertDate(iso: string | null) {
  if (!iso) return null;
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
}

function alertFooter(alert: OperationalAlert, nowTs: number): string {
  const dueDate = formatAlertDate(alert.dueDate);
  if (dueDate) return `Afati: ${dueDate}`;
  return timeAgo(alert.occurredAt, nowTs);
}

const ALERT_META: Record<
  OperationalAlertType,
  { icon: LucideIcon; color: string; bg: string; title: string }
> = {
  sale_completed: {
    icon: BadgeCheck,
    color: "#3c7a57",
    bg: "#edf7f1",
    title: "Shitje e re",
  },
  reservation_created: {
    icon: Clock3,
    color: "#b0892f",
    bg: "#fff8e8",
    title: "Rezervim i ri",
  },
  reservation_due_week: {
    icon: Clock3,
    color: "#b0892f",
    bg: "#fff8e8",
    title: "Afat rezervimi",
  },
  reservation_due_day: {
    icon: AlertCircle,
    color: "#b14b4b",
    bg: "#fbeeee",
    title: "Rezervim nesër",
  },
  reservation_due_today: {
    icon: AlertCircle,
    color: "#b14b4b",
    bg: "#fbeeee",
    title: "Rezervim sot",
  },
  reservation_overdue: {
    icon: AlertCircle,
    color: "#b14b4b",
    bg: "#fbeeee",
    title: "Rezervim i vonuar",
  },
  payment_due_week: {
    icon: CreditCard,
    color: "#b0892f",
    bg: "#fff8e8",
    title: "Afat pagese",
  },
  payment_due_day: {
    icon: CreditCard,
    color: "#b14b4b",
    bg: "#fbeeee",
    title: "Pagesë nesër",
  },
  payment_due_today: {
    icon: CreditCard,
    color: "#b14b4b",
    bg: "#fbeeee",
    title: "Pagesë sot",
  },
  payment_overdue: {
    icon: AlertCircle,
    color: "#b14b4b",
    bg: "#fbeeee",
    title: "Pagesë e vonuar",
  },
};

const LS_ALERT_READ_IDS_KEY = "roinvest_operational_alert_read_ids";

function readStoredAlertIds(): string[] {
  try {
    const rawValue = localStorage.getItem(LS_ALERT_READ_IDS_KEY);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStoredAlertIds(ids: string[]) {
  localStorage.setItem(LS_ALERT_READ_IDS_KEY, JSON.stringify(ids.slice(-200)));
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

// ─── OperationalAlertsPanel ───────────────────────────────────────────────────

function OperationalAlertsPanel({
  alerts,
  sourceErrors,
  nowTs,
  onMarkRead,
  onClose,
}: {
  alerts: OperationalAlert[];
  sourceErrors: string[];
  nowTs: number;
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
        <span className="text-[13px] font-semibold text-black/80">Sinjalet operative</span>
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
        {sourceErrors.length > 0 && (
          <div className="border-b border-[#f1dddd] bg-[#fdf8f8] px-4 py-3">
            <p className="text-[11.5px] font-medium text-[#b14b4b]">
              Disa sinjale nuk u ngarkuan.
            </p>
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.03]">
              <Bell size={15} className="text-black/30" strokeWidth={2} />
            </div>
            <p className="text-[12.5px] font-medium text-black/55">Nuk ka sinjale aktive</p>
            <p className="mt-1 text-[11.5px] text-black/32">
              Shitjet, rezervimet dhe afatet kritike do të shfaqen këtu.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const meta = ALERT_META[alert.type];
            const Icon = meta.icon;
            return (
              <div
                key={alert.id}
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
                    Njësia <span className="font-medium text-black/65">{alert.unitDisplay}</span>
                    {` · ${alert.detail}`}
                  </p>
                  <p className="mt-1 text-[11px] text-black/28">{alertFooter(alert, nowTs)}</p>
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

  // Operational alerts state
  const [bellOpen, setBellOpen]           = useState(false);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [alertSourceErrors, setAlertSourceErrors] = useState<string[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<string[]>(readStoredAlertIds);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const bellRef = useRef<HTMLDivElement>(null);
  const hasRequestedAlertsRef = useRef(false);
  const alertsPrefetchHandleRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Avatar state
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const visibleNavItems = navItems.filter((item) => {
    if (userRole !== "sales_director") {
      return ["overview", "sales", "units", "reports"].includes(item.key);
    }
    return true;
  });

  const userLabel =
    userRole === "sales_director"
      ? "Sales Director"
      : userRole === "cfo"
        ? "CFO Access"
        : "Investor Access";
  const userInitials = userName
    .split(" ").filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase()).join("");

  const loadAlerts = useCallback((force = false) => {
    if (userRole !== "sales_director" || (hasRequestedAlertsRef.current && !force)) return;
    hasRequestedAlertsRef.current = true;

    void operationalAlerts.listOperationalAlerts({ limit: 24 }).then(({ data, error }) => {
      if (!isMountedRef.current) return;
      if (error || !data) {
        setAlertSourceErrors([error ?? "Sinjalet operative nuk u ngarkuan."]);
        return;
      }

      setAlerts(data.alerts);
      setAlertSourceErrors(data.sourceErrors);
    });
  }, [userRole]);

  // Redirect if page not allowed
  useEffect(() => {
    const allowed = visibleNavItems.map((i) => i.key);
    if (!allowed.includes(currentPage)) onNavigate("overview");
  }, [currentPage, onNavigate, userRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // Operational alerts are secondary shell work, so prefetch them after first paint.
  useEffect(() => {
    isMountedRef.current = true;
    if (userRole !== "sales_director") return undefined;

    const idleWindow = window as IdleWindow;
    let usedIdleCallback = false;

    if (idleWindow.requestIdleCallback) {
      usedIdleCallback = true;
      alertsPrefetchHandleRef.current = idleWindow.requestIdleCallback(() => {
        alertsPrefetchHandleRef.current = null;
        loadAlerts();
      }, { timeout: 1200 });
    } else {
      alertsPrefetchHandleRef.current = window.setTimeout(() => {
        alertsPrefetchHandleRef.current = null;
        loadAlerts();
      }, 250);
    }

    return () => {
      isMountedRef.current = false;
      if (alertsPrefetchHandleRef.current === null) return;

      if (usedIdleCallback && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(alertsPrefetchHandleRef.current);
        return;
      }

      window.clearTimeout(alertsPrefetchHandleRef.current);
    };
  }, [loadAlerts, userRole]);

  // Close dropdowns on outside click
  useEffect(() => {
    const tickId = window.setInterval(() => {
      setNowTs(Date.now());
    }, 60_000);

    const handler = (e: MouseEvent) => {
      if (bellRef.current   && !bellRef.current.contains(e.target as Node))   setBellOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => {
      window.clearInterval(tickId);
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  const handleMarkRead = () => {
    const mergedIds = Array.from(new Set([...readAlertIds, ...alerts.map((alert) => alert.id)]));
    setReadAlertIds(mergedIds);
    writeStoredAlertIds(mergedIds);
  };

  const readAlertIdSet = new Set(readAlertIds);
  const unreadCount = alerts.filter((alert) => !readAlertIdSet.has(alert.id)).length;

  return (
    <div className="min-h-screen bg-[#f8f8fa] text-black">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 flex h-screen w-[260px] flex-col border-r border-black/[0.05] bg-[#fcfcfd]">
        <div className="flex h-[74px] items-center border-b border-black/[0.05] px-4">
          <img src="/selesta-logo-blue.png" alt="Selesta Living logo" className="h-6 w-[42px] object-contain" />
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
          <div className="text-[10px] uppercase tracking-[0.18em] text-black/22">Selesta Living</div>
          <div className="mt-1 text-[11px] text-black/32">v1.0</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ml-[260px] min-h-screen">
        <header className="flex h-[74px] items-center justify-between border-b border-black/[0.05] bg-[#fcfcfd] px-7">
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <img src="/selesta-logo-blue.png" alt="Selesta Living logo" className="h-7 w-[48px] object-contain" />
            <div className="flex flex-col leading-none">
              <span className="text-[15px]" style={{ color: ACCENT, fontWeight: 600 }}>Selesta Living</span>
              <span
                className="mt-1 text-[10px] uppercase tracking-[0.18em]"
                style={{ color: "rgba(0,56,131,0.68)", fontWeight: 500 }}
              >
                UF Partners Portal
              </span>
            </div>
          </div>

          {/* Right: bell + avatar */}
          <div className="flex items-center gap-3">

            {/* Bell */}
            {userRole === "sales_director" && (
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => {
                    loadAlerts(true);
                    setBellOpen((o) => !o);
                    setAvatarOpen(false);
                  }}
                  className="relative rounded-lg p-2 text-black/35 transition hover:bg-black/[0.04] hover:text-black/60"
                  aria-label="Sinjalet operative"
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
                    <OperationalAlertsPanel
                      alerts={alerts}
                      sourceErrors={alertSourceErrors}
                      nowTs={nowTs}
                      onMarkRead={handleMarkRead}
                      onClose={() => setBellOpen(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}

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
