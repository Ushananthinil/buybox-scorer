import test from "node:test";
import assert from "node:assert/strict";
import { extractSignals, htmlToText } from "./signals.js";
import { parseRobots } from "./robots.js";

test("extractSignals finds founding year, owner, family and email", () => {
  const text = htmlToText(
    "<h1>Acme</h1><p>Serving Ohio since 1989.</p><p>We are a family-owned and operated business. Founded by Dale Whitfield.</p><p>Contact: hello@acme.example</p>",
  );
  const s = extractSignals(text, 2026);
  assert.equal(s.foundedYear, 1989);
  assert.equal(s.yearsInBusiness, 37);
  assert.equal(s.familyOwned, true);
  assert.equal(s.founderLed, true);
  assert.equal(s.ownerName, "Dale Whitfield");
  assert.equal(s.email, "hello@acme.example");
  assert.equal(s.successorMention, false);
});

test("extractSignals detects successor and hiring language", () => {
  const s = extractSignals("Our second-generation leaders. We're hiring!", 2026);
  assert.equal(s.successorMention, true);
  assert.equal(s.hiring, true);
});

test("htmlToText drops scripts and styles", () => {
  assert.equal(htmlToText("<style>a{}</style><script>x()</script><p>Hi &amp; bye</p>"), "Hi & bye");
});

test("robots: disallow, allow override, and wildcard agent", () => {
  const allowed = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/public\n", "buyboxbot");
  assert.equal(allowed("/about"), true);
  assert.equal(allowed("/private/x"), false);
  assert.equal(allowed("/private/public/page"), true);
});

test("robots: specific agent group wins over wildcard", () => {
  const txt = "User-agent: *\nAllow: /\n\nUser-agent: buyboxbot\nDisallow: /\n";
  assert.equal(parseRobots(txt, "buyboxbot")("/about"), false);
});
