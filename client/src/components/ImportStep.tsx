import { ChangeEvent } from "react";
import { LoadInfo } from "../types";

interface Props {
  info: LoadInfo | null;
  busy: boolean;
  onSample: () => void;
  onCsv: (text: string) => void;
}

export function ImportStep({ info, busy, onSample, onCsv }: Props) {
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCsv(await file.text());
    e.target.value = "";
  };

  return (
    <section className="panel" aria-labelledby="step-import">
      <h2 id="step-import">
        <span className="step">1</span> Bring in your leads
      </h2>
      <p className="hint">
        Upload a CSV with a <code>company_name</code> column (website, phone, city, state, industry, employee_count and
        revenue_estimate are optional). Duplicates are merged automatically.
      </p>
      <div className="row">
        <label className="btn btn-secondary">
          Upload CSV
          <input type="file" accept=".csv,text/csv" onChange={handleFile} hidden disabled={busy} />
        </label>
        <button className="btn btn-primary" onClick={onSample} disabled={busy}>
          Load sample data
        </button>
      </div>
      {info ? (
        <p className="status" role="status">
          <strong>{info.count} companies ready.</strong> {info.merged} duplicate{info.merged === 1 ? "" : "s"} merged
          {info.skipped ? `, ${info.skipped} row${info.skipped === 1 ? "" : "s"} skipped (no company name)` : ""}.
        </p>
      ) : (
        <p className="empty">No leads yet. Load the sample data to try it, or upload your own list.</p>
      )}
    </section>
  );
}
