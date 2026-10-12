export interface Lead {
  id: string;
  companyName: string;
  website?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
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

export interface Weights {
  industry: number;
  size: number;
  revenue: number;
  location: number;
  years: number;
  succession: number;
  completeness: number;
}

export interface BuyBox {
  industries: string[];
  minEmployees?: number;
  maxEmployees?: number;
  minRevenue?: number;
  maxRevenue?: number;
  states: string[];
  minYears?: number;
  weights: Weights;
}

export type Priority = "Enrich first" | "Maybe" | "Skip";

export interface ScoredLead extends Lead {
  score: number;
  priority: Priority;
  reasons: string[];
  breakdown: Record<keyof Weights, number>;
  signals?: Signals;
}

export const DEFAULT_WEIGHTS: Weights = {
  industry: 25,
  size: 15,
  revenue: 15,
  location: 10,
  years: 10,
  succession: 20,
  completeness: 5,
};
