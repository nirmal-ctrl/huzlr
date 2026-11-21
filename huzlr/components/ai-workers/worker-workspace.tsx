"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  PanelLeft,
  Pencil,
  RotateCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { useWorkerWorkspace } from "@/components/ai-workers/shared";
import { errorDetail } from "@/components/ai-workers/worker-actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type AIWorker,
  type WorkerSession,
  type WorkerSessionDetail,
  useCreateWorkerSessionMutation,
  useDeployAIWorkerMutation,
  useGetWorkerFeedInfiniteQuery,
  useGetWorkerSessionQuery,
  useGetWorkerSessionsQuery,
  useSendWorkerSessionMessageMutation,
} from "@/services/aiWorkersApi";

const ACTIVE_STATUSES = new Set(["queued", "running", "waiting_approval"]);

export function WorkerWorkspace() {
  const { workspaceId, isReady } = useWorkerWorkspace();
  return (
    <WorkerWorkspaceSurface
      key={workspaceId ?? "none"}
      workspaceId={workspaceId}
      isReady={isReady}
    />
  );
}

function WorkerWorkspaceSurface({
  workspaceId,
  isReady,
}: {
  workspaceId: number | null;
  isReady: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const requestedSession = params.get("session") ?? "";
  const requestedWorker = params.get("worker") ?? "";
  const workersQuery = useGetWorkerFeedInfiniteQuery(workspaceId ?? 0, {
    skip: !workspaceId,
  });
  const sessionsQuery = useGetWorkerSessionsQuery(workspaceId ?? 0, {
    skip: !workspaceId,
    pollingInterval: 5000,
  });
  const workers = useMemo(
    () =>
      Array.from(
        new Map(
          workersQuery.currentData?.pages
            .flatMap((page) => page.items)
            .map((worker) => [worker.id, worker]) ?? [],
        ).values(),
      ),
    [workersQuery.currentData],
  );
  const sessions = sessionsQuery.currentData ?? [];
  const [sessionId, setSessionId] = useState(requestedSession);
  const [workerId, setWorkerId] = useState(requestedWorker);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mobileSessions, setMobileSessions] = useState(false);
  const [createSession, createState] = useCreateWorkerSessionMutation();
  const [sendMessage, sendState] = useSendWorkerSessionMessageMutation();
  const [deploy, deployState] = useDeployAIWorkerMutation();
  const logRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionQuery = useGetWorkerSessionQuery(sessionId, {
    skip: !sessionId,
    pollingInterval: 1500,
    refetchOnFocus: true,
  });
  const session = sessionQuery.currentData;
  const worker = workers.find(
    (item) => item.id === (session?.worker_id ?? workerId),
  );
  const pending = session?.messages.some(
    (message) =>
      message.role === "user" &&
      !!message.execution_status &&
      ACTIVE_STATUSES.has(message.execution_status),
  );
  const busy = createState.isLoading || sendState.isLoading || !!pending;

  useEffect(() => {
    if (
      workersQuery.hasNextPage &&
      !workersQuery.isFetching &&
      !workersQuery.isError
    )
      void workersQuery.fetchNextPage();
  }, [workersQuery]);

  useEffect(() => {
    if (requestedSession && requestedSession !== sessionId)
      setSessionId(requestedSession);
  }, [requestedSession, sessionId]);

  useEffect(() => {
    if (sessionId || workerId || !workers.length) return;
    setWorkerId(
      workers.find((item) => item.status === "deployed")?.id ?? workers[0].id,
    );
  }, [sessionId, workerId, workers]);

  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [session?.messages.length, pending]);

  const openSession = (id: string) => {
    const selected = sessions.find((item) => item.id === id);
    if (selected) setWorkerId(selected.worker_id);
    setSessionId(id);
    setMobileSessions(false);
    setError(null);
    router.replace(`/work?session=${encodeURIComponent(id)}`, { scroll: false });
  };
  const startNew = () => {
    setSessionId("");
    setInput("");
    setError(null);
    setMobileSessions(false);
    router.replace(
      workerId ? `/work?worker=${encodeURIComponent(workerId)}` : "/work",
      { scroll: false },
    );
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const activate = async () => {
    if (!worker || worker.status === "deployed") return;
    setError(null);
    try {
      await deploy({ workerId: worker.id, projectId: worker.project_id }).unwrap();
    } catch (failure) {
      setError(errorDetail(failure));
    }
  };
  const submit = async () => {
    const content = input.trim();
    if (!worker || worker.status !== "deployed" || !content || busy) return;
    setError(null);
    try {
      let targetSession = sessionId;
      if (!targetSession) {
        const created = await createSession({ worker_id: worker.id }).unwrap();
        targetSession = created.id;
        setSessionId(created.id);
        router.replace(`/work?session=${encodeURIComponent(created.id)}`, {
          scroll: false,
        });
      }
      await sendMessage({ sessionId: targetSession, content }).unwrap();
      setInput("");
    } catch (failure) {
      setError(errorDetail(failure));
    }
  };

  const loading = !isReady || (!!workspaceId && !workersQuery.currentData);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/10">
      <SiteHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Show chat sessions"
            onClick={() => setMobileSessions((visible) => !visible)}
          >
            <PanelLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={startNew}>
            <MessageSquarePlus className="size-4" />
            New chat
          </Button>
        </div>
      </SiteHeader>
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <SessionRail
          sessions={sessions}
          selectedId={sessionId}
          visible={mobileSessions}
          loading={sessionsQuery.isLoading}
          failed={sessionsQuery.isError}
          onClose={() => setMobileSessions(false)}
          onNew={startNew}
          onOpen={openSession}
          onRetry={() => sessionsQuery.refetch()}
        />
        <main className="flex min-w-0 flex-1 flex-col bg-background">
          {loading ? (
            <WorkerWorkspaceLoading />
          ) : workersQuery.isError ? (
            <LoadError onRetry={() => workersQuery.refetch()} />
          ) : !workers.length ? (
            <NoWorkers />
          ) : (
            <>
              <Conversation
                session={session}
                loading={!!sessionId && sessionQuery.isLoading}
                failed={!!sessionId && sessionQuery.isError}
                pending={!!pending}
                worker={worker}
                logRef={logRef}
                onRetry={() => sessionQuery.refetch()}
              />
              <Composer
                input={input}
                setInput={setInput}
                worker={worker}
                workers={workers}
                locked={!!sessionId}
                busy={busy}
                activating={deployState.isLoading}
                error={error}
                textareaRef={textareaRef}
                onWorkerChange={setWorkerId}
                onActivate={activate}
                onSubmit={submit}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SessionRail({
  sessions,
  selectedId,
  visible,
  loading,
  failed,
  onClose,
  onNew,
  onOpen,
  onRetry,
}: {
  sessions: WorkerSession[];
  selectedId: string;
  visible: boolean;
  loading: boolean;
  failed: boolean;
  onClose: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onRetry: () => void;
}) {
  return (
    <>
      {visible && (
        <button
          aria-label="Close chat sessions"
          className="absolute inset-0 z-20 bg-black/20 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-label="Chat sessions"
        className={`absolute inset-y-0 left-0 z-30 flex w-[min(19rem,88vw)] shrink-0 flex-col border-r bg-muted/35 transition-transform md:static md:w-72 md:translate-x-0 ${visible ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-3">
          <div>
            <p className="text-sm font-semibold">Agent chats</p>
            <p className="text-[11px] text-muted-foreground">
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
            </p>
          </div>
          <Button size="icon" variant="ghost" aria-label="New chat" onClick={onNew}>
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : failed ? (
            <div className="rounded-xl border bg-background p-3 text-sm">
              <p className="text-muted-foreground">Couldn’t load chats.</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={onRetry}>
                <RotateCw className="size-3.5" /> Try again
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs leading-5 text-muted-foreground">
              Your conversations will appear here after you send the first message.
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onOpen(item.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                    item.id === selectedId
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  }`}
                >
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="mt-1 block truncate text-[11px]">{item.worker_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Conversation({
  session,
  loading,
  failed,
  pending,
  worker,
  logRef,
  onRetry,
}: {
  session: WorkerSessionDetail | undefined;
  loading: boolean;
  failed: boolean;
  pending: boolean;
  worker: AIWorker | undefined;
  logRef: React.RefObject<HTMLDivElement | null>;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (failed) return <LoadError onRetry={onRetry} />;
  if (!session?.messages.length)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-10">
        <div className="max-w-lg text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border bg-muted/30 shadow-sm">
            <Sparkles className="size-5 text-primary" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            What should {worker?.name ?? "your worker"} work on?
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Send a request to start a saved chat. Follow-up messages stay in the same session and include its conversation history.
          </p>
        </div>
      </div>
    );
  return (
    <div
      ref={logRef}
      role="log"
      aria-live="polite"
      className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-8 sm:px-8">
        {session.messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm">
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.execution_status === "failed" && (
                  <p className="mt-2 flex items-center gap-1.5 border-t border-primary-foreground/20 pt-2 text-xs opacity-90">
                    <TriangleAlert className="size-3.5" />
                    {message.execution_error ?? "The worker could not complete this request."}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex gap-3">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                <Bot className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-7 text-foreground">
                {message.content}
              </div>
            </div>
          ),
        )}
        {pending && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted/40">
              <Loader2 className="size-3.5 animate-spin" />
            </div>
            <span>{session.worker_name} is working…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({
  input,
  setInput,
  worker,
  workers,
  locked,
  busy,
  activating,
  error,
  textareaRef,
  onWorkerChange,
  onActivate,
  onSubmit,
}: {
  input: string;
  setInput: (value: string) => void;
  worker: AIWorker | undefined;
  workers: AIWorker[];
  locked: boolean;
  busy: boolean;
  activating: boolean;
  error: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onWorkerChange: (id: string) => void;
  onActivate: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent px-3 pb-3 pt-2 sm:px-6 sm:pb-5">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border bg-background p-2 shadow-[0_12px_40px_-22px_rgba(0,0,0,0.4)] focus-within:border-foreground/25">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            disabled={busy || worker?.status !== "deployed"}
            placeholder={busy ? `${worker?.name ?? "Worker"} is working…` : "Ask your worker to do something…"}
            className="min-h-[72px] resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-2 border-t px-1 pt-2">
            <Select value={worker?.id ?? ""} onValueChange={onWorkerChange} disabled={locked || busy}>
              <SelectTrigger className="h-8 max-w-[15rem] border-0 bg-muted/60 text-xs shadow-none">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}{item.status !== "deployed" ? " · inactive" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              className="size-8 rounded-full"
              aria-label="Send message"
              disabled={!input.trim() || busy || worker?.status !== "deployed"}
              onClick={onSubmit}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </Button>
          </div>
        </div>
        {worker?.status !== "deployed" ? (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>{worker?.name ?? "This worker"} must be active before chatting.</span>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" disabled={activating} onClick={onActivate}>
              {activating ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
              Activate
            </Button>
            {worker && (
              <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                <Link href={`/ai-workers/${worker.id}/edit`}><Pencil className="size-3" /> Edit</Link>
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Enter to send · Shift + Enter for a new line · chats are saved automatically
          </p>
        )}
        {error && <p role="alert" className="mt-2 text-center text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <TriangleAlert className="size-5 text-muted-foreground" />
      <p className="text-sm font-medium">We couldn’t load this chat</p>
      <Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="size-3.5" /> Try again</Button>
    </div>
  );
}

function NoWorkers() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
      <Bot className="size-6 text-muted-foreground" />
      <h1 className="mt-4 text-lg font-semibold">Create a worker to start chatting</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">Your worker can keep context across every message in a saved session.</p>
      <Button asChild className="mt-5"><Link href="/ai-workers/new">Create your first worker</Link></Button>
    </div>
  );
}

export function WorkerWorkspaceLoading() {
  return (
    <div role="status" aria-label="Loading agent chats" className="flex min-h-0 flex-1 items-center justify-center">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
