import { useState } from "react";
import { api } from "./api";
import { BuyBoxStep } from "./components/BuyBoxStep";
import { ImportStep } from "./components/ImportStep";
import { Results } from "./components/Results";
import { BuyBoxForm, DEFAULT_FORM, LoadInfo, ScoredLead, Summary } from "./types";

export default function App() {
  const [info, setInfo] = useState<LoadInfo | null>(null);
  const [form, setForm] = useState<BuyBoxForm>(DEFAULT_FORM);
  const [result, setResult] = useState<{ leads: ScoredLead[]; summary: Summary } | null>(null);
  const [enriched, setEnriched] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const loaded = (i: LoadInfo) => {
    setInfo(i);
    setResult(null);
    setEnriched(null);
  };

  return (
    <div className="app">
      <header>
        <h1>BuyBox Scorer</h1>
        <p>Rank acquisition targets against your own criteria, and see exactly why each one scored the way it did.</p>
      </header>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}
      {busy && (
        <div className="banner" role="status" aria-live="polite">
          {busy}
        </div>
      )}

      <ImportStep
        info={info}
        busy={busy !== null}
        onSample={() => run("Loading sample data...", async () => loaded(await api.loadSample()))}
        onCsv={(text) => run("Reading your CSV...", async () => loaded(await api.importCsv(text)))}
      />

      <BuyBoxStep
        form={form}
        onChange={setForm}
        disabled={!info}
        busy={busy !== null}
        enrichedCount={enriched}
        onEnrich={() => run("Checking company websites...", async () => setEnriched((await api.enrich()).enriched))}
        onScore={() => run("Ranking leads...", async () => setResult(await api.score(form)))}
      />

      {result && <Results leads={result.leads} summary={result.summary} />}

      <footer>
        Sample companies are fictional. Real websites are only read where robots.txt allows it, and only public business pages.
      </footer>
    </div>
  );
}
