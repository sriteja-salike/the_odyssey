/* Draft workspace (01 §4.1, §6.2): scenario setup, the imported (unapplied)
   disruption notice, baseline category context, and the single primary action
   `Analyze disruption`. No fabricated recommendation. */
import { AlertTriangle, ICON_SM } from "./icons";
import { getNotice, getBaselineContext, getOverlay, type ScenarioLetter } from "../lib/api";
import { CATEGORY_LABEL } from "../lib/categories";
import { lb, weeks, date } from "../lib/format";

export default function DraftWorkspace({ letter, onAnalyze }: { letter: ScenarioLetter; onAnalyze: () => void }) {
  const overlay = getOverlay(letter);
  const notice = getNotice(letter);
  const baseline = getBaselineContext(letter);

  return (
    <div className="workspace">
      <div className="col">
        <section>
          <h1 className="risk-title" style={{ marginTop: 0 }}>{overlay.display_name}</h1>
          <p className="lead">
            A synthetic operations notice just arrived. Aggregate pounds look healthy —
            analyze it to project each category forward and surface any coming shortage.
          </p>
          <div style={{ marginTop: "var(--s6)" }}>
            <button className="btn btn--primary" onClick={onAnalyze}>Analyze disruption</button>
          </div>
        </section>

        {notice && (
          <section className="card">
            <h2 className="sec">Imported disruption notice</h2>
            <div className="notice">
              <div className="notice__meta">
                <span>{notice.title}</span>
                <span className="hint">Received {date(notice.recorded_at.slice(0, 10))} · synthetic · untrusted text</span>
              </div>
              <p className="notice__body">{notice.body}</p>
              <p className="hint" style={{ marginTop: "var(--s2)" }}>
                Not yet applied. The agent will extract only the fields present in this text.
              </p>
            </div>
          </section>
        )}
      </div>

      <aside className="col">
        <section className="card">
          <h2 className="sec">Current coverage</h2>
          <p className="hint" style={{ marginTop: "-6px", marginBottom: "var(--s3)" }}>
            {lb(baseline.total_on_hand_lb)} on hand across {baseline.categories.length} categories.
          </p>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col" className="num">On hand</th>
                <th scope="col" className="num">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {baseline.categories.map((c) => (
                <tr key={c.category_id}>
                  <td>{CATEGORY_LABEL[c.category_id]}{c.essential && <span className="hint"> · essential</span>}</td>
                  <td className="num">{lb(c.on_hand_lb)}</td>
                  <td className="num">
                    {c.coverage_weeks != null ? weeks(c.coverage_weeks) : "—"}
                    {c.coverage_weeks != null && (
                      <span className={`dotstat ${c.healthy ? "dotstat--ok" : "dotstat--risk"}`} aria-hidden />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint" style={{ marginTop: "var(--s3)" }}>
            <AlertTriangle size={ICON_SM} aria-hidden style={{ verticalAlign: "-2px" }} /> Totals can hide a
            single category about to run short — that is what the analysis checks.
          </p>
        </section>
      </aside>
    </div>
  );
}
