import { Fragment, useMemo, useState } from "react";
import { api } from "../api";
import { Priority, ScoredLead, Summary } from "../types";

const money = (n?: number) => (n === undefined ? "n/a" : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);

interface Props {
  leads: ScoredLead[];
  summary: Summary;
}

export function Results({ leads, summary }: Props) {
  const [filter, setFilter] = useState<Priority | "All">("All");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ id: string; subject: string; body: string } | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const shown = useMemo(() => (filter === "All" ? leads : leads.filter((l) => l.priority === filter)), [leads, filter]);

  const makeDraft = async (id: string) => {
    setDraftError(null);
    try {
      setDraft({ id, ...(await api.outreach(id)) });
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Couldn't write the draft.");
    }
  };

  const tabs: (Priority | "All")[] = ["All", "Enrich first", "Maybe", "Skip"];
  const count = (t: Priority | "All") =>
    t === "All" ? summary.total : t === "Enrich first" ? summary.enrichFirst : t === "Maybe" ? summary.maybe : summary.skip;

  return (
    <section className="panel" aria-labelledby="step-results">
      <div className="results-head">
        <h2 id="step-results">
          <span className="step">3</span> Where to spend your credits
        </h2>
        <a className="btn btn-secondary" href={api.exportUrl}>
          Download CSV
        </a>
      </div>
      <p className="status" role="status">
        Enriching only the <strong>{summary.enrichFirst}</strong> top leads skips{" "}
        <strong>{summary.creditsSavedPct}%</strong> of the list.
        {!summary.enriched && " Check company websites in step 2 to sharpen the ranking."}
      </p>

      <div className="tabs" role="tablist" aria-label="Filter by priority">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={filter === t} className={filter === t ? "tab on" : "tab"} onClick={() => setFilter(t)}>
            {t} <span className="count">{count(t)}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="empty">No leads in this group.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Score</th>
                <th>Priority</th>
                <th>Location</th>
                <th>Industry</th>
                <th>Size</th>
                <th aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {shown.map((l) => (
                <Fragment key={l.id}>
                  <tr>
                    <td className="name">{l.companyName}</td>
                    <td>
                      <div className="score" aria-label={`Score ${l.score} out of 100`}>
                        <span className="score-num">{l.score}</span>
                        <span className="bar">
                          <span className={`fill ${l.priority === "Enrich first" ? "go" : l.priority === "Maybe" ? "mid" : "low"}`} style={{ width: `${l.score}%` }} />
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${l.priority === "Enrich first" ? "go" : l.priority === "Maybe" ? "mid" : "low"}`}>{l.priority}</span>
                    </td>
                    <td>{[l.city, l.state].filter(Boolean).join(", ") || "n/a"}</td>
                    <td>{l.industry ?? "n/a"}</td>
                    <td>
                      {l.employeeCount ?? "n/a"} staff, {money(l.revenueEstimate)}
                    </td>
                    <td>
                      <button className="link" aria-expanded={open === l.id} onClick={() => setOpen(open === l.id ? null : l.id)}>
                        {open === l.id ? "Hide" : "Why?"}
                      </button>
                    </td>
                  </tr>
                  {open === l.id && (
                    <tr className="detail">
                      <td colSpan={7}>
                        <ul>
                          {l.reasons.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                        {l.signals && (
                          <p className="hint">
                            {l.signals.ownerName ? `Owner: ${l.signals.ownerName}. ` : ""}
                            {l.signals.email ? `Email: ${l.signals.email}. ` : ""}
                            {l.signals.hiring ? "Currently hiring." : ""}
                          </p>
                        )}
                        <button className="btn btn-secondary small" onClick={() => makeDraft(l.id)}>
                          Draft outreach email
                        </button>
                        {draft?.id === l.id && (
                          <div className="draft">
                            <strong>{draft.subject}</strong>
                            <pre>{draft.body}</pre>
                            <button className="btn btn-secondary small" onClick={() => navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`)}>
                              Copy
                            </button>
                          </div>
                        )}
                        {draftError && draft?.id !== l.id && <p className="error">{draftError}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
