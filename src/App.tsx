import "./App.css";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DashboardShell, { type PageKey } from "./DashboardShell";
import OverviewPage from "./OverviewPage";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import LoginPage from "./LoginPage";
import AccessDenied from "./AccessDenied";

const SalesPage = lazy(() => import("./SalesPage"));
const UnitsDashboard = lazy(() =>
  import("./UnitsDashboard").then((module) => ({ default: module.UnitsDashboard })),
);
const MarketingDashboard = lazy(() => import("./MarketingDashboard"));
const CRMContent = lazy(() => import("./CRMContent"));
const ExecutiveReports = lazy(() => import("./ExecutiveReports"));
const DataInputPage = lazy(() => import("./DataInputPage"));

const PAGE_PATHS: Record<PageKey, string> = {
  overview: "/overview",
  sales: "/sales",
  units: "/units",
  marketing: "/marketing",
  crm: "/crm",
  reports: "/executive-reports",
  input: "/data-input",
};

function isPageKey(value: string | null): value is PageKey {
  return (
    value === "overview" ||
    value === "sales" ||
    value === "units" ||
    value === "marketing" ||
    value === "crm" ||
    value === "reports" ||
    value === "input"
  );
}

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

function getPageFromPath(pathname: string): PageKey | null {
  const normalized = normalizePathname(pathname);
  const entry = Object.entries(PAGE_PATHS).find(([, path]) => path === normalized);
  return entry ? (entry[0] as PageKey) : null;
}

function buildPageUrl(page: PageKey, focusUnitId?: string | null, hash?: string | null) {
  const url = new URL(window.location.href);
  url.pathname = PAGE_PATHS[page];
  url.searchParams.delete("page");
  url.hash = hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "";

  if (page === "sales" && focusUnitId) {
    url.searchParams.set("focusUnitId", focusUnitId);
  } else {
    url.searchParams.delete("focusUnitId");
  }

  return url;
}

function getRoutingState() {
  if (typeof window === "undefined") {
    return {
      page: "overview" as PageKey,
      search: "",
      normalizedUrl: null as URL | null,
    };
  }

  const currentUrl = new URL(window.location.href);
  const legacyPage = currentUrl.searchParams.get("page");

  if (isPageKey(legacyPage)) {
    const normalizedUrl = buildPageUrl(legacyPage, currentUrl.searchParams.get("focusUnitId"));
    return {
      page: legacyPage,
      search: normalizedUrl.search,
      normalizedUrl,
    };
  }

  const pageFromPath = getPageFromPath(currentUrl.pathname);

  if (pageFromPath) {
    const normalizedPath = normalizePathname(currentUrl.pathname);
    const normalizedUrl = new URL(currentUrl.toString());
    let needsNormalization =
      normalizedPath !== currentUrl.pathname || currentUrl.searchParams.has("page");

    normalizedUrl.pathname = normalizedPath;
    normalizedUrl.searchParams.delete("page");

    if (pageFromPath !== "sales" && normalizedUrl.searchParams.has("focusUnitId")) {
      normalizedUrl.searchParams.delete("focusUnitId");
      needsNormalization = true;
    }

    return {
      page: pageFromPath,
      search: needsNormalization ? normalizedUrl.search : currentUrl.search,
      normalizedUrl: needsNormalization ? normalizedUrl : null,
    };
  }

  const normalizedUrl = buildPageUrl("overview");
  return {
    page: "overview" as PageKey,
    search: normalizedUrl.search,
    normalizedUrl,
  };
}

function replaceUrl(url: URL) {
  window.history.replaceState(window.history.state, "", url.toString());
}

function pushUrl(url: URL) {
  window.history.pushState(window.history.state, "", url.toString());
}

function PageFallback() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      role="status"
      className="min-h-[calc(100vh-74px)] bg-[#f8f8fa]"
    >
      <span className="sr-only">Loading page</span>

      <div className="mx-auto max-w-[1280px] px-5 py-7 md:px-10 md:py-9">
        <div className="max-w-[560px]">
          <div className="h-2.5 w-24 rounded-full bg-black/[0.05]" />
          <div className="mt-4 h-8 w-full max-w-[320px] rounded-[10px] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]" />
          <div className="mt-3 h-4 w-full max-w-[520px] rounded-full bg-black/[0.045]" />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[156px] rounded-[18px] border border-[#e8e8ec] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)]"
            />
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.9fr)]">
          <div className="h-[320px] rounded-[20px] border border-[#e8e8ec] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)]" />
          <div className="h-[320px] rounded-[20px] border border-[#e8e8ec] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)]" />
        </div>
      </div>
    </div>
  );
}

function ProtectedApp() {
  const { loading, session, approvedUser } = useAuth();
  const initialRoutingState = useMemo(() => getRoutingState(), []);
  const [currentPage, setCurrentPage] = useState<PageKey>(initialRoutingState.page);
  const [locationSearch, setLocationSearch] = useState<string>(initialRoutingState.search);

  const syncRoutingState = useCallback(() => {
    const next = getRoutingState();

    if (next.normalizedUrl) {
      replaceUrl(next.normalizedUrl);
    }

    setCurrentPage(next.page);
    setLocationSearch(next.normalizedUrl?.search ?? next.search);
  }, []);

  const handleNavigate = (page: PageKey, hash?: string | null) => {
    const nextUrl = buildPageUrl(page, null, hash);
    pushUrl(nextUrl);
    setCurrentPage(page);
    setLocationSearch(nextUrl.search);
  };

  const handleOpenSalesPayments = (unitId: string) => {
    const nextUrl = buildPageUrl("sales", unitId);
    pushUrl(nextUrl);
    setCurrentPage("sales");
    setLocationSearch(nextUrl.search);
  };

  const handleLoginSuccess = useCallback(() => {
    const nextUrl = buildPageUrl("overview");
    replaceUrl(nextUrl);
    setCurrentPage("overview");
    setLocationSearch(nextUrl.search);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !initialRoutingState.normalizedUrl) return;
    replaceUrl(initialRoutingState.normalizedUrl);
  }, [initialRoutingState]);

  useEffect(() => {
    const handlePopState = () => {
      syncRoutingState();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [syncRoutingState]);

  // Reset window scroll to the top on every page change so a new page always
  // opens from the top, regardless of where the previous page was scrolled.
  // Covers sidebar clicks, programmatic navigation, and browser back/forward.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentPage]);

  if (loading) {
    return <div className="min-h-screen bg-[#f8f8fa]" />;
  }

  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (!approvedUser) {
    return <AccessDenied />;
  }

  return (
    <DashboardShell
      currentPage={currentPage}
      onNavigate={handleNavigate}
      userName={approvedUser.full_name || approvedUser.email}
      userRole={approvedUser.role}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 min-w-0"
        >
          <Suspense fallback={<PageFallback />}>
            {currentPage === "overview" && <OverviewPage />}
            {currentPage === "sales" && (
              <SalesPage
                onNavigate={(page, hash) => handleNavigate(page as PageKey, hash)}
                navigationSearch={locationSearch}
              />
            )}
            {currentPage === "units" && <UnitsDashboard />}
            {currentPage === "marketing" &&
              approvedUser.role === "sales_director" && (
                <MarketingDashboard />
              )}
            {currentPage === "crm" &&
              approvedUser.role === "sales_director" && <CRMContent />}
            {currentPage === "reports" && <ExecutiveReports />}
            {currentPage === "input" &&
              approvedUser.role === "sales_director" && (
                <DataInputPage onOpenSalesPayments={handleOpenSalesPayments} />
              )}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </DashboardShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}
