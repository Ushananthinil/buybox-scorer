import test from "node:test";
import assert from "node:assert/strict";
import { dedupe } from "./dedupe.js";
import { normalizeName, domainOf } from "./normalize.js";
import { Lead } from "./types.js";

test("normalizeName strips suffixes and punctuation", () => {
  assert.equal(normalizeName("Acme, Inc."), "acme");
  assert.equal(normalizeName("The Smith & Sons Co."), "smith and sons");
});

test("domainOf handles protocol and www", () => {
  assert.equal(domainOf("https://www.Acme.com/about"), "acme.com");
  assert.equal(domainOf("acme.com"), "acme.com");
  assert.equal(domainOf(undefined), undefined);
});

test("dedupe merges name variants and fills missing fields", () => {
  const leads: Lead[] = [
    { id: "1", companyName: "Maple Ridge HVAC", website: "mapleridge.example", state: "OH", employeeCount: 18 },
    { id: "2", companyName: "MAPLE RIDGE HVAC LLC", state: "OH", industry: "HVAC" },
    { id: "3", companyName: "Lakeshore Plumbing", state: "OH" },
  ];
  const { leads: out, merged } = dedupe(leads);
  assert.equal(merged, 1);
  assert.equal(out.length, 2);
  const maple = out.find((l) => l.companyName.includes("Maple") || l.companyName.includes("MAPLE"))!;
  assert.equal(maple.industry, "HVAC");
  assert.equal(maple.employeeCount, 18);
});

test("dedupe matches by phone even when names differ", () => {
  const { merged } = dedupe([
    { id: "1", companyName: "Alpha Services", phone: "614-555-0101" },
    { id: "2", companyName: "Totally Different Name", phone: "(614) 555 0101" },
  ]);
  assert.equal(merged, 1);
});

test("same name in different states is not merged", () => {
  const { merged } = dedupe([
    { id: "1", companyName: "Main Street Bakery", state: "OH" },
    { id: "2", companyName: "Main Street Bakery", state: "TX" },
  ]);
  assert.equal(merged, 0);
});
