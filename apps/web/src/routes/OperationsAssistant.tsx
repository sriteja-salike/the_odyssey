import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { ArrowDown, ArrowRight, ArrowUp, Checkmark, Locked, StopFilled } from "@carbon/icons-react";
import ProductShell from "../components/ProductShell";
import ConnectedSources from "../components/ConnectedSources";
import {
  recentRunForCase,
  startWorkItem,
  type OperationsAssistantResponse,
} from "../lib/liveApi";
import {
  loadAssistantSeed,
  useOperationsAssistantController,
  type AssistantProgress,
} from "../hooks/useOperationsAssistantController";
import {
  clearAssistantSession,
  readAssistantSession,
  textMessage,
  writeAssistantSession,
  type PersistedMessage,
} from "../lib/operationsAssistantSession";

export default function OperationsAssistant() {
  const [params] = useSearchParams();
  const prompt = params.get("prompt")?.trim() ?? "";
  const conversationKey = params.get("new") ?? "stored";
  const fresh = params.has("new");
  const stored = useMemo(() => prompt || fresh ? null : readAssistantSession(), [fresh, prompt]);
  const [seed, setSeed] = useState<OperationsAssistantResponse | null>(stored?.response ?? null);
  const [loading, setLoading] = useState(Boolean(prompt));
  const [partialAnswer, setPartialAnswer] = useState("");
  const [initialProgress, setInitialProgress] = useState<AssistantProgress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!prompt) {
      if (fresh) setSeed(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setPartialAnswer("");
    setInitialProgress(null);
    loadAssistantSeed(prompt, controller.signal, (event) => {
      if (event.type === "progress") setInitialProgress(event);
      if (event.type === "delta") {
        setInitialProgress(null);
        setPartialAnswer((current) => current + event.delta);
      }
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        setSeed(response);
        writeAssistantSession({
          messages: [textMessage("user", prompt), textMessage("assistant", response.answer)],
          response,
        });
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [fresh, prompt]);

  if (loading) {
    return (
      <ProductShell active="assistant">
        <main className="assistant-page assistant-page--loading" aria-live="polite">
          <header className="assistant-page__intro">
            <p className="eyebrow">ShareStack decision agent</p>
            <h1>Checking your question.</h1>
            <p>The agent is matching it to today’s situations and verified operations records.</p>
          </header>
          <div className="assistant-layout">
            <section className="assistant-thread assistant-loading-thread" aria-label="Conversation loading">
              <div className="assistant-message assistant-message--user"><span>You</span><p>{prompt}</p></div>
              {partialAnswer
                ? <StreamingSeedMessage answer={partialAnswer} />
                : <ThinkingMessage progress={initialProgress} />}
            </section>
            <aside className="assistant-context"><span>Current decision</span><h2>Matching this to the right situation</h2><p>The related issue, information checked, and next action will appear here.</p></aside>
          </div>
        </main>
      </ProductShell>
    );
  }

  return (
    <ProductShell active="assistant">
      {error && <div className="service-error assistant-route-error" role="alert">{error}</div>}
      <AssistantThread
        key={prompt || conversationKey}
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
  const [opening, setOpening] = useState(false);
  const { runtime, response, currentItem, progress, running, error, setError } = useOperationsAssistantController({
    prompt, seed, storedMessages,
  });
  const existingRun = currentItem ? recentRunForCase(currentItem.case_key) : undefined;

  async function openDecision() {
    if (!currentItem) return;
    if (existingRun) {
      navigate(`/runs/${existingRun.run_id}`);
      return;
    }
    setOpening(true);
    setError("");
    try {
      const run = await startWorkItem(currentItem);
      navigate(`/runs/${run.run_id}`, { state: { autoAnalyze: true } });
    } catch (reason) {
      setError((reason as Error).message);
      setOpening(false);
    }
  }

  function startNewConversation() {
    clearAssistantSession();
    navigate(`/assistant?new=${crypto.randomUUID()}`);
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="assistant-page">
        <div className="assistant-page__heading">
          <header className="assistant-page__intro">
            <p className="eyebrow">ShareStack decision agent</p>
            <h1>Ask, understand, then decide.</h1>
            <p>Use plain language. The agent matches your situation, reads verified records, and opens one safe decision flow.</p>
          </header>
          <button type="button" className="assistant-new" onClick={startNewConversation}>New conversation</button>
        </div>
        {currentItem && <div className="assistant-casebar">
          <span>Discussing</span>
          <strong>{currentItem.presentation.issue.title}</strong>
          {existingRun && <button type="button" onClick={() => navigate(`/runs/${existingRun.run_id}`)}>Return to decision<ArrowRight size={16} /></button>}
        </div>}
        <div className="assistant-layout">
          <ThreadPrimitive.Root className="assistant-thread">
            <ThreadPrimitive.Viewport className="assistant-thread__viewport">
              <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
              {running && progress && <ThinkingMessage progress={progress} />}
              <ThreadPrimitive.ViewportFooter className="assistant-thread__footer">
                {!running && response?.suggested_questions.length ? (
                  <div className="assistant-followups" aria-label="Useful follow-up questions">
                    <span>Useful follow-ups</span>
                    <div>{response.suggested_questions.slice(0, 3).map((question) => (
                      <ThreadPrimitive.Suggestion key={question} prompt={question} send>{question}</ThreadPrimitive.Suggestion>
                    ))}</div>
                  </div>
                ) : null}
                <ThreadPrimitive.ScrollToBottom className="assistant-scroll" aria-label="Scroll to latest message"><ArrowDown size={18} /></ThreadPrimitive.ScrollToBottom>
                <ComposerPrimitive.Root className="assistant-composer">
                  <ComposerPrimitive.Input aria-label="Ask about operations" placeholder="Ask a follow-up about this decision" rows={2} />
                  {running
                    ? <ComposerPrimitive.Cancel className="assistant-composer__send assistant-composer__cancel" aria-label="Stop response"><StopFilled size={18} /></ComposerPrimitive.Cancel>
                    : <ComposerPrimitive.Send className="assistant-composer__send" aria-label="Send message"><ArrowUp size={20} /></ComposerPrimitive.Send>}
                </ComposerPrimitive.Root>
                <p><Locked size={12} aria-hidden /> The agent cannot approve or perform an action</p>
              </ThreadPrimitive.ViewportFooter>
            </ThreadPrimitive.Viewport>
          </ThreadPrimitive.Root>

          <aside className="assistant-context" aria-label="Current decision" aria-live="polite">
            <span>Current decision</span>
            {currentItem && response ? (
              <>
                <div className={`assistant-context__status assistant-context__status--${response.response_type.toLowerCase()}`}>
                  <Checkmark size={16} />{responseLabel(response)}
                </div>
                <h2>{currentItem.presentation.issue.title}</h2>
                <p>{currentItem.presentation.issue.summary}</p>
                <div className="assistant-context__source"><Checkmark size={17} />{currentItem.source_count} case records checked</div>
                <div className={`agent-mode-line${response.agent.effective_mode === "offline_fallback" ? " agent-mode-line--fallback" : ""}`}><span className="agent-mode-dot" aria-hidden />{agentModeLabel(response)}</div>
                {running && <LiveProgress progress={progress} />}
                <section className="assistant-work" aria-label="What ShareStack did">
                  <strong>What ShareStack did</strong>
                  <ol>
                    <li><span>1</span>Matched your question to this situation</li>
                    <li><span>2</span>Read the relevant operational records</li>
                    <li><span>3</span>{currentItem.state === "INFORMATION_NEEDED" ? "Found a conflict and stopped safely" : "Checked the available responses and safety limits"}</li>
                  </ol>
                </section>
                <ConnectedSources sources={currentItem.connected_sources ?? []} recordCount={currentItem.source_count} />
                <ul className="assistant-guardrails">
                  <li><Checkmark size={15} />The answer uses only the information shown here</li>
                  <li><Locked size={15} />{currentItem.state === "INFORMATION_NEEDED" ? "Approval is unavailable until the records agree" : "You still make the final decision"}</li>
                </ul>
                <button type="button" onClick={() => void openDecision()} disabled={opening}>
                  {opening
                    ? "Agent is preparing the review…"
                    : existingRun
                      ? "Return to this decision"
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
                    <ThreadPrimitive.Suggestion key={question} prompt={question} send>{question}<ArrowRight size={15} /></ThreadPrimitive.Suggestion>
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
      <span>ShareStack decision agent</span>
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function ThinkingMessage({ progress }: { progress: AssistantProgress | null }) {
  return (
    <div className="assistant-message assistant-message--agent assistant-thinking" role="status" aria-live="polite">
      <span>ShareStack decision agent</span>
      <div>
        <p>{progress?.message ?? "Checking inventory, deliveries, and available responses"}</p>
        <span className="assistant-thinking__dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </div>
  );
}

function StreamingSeedMessage({ answer }: { answer: string }) {
  return <div className="assistant-message assistant-message--agent"><span>ShareStack decision agent</span><div><p>{answer}</p></div></div>;
}

function LiveProgress({ progress }: { progress: AssistantProgress | null }) {
  return <div className="assistant-live-progress" role="status" aria-live="polite">
    <span className="assistant-thinking__dots" aria-hidden="true"><i /><i /><i /></span>
    <span>{progress?.message ?? "Reviewing your follow-up"}</span>
  </div>;
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
  if (response.guardrails.facts === "Hardcoded synthetic demonstration data") {
    return "Guided demo review completed";
  }
  if (agent.effective_mode === "live" && agent.status === "live_verified") {
    return "Decision agent completed its review";
  }
  if (agent.effective_mode === "offline_fallback" || agent.effective_mode === "offline") {
    return "Verified backup review completed";
  }
  return "Verified decision review completed";
}
