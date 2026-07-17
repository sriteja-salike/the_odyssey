import { useId, useState } from "react";
import { Button } from "@carbon/react";
import { ChartColumn, ChevronDown, ChevronUp, WarningAlt } from "@carbon/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DecisionPresentation, DecisionVisualPresentation } from "../lib/liveTypes";

export default function DecisionVisual({
  presentation,
  result = false,
  compact = false,
}: {
  presentation: DecisionPresentation;
  result?: boolean;
  compact?: boolean;
}) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const visual = result ? presentation.result_visual ?? presentation.visual : presentation.visual;

  if (visual.kind === "conflict") return <ConflictVisual visual={visual} />;

  return (
    <figure className={`decision-visual${compact ? " decision-visual--compact" : ""}`}>
      <div className="decision-visual__heading">
        <ChartColumn size={20} aria-hidden />
        <div><h3>{visual.title}</h3><p>{visual.summary}</p></div>
      </div>
      <div className="decision-visual__chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visual.data} margin={{ top: 18, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--line-strong)" }} tick={{ fill: "var(--sub)", fontSize: 11 }} />
            <YAxis hide domain={[0, "dataMax + 1"]} />
            {visual.reference_value != null && (
              <ReferenceLine
                y={Number(visual.reference_value)}
                stroke="var(--breach)"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{ value: visual.reference_label ?? "Reference", position: "insideTop", fill: "var(--breach)", fontSize: 10, fontWeight: 600 }}
              />
            )}
            <Tooltip
              cursor={{ fill: "var(--raised)" }}
              contentStyle={{ border: "1px solid var(--line)", borderRadius: 8, boxShadow: "var(--shadow-soft)" }}
              formatter={(value) => [formatTooltip(Number(value), visual.unit), "Verified value"]}
            />
            <Bar dataKey={(item) => Number(item.value)} radius={[5, 5, 0, 0]} maxBarSize={72} isAnimationActive={false}>
              {visual.data.map((item) => <Cell key={item.label} fill={colorFor(item.tone)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Button
        kind="ghost"
        size="sm"
        className="decision-visual__table-toggle"
        renderIcon={showTable ? ChevronUp : ChevronDown}
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={() => setShowTable((value) => !value)}
      >
        {showTable ? "Hide values" : "View exact values"}
      </Button>
      {showTable && (
        <div className="decision-visual__table-wrap" id={tableId}>
          <table className="decision-visual__table">
            <caption>{visual.title}</caption>
            <thead><tr><th scope="col">Measure</th><th scope="col">Value</th></tr></thead>
            <tbody>{visual.data.map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td>{item.formatted_value}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <figcaption className="visually-hidden">{visual.summary}</figcaption>
    </figure>
  );
}

function ConflictVisual({ visual }: { visual: DecisionVisualPresentation }) {
  return (
    <section className="decision-visual decision-visual--conflict" aria-labelledby="conflict-title">
      <div className="decision-visual__heading">
        <WarningAlt size={20} aria-hidden />
        <div><h3 id="conflict-title">{visual.title}</h3><p>{visual.summary}</p></div>
      </div>
      <div className="conflict-list" role="list">
        {visual.conflicts.map((conflict, index) => (
          <div key={`${conflict.field_label}-${conflict.sources.join("-")}-${index}`} role="listitem">
            <strong>{conflict.field_label}</strong>
            <span>{conflict.message}</span>
            <small>{conflict.sources.join(" · ")} · {conflict.observed_values.join(" / ")}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function colorFor(tone: "attention" | "positive" | "neutral"): string {
  if (tone === "attention") return "var(--breach)";
  if (tone === "positive") return "var(--ok)";
  return "var(--action)";
}

function formatTooltip(value: number, unit: DecisionVisualPresentation["unit"]): string {
  if (unit === "weeks") return `${value.toFixed(1)} weeks`;
  if (unit === "usd") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  if (unit === "lb") return `${new Intl.NumberFormat("en-US").format(value)} lb`;
  return String(value);
}
