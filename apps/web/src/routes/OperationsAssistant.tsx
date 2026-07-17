import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { ArrowDown, ArrowRight, ArrowUp, Checkmark, DataReference, Locked } from "@carbon/icons-react";
import ProductShell from "../components/ProductShell";
import {
  askOperationsAssistant,
  startWorkItem,
  type OperationsAssistantResponse,
} from "../lib/liveApi";
import type { OperationsAssistantMessage } from "../lib/liveTypes";

const WELCOME = "Tell me what changed or ask what needs attention. I’ll match your question to verified operations data, explain the decision, and keep approval with you.";
const SESSION_KEY = "nourishops:operations-assistant-session";
const seedRequests = new Map<string, Promise<OperationsAssistantResponse>>();

type PersistedMessage = {
  role: "user" | "assistant";
  content: { type: "text"; text: string }[];
};

interface PersistedSession {
  messages: PersistedMessage[];
  response: OperationsAssistantResponse;
}

export default function OperationsAssistant() {
  const [params] = useSearchParams();
  const prompt = params.get("prompt")?.trim() ?? "";
  const stored = useMemo(() => prompt ? null : readSession(), [prompt]);
  const [seed, setSeed] = useState<OperationsAssistantResponse | null>(stored?.response ?? null);
  const [loading, setLoading] = useState(Boolean(prompt));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!prompt) return;
    let active = true;
    setLoading(true);
    setError("");
    seedRequest(prompt)
      .then((response) => {
        if (!active) return;
        setSeed(response);
        writeSession({
          messages: [textMessage("user", prompt), textMessage("assistant", response.answer)],
          response,
        });
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [prompt]);

  if (loading) {
    return (
      <ProductShell active="assistant">
        <main className="assistant-loading" aria-live="polite">
          <p>The operations agent is checking verified records and decision paths…</p>
        </main>
      </ProductShell>
    );
  }

  return (
    <ProductShell active="assistant">
      {error && <div className="service-error assistant-route-error" role="alert">{error}</div>}
      <AssistantThread
        prompt={prompt}
        seed={seed}
        storedMessages={stored?.messages ?? []}
      />
    </ProductShell>
  );
}

function AssistantThread({
  prompt,
  seed,
  storedMessages,
}: {
  prompt: string;
  seed: OperationsAssistantResponse | null;
  storedMessages: PersistedMessage[];
}) {
  const navigate = useNavigate();
  const [response, setResponse] = useState<OperationsAssistantResponse | null>(seed);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const contextItemId = useRef(seed?.work_item?.work_item_id);

  useEffect(() => {
    setResponse(seed);
    contextItemId.current = seed?.work_item?.work_item_id;
  }, [seed]);

  const adapter = useMemo<ChatModelAdapter>(() => ({
    async run({ messages, abortSignal }) {
      setError("");
      const conversation: OperationsAssistantMessage[] = messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({
          role: message.role as "user" | "assistant",
          content: messageText(message),
        }))
        .filter((message) => message.content.length > 0);
      try {
        const next = await askOperationsAssistant(conversation, contextItemId.current);
        if (abortSignal.aborted) throw new DOMException("Aborted", "AbortError");
        contextItemId.current = next.work_item?.work_item_id;
        setResponse(next);
        writeSession({
          messages: [
            ...conversation.map((message) => textMessage(message.role, message.content)),
            textMessage("assistant", next.answer),
          ],
          response: next,
        });
        return { content: [{ type: "text", text: next.answer }] };
      } catch (cause) {
        if (!abortSignal.aborted) setError((cause as Error).message);
        throw cause;
      }
    },
  }), []);

  const initialMessages = useMemo<ThreadMessageLike[]>(() => {
    if (storedMessages.length) return storedMessages;
    if (prompt && seed) {
      return [textMessage("user", prompt), textMessage("assistant", seed.answer)];
    }
    return [textMessage("assistant", WELCOME)];
  }, [prompt, seed, storedMessages]);
  const runtime = useLocalRuntime(adapter, { initialMessages });
  const currentItem = response?.work_item ?? null;

  async function openDecision() {
    if (!currentItem) return;
    setOpening(true);
    setError("");
    try {
      const run = await startWorkItem(currentItem);
      navigate(`/runs/${run.run_id}`);
    } catch (reason) {
      setError((reason as Error).message);
      setOpening(false);
    }
  }

  function askSuggested(question: string) {
    navigate(`/assistant?prompt=${encodeURIComponent(question)}`);
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="assistant-page">
        <header className="assistant-page__intro">
          <p className="eyebrow">Nourish decision agent</p>
          <h1>Ask, understand, then decide.</h1>
          <p>Use plain language. The agent matches your situation, reads verified records, and opens one safe decision flow.</p>
        </header>
        <div className="assistant-layout">
          <ThreadPrimitive.Root className="assistant-thread">
            <ThreadPrimitive.Viewport className="assistant-thread__viewport">
              <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
              <ThreadPrimitive.ViewportFooter className="assistant-thread__footer">
                <ThreadPrimitive.ScrollToBottom className="assistant-scroll" aria-label="Scroll to latest message"><ArrowDown size={18} /></ThreadPrimitive.ScrollToBottom>
                <ComposerPrimitive.Root className="assistant-composer">
                  <ComposerPrimitive.Input aria-label="Ask about operations" placeholder="Ask a follow-up about this decision" rows={2} />
                  <ComposerPrimitive.Send className="assistant-composer__send" aria-label="Send message"><ArrowUp size={20} /></ComposerPrimitive.Send>
                </ComposerPrimitive.Root>
                <p><Locked size={12} aria-hidden /> The agent cannot approve or perform an action</p>
              </ThreadPrimitive.ViewportFooter>
            </ThreadPrimitive.Viewport>
          </ThreadPrimitive.Root>

          <aside className="assistant-context" aria-label="Current decision context" aria-live="polite">
            <span>Agent decision context</span>
            {currentItem && response ? (
              <>
                <div className={`assistant-context__status assistant-context__status--${response.response_type.toLowerCase()}`}>
                  <Checkmark size={16} />{responseLabel(response)}
                </div>
                <h2>{currentItem.presentation.issue.title}</h2>
                <p>{currentItem.presentation.issue.summary}</p>
                <div className="assistant-context__source"><DataReference size={17} />{currentItem.source_count} verified sources checked</div>
                <div className={`agent-mode-line${response.agent.effective_mode === "offline_fallback" ? " agent-mode-line--fallback" : ""}`}><span className="agent-mode-dot" aria-hidden />{agentModeLabel(response)}</div>
                <ul className="assistant-guardrails">
                  <li><Checkmark size={15} />Facts grounded in frozen records</li>
                  <li><Checkmark size={15} />Safety constraints rechecked</li>
                  <li><Locked size={15} />{currentItem.state === "INFORMATION_NEEDED" ? "Approval locked until records agree" : "Manager approval remains required"}</li>
                </ul>
                <button type="button" onClick={() => void openDecision()} disabled={opening}>
                  {opening
                    ? "Agent is preparing the review…"
                    : currentItem.state === "INFORMATION_NEEDED"
                      ? "Review blocking records"
                      : "Open agent recommendation"}
                  <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <>
                <h2>{response?.response_type === "CLARIFY" ? "A little more detail will help" : "No decision selected yet"}</h2>
                <p>{response?.authority_note ?? "Describe what changed and the agent will connect it to verified decision work."}</p>
                <div className="assistant-context__suggestions">
                  {(response?.suggested_questions ?? [
                    "What needs my attention first?",
                    "Are any deliveries at risk?",
                    "Do any records conflict?",
                  ]).slice(0, 3).map((question) => (
                    <button key={question} type="button" onClick={() => askSuggested(question)}>{question}<ArrowRight size={15} /></button>
                  ))}
                </div>
              </>
            )}
            {error && <p className="field__err" role="alert">{error} Try sending the question again.</p>}
          </aside>
        </div>
      </main>
    </AssistantRuntimeProvider>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="assistant-message assistant-message--user">
      <span>You</span>
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="assistant-message assistant-message--agent">
      <span>Nourish decision agent</span>
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function messageText(message: unknown): string {
  const content = (message as { content?: { type: string; text?: string }[] } | undefined)?.content ?? [];
  return content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n").trim();
}

function textMessage(role: "user" | "assistant", text: string): PersistedMessage {
  return { role, content: [{ type: "text", text }] };
}

function readSession(): PersistedSession | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) as PersistedSession : null;
  } catch {
    return null;
  }
}

function writeSession(session: PersistedSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The conversation remains usable when browser storage is unavailable.
  }
}

function seedRequest(prompt: string): Promise<OperationsAssistantResponse> {
  const existing = seedRequests.get(prompt);
  if (existing) return existing;
  const request = askOperationsAssistant([{ role: "user", content: prompt }]);
  seedRequests.set(prompt, request);
  void request.then(
    () => seedRequests.delete(prompt),
    () => seedRequests.delete(prompt),
  );
  return request;
}

function responseLabel(response: OperationsAssistantResponse): string {
  return {
    ANSWER: "Agent matched this question",
    DECISION: "Agent found a decision to review",
    SAFE_STOP: "Agent stopped safely on conflicting data",
    CLARIFY: "Agent needs more detail",
  }[response.response_type];
}

function agentModeLabel(response: OperationsAssistantResponse): string {
  const { agent } = response;
  if (agent.effective_mode === "live" && agent.status === "live_verified") {
    return `Live ${agent.provider ?? "AI"} agent · verified output`;
  }
  if (agent.effective_mode === "offline_fallback") {
    return "Verified local fallback · agent service unavailable";
  }
  return "Verified local decision agent";
}
