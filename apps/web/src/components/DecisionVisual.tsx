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
import { getGolden, type ScenarioLetter } from "../lib/api";
import { buildDecisionPresentation } from "../lib/decisionPresentation";
import { lb, usd } from "../lib/format";
import type { CategoryProjection } from "../types/golden";

interface Datum {
  label: string;
  value: number;
  display: string;
  state?: "attention" | "positive" | "neutral";
}

export default function DecisionVisual({ letter, result = false, compact = false }: { letter: ScenarioLetter; result?: boolean; compact?: boolean }) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const presentation = buildDecisionPresentation(letter);
  const golden = getGolden(letter);
  const visualSummary = result ? resultCaption(letter) : presentation.visual.summary;

  if (letter === "E") {
    const issues = (golden.blocking_issues ?? []) as unknown as {
      finding_id: string;
      field: string;
      message: string;
      record_ids: string[];
      observed_values: (string | null)[];
    }[];
    return (
      <section className="decision-visual decision-visual--conflict" aria-labelledby="conflict-title">
        <div className="decision-visual__heading">
          <WarningAlt size={20} aria-hidden />
          <div><h3 id="conflict-title">{presentation.visual.title}</h3><p>{presentation.visual.summary}</p></div>
        </div>
        <div className="conflict-list" role="list">
          {issues.slice(0, 4).map((issue) => (
            <div key={issue.finding_id} role="listitem">
              <strong>{humanize(issue.field)}</strong>
              <span>{issue.message}</span>
              <small>{issue.record_ids.join(" · ")} · {issue.observed_values.map((value) => value ?? "missing").join(" / ")}</small>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const { data, reference, referenceLabel, unit } = chartData(letter, result);

  return (
    <figure className={`decision-visual${compact ? " decision-visual--compact" : ""}`}>
      <div className="decision-visual__heading">
        <ChartColumn size={20} aria-hidden />
        <div><h3>{result ? "What the simulation changed" : presentation.visual.title}</h3><p>{visualSummary}</p></div>
      </div>
      <div className="decision-visual__chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--line-strong)" }} tick={{ fill: "var(--sub)", fontSize: 11 }} />
            <YAxis hide domain={[0, "dataMax + 1"]} />
            {reference != null && (
              <ReferenceLine y={reference} stroke="var(--breach)" strokeDasharray="5 4" strokeWidth={1.5}
                label={{ value: referenceLabel, position: "insideTop", fill: "var(--breach)", fontSize: 10, fontWeight: 600 }} />
            )}
            <Tooltip
              cursor={{ fill: "var(--raised)" }}
              contentStyle={{ border: "1px solid var(--line)", borderRadius: 8, boxShadow: "var(--shadow-soft)" }}
              formatter={(value: number) => [`${formatValue(value, unit)}`, "Verified value"]}
            />
            <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={letter === "A" ? 64 : 96} isAnimationActive={false}>
              {data.map((item) => <Cell key={item.label} fill={colorFor(item.state)} />)}
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
            <caption>{presentation.visual.title}</caption>
            <thead><tr><th scope="col">Measure</th><th scope="col">Value</th></tr></thead>
            <tbody>{data.map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td>{item.display}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <figcaption className="visually-hidden">{visualSummary}</figcaption>
    </figure>
  );
}

function chartData(letter: Exclude<ScenarioLetter, "E">, result: boolean): {
  data: Datum[];
  reference?: number;
  referenceLabel?: string;
  unit: "weeks" | "lb" | "usd";
} {
  const golden = getGolden(letter);
  if (letter === "A") {
    if (result) {
      return {
        data: [
          { label: "Before", value: 1.3, display: "1.3 weeks", state: "attention" },
          { label: "After", value: 3, display: "3.0 weeks", state: "positive" },
        ],
        reference: 1.5,
        referenceLabel: "Minimum 1.5 weeks",
        unit: "weeks",
      };
    }
    const detail = (golden.projections.baseline as Record<string, unknown>).PROTEIN as CategoryProjection;
    return {
      data: detail.conservative.map((week, index) => ({
        label: ["Aug 3", "Aug 10", "Aug 17", "Aug 24"][index],
        value: Number(week.end_wos),
        display: `${Number(week.end_wos).toFixed(1)} weeks`,
        state: index === 1 ? "attention" : "neutral",
      })),
      reference: 1.5,
      referenceLabel: "Minimum 1.5 weeks",
      unit: "weeks",
    };
  }
  if (letter === "B") {
    return {
      data: result ? [
        { label: "Accept all", value: 50_000, display: lb(50_000), state: "attention" },
        { label: "Approved", value: 40_000, display: lb(40_000), state: "positive" },
      ] : [
        { label: "Accept all", value: 50_000, display: lb(50_000), state: "attention" },
        { label: "Capacity", value: 40_000, display: lb(40_000), state: "neutral" },
        { label: "Recommended", value: 40_000, display: lb(40_000), state: "positive" },
      ],
      reference: 40_000,
      referenceLabel: "40,000 lb capacity",
      unit: "lb",
    };
  }
  if (letter === "C") {
    return {
      data: [
        { label: "Offer", value: 12_000, display: lb(12_000), state: "attention" },
        { label: result ? "Redirected" : "Local target", value: result ? 12_000 : 6_000, display: lb(result ? 12_000 : 6_000), state: result ? "positive" : "neutral" },
      ],
      unit: "lb",
    };
  }
  return {
    data: result ? [
      { label: "Available", value: 13_000, display: usd(13_000), state: "neutral" },
      { label: "Approved", value: 9_600, display: usd(9_600), state: "positive" },
      { label: "Remaining", value: 3_400, display: usd(3_400), state: "neutral" },
    ] : [
      { label: "Available", value: 13_000, display: usd(13_000), state: "neutral" },
      { label: "Both needs", value: 22_350, display: usd(22_350), state: "attention" },
      { label: "Recommended", value: 9_600, display: usd(9_600), state: "positive" },
    ],
    reference: 13_000,
    referenceLabel: "$13,000 available",
    unit: "usd",
  };
}

function colorFor(state: Datum["state"]): string {
  if (state === "attention") return "var(--breach)";
  if (state === "positive") return "var(--ok)";
  return "var(--action)";
}

function formatValue(value: number, unit: "weeks" | "lb" | "usd"): string {
  if (unit === "weeks") return `${value.toFixed(1)} weeks`;
  return unit === "usd" ? usd(value) : lb(value);
}

function resultCaption(letter: ScenarioLetter): string {
  return ({
    A: "The simulated purchase raises protein coverage above the safe minimum.",
    B: "The partial acceptance uses refrigerated capacity without overflow.",
    C: "The full offer is redirected for useful distribution elsewhere.",
    D: "The simulated dairy purchase uses $9,600 and leaves $3,400 available.",
    E: "No simulated action was created.",
  } as Record<ScenarioLetter, string>)[letter];
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}
