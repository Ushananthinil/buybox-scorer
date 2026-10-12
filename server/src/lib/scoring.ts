import { BuyBox, Lead, Priority, ScoredLead, Signals, Weights } from "./types.js";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const UNKNOWN = 0.4; // missing data is a mild penalty, not a disqualifier

/** 1 inside [min,max]; decays linearly with distance outside. Undefined bounds are open. */
function rangeFit(value: number | undefined, min?: number, max?: number): number {
  if (min === undefined && max === undefined) return 1;
  if (value === undefined) return UNKNOWN;
  if (min !== undefined && value < min) return clamp(value / min);
  if (max !== undefined && value > max) return clamp(max / value);
  return 1;
}

function industryFit(lead: Lead, box: BuyBox): number {
  if (box.industries.length === 0) return 1;
  if (!lead.industry) return 0.3;
  const li = lead.industry.toLowerCase();
  return box.industries.some((i) => {
    const t = i.trim().toLowerCase();
    return t && (li.includes(t) || t.includes(li));
  })
    ? 1
    : 0;
}

function locationFit(lead: Lead, box: BuyBox): number {
  if (box.states.length === 0) return 1;
  if (!lead.state) return UNKNOWN;
  return box.states.some((s) => s.trim().toLowerCase() === lead.state!.toLowerCase()) ? 1 : 0;
}

function yearsFit(signals: Signals | undefined, box: BuyBox): number {
  const years = signals?.yearsInBusiness;
  if (years === undefined) return UNKNOWN;
  const target = box.minYears && box.minYears > 0 ? box.minYears : 15;
  return clamp(years / target);
}

/**
 * Succession likelihood: how likely is a founder-led business to need an exit?
 * Older, founder-led or family-owned firms with NO successor mention score highest.
 */
export function successorLikelihood(s: Signals | undefined): number {
  if (!s) return UNKNOWN;
  let v = 0.4;
  if (s.founderLed) v += 0.2;
  if (s.familyOwned) v += 0.1;
  if ((s.yearsInBusiness ?? 0) >= 25) v += 0.2;
  if (s.successorMention) v -= 0.5;
  return clamp(v);
}

export function completeness(lead: Lead, signals?: Signals): number {
  const checks = [
    lead.website, lead.phone, lead.city, lead.state, lead.industry,
    lead.employeeCount, lead.revenueEstimate, signals?.email,
  ];
  return checks.filter((c) => c !== undefined && c !== "").length / checks.length;
}

export function priorityOf(score: number): Priority {
  if (score >= 70) return "Enrich first";
  if (score >= 45) return "Maybe";
  return "Skip";
}

const LABELS: Record<keyof Weights, string> = {
  industry: "industry", size: "employee count", revenue: "revenue",
  location: "location", years: "years in business", succession: "succession likelihood",
  completeness: "data completeness",
};

export function explain(lead: Lead, signals: Signals | undefined, parts: Record<keyof Weights, number>): string[] {
  const reasons: string[] = [];
  if (signals?.foundedYear) {
    const bits = [`Founded ${signals.foundedYear}`];
    if (signals.ownerName) bits.push(`founder ${signals.ownerName} named on site`);
    else if (signals.founderLed) bits.push("founder-led");
    if (signals.successorMention) bits.push("successor mentioned");
    else bits.push("no successor mentioned");
    reasons.push(bits.join(", "));
  }
  const keys = Object.keys(parts) as (keyof Weights)[];
  const best = keys.filter((k) => parts[k] >= 0.9 && k !== "completeness").slice(0, 2);
  const worst = keys.filter((k) => parts[k] <= 0.1).slice(0, 2);
  if (best.length) reasons.push(`Strong fit on ${best.map((k) => LABELS[k]).join(" and ")}`);
  if (worst.length) reasons.push(`Misses buy box on ${worst.map((k) => LABELS[k]).join(" and ")}`);
  if (reasons.length === 0) reasons.push("Limited data; enrich to learn more");
  return reasons.slice(0, 3);
}

export function scoreLead(lead: Lead, box: BuyBox, signals?: Signals): ScoredLead {
  const parts: Record<keyof Weights, number> = {
    industry: industryFit(lead, box),
    size: rangeFit(lead.employeeCount, box.minEmployees, box.maxEmployees),
    revenue: rangeFit(lead.revenueEstimate, box.minRevenue, box.maxRevenue),
    location: locationFit(lead, box),
    years: yearsFit(signals, box),
    succession: successorLikelihood(signals),
    completeness: completeness(lead, signals),
  };
  const keys = Object.keys(parts) as (keyof Weights)[];
  const totalWeight = keys.reduce((a, k) => a + box.weights[k], 0) || 1;
  const raw = keys.reduce((a, k) => a + parts[k] * box.weights[k], 0) / totalWeight;
  const score = Math.round(raw * 100);

  return {
    ...lead,
    score,
    priority: priorityOf(score),
    reasons: explain(lead, signals, parts),
    breakdown: parts,
    signals,
  };
}

export function scoreAll(
  leads: Lead[],
  box: BuyBox,
  signalsById: Record<string, Signals | undefined> = {},
): ScoredLead[] {
  return leads.map((l) => scoreLead(l, box, signalsById[l.id])).sort((a, b) => b.score - a.score);
}

/** Share of leads the user can skip enriching if they only enrich "Enrich first". */
export function creditsSavedPct(scored: ScoredLead[]): number {
  if (scored.length === 0) return 0;
  const keep = scored.filter((s) => s.priority === "Enrich first").length;
  return Math.round(((scored.length - keep) / scored.length) * 100);
}
