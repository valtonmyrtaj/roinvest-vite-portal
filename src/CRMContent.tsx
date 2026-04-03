import { useMemo, useState } from "react";
import {
  Activity,
  MessageSquare,
  Phone,
  Users,
  Eye,
  ShoppingBag,
  ChevronDown,
} from "lucide-react";
import { useDashboard } from "./context/DashboardContext";


type CrmView = "Daily" | "Monthly" | "Quarterly" | "Yearly";

type ActivityItem = {
  id: number;
  title: string;
  detail: string;
  owner: string;
  time: string;
  type: "lead" | "call" | "showing" | "sale";
};

const crmViews: CrmView[] = ["Daily", "Monthly", "Quarterly", "Yearly"];

const activityFeed: Record<CrmView, ActivityItem[]> = {
  Daily: [
    {
      id: 1,
      title: "New lead batch captured",
      detail: "12 leads entered from website and Meta forms.",
      owner: "Sales Team",
      time: "09:10",
      type: "lead",
    },
    {
      id: 2,
      title: "Follow-up calls completed",
      detail: "8 outbound calls completed with warm prospects.",
      owner: "Valton",
      time: "11:40",
      type: "call",
    },
    {
      id: 3,
      title: "Private showing booked",
      detail: "2 qualified clients booked for afternoon visits.",
      owner: "Ardit",
      time: "14:25",
      type: "showing",
    },
    {
      id: 4,
      title: "Reservation confirmed",
      detail: "1 unit moved from negotiation to reserved.",
      owner: "Sales Desk",
      time: "17:20",
      type: "sale",
    },
  ],
  Monthly: [
    {
      id: 1,
      title: "Lead generation stable",
      detail: "186 leads generated across all active channels.",
      owner: "Marketing + Sales",
      time: "March",
      type: "lead",
    },
    {
      id: 2,
      title: "Call cadence maintained",
      detail: "92 calls logged with active prospects.",
      owner: "Sales Team",
      time: "March",
      type: "call",
    },
    {
      id: 3,
      title: "Showings increased",
      detail: "34 physical or virtual showings completed.",
      owner: "CRM Desk",
      time: "March",
      type: "showing",
    },
    {
      id: 4,
      title: "Sales pipeline advanced",
      detail: "7 reservations and 4 closed sales recorded.",
      owner: "Management",
      time: "March",
      type: "sale",
    },
  ],
  Quarterly: [
    {
      id: 1,
      title: "Pipeline depth improved",
      detail: "Lead volume up 18% vs previous quarter.",
      owner: "Growth Team",
      time: "Q1",
      type: "lead",
    },
    {
      id: 2,
      title: "Response discipline stronger",
      detail: "Average first-response time reduced to 11 min.",
      owner: "Sales Ops",
      time: "Q1",
      type: "call",
    },
    {
      id: 3,
      title: "Showing conversion improved",
      detail: "Qualified-showing ratio is trending upward.",
      owner: "Sales Team",
      time: "Q1",
      type: "showing",
    },
    {
      id: 4,
      title: "Reservations translating better",
      detail: "Reservation-to-sale conversion now at 61%.",
      owner: "Director",
      time: "Q1",
      type: "sale",
    },
  ],
  Yearly: [
    {
      id: 1,
      title: "CRM discipline established",
      detail: "A cleaner, more structured lead flow is in place.",
      owner: "Roinvest",
      time: "2026",
      type: "lead",
    },
    {
      id: 2,
      title: "Sales follow-up matured",
      detail: "Call tracking and contact stages became consistent.",
      owner: "Sales Ops",
      time: "2026",
      type: "call",
    },
    {
      id: 3,
      title: "Showing process standardized",
      detail: "Visits and client qualification are better organized.",
      owner: "CRM Team",
      time: "2026",
      type: "showing",
    },
    {
      id: 4,
      title: "Conversion quality improved",
      detail: "Higher-quality leads are moving deeper in the funnel.",
      owner: "Leadership",
      time: "2026",
      type: "sale",
    },
  ],
};

const kpiValues: Record<
  CrmView,
  {
    leads: number;
    calls: number;
    showings: number;
    sales: number;
    response: string;
    conversion: string;
  }
> = {
  Daily: {
    leads: 12,
    calls: 8,
    showings: 2,
    sales: 1,
    response: "14 min",
    conversion: "8.3%",
  },
  Monthly: {
    leads: 186,
    calls: 92,
    showings: 34,
    sales: 4,
    response: "19 min",
    conversion: "11.8%",
  },
  Quarterly: {
    leads: 524,
    calls: 271,
    showings: 96,
    sales: 14,
    response: "11 min",
    conversion: "14.5%",
  },
  Yearly: {
    leads: 2180,
    calls: 1180,
    showings: 402,
    sales: 61,
    response: "16 min",
    conversion: "15.1%",
  },
};

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-[16px] text-black/88" style={{ fontWeight: 600 }}>
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-[12.5px] text-black/45">{subtitle}</p>}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] text-black/45">{label}</div>
          <div
            className="mt-2 text-[28px] leading-none text-black/90"
            style={{ fontWeight: 650 }}
          >
            {value}
          </div>
        </div>

        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: tone }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActivityBadge({ type }: { type: ActivityItem["type"] }) {
  const map = {
    lead: { text: "Lead", bg: "#eef3fb", color: "#003883" },
    call: { text: "Call", bg: "#f4f7fb", color: "#334155" },
    showing: { text: "Showing", bg: "#f5f8fb", color: "#0f172a" },
    sale: { text: "Sale", bg: "#eef8f3", color: "#166534" },
  };

  const current = map[type];

  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px]"
      style={{
        backgroundColor: current.bg,
        color: current.color,
        fontWeight: 600,
      }}
    >
      {current.text}
    </span>
  );
}

export default function CRMContent() {
  const { selectedPeriod, data } = useDashboard();
  const [crmView, setCrmView] = useState<CrmView>("Monthly");

  const currentKpis =
    crmView === "Monthly"
      ? {
          ...kpiValues["Monthly"],
          leads: data.sales.leads,
          calls: data.sales.calls,
          showings: data.sales.showings,
          sales: data.sales.sales,
        }
      : kpiValues[crmView];
  const currentFeed = activityFeed[crmView];

  const funnel = useMemo(() => {
    const { leads, calls, showings, sales } = currentKpis;

    return [
      { label: "Leads", value: leads },
      { label: "Calls", value: calls },
      { label: "Showings", value: showings },
      { label: "Sales", value: sales },
    ];
  }, [currentKpis]);

  const maxFunnelValue = Math.max(...funnel.map((item) => item.value));

  return (
    <div className="min-h-[calc(100vh-74px)] bg-[#f8f8fa] px-7 py-7">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-black/30">
            CRM Activity
          </div>
          <h1
            className="mt-2 text-[28px] leading-none text-black/90"
            style={{ fontWeight: 650 }}
          >
            Sales execution overview
          </h1>
          <p className="mt-2 text-[13px] text-black/48">
            Operational CRM view for {selectedPeriod}.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-black/[0.05] bg-white p-1 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
          {crmViews.map((view) => {
            const active = crmView === view;

            return (
              <button
                key={view}
                onClick={() => setCrmView(view)}
                className={`rounded-xl px-3.5 py-2 text-[12.5px] transition ${
                  active ? "bg-[#eef3fb] text-[#003883]" : "text-black/45 hover:text-black/70"
                }`}
                style={{ fontWeight: active ? 600 : 500 }}
              >
                {view}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 grid grid-cols-12 gap-5 xl:col-span-8">
          <div className="col-span-12 md:col-span-6 xl:col-span-4">
            <KpiCard
              label="Leads"
              value={currentKpis.leads}
              icon={<Users className="h-5 w-5 text-[#003883]" />}
              tone="#eef3fb"
            />
          </div>

          <div className="col-span-12 md:col-span-6 xl:col-span-4">
            <KpiCard
              label="Calls"
              value={currentKpis.calls}
              icon={<Phone className="h-5 w-5 text-[#0f172a]" />}
              tone="#f3f6fa"
            />
          </div>

          <div className="col-span-12 md:col-span-6 xl:col-span-4">
            <KpiCard
              label="Showings"
              value={currentKpis.showings}
              icon={<Eye className="h-5 w-5 text-[#334155]" />}
              tone="#f4f7fb"
            />
          </div>

          <div className="col-span-12 md:col-span-6 xl:col-span-4">
            <KpiCard
              label="Sales"
              value={currentKpis.sales}
              icon={<ShoppingBag className="h-5 w-5 text-[#166534]" />}
              tone="#eef8f3"
            />
          </div>

          <div className="col-span-12 md:col-span-6 xl:col-span-4">
            <KpiCard
              label="Avg. response"
              value={currentKpis.response}
              icon={<MessageSquare className="h-5 w-5 text-[#003883]" />}
              tone="#eef3fb"
            />
          </div>

          <div className="col-span-12 md:col-span-6 xl:col-span-4">
            <KpiCard
              label="Lead conversion"
              value={currentKpis.conversion}
              icon={<Activity className="h-5 w-5 text-[#7c2d12]" />}
              tone="#fff7ed"
            />
          </div>

          <div className="col-span-12 rounded-3xl border border-black/[0.05] bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
            <SectionTitle
              title="Pipeline funnel"
              subtitle={`Conversion structure for ${crmView.toLowerCase()} view`}
            />

            <div className="space-y-4">
              {funnel.map((item) => {
                const width = `${(item.value / maxFunnelValue) * 100}%`;

                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[12.5px] text-black/58">{item.label}</span>
                      <span
                        className="text-[12.5px] text-black/82"
                        style={{ fontWeight: 600 }}
                      >
                        {item.value}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-black/[0.05]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width,
                          background:
                            "linear-gradient(90deg, rgba(0,56,131,1) 0%, rgba(102,194,255,1) 100%)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4">
          <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-[0_14px_40px_rgba(0,0,0,0.04)]">
            <SectionTitle
              title="Activity feed"
              subtitle={`Latest CRM actions in ${crmView.toLowerCase()} mode`}
            />

            <div className="space-y-4">
              {currentFeed.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-black/[0.05] bg-[#fcfcfd] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className="text-[13px] text-black/88"
                        style={{ fontWeight: 600 }}
                      >
                        {item.title}
                      </div>
                      <p className="mt-1 text-[12.5px] leading-5 text-black/50">
                        {item.detail}
                      </p>
                    </div>

                    <ActivityBadge type={item.type} />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11.5px] text-black/38">
                    <span>{item.owner}</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-[#f7f9fc] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] text-black/45">Current month context</div>
                  <div
                    className="mt-1 text-[15px] text-black/88"
                    style={{ fontWeight: 600 }}
                  >
                    {selectedPeriod}
                  </div>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white ring-1 ring-black/[0.05]">
                  <ChevronDown className="h-4 w-4 text-black/38" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}