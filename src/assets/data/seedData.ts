import type { DashboardData } from "../../types";

export const seedData: DashboardData = {
  sales: {
    leads: 200,
    calls: 60,
    showings: 18,
    sales: 4,
    revenue: 185000,
  },
  units: {
    total: 120,
    available: 48,
    reserved: 22,
    sold: 50,
  },
  marketing: {
    spend: 3200,
    campaigns: 12,
    reach: 145000,
    clicks: 4200,
    leadsGenerated: 87,
  },
  crm: {
    followUps: 34,
    meetings: 11,
    activeClients: 52,
    hotLeads: 9,
  },
  targets: {
    monthlyRevenueTarget: 250000,
    monthlySalesTarget: 6,
    quarterlyRevenueTarget: 700000,
  },
  ownership: {
    ufPartners: 60,
    landOwner: 40,
    constructionCompany: 20,
  },
};