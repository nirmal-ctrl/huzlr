"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  FileSliders,
  Loader2,
  Plus,
  SquareTerminal,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useDraftAIWorkerMutation,
  type AIWorkerInput,
  type WorkerCreationMessage,
  type WorkerCreationProposal,
} from "@/services/aiWorkersApi";
import { workerError } from "./shared";

export function WorkerCreationChat({
  active,
  workspaceId,
  draft,
  available,
  checkingAvailability,
  availabilityError,
  onRetryAvailability,
  onManualSetup,
  onDraftChange,
  onBusyChange,
}: {
  active: boolean;
  workspaceId: number | null;
  draft: Omit<AIWorkerInput, "project_id" | "workspace_id">;
  available: boolean;
  checkingAvailability: boolean;
  availabilityError: boolean;
  onRetryAvailability: () => unknown;
  onManualSetup: () => void;
  onDraftChange: (proposal: WorkerCreationProposal | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [messages, setMessages] = useState<WorkerCreationMessage[]>([]);
  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState<WorkerCreationProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [retryTurns, setRetryTurns] = useState<WorkerCreationMessage[] | null>(
    null,
  );
  const [generate, state] = useDraftAIWorkerMutation();
  const requestRef = useRef<ReturnType<typeof generate> | null>(null);
  const retryConfiguration = useRef<Partial<
    Omit<AIWorkerInput, "project_id" | "workspace_id">
  > | null>(null);
  const mounted = useRef(true);
  const sending = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const followLatest = useRef(true);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestRef.current?.abort();
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);
  useEffect(() => {
    onBusyChange(state.isLoading);
  }, [state.isLoading, onBusyChange]);
  useEffect(() => {
    if (active && followLatest.current)
      logRef.current?.scrollTo({
        top: logRef.current.scrollHeight,
        behavior: "instant",
      });
  }, [active, messages, proposal, state.isLoading, error]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea || !active) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [input, active]);

  const scrollToLatest = () => {
    followLatest.current = true;
    setAtBottom(true);
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  const copyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      if (!mounted.current) return;
      setCopied(index);
      setCopyError(false);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(null), 2000);
    } catch {
      if (mounted.current) setCopyError(true);
    }
  };

  const send = async (text: string, retry?: WorkerCreationMessage[]) => {
    const content = text.trim();
    if ((!content && !retry) || !workspaceId || !available || sending.current)
      return;
    sending.current = true;
    followLatest.current = true;
    setAtBottom(true);
    const turns: WorkerCreationMessage[] = retry ?? [
      ...messages,
      { role: "user", content },
    ];
    if (!retry) {
      setMessages(turns);
      setInput("");
    }
    setRetryTurns(turns);
    setError(null);
    setProposal(null);
    onDraftChange(null);
    const { name, instructions, model_name, ...settings } = {
      ...draft,
      ...proposal,
    };
    const currentConfiguration =
      retry && retryConfiguration.current
        ? retryConfiguration.current
        : {
            ...settings,
            ...(name.trim() ? { name } : {}),
            ...(instructions.trim() ? { instructions } : {}),
            ...(model_name.trim() ? { model_name } : {}),
          };
    retryConfiguration.current = currentConfiguration;
    try {
      const request = generate({
        workspace_id: workspaceId,
        messages: turns.slice(-20),
        current_configuration: currentConfiguration,
      });
      requestRef.current = request;
      const reply = await request.unwrap();
      if (!mounted.current) return;
      setMessages([...turns, { role: "assistant", content: reply.message }]);
      setProposal(reply.configuration);
      onDraftChange(reply.configuration);
      setRetryTurns(null);
    } catch (failure) {
      if (mounted.current) setError(workerError(failure));
    } finally {
      sending.current = false;
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-white dark:bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <SquareTerminal
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="font-medium">Worker builder</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground"
          disabled={state.isLoading || !messages.length}
          onClick={() => {
            setMessages([]);
            setInput("");
            setProposal(null);
            onDraftChange(null);
            setError(null);
            setRetryTurns(null);
            retryConfiguration.current = null;
            setCopied(null);
            setCopyError(false);
            followLatest.current = true;
            setAtBottom(true);
            inputRef.current?.focus();
          }}
        >
          <Plus className="size-3.5" />
          New chat
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={logRef}
          role="log"
          aria-label="Worker creation conversation"
          aria-live="polite"
          aria-relevant="additions"
          tabIndex={0}
          onScroll={(event) => {
            const element = event.currentTarget;
            const nearBottom =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              64;
            followLatest.current = nearBottom;
            setAtBottom(nearBottom);
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-auto outline-offset-[-2px]"
        >
          <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-8">
            {!messages.length && (
              <div className="pb-4 pt-2 sm:pb-8 sm:pt-12">
                <p className="mb-3 flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground">
                  <span
                    className="size-1.5 rounded-full bg-primary/70"
                    aria-hidden="true"
                  />
                  LET’S BUILD YOUR WORKER
                </p>
                <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                  What would you like to delegate?
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                  Tell me what a good outcome looks like. We’ll work out the
                  instructions, tools, and boundaries together.
                </p>
                <div className="mt-7 grid gap-2 sm:mt-9 sm:grid-cols-3">
                  {[
                    {
                      title: "Spot blockers",
                      description: "Review sprint tasks",
                      prompt: "Review sprint tasks and highlight blockers",
                    },
                    {
                      title: "Report on delivery",
                      description: "Summarize project progress",
                      prompt: "Prepare a weekly delivery report",
                    },
                    {
                      title: "Triage the backlog",
                      description: "Organize what comes next",
                      prompt: "Help triage tasks in this project",
                    },
                  ].map((example) => (
                    <button
                      key={example.title}
                      type="button"
                      disabled={!available || !workspaceId || state.isLoading}
                      onClick={() => {
                        setInput(example.prompt);
                        inputRef.current?.focus();
                      }}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-slate-50/60 px-4 py-3 text-left transition-colors hover:border-primary/25 hover:bg-primary/[0.035] focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 sm:min-h-24 sm:items-start dark:bg-muted/20"
                    >
                      <span>
                        <span className="block text-xs font-medium">
                          {example.title}
                        </span>
                        <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">
                          {example.description}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-7 sm:space-y-9">
              {messages.map((message, index) =>
                message.role === "user" ? (
                  <div
                    key={index}
                    className="ml-auto max-w-[92%] sm:max-w-[85%]"
                  >
                    <p className="mb-1.5 text-right text-[11px] font-medium text-muted-foreground">
                      You
                    </p>
                    <div className="rounded-2xl rounded-tr-md bg-slate-100 px-4 py-3 text-sm leading-6 dark:bg-muted">
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={index} className="group">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <SquareTerminal
                          className="size-3.5"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="text-xs font-semibold">Huzlr</span>
                      <span className="text-[11px] text-muted-foreground">
                        Builder
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none break-words text-foreground prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-7 prose-li:leading-7 prose-a:text-primary prose-pre:overflow-x-auto prose-pre:bg-slate-950 prose-pre:text-slate-100 prose-table:block prose-table:overflow-x-auto dark:prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ children, href, title }) => (
                            <a
                              href={href}
                              title={title}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        copied === index
                          ? "Message copied"
                          : "Copy assistant message"
                      }
                      className="mt-2 size-8 text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      onClick={() => void copyMessage(message.content, index)}
                    >
                      {copied === index ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                ),
              )}
            </div>

            {state.isLoading && (
              <div
                role="status"
                className="mt-6 flex items-center gap-2.5 text-xs text-muted-foreground"
              >
                <Loader2 className="size-4 animate-spin text-primary" />
                Working on your configuration…
              </div>
            )}

            {proposal && (
              <article
                aria-label="Suggested configuration"
                className="mt-5 overflow-hidden rounded-xl border border-border bg-slate-50/50 dark:bg-muted/15"
              >
                <details>
                  <summary className="group flex cursor-pointer list-none items-center gap-3 p-4 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-white text-primary dark:bg-card">
                      <FileSliders className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Configuration draft
                      </span>
                      <span className="mt-1 block break-words text-sm font-semibold">
                        {proposal.name}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {proposal.allowed_tools.length} tools ·{" "}
                        {proposal.max_steps} steps · Ready for review
                      </span>
                    </span>
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="border-t border-border/60 px-4 py-4 sm:px-5">
                    <p className="whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
                      {proposal.instructions}
                    </p>
                    <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-xs">
                      <div>
                        <dt className="text-[11px] text-muted-foreground">
                          Tools
                        </dt>
                        <dd className="mt-1 break-words leading-5">
                          {proposal.allowed_tools.length
                            ? proposal.allowed_tools
                                .map((tool) => tool.replaceAll("_", " "))
                                .join(", ")
                            : "No tools"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">
                          Environment
                        </dt>
                        <dd className="mt-1">
                          {proposal.sandbox_mode === "docker"
                            ? "Isolated sandbox"
                            : "Project tools"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">
                          Run limits
                        </dt>
                        <dd className="mt-1 leading-5">
                          {proposal.max_steps} steps · $
                          {(proposal.max_cost_cents / 100).toFixed(2)} budget ·{" "}
                          {proposal.max_runtime_seconds}s
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">
                          Worker model
                        </dt>
                        <dd className="mt-1 break-words">
                          {draft.model_name || "Default model"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </details>
              </article>
            )}

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs leading-5"
              >
                <p>{error}</p>
                {retryTurns && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={state.isLoading}
                    onClick={() => void send("", retryTurns)}
                  >
                    Try again
                  </Button>
                )}
              </div>
            )}
            {!checkingAvailability && !available && (
              <div
                role="status"
                className="mt-5 rounded-xl border bg-muted/20 p-4 text-xs leading-6 text-muted-foreground"
              >
                <p>
                  {availabilityError
                    ? "We couldn’t connect to the creation assistant."
                    : "Chat creation is not enabled in this environment. You can create your worker using manual setup."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onManualSetup}
                  >
                    Use manual setup
                  </Button>
                  {availabilityError && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onRetryAvailability}
                    >
                      Try again
                    </Button>
                  )}
                </div>
              </div>
            )}
            {copyError && (
              <p role="status" className="mt-3 text-xs text-muted-foreground">
                Couldn’t copy the message. Select its text to copy it manually.
              </p>
            )}
          </div>
        </div>

        {!atBottom && messages.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute right-4 bottom-3 z-10 h-10 w-10 gap-1.5 rounded-full bg-background p-0 shadow-sm sm:right-auto sm:left-1/2 sm:h-9 sm:w-auto sm:-translate-x-1/2 sm:px-3"
            onClick={scrollToLatest}
          >
            <ArrowDown className="size-3.5" />
            <span className="sr-only sm:not-sr-only">Latest messages</span>
          </Button>
        )}
      </div>

      <div className="shrink-0 px-4 pb-3 pt-2 sm:px-8 sm:pb-4">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-2xl border border-border bg-white p-2 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.12)] transition-shadow focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-primary/[0.06] sm:block dark:bg-card">
          <Label htmlFor="worker-chat-message" className="sr-only">
            Describe or refine your worker
          </Label>
          <Textarea
            ref={inputRef}
            id="worker-chat-message"
            value={input}
            maxLength={6000}
            rows={1}
            disabled={!available || !workspaceId || state.isLoading}
            placeholder={
              checkingAvailability
                ? "Connecting to the assistant…"
                : !workspaceId
                  ? "Select a workspace to start"
                  : messages.length
                    ? "Ask for a change…"
                    : "Describe your worker…"
            }
            className="field-sizing-fixed min-h-11 max-h-24 resize-none rounded-none border-0 bg-transparent px-2 py-2.5 text-base leading-6 shadow-none focus-visible:ring-0 sm:max-h-36 sm:text-sm dark:bg-transparent"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void send(input);
              }
            }}
          />
          <div className="flex items-center justify-between gap-3 sm:pl-2">
            <span className="hidden text-[11px] text-muted-foreground sm:block">
              {state.isLoading
                ? "Drafting configuration…"
                : "Draft first. You decide when to create."}
            </span>
            <Button
              type="button"
              aria-label="Send message"
              size="icon"
              className="size-11 shrink-0 rounded-xl disabled:opacity-40 sm:size-9"
              disabled={
                !input.trim() || !workspaceId || !available || state.isLoading
              }
              onClick={() => void send(input)}
            >
              {state.isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="mx-auto mt-2 hidden max-w-3xl text-center text-[10px] text-muted-foreground sm:block">
          Enter to send <span className="px-1.5 text-border">/</span> Shift +
          Enter for a new line
        </p>
      </div>
    </div>
  );
}
