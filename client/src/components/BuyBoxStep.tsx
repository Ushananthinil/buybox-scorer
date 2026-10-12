import { BuyBoxForm, WEIGHT_LABELS, WeightKey } from "../types";

interface Props {
  form: BuyBoxForm;
  onChange: (f: BuyBoxForm) => void;
  disabled: boolean;
  busy: boolean;
  enrichedCount: number | null;
  onEnrich: () => void;
  onScore: () => void;
}

export function BuyBoxStep({ form, onChange, disabled, busy, enrichedCount, onEnrich, onScore }: Props) {
  const set = (k: keyof Omit<BuyBoxForm, "weights">) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [k]: e.target.value });
  const setWeight = (k: WeightKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, weights: { ...form.weights, [k]: Number(e.target.value) } });

  return (
    <section className="panel" aria-labelledby="step-box">
      <h2 id="step-box">
        <span className="step">2</span> Describe the business you want to buy
      </h2>
      <div className="grid">
        <label className="field wide">
          Industries <small>comma separated</small>
          <input value={form.industries} onChange={set("industries")} placeholder="HVAC, Plumbing" />
        </label>
        <label className="field">
          States <small>comma separated</small>
          <input value={form.states} onChange={set("states")} placeholder="OH, PA" />
        </label>
        <label className="field">
          Min years in business
          <input type="number" min="0" value={form.minYears} onChange={set("minYears")} />
        </label>
        <label className="field">
          Employees, min
          <input type="number" min="0" value={form.minEmployees} onChange={set("minEmployees")} />
        </label>
        <label className="field">
          Employees, max
          <input type="number" min="0" value={form.maxEmployees} onChange={set("maxEmployees")} />
        </label>
        <label className="field">
          Revenue, min ($)
          <input type="number" min="0" value={form.minRevenue} onChange={set("minRevenue")} />
        </label>
        <label className="field">
          Revenue, max ($)
          <input type="number" min="0" value={form.maxRevenue} onChange={set("maxRevenue")} />
        </label>
      </div>

      <details className="weights">
        <summary>What matters most to you</summary>
        <div className="grid">
          {(Object.keys(WEIGHT_LABELS) as WeightKey[]).map((k) => (
            <label className="field" key={k}>
              {WEIGHT_LABELS[k]} <output>{form.weights[k]}</output>
              <input type="range" min="0" max="50" value={form.weights[k]} onChange={setWeight(k)} />
            </label>
          ))}
        </div>
      </details>

      <div className="row">
        <button className="btn btn-secondary" onClick={onEnrich} disabled={disabled || busy}>
          Check company websites
        </button>
        <button className="btn btn-primary" onClick={onScore} disabled={disabled || busy}>
          Rank leads
        </button>
      </div>
      <p className="hint">
        Checking websites reads each company's public home, about and contact pages (honoring robots.txt) to spot
        founder, age and succession signals. It's optional, and ranking works without it.
        {enrichedCount !== null && <strong> {enrichedCount} sites checked.</strong>}
      </p>
    </section>
  );
}
