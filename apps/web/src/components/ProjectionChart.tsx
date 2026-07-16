/* Four-week projection (01 §10.1, 02 §5.7).
   - Conservative = primary solid series (decision default).
   - Expected = secondary dashed.
   - With recommended action = named comparison series.
   - Minimum threshold stronger than target; single y-axis.
   Every plotted value is available in the adjacent data table; the Recharts SVG
   is aria-hidden because that labeled table + summary are present. */
import { useId, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine, ReferenceDot, Tooltip,
} from "recharts";
import { weeks } from "../lib/format";

export interface WeekPoint {
  week: string;        // "Week 2 · Aug 10"
  conservative: number;
  expected: number;
  after?: number;
}

interface Props {
  data: WeekPoint[];
  min: number;
  target: number;
  breachIndex: number;   // 0-based
  category: string;      // "Protein"
  showAfter?: boolean;
}

const C = "var(--series-conservative)";
const E = "var(--series-expected)";
const A = "var(--series-after)";
const BREACH = "var(--breach)";
const SUB = "var(--sub)";

export default function ProjectionChart({ data, min, target, breachIndex, category, showAfter = true }: Props) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const breach = data[breachIndex];

  const summary =
    `${category} conservative coverage falls to ${breach.conservative.toFixed(1)} weeks in ` +
    `${breach.week}, below the ${min.toFixed(1)}-week minimum` +
    (showAfter && breach.after != null
      ? `. The recommended purchase restores ${breach.after.toFixed(1)} weeks.`
      : ".");

  return (
    <figure className="chart">
      <p className="visually-hidden">{summary}</p>

      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 16, right: 96, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="week" interval={0} padding={{ left: 24, right: 24 }}
              tick={{ fill: SUB, fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--line)" }} />
            <YAxis
              domain={[0, 3.5]} ticks={[0, 1, 1.5, 2, 3, 3.5]}
              tick={{ fill: SUB, fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--line)" }}
              width={44} label={{ value: "Weeks of supply", angle: -90, position: "insideLeft", fill: SUB, fontSize: 11, style: { textAnchor: "middle" } }}
            />
            <ReferenceLine y={target} stroke={SUB} strokeDasharray="2 4" strokeWidth={1.5}
              label={{ value: `Target ${target.toFixed(1)}`, position: "right", fill: SUB, fontSize: 10 }} />
            <ReferenceLine y={min} stroke={BREACH} strokeWidth={2}
              label={{ value: `Minimum ${min.toFixed(1)}`, position: "right", fill: BREACH, fontSize: 10, fontWeight: 700 }} />
            {showAfter && (
              <Line type="linear" dataKey="after" name="With recommended purchase" stroke={A} strokeWidth={2.5} dot={{ r: 3, fill: A }} isAnimationActive={false} />
            )}
            <Line type="linear" dataKey="expected" name="Expected" stroke={E} strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3, fill: E }} isAnimationActive={false} />
            <Line type="linear" dataKey="conservative" name="Conservative" stroke={C} strokeWidth={3} dot={{ r: 4, fill: C }} isAnimationActive={false} />
            <ReferenceDot x={breach.week} y={breach.conservative} r={7} fill="none" stroke={BREACH} strokeWidth={2.5} />
            <Tooltip
              contentStyle={{ background: "var(--raised)", border: "1px solid var(--line-strong)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--ink)", fontWeight: 700 }}
              itemStyle={{ fontVariantNumeric: "tabular-nums" }}
              formatter={(v: number, name: string) => [`${v.toFixed(1)} weeks`, name]}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="chart__caption">{summary}</figcaption>

      <div className="legend" aria-hidden="true">
        <span style={{ color: C }}><i /></span>
        <span>Conservative (decision default)</span>
        <span style={{ color: E }}><i className="dash" /></span>
        <span>Expected</span>
        {showAfter && (<><span style={{ color: A }}><i /></span><span>With recommended purchase</span></>)}
        <span style={{ color: BREACH }}><i /></span>
        <span>Minimum</span>
      </div>

      <button className="linkbtn" aria-expanded={showTable} aria-controls={tableId} onClick={() => setShowTable((s) => !s)}>
        {showTable ? "Hide chart data" : "View chart data"}
      </button>

      {showTable && (
        <table className="chartdata" id={tableId}>
          <caption className="visually-hidden">{category} weeks of supply by week</caption>
          <thead>
            <tr>
              <th scope="col">Week</th>
              <th scope="col">Conservative</th>
              <th scope="col">Expected</th>
              {showAfter && <th scope="col">With purchase</th>}
              <th scope="col">Minimum</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.week}>
                <td>{d.week}</td>
                <td>{weeks(d.conservative)}</td>
                <td>{weeks(d.expected)}</td>
                {showAfter && <td>{d.after != null ? weeks(d.after) : "—"}</td>}
                <td>{weeks(min)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
