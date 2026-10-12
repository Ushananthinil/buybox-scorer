/** Tiny robots.txt evaluator: longest matching rule wins; Allow beats Disallow on ties. */
export function parseRobots(txt: string, userAgent = "buyboxbot"): (path: string) => boolean {
  const ua = userAgent.toLowerCase();
  type Rule = { allow: boolean; path: string };
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;

  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      if (val) current.rules.push({ allow: key === "allow", path: val });
      lastWasAgent = false;
    } else lastWasAgent = false;
  }

  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = chosen.flatMap((g) => g.rules);

  return (path: string) => {
    let best: Rule | undefined;
    for (const r of rules) {
      const p = r.path.replace(/\$$/, "");
      if (path.startsWith(p) && (!best || p.length > best.path.length || (p.length === best.path.length && r.allow))) {
        best = r;
      }
    }
    return best ? best.allow : true;
  };
}
