import type { DashboardData } from "../../types";

export const seedData: DashboardData = {
  sales: {
    leads: 36,
    calls: 3778,
    showings: 36,
    sales: 29,
    revenue: 3446300,
  },
  units: {
    total: 132,
    available: 100,
    reserved: 3,
    sold: 29,
  },
  marketing: {
    spend: 3900,
    campaigns: 8,
    reach: 97000,
    clicks: 2840,
    leadsGenerated: 139,
  },
  crm: {
    followUps: 46,
    meetings: 36,
    activeClients: 27,
    hotLeads: 3,
  },
  targets: {
    monthlyRevenueTarget: 250000,
    monthlySalesTarget: 6,
    quarterlyRevenueTarget: 700000,
  },
  ownership: {
    ufPartners: 68,
    landOwner: 34,
    constructionCompany: 30,
  },
};
