import "./App.css";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DashboardShell, { type PageKey } from "./DashboardShell";
import OverviewPage from "./OverviewPage";
import SalesPage from "./SalesPage";
import { UnitsDashboard } from "./UnitsDashboard";
import MarketingDashboard from "./MarketingDashboard";
import CRMContent from "./CRMContent";
import ExecutiveReports from "./ExecutiveReports";
import { DashboardProvider } from "./context/DashboardContext";
import DataInputPage from "./DataInputPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./LoginPage";
import AccessDenied from "./AccessDenied";

function ProtectedApp() {
  const { loading, session, approvedUser } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageKey>("overview");

  if (loading) {
    return <div className="min-h-screen bg-[#f8f8fa]" />;
  }

  if (!session) {
    return <LoginPage />;
  }

  if (!approvedUser) {
    return <AccessDenied />;
  }

  return (
    <DashboardProvider>
      <DashboardShell
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        userName={approvedUser.full_name || approvedUser.email}
        userRole={approvedUser.role}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex-1 min-w-0"
          >
            {currentPage === "overview" && <OverviewPage />}
            {currentPage === "sales" && <SalesPage />}
            {currentPage === "units" && <UnitsDashboard />}
            {currentPage === "marketing" &&
              approvedUser.role === "sales_director" && <MarketingDashboard />}
            {currentPage === "crm" &&
              approvedUser.role === "sales_director" && <CRMContent />}
            {currentPage === "reports" && <ExecutiveReports />}
            {currentPage === "input" &&
              approvedUser.role === "sales_director" && <DataInputPage />}
          </motion.div>
        </AnimatePresence>
      </DashboardShell>
    </DashboardProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}