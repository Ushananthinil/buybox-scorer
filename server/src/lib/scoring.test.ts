import test from "node:test";
import assert from "node:assert/strict";
import { creditsSavedPct, scoreAll, scoreLead, successorLikelihood } from "./scoring.js";
import { csvToLeads, toCsv } from "./csv.js";
import { crawlSite, clearCrawlCache, mapLimit } from "./crawler.js";
import { sampleLeads, samplePages } from "./sample.js";
import { dedupe } from "./dedupe.js";
import { BuyBox, DEFAULT_WEIGHTS, Lead } from "./types.js";

const box: BuyBox = {
  industries: ["HVAC", "Plumbing"],
  minEmployees: 10, maxEmployees: 30,
  minRevenue: 1_000_000, maxRevenue: 5_000_000,
  states: ["OH"], minYears: 20,
  weights: DEFAULT_WEIGHTS,
};

const good: Lead = { id: "a", companyName: "Good Co", industry: "HVAC", state: "OH", employeeCount: 20, revenueEstimate: 2_000_000 };
const bad: Lead = { id: "b", companyName: "Bad Co", industry: "Photography", state: "TX", employeeCount: 2, revenueEstimate: 100_000 };

test("buy-box match outranks a mismatch", () => {
  const [first, second] = scoreAll([bad, good], box);
  assert.equal(first.id, "a");
  assert.ok(first.score > second.score);
  assert.equal(second.priority, "Skip");
});

test("score stays within 0..100", () => {
  for (const l of [good, bad]) {
    const s = scoreLead(l, box).score;
    assert.ok(s >= 0 && s <= 100);
  }
});

test("succession: older founder-led firm without successor beats one with a successor", () => {
  const base = { founderLed: true, familyOwned: true, hiring: false, yearsInBusiness: 35 };
  const open = successorLikelihood({ ...base, successorMention: false });
  const planned = successorLikelihood({ ...base, successorMention: true });
  assert.ok(open > planned);
  assert.equal(successorLikelihood(undefined), 0.4);
});

test("weights change the ranking", () => {
  const onlyLocation = { ...box, weights: { industry: 0, size: 0, revenue: 0, location: 100, years: 0, succession: 0, completeness: 0 } };
  const ohOnly: Lead = { id: "c", companyName: "Loc Co", state: "OH" };
  assert.equal(scoreLead(ohOnly, onlyLocation).score, 100);
});

test("reasons are produced and credits saved is computed", () => {
  const scored = scoreAll([good, bad], box);
  assert.ok(scored[0].reasons.length > 0);
  const pct = creditsSavedPct(scored);
  assert.ok(pct >= 0 && pct <= 100);
});

test("csv: parses quotes, aliases, numbers, and reports skipped rows", () => {
  const csv = 'Company,Employees,Revenue,State\n"Smith, Jones & Co",12,"$1,200,000",OH\n,5,100,TX\n';
  const r = csvToLeads(csv);
  assert.equal(r.leads.length, 1);
  assert.equal(r.skipped, 1);
  assert.equal(r.leads[0].companyName, "Smith, Jones & Co");
  assert.equal(r.leads[0].revenueEstimate, 1_200_000);
});

test("csv: missing company column gives a clear error", () => {
  assert.match(csvToLeads("foo,bar\n1,2").errors[0], /company_name/);
});

test("csv export neutralizes spreadsheet formulas", () => {
  assert.equal(toCsv([["=SUM(A1)", "ok"]]), "'=SUM(A1),ok");
  assert.equal(toCsv([["a,b"]]), '"a,b"');
});

test("sample data: dedupe removes the planted duplicates", () => {
  const leads = sampleLeads();
  const { leads: out, merged } = dedupe(leads);
  assert.ok(merged >= 5);
  assert.equal(out.length, leads.length - merged);
});

test("crawler uses injected fetcher, honors robots.txt, and caches by domain", async () => {
  clearCrawlCache();
  const pages = samplePages();
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    const u = new URL(url);
    if (u.pathname === "/robots.txt") return "User-agent: *\nDisallow: /contact\n";
    return pages[u.hostname] ?? null;
  };
  const s = await crawlSite("mapleridgehvac.example", fetcher);
  assert.equal(s?.foundedYear, 1989);
  assert.equal(s?.familyOwned, true);
  assert.ok(!calls.some((c) => c.endsWith("/contact")), "should not fetch disallowed path");
  const before = calls.length;
  await crawlSite("mapleridgehvac.example", fetcher);
  assert.equal(calls.length, before, "second call must hit cache");
});

test("crawler returns null for unreachable sites", async () => {
  clearCrawlCache();
  assert.equal(await crawlSite("nowhere.example", async () => null), null);
});

test("mapLimit respects the concurrency limit", async () => {
  let active = 0, peak = 0;
  await mapLimit([1, 2, 3, 4, 5, 6], 2, async () => {
    active++; peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 5));
    active--;
  });
  assert.ok(peak <= 2);
});
