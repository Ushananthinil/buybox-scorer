import { Lead } from "./types.js";

/**
 * 100% fictional demo data. Domains use the reserved ".example" TLD, so nothing real is ever crawled.
 * Each company also gets a fake "website" so the enrichment step works fully offline.
 */
type Flag = "family" | "founder" | "successor" | "hiring";
type Row = [string, string, string, string, number, number, number, Flag[]];

const ROWS: Row[] = [
  ["Maple Ridge HVAC", "HVAC", "Columbus", "OH", 18, 2_400_000, 1989, ["founder", "family"]],
  ["Lakeshore Plumbing", "Plumbing", "Cleveland", "OH", 24, 3_100_000, 1994, ["founder"]],
  ["Summit Roofing", "Roofing", "Pittsburgh", "PA", 35, 5_200_000, 2009, ["hiring"]],
  ["Keystone Landscaping", "Landscaping", "Harrisburg", "PA", 14, 1_300_000, 1982, ["founder", "family"]],
  ["Brightwater Pool Service", "Pool Services", "Tampa", "FL", 12, 1_800_000, 1991, ["founder"]],
  ["Ironclad Auto Repair", "Auto Repair", "Dayton", "OH", 9, 1_100_000, 1986, ["founder", "family"]],
  ["Northgate Electric", "Electrical", "Erie", "PA", 28, 4_600_000, 1978, ["founder", "successor"]],
  ["Cedar Point Cleaning", "Janitorial", "Toledo", "OH", 40, 2_900_000, 2012, ["hiring"]],
  ["Harbor Light Dental", "Dental", "Orlando", "FL", 16, 3_800_000, 1999, ["founder"]],
  ["Prairie Wind Pest Control", "Pest Control", "Omaha", "NE", 20, 2_700_000, 1987, ["founder", "family"]],
  ["Redwood Fencing", "Fencing", "Akron", "OH", 11, 1_500_000, 1993, ["founder"]],
  ["Granite State Moving", "Moving", "Concord", "NH", 22, 2_200_000, 1984, ["family", "successor"]],
  ["Silverline Printing", "Printing", "Buffalo", "NY", 17, 2_000_000, 1980, ["founder", "family"]],
  ["Oakview Veterinary", "Veterinary", "Raleigh", "NC", 19, 3_300_000, 2001, ["founder", "hiring"]],
  ["Blue Heron Tax Services", "Accounting", "Charleston", "SC", 8, 950_000, 1990, ["founder"]],
  ["Copperfield Machine Shop", "Machining", "Youngstown", "OH", 30, 6_100_000, 1975, ["founder", "family"]],
  ["Riverbend Self Storage", "Self Storage", "Lexington", "KY", 6, 1_700_000, 1996, ["founder"]],
  ["Pioneer Sign Company", "Signage", "Canton", "OH", 13, 1_900_000, 1988, ["founder", "family"]],
  ["Evergreen Tree Care", "Landscaping", "Allentown", "PA", 15, 1_600_000, 1992, ["founder"]],
  ["Starlight Laundromat", "Laundry", "Mobile", "AL", 7, 800_000, 2005, []],
  ["Anchor Bay Marine Repair", "Marine Services", "Sarasota", "FL", 10, 1_400_000, 1983, ["founder", "family"]],
  ["Timberline Cabinets", "Woodworking", "Scranton", "PA", 21, 2_800_000, 1979, ["founder", "family"]],
  ["Metro Courier Express", "Logistics", "Cincinnati", "OH", 45, 4_200_000, 2014, ["hiring"]],
  ["Golden Hour Photography", "Photography", "Nashville", "TN", 4, 450_000, 2016, []],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function pageFor(row: Row): string {
  const [name, , city, , , , founded, flags] = row;
  const parts = [`<h1>${name}</h1>`, `<p>Proudly serving ${city} since ${founded}.</p>`];
  if (flags.includes("family")) parts.push("<p>We are a family-owned and operated business.</p>");
  if (flags.includes("founder")) {
    const first = ["Dale", "Marcia", "Tom", "Linda", "Raymond", "Susan"][name.length % 6];
    const last = ["Whitfield", "Okafor", "Brennan", "Castillo", "Hartman", "Nguyen"][name.length % 6];
    parts.push(`<p>Founded by ${first} ${last}, who still leads the team every day.</p>`);
  }
  if (flags.includes("successor")) parts.push("<p>Our second-generation leaders are shaping the next chapter.</p>");
  if (flags.includes("hiring")) parts.push("<p>We're hiring! Join our team today.</p>");
  parts.push(`<p>Contact: office@${slug(name)}.example</p>`);
  return `<html><body>${parts.join("")}</body></html>`;
}

const phone = (i: number) => `(555) 01${String(i).padStart(2, "0")}-${1000 + i * 7}`.replace(/[()]/g, "");

export function sampleLeads(): Lead[] {
  const leads: Lead[] = [];
  ROWS.forEach((r, i) => {
    const [name, industry, city, state, employeeCount, revenueEstimate] = r;
    leads.push({
      id: `s${leads.length + 1}`, companyName: name, website: `${slug(name)}.example`, phone: phone(i),
      city, state, country: "US", industry, employeeCount, revenueEstimate,
    });
    // Every 4th company appears again from a "second source" with variant naming and missing fields.
    if (i % 4 === 0) {
      leads.push({
        id: `s${leads.length + 1}`, companyName: `${name.toUpperCase()} LLC`,
        phone: phone(i), city, state, industry,
      });
    }
  });
  return leads;
}

/** Offline "web": maps a fake domain to its fake page HTML. */
export function samplePages(): Record<string, string> {
  const pages: Record<string, string> = {};
  for (const r of ROWS) pages[`${slug(r[0])}.example`] = pageFor(r);
  return pages;
}
