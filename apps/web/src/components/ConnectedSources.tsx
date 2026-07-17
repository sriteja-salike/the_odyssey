import { CheckmarkFilled, ChevronDown, DataReference } from "@carbon/icons-react";

export interface ConnectedSourceView {
  source_id: string;
  display_name: string;
  source_kind?: string;
}

const PURPOSE: Record<string, string> = {
  "warehouse-wms": "Current inventory and storage limits",
  "distribution-history": "Recent food distribution patterns",
  "receiving-erp": "Incoming deliveries and expected dates",
  "donor-crm": "Donation offers awaiting a response",
  "org-policy": "Stocking rules and approval requirements",
  "procurement-catalog": "Available responses, quantities, and costs",
  "knowledge-inbox": "Notices and supporting operations records",
};

export default function ConnectedSources({
  sources,
  recordCount,
  label = "Information checked",
  open = false,
}: {
  sources: ConnectedSourceView[];
  recordCount?: number;
  label?: string;
  open?: boolean;
}) {
  const unique = [...new Map(sources.map((source) => [source.source_id, source])).values()];
  if (!unique.length) return null;

  return (
    <details className="connected-sources" open={open}>
      <summary>
        <span className="connected-sources__icon"><DataReference size={18} aria-hidden /></span>
        <span>
          <strong>{label}</strong>
          <small>{summary(unique.length, recordCount)}</small>
        </span>
        <ChevronDown className="connected-sources__chevron" size={17} aria-hidden />
      </summary>
      <div className="connected-sources__body">
        <p>ShareStack used these read-only demo connections to understand the situation.</p>
        <ul>
          {unique.map((source) => (
            <li key={source.source_id}>
              <CheckmarkFilled size={16} aria-hidden />
              <span><strong>{friendlyName(source)}</strong><small>{PURPOSE[source.source_id] ?? "Verified operational information"}</small></span>
            </li>
          ))}
        </ul>
        <p className="connected-sources__note">Information was read for this decision. No connected system was changed.</p>
      </div>
    </details>
  );
}

function summary(systemCount: number, recordCount?: number) {
  const systems = `${systemCount} connected operational ${systemCount === 1 ? "system" : "systems"}`;
  return recordCount === undefined ? systems : `${recordCount} case ${recordCount === 1 ? "record" : "records"} across ${systems}`;
}

function friendlyName(source: ConnectedSourceView) {
  return ({
    "warehouse-wms": "Warehouse inventory",
    "distribution-history": "Distribution history",
    "receiving-erp": "Incoming deliveries",
    "donor-crm": "Donation offers",
    "org-policy": "Food bank policies",
    "procurement-catalog": "Response options and costs",
    "knowledge-inbox": "Operations notices",
  } as Record<string, string>)[source.source_id] ?? source.display_name;
}
