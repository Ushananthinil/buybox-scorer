export interface Lead {
  id: string;
  companyName: string;
  website?: string;
  phone?: string;
  city?: string;
  state?: string;
  industry?: string;
  employeeCount?: number;
  revenueEstimate?: number;
}

export interface Signals {
  foundedYear?: number;
  yearsInBusiness?: number;
  familyOwned: boolean;
  founderLed: boolean;
  ownerName?: string;
  email?: string;
  successorMention: boolean;
  hiring: boolean;
}

export type WeightKey = "industry" | "size" | "revenue" | "location" | "years" | "succession" | "completeness";
export type Priority = "Enrich first" | "Maybe" | "Skip";

export interface ScoredLead extends Lead {
  score: number;
  priority: Priority;
  reasons: string[];
  breakdown: Record<WeightKey, number>;
  signals?: Signals;
}

export interface Summary {
  total: number;
  enrichFirst: number;
  maybe: number;
  skip: number;
  creditsSavedPct: number;
  enriched: boolean;
}

export interface LoadInfo {
  count: number;
  imported: number;
  merged: number;
  skipped?: number;
}

export interface BuyBoxForm {
  industries: string;
  states: string;
  minEmployees: string;
  maxEmployees: string;
  minRevenue: string;
  maxRevenue: string;
  minYears: string;
  weights: Record<WeightKey, number>;
}

export const WEIGHT_LABELS: Record<WeightKey, string> = {
  industry: "Industry match",
  size: "Employee count",
  revenue: "Revenue",
  location: "Location",
  years: "Years in business",
  succession: "Succession likelihood",
  completeness: "Data completeness",
};

export const DEFAULT_FORM: BuyBoxForm = {
  industries: "HVAC, Plumbing, Electrical, Landscaping",
  states: "OH, PA",
  minEmployees: "10",
  maxEmployees: "30",
  minRevenue: "1000000",
  maxRevenue: "5000000",
  minYears: "25",
  weights: { industry: 25, size: 15, revenue: 15, location: 10, years: 10, succession: 20, completeness: 5 },
};
