import { useEffect, useMemo, useState } from "react";
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
import { ArrowDown, ArrowRight, ArrowUp, Checkmark, DataReference } from "@carbon/icons-react";
import ProductShell from "../components/ProductShell";
import {
  askOperationsAssistant,
  startWorkItem,
  type OperationsAssistantResponse,
  type WorkItem,
} from "../lib/liveApi";

const WELCOME = "Tell me what is happening, or ask what needs attention. I’ll use the verified operations data to find the right decision flow.";

export default function OperationsAssistant() {
  const [params] = useSearchParams();
  const prompt = params.get("prompt")?.trim() ?? "";
  const [seed, setSeed] = useState<OperationsAssistantResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(prompt));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!prompt) return;
    setLoading(true);
    askOperationsAssistant(prompt)
      .then(setSeed)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [prompt]);

  if (loading) {
    return <ProductShell active="assistant"><main className="assistant-loading"><p>Checking verified operations data…</p></main></ProductShell>;
  }

  return (
    <ProductShell active="assistant">
      {error && <div className="service-error assistant-route-error" role="alert">{error}</div>}
      <AssistantThread prompt={prompt} seed={seed} />
    </ProductShell>
  );
}

function AssistantThread({ prompt, seed }: { prompt: string; seed: OperationsAssistantResponse | null }) {
  const navigate = useNavigate();
  const [currentItem, setCurrentItem] = useState<WorkItem | null>(seed?.work_item ?? null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  const adapter = useMemo<ChatModelAdapter>(() => ({
    async run({ messages, abortSignal }) {
      const text = messageText(messages.at(-1));
      const response = await askOperationsAssistant(text);
      if (abortSignal.aborted) throw new DOMException("Aborted", "AbortError");
      setCurrentItem(response.work_item);
      return { content: [{ type: "text", text: response.answer }] };
    },
  }), []);

  const initialMessages = useMemo<ThreadMessageLike[]>(() => {
    if (!prompt || !seed) return [{ role: "assistant", content: [{ type: "text", text: WELCOME }] }];
    return [
      { role: "user", content: [{ type: "text", text: prompt }] },
      { role: "assistant", content: [{ type: "text", text: seed.answer }] },
    ];
  }, [prompt, seed]);
  const runtime = useLocalRuntime(adapter, { initialMessages });

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

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="assistant-page">
        <header className="assistant-page__intro">
          <p className="eyebrow">Operations assistant</p>
          <h1>Ask, understand, then decide.</h1>
          <p>The assistant can explain verified data and open the right workflow. It cannot approve an action.</p>
        </header>
        <div className="assistant-layout">
          <ThreadPrimitive.Root className="assistant-thread">
            <ThreadPrimitive.Viewport className="assistant-thread__viewport">
              <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
              <ThreadPrimitive.ViewportFooter className="assistant-thread__footer">
                <ThreadPrimitive.ScrollToBottom className="assistant-scroll" aria-label="Scroll to latest message"><ArrowDown size={18} /></ThreadPrimitive.ScrollToBottom>
                <ComposerPrimitive.Root className="assistant-composer">
                  <ComposerPrimitive.Input aria-label="Ask about operations" placeholder="Ask a follow-up about operations" rows={2} />
                  <ComposerPrimitive.Send className="assistant-composer__send" aria-label="Send message"><ArrowUp size={20} /></ComposerPrimitive.Send>
                </ComposerPrimitive.Root>
                <p>Verified-data assistant · Manager approval is always separate</p>
              </ThreadPrimitive.ViewportFooter>
            </ThreadPrimitive.Viewport>
          </ThreadPrimitive.Root>

          <aside className="assistant-context" aria-label="Current decision context">
            <span>Decision context</span>
            {currentItem ? (
              <>
                <div className="assistant-context__status"><Checkmark size={16} />Matched to a verified case</div>
                <h2>{currentItem.presentation.issue.title}</h2>
                <p>{currentItem.presentation.issue.summary}</p>
                <div className="assistant-context__source"><DataReference size={17} />{currentItem.source_count} verified sources</div>
                <button type="button" onClick={() => void openDecision()} disabled={opening}>
                  {opening ? "Preparing response…" : currentItem.primary_action_label}<ArrowRight size={18} />
                </button>
              </>
            ) : (
              <p>Ask a question and I’ll connect it to the most relevant verified case.</p>
            )}
            {error && <p className="field__err" role="alert">{error}</p>}
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
      <span>Nourish Ops</span>
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function messageText(message: unknown): string {
  const content = (message as { content?: { type: string; text?: string }[] } | undefined)?.content ?? [];
  return content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n").trim();
}
