import { motion } from "framer-motion";
import { useCRM } from "./hooks/useCRM";
import { DailyLogSection } from "./crm-content/DailyLogSection";
import { PageHeader } from "./components/ui/PageHeader";
import { SOFT_EASE, sectionMotion } from "./crm-content/shared";
import { PAGE_BG } from "./ui/tokens";

export default function CRMContent() {
  const {
    dailyLog,
    dailyLogLoading,
    createDailyEntry,
    updateDailyEntry,
    deleteDailyEntry,
  } = useCRM({ loadLeads: false, loadShowings: false });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: SOFT_EASE }}
      style={{ background: PAGE_BG }}
    >
      <div className="mx-auto max-w-[1220px] px-5 py-7 sm:px-6 md:px-10 md:py-9">
        <motion.div {...sectionMotion()} className="mb-7">
          <PageHeader
            tone="brand"
            title="Aktiviteti CRM"
            subtitle="Monitorimi i aktivitetit ditor"
            className="mb-0"
            titleClassName="leading-none"
            subtitleClassName="!mt-0"
          />
        </motion.div>

        <motion.div {...sectionMotion(0.02)} className="mb-7">
          <DailyLogSection
            entries={dailyLog}
            loading={dailyLogLoading}
            onCreate={createDailyEntry}
            onUpdate={updateDailyEntry}
            onDelete={deleteDailyEntry}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
