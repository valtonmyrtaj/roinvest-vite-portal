export type SalesData = {
  leads: number;
  calls: number;
  showings: number;
  sales: number;
  revenue: number;
};

export type UnitsData = {
  total: number;
  available: number;
  reserved: number;
  sold: number;
};

export type MarketingData = {
  spend: number;
  campaigns: number;
  reach: number;
  clicks: number;
  leadsGenerated: number;
};

export type CRMData = {
  followUps: number;
  meetings: number;
  activeClients: number;
  hotLeads: number;
};

export type TargetsData = {
  monthlyRevenueTarget: number;
  monthlySalesTarget: number;
  quarterlyRevenueTarget: number;
};

export type OwnershipData = {
  ufPartners: number;
  landOwner: number;
  constructionCompany: number;
};

export type DashboardData = {
  sales: SalesData;
  units: UnitsData;
  marketing: MarketingData;
  crm: CRMData;
  targets: TargetsData;
  ownership: OwnershipData;
};