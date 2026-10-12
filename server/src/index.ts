import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { csvToLeads, toCsv } from "./lib/csv.js";
import { enrichLeads, TextFetcher, httpFetcher } from "./lib/crawler.js";
import { dedupe } from "./lib/dedupe.js";
import { domainOf } from "./lib/normalize.js";
import { outreachDraft } from "./lib/outreach.js";
import { sampleLeads, samplePages } from "./lib/sample.js";
import { creditsSavedPct, scoreAll } from "./lib/scoring.js";
import { BuyBox, DEFAULT_WEIGHTS, Lead, ScoredLead, Signals } from "./lib/types.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : ["http://localhost:5173", "http://localhost:5174"] }));
app.use(express.json({ limit: "5mb" }));

// ---- In-memory store (single-user demo; see docs/ARCHITECTURE.md for the Postgres upgrade path) ----
let leads: Lead[] = [];
let signals: Record<string, Signals | undefined> = {};
let lastScored: ScoredLead[] = [];

const demoPages = samplePages();
/** ".example" domains are fictional: serve them from the bundled offline "web" instead of the network. */
const routedFetcher: TextFetcher = async (url) => {
  const host = new URL(url).hostname;
  if (host.endsWith(".example")) {
    if (url.endsWith("/robots.txt")) return "User-agent: *\nAllow: /\n";
    return new URL(url).pathname === "/" ? demoPages[host] ?? null : null;
  }
  return httpFetcher(url);
};

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" && v.trim() === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : [];

function parseBox(body: unknown): BuyBox {
  const b = (body ?? {}) as Record<string, unknown>;
  const w = (b.weights ?? {}) as Record<string, unknown>;
  const weights = { ...DEFAULT_WEIGHTS };
  for (const k of Object.keys(weights) as (keyof typeof weights)[]) {
    const n = num(w[k]);
    if (n !== undefined && n >= 0 && n <= 100) weights[k] = n;
  }
  return {
    industries: list(b.industries),
    states: list(b.states),
    minEmployees: num(b.minEmployees), maxEmployees: num(b.maxEmployees),
    minRevenue: num(b.minRevenue), maxRevenue: num(b.maxRevenue),
    minYears: num(b.minYears),
    weights,
  };
}

function load(newLeads: Lead[]) {
  const result = dedupe(newLeads);
  leads = result.leads;
  signals = {};
  lastScored = [];
  return { count: leads.length, imported: newLeads.length, merged: result.merged };
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/leads/sample", (_req, res) => res.json(load(sampleLeads())));

app.post("/api/leads/import", (req, res) => {
  const csv = (req.body as { csv?: unknown })?.csv;
  if (typeof csv !== "string" || !csv.trim()) return res.status(400).json({ error: "Send the CSV text as { csv: string }." });
  const parsed = csvToLeads(csv);
  if (parsed.errors.length) return res.status(400).json({ error: parsed.errors[0] });
  res.json({ ...load(parsed.leads), skipped: parsed.skipped });
});

app.get("/api/leads", (_req, res) => res.json({ leads }));

app.post("/api/enrich", async (_req, res) => {
  if (leads.length === 0) return res.status(400).json({ error: "Import leads first." });
  const targets = leads.filter((l) => l.website).slice(0, 100);
  signals = await enrichLeads(targets, routedFetcher, 5);
  res.json({ attempted: targets.length, enriched: Object.keys(signals).length });
});

app.post("/api/score", (req, res) => {
  if (leads.length === 0) return res.status(400).json({ error: "Import leads first." });
  lastScored = scoreAll(leads, parseBox(req.body), signals);
  res.json({
    leads: lastScored,
    summary: {
      total: lastScored.length,
      enrichFirst: lastScored.filter((l) => l.priority === "Enrich first").length,
      maybe: lastScored.filter((l) => l.priority === "Maybe").length,
      skip: lastScored.filter((l) => l.priority === "Skip").length,
      creditsSavedPct: creditsSavedPct(lastScored),
      enriched: Object.keys(signals).length > 0,
    },
  });
});

app.get("/api/export.csv", (_req, res) => {
  if (lastScored.length === 0) return res.status(400).json({ error: "Score leads before exporting." });
  const rows: (string | number | undefined)[][] = [
    ["Company", "Score", "Priority", "Website", "Phone", "City", "State", "Industry", "Employees", "Revenue", "Owner", "Email", "Reasons"],
    ...lastScored.map((l) => [
      l.companyName, l.score, l.priority, domainOf(l.website), l.phone, l.city, l.state, l.industry,
      l.employeeCount, l.revenueEstimate, l.signals?.ownerName, l.signals?.email, l.reasons.join(" | "),
    ]),
  ];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="scored-leads.csv"');
  res.send(toCsv(rows));
});

app.post("/api/outreach", (req, res) => {
  const id = (req.body as { leadId?: unknown })?.leadId;
  const lead = lastScored.find((l) => l.id === id);
  if (!lead) return res.status(404).json({ error: "Lead not found. Score leads first." });
  res.json(outreachDraft(lead, typeof (req.body as { sender?: unknown }).sender === "string" ? (req.body as { sender: string }).sender : undefined));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`BuyBox API listening on http://localhost:${port}`));
