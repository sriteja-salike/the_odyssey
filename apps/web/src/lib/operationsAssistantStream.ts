import type { OperationsAssistantStreamEvent } from "./liveTypes";

const PROTOCOL = "operations-assistant-stream/1.0.0";

export function parseOperationsAssistantEvent(line: string): OperationsAssistantStreamEvent {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new Error("The decision agent returned an unreadable stream event.");
  }
  if (!isRecord(value) || value.protocol !== PROTOCOL || typeof value.type !== "string") {
    throw new Error("The decision agent returned an unsupported stream event.");
  }
  if (typeof value.sequence !== "number" || typeof value.request_id !== "string") {
    throw new Error("The decision agent returned an incomplete stream event.");
  }
  if (value.type === "progress" && isProgress(value)) return value as OperationsAssistantStreamEvent;
  if (value.type === "delta" && typeof value.delta === "string") return value as OperationsAssistantStreamEvent;
  if (value.type === "result" && isRecord(value.data) && isRecord(value.meta)) return value as OperationsAssistantStreamEvent;
  if (value.type === "done") return value as OperationsAssistantStreamEvent;
  if (value.type === "error" && typeof value.code === "string" && typeof value.message === "string" && typeof value.retryable === "boolean") {
    return value as OperationsAssistantStreamEvent;
  }
  throw new Error("The decision agent returned a malformed stream event.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isProgress(value: Record<string, unknown>) {
  return (value.stage === "MATCHING" || value.stage === "READING" || value.stage === "CHECKING")
    && typeof value.message === "string";
}
