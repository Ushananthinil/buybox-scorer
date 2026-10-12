import { domainOf } from "./normalize.js";
import { parseRobots } from "./robots.js";
import { extractSignals, htmlToText } from "./signals.js";
import { Lead, Signals } from "./types.js";

export const USER_AGENT = "buyboxbot/1.0 (+portfolio project; respects robots.txt)";
const PATHS = ["/", "/about", "/about-us", "/contact"];
const TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 6000;
const HOST_DELAY_MS = 500;

export type TextFetcher = (url: string) => Promise<string | null>;

const cache = new Map<string, { at: number; signals: Signals | null }>();
const lastHit = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function polite(host: string) {
  const wait = (lastHit.get(host) ?? 0) + HOST_DELAY_MS - Date.now();
  lastHit.set(host, Math.max(Date.now(), (lastHit.get(host) ?? 0) + HOST_DELAY_MS));
  if (wait > 0) await sleep(wait);
}

export const httpFetcher: TextFetcher = async (url) => {
  const host = new URL(url).hostname;
  await polite(host);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("text/plain")) return null;
    return (await res.text()).slice(0, 500_000);
  } catch {
    return null; // timeouts, DNS errors, blocked: treat as "no data"
  } finally {
    clearTimeout(timer);
  }
};

/** Crawl one site (home, about, contact) and return extracted signals, or null if unreachable/blocked. */
export async function crawlSite(
  website: string,
  fetchText: TextFetcher = httpFetcher,
  now = Date.now(),
): Promise<Signals | null> {
  const domain = domainOf(website);
  if (!domain) return null;

  const hit = cache.get(domain);
  if (hit && now - hit.at < TTL_MS) return hit.signals;

  const origin = `https://${domain}`;
  const robotsTxt = await fetchText(`${origin}/robots.txt`);
  const allowed = robotsTxt ? parseRobots(robotsTxt, "buyboxbot") : () => true;

  const texts: string[] = [];
  for (const p of PATHS) {
    if (!allowed(p)) continue;
    const html = await fetchText(origin + p);
    if (html) texts.push(htmlToText(html));
  }

  const signals = texts.length ? extractSignals(texts.join(" ")) : null;
  cache.set(domain, { at: now, signals });
  return signals;
}

/** Run an async mapper with bounded concurrency. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function enrichLeads(
  leads: Lead[],
  fetchText: TextFetcher = httpFetcher,
  concurrency = 5,
): Promise<Record<string, Signals | undefined>> {
  const out: Record<string, Signals | undefined> = {};
  await mapLimit(leads, concurrency, async (l) => {
    if (!l.website) return;
    const s = await crawlSite(l.website, fetchText);
    if (s) out[l.id] = s;
  });
  return out;
}

export function clearCrawlCache() {
  cache.clear();
  lastHit.clear();
}
