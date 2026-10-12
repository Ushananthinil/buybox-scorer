import { Lead } from "./types.js";

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

export function toCsv(rows: (string | number | undefined)[][]): string {
  const esc = (v: string | number | undefined) => {
    const s = v === undefined ? "" : String(v);
    // Prefix risky leading characters to prevent spreadsheet formula injection.
    const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

const ALIASES: Record<string, keyof Lead> = {
  company_name: "companyName", company: "companyName", name: "companyName", companyname: "companyName",
  website: "website", url: "website", domain: "website",
  phone: "phone", telephone: "phone",
  city: "city", state: "state", country: "country",
  industry: "industry", category: "industry",
  employee_count: "employeeCount", employees: "employeeCount", employeecount: "employeeCount",
  revenue_estimate: "revenueEstimate", revenue: "revenueEstimate", revenueestimate: "revenueEstimate",
};

const toNum = (v: string): number | undefined => {
  const n = Number(v.replace(/[$,\s]/g, ""));
  return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
};

export interface ImportResult {
  leads: Lead[];
  skipped: number;
  errors: string[];
}

export function csvToLeads(text: string, idPrefix = "l"): ImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { leads: [], skipped: 0, errors: ["CSV needs a header row and at least one data row"] };

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const map = header.map((h) => ALIASES[h]);
  if (!map.includes("companyName")) {
    return { leads: [], skipped: 0, errors: ["Missing a company_name column"] };
  }

  const leads: Lead[] = [];
  let skipped = 0;
  rows.slice(1).forEach((r, i) => {
    const lead: Partial<Lead> = {};
    map.forEach((key, idx) => {
      const v = (r[idx] ?? "").trim();
      if (!key || v === "") return;
      if (key === "employeeCount" || key === "revenueEstimate") {
        const n = toNum(v);
        if (n !== undefined) lead[key] = n;
      } else {
        (lead as Record<string, string>)[key] = v;
      }
    });
    if (!lead.companyName) { skipped++; return; }
    leads.push({ ...(lead as Lead), id: `${idPrefix}${i + 1}` });
  });
  return { leads, skipped, errors: [] };
}
