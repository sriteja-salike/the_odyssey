import type { ThreadMessageLike } from "@assistant-ui/react";
import type { OperationsAssistantResponse } from "./liveTypes";

const SESSION_KEY = "nourishops:operations-assistant-session";
const SESSION_VERSION = "operations-assistant-session/2.0.0";

export type PersistedMessage = {
  role: "user" | "assistant";
  content: { type: "text"; text: string }[];
};

export interface PersistedAssistantSession {
  schema_version?: typeof SESSION_VERSION;
  messages: PersistedMessage[];
  response: OperationsAssistantResponse;
}

export function readAssistantSession(): PersistedAssistantSession | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as PersistedAssistantSession;
    return Array.isArray(session.messages) && session.response ? session : null;
  } catch {
    return null;
  }
}

export function writeAssistantSession(session: Omit<PersistedAssistantSession, "schema_version">) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      schema_version: SESSION_VERSION,
      ...session,
    }));
  } catch {
    // The conversation remains usable when browser storage is unavailable.
  }
}

export function clearAssistantSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function textMessage(role: "user" | "assistant", text: string): PersistedMessage {
  return { role, content: [{ type: "text", text }] };
}

export function messageText(message: ThreadMessageLike): string {
  if (typeof message.content === "string") return message.content.trim();
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => "text" in part ? part.text : "")
    .join("\n")
    .trim();
}
