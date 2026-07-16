/* Run-id helpers. A run id encodes its scenario letter, e.g. `run_scn-a_7f3d02`.
   Prior runs remain retrievable by their direct URL (01 §3.4). */
import type { ScenarioLetter } from "./api";

export function letterFromRunId(runId: string): ScenarioLetter | null {
  const m = runId.match(/^run_scn-([a-e])_/i);
  return m ? (m[1].toUpperCase() as ScenarioLetter) : null;
}
