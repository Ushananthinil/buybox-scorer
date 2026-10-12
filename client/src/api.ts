import { BuyBoxForm, LoadInfo, ScoredLead, Summary } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...init });
  } catch {
    throw new Error("Can't reach the server. Start it with `npm run dev` in /server.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export const api = {
  loadSample: () => request<LoadInfo>("/api/leads/sample", { method: "POST" }),
  importCsv: (csv: string) => request<LoadInfo>("/api/leads/import", { method: "POST", body: JSON.stringify({ csv }) }),
  enrich: () => request<{ attempted: number; enriched: number }>("/api/enrich", { method: "POST" }),
  score: (f: BuyBoxForm) =>
    request<{ leads: ScoredLead[]; summary: Summary }>("/api/score", {
      method: "POST",
      body: JSON.stringify({
        industries: split(f.industries),
        states: split(f.states),
        minEmployees: f.minEmployees, maxEmployees: f.maxEmployees,
        minRevenue: f.minRevenue, maxRevenue: f.maxRevenue,
        minYears: f.minYears,
        weights: f.weights,
      }),
    }),
  outreach: (leadId: string) =>
    request<{ subject: string; body: string }>("/api/outreach", { method: "POST", body: JSON.stringify({ leadId }) }),
  exportUrl: `${BASE}/api/export.csv`,
};
