import { useEffect, useMemo, useRef, useState } from "react";
import {
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { guidedDemoResponse, waitForGuidedDemo } from "../lib/operationsAssistantDemo";
import {
  messageText,
  textMessage,
  writeAssistantSession,
  type PersistedMessage,
} from "../lib/operationsAssistantSession";
import { streamOperationsAssistant } from "../lib/liveApi";
import type {
  OperationsAssistantMessage,
  OperationsAssistantResponse,
  OperationsAssistantStreamEvent,
  WorkItem,
} from "../lib/liveTypes";

export const ASSISTANT_WELCOME = "Tell me what changed or ask what needs attention. I’ll match your question to verified operations data, explain the decision, and keep approval with you.";

export type AssistantProgress = Extract<OperationsAssistantStreamEvent, { type: "progress" }>;

export function useOperationsAssistantController({
  prompt,
  seed,
  storedMessages,
}: {
  prompt: string;
  seed: OperationsAssistantResponse | null;
  storedMessages: PersistedMessage[];
}) {
  const [response, setResponse] = useState<OperationsAssistantResponse | null>(seed);
  const [currentItem, setCurrentItem] = useState<WorkItem | null>(seed?.work_item ?? null);
  const [progress, setProgress] = useState<AssistantProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const contextItemId = useRef(seed?.work_item?.work_item_id);

  useEffect(() => {
    setResponse(seed);
    setCurrentItem(seed?.work_item ?? null);
    contextItemId.current = seed?.work_item?.work_item_id;
  }, [seed]);

  const adapter = useMemo<ChatModelAdapter>(() => ({
    async *run({ messages, abortSignal }) {
      setError("");
      setRunning(true);
      setProgress(null);
      const conversation = toConversation(messages);
      const lastUser = [...conversation].reverse().find((message) => message.role === "user");
      let rendered = "";
      let next: OperationsAssistantResponse | null = null;
      try {
        const startedAt = Date.now();
        setProgress(demoProgress());
        const guided = lastUser ? await guidedDemoResponse(lastUser.content) : null;
        if (guided) {
          await waitForGuidedDemo(startedAt);
          if (abortSignal.aborted) throw new DOMException("Aborted", "AbortError");
          rendered = guided.answer;
          next = guided;
          yield assistantText(rendered);
        } else {
          for await (const event of streamOperationsAssistant(
            conversation, contextItemId.current, abortSignal,
          )) {
            if (event.type === "progress") {
              setProgress(event);
              continue;
            }
            if (event.type === "delta") {
              setProgress(null);
              rendered += event.delta;
              yield assistantText(rendered);
              continue;
            }
            if (event.type === "result") next = event.data;
          }
          if (!next) throw new Error("The decision agent response was not verified.");
          if (rendered !== next.answer) {
            rendered = next.answer;
            yield assistantText(rendered);
          }
        }
        if (next.work_item) {
          contextItemId.current = next.work_item.work_item_id;
          setCurrentItem(next.work_item);
        }
        setResponse(next);
        writeAssistantSession({
          messages: [
            ...conversation.map((message) => textMessage(message.role, message.content)),
            textMessage("assistant", next.answer),
          ],
          response: next,
        });
      } catch (cause) {
        if (abortSignal.aborted) return;
        setError((cause as Error).message);
        throw cause;
      } finally {
        setProgress(null);
        setRunning(false);
      }
    },
  }), []);

  const initialMessages = useMemo<ThreadMessageLike[]>(() => {
    if (storedMessages.length) return storedMessages;
    if (prompt && seed) return [textMessage("user", prompt), textMessage("assistant", seed.answer)];
    return [textMessage("assistant", ASSISTANT_WELCOME)];
  }, [prompt, seed, storedMessages]);
  const runtime = useLocalRuntime(adapter, { initialMessages });

  return { runtime, response, currentItem, progress, running, error, setError };
}

export async function loadAssistantSeed(
  prompt: string,
  signal: AbortSignal,
  onEvent: (event: OperationsAssistantStreamEvent) => void,
): Promise<OperationsAssistantResponse> {
  const startedAt = Date.now();
  onEvent(demoProgress());
  const guided = await guidedDemoResponse(prompt);
  if (guided) {
    await waitForGuidedDemo(startedAt);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    onEvent({
      protocol: "operations-assistant-stream/1.0.0",
      type: "delta",
      sequence: 2,
      request_id: "GUIDED-DEMO",
      delta: guided.answer,
    });
    return guided;
  }
  let result: OperationsAssistantResponse | null = null;
  for await (const event of streamOperationsAssistant(
    [{ role: "user", content: prompt }], undefined, signal,
  )) {
    onEvent(event);
    if (event.type === "result") result = event.data;
  }
  if (!result) throw new Error("The decision agent response was not verified.");
  return result;
}

function toConversation(messages: readonly ThreadMessageLike[]): OperationsAssistantMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: messageText(message),
    }))
    .filter((message) => message.content.length > 0);
}

function assistantText(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function demoProgress(): AssistantProgress {
  return {
    protocol: "operations-assistant-stream/1.0.0",
    type: "progress",
    sequence: 1,
    request_id: "GUIDED-DEMO",
    stage: "READING",
    message: "Checking inventory, deliveries, and available responses",
  };
}
