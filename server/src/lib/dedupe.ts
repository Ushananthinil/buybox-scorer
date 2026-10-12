import { Lead } from "./types.js";
import { domainOf, normalizeName, phoneDigits, similarity } from "./normalize.js";

const FIELDS: (keyof Lead)[] = [
  "website", "phone", "city", "state", "country", "industry", "employeeCount", "revenueEstimate",
];

function richness(l: Lead): number {
  return FIELDS.filter((f) => l[f] !== undefined && l[f] !== "").length;
}

function sameState(a: Lead, b: Lead): boolean {
  if (!a.state || !b.state) return true; // unknown state: don't block a name match
  return a.state.toLowerCase() === b.state.toLowerCase();
}

export function isDuplicate(a: Lead, b: Lead): boolean {
  const da = domainOf(a.website);
  const db = domainOf(b.website);
  if (da && db && da === db) return true;

  const pa = phoneDigits(a.phone);
  const pb = phoneDigits(b.phone);
  if (pa && pb && pa === pb) return true;

  const na = normalizeName(a.companyName);
  const nb = normalizeName(b.companyName);
  return na.length > 0 && similarity(na, nb) >= 0.88 && sameState(a, b);
}

/** Keep the richest record of each duplicate group and fill its gaps from the others. */
export function mergeGroup(group: Lead[]): Lead {
  const sorted = [...group].sort((x, y) => richness(y) - richness(x));
  const merged: Lead = { ...sorted[0] };
  for (const other of sorted.slice(1)) {
    for (const f of FIELDS) {
      if (merged[f] === undefined || merged[f] === "") {
        (merged as unknown as Record<string, unknown>)[f] = other[f];
      }
    }
  }
  return merged;
}

export function dedupe(leads: Lead[]): { leads: Lead[]; merged: number } {
  const parent = leads.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));

  for (let i = 0; i < leads.length; i++) {
    for (let j = i + 1; j < leads.length; j++) {
      if (isDuplicate(leads[i], leads[j])) parent[find(j)] = find(i);
    }
  }

  const groups = new Map<number, Lead[]>();
  leads.forEach((l, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), l]);
  });

  const out = [...groups.values()].map(mergeGroup);
  return { leads: out, merged: leads.length - out.length };
}
