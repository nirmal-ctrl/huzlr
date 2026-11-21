"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CircleStop,
  Cloud,
  History,
  Loader2,
  Pencil,
  Sparkles,
  Play,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InfiniteScroll } from "@/components/ai-workers/infinite-scroll";
import { useWorkerWorkspace } from "@/components/ai-workers/shared";
import { RunDialog, errorDetail } from "@/components/ai-workers/worker-actions";
import { useToast } from "@/hooks/use-toast";
import {
  type AIWorker,
  type WorkerFeedItem,
  useGetWorkerFeedInfiniteQuery,
  useDeployAIWorkerMutation,
  useDisableAIWorkerMutation,
} from "@/services/aiWorkersApi";

export default function AIWorkersPage() {
  return (
    <Suspense fallback={<LoadingWorkers />}>
      <WorkersLanding />
    </Suspense>
  );
}

function LoadingWorkers() {
  return (
    <div
      role="status"
      aria-label="Loading workers"
      className="flex min-h-64 items-center justify-center"
    >
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}

function WorkersLanding() {
  const { workspaceId, isReady } = useWorkerWorkspace();
  // Remount local dialogs when switching workspace; feed caches are scoped by workspace.
  return (
    <WorkersContent
      key={workspaceId ?? "none"}
      workspaceId={workspaceId}
      isReady={isReady}
    />
  );
}

function WorkersContent({
  workspaceId,
  isReady,
}: {
  workspaceId: number | null;
  isReady: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [runWorker, setRunWorker] = useState<AIWorker | null>(null);
  const query = useGetWorkerFeedInfiniteQuery(workspaceId ?? 0, {
    skip: !workspaceId,
    refetchOnMountOrArgChange: 30,
    refetchOnFocus: true,
  });
  const workers = Array.from(
    new Map(
      query.currentData?.pages
        .flatMap((page) => page.items)
        .map((worker) => [worker.id, worker]) ?? [],
    ).values(),
  );
  const createUrl = "/ai-workers/new";
  const loading =
    !isReady || (!!workspaceId && !query.currentData && !query.isError);
  const initialError = query.isError && !query.currentData;
  const nextPageError = query.isError && query.direction === "forward";

  return (
    <>
      <div className="shrink-0">
        <SiteHeader>
          {workers.length > 0 && (
            <Button asChild size="sm">
              <Link href={createUrl}>
                <Plus className="size-3.5" />
                Create worker
              </Link>
            </Button>
          )}
        </SiteHeader>
      </div>
      <main
        aria-label="AI Workers"
        className="flex min-w-0 flex-1 flex-col px-4 py-5 lg:px-6"
      >
        {loading ? (
          <LoadingWorkers />
        ) : initialError ? (
          <div
            role="alert"
            className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center"
          >
            <p className="font-medium">We couldn’t load your workers</p>
            <p className="text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        ) : !workers.length ? (
          <section className="flex min-h-[70vh] flex-1 flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border bg-muted/30">
              <Bot className="size-6 stroke-[1.5] text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              No workers yet
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Choose a model, set its instructions, and give it a task.
            </p>
            <Button asChild className="mt-6 gap-2 rounded-lg px-4">
              <Link href={createUrl}>
                <Plus className="size-4" />
                Create your first worker
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            {!workspaceId && (
              <p className="mt-6 text-xs text-muted-foreground">
                You can explore setup now and select a workspace to save your
                worker.
              </p>
            )}
          </section>
        ) : (
          <>
            <h1 className="sr-only">Your AI workers</h1>
            {query.isError && !nextPageError && (
              <div
                role="alert"
                className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <p>
                  We couldn’t refresh your workers. Your current list is still
                  here.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => query.refetch()}
                >
                  Try again
                </Button>
              </div>
            )}
            <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workers.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  highlighted={params.get("worker") === worker.id}
                  onRun={() => setRunWorker(worker)}
                />
              ))}
            </div>
            <InfiniteScroll
              count={workers.length}
              hasMore={query.hasNextPage}
              fetching={query.isFetching}
              error={query.isError}
              loadMore={query.fetchNextPage}
            />
          </>
        )}
      </main>
      {runWorker && (
        <RunDialog
          key={runWorker.id}
          worker={runWorker}
          open
          onOpenChange={(open) => !open && setRunWorker(null)}
          onQueued={(executionId) =>
            router.push(
              `/ai-workers/${runWorker.id}/executions?execution=${executionId}`,
            )
          }
        />
      )}
    </>
  );
}

function WorkerCard({
  worker,
  highlighted,
  onRun,
}: {
  worker: WorkerFeedItem;
  highlighted: boolean;
  onRun: () => void;
}) {
  const { toast } = useToast();
  const [deploy, deployState] = useDeployAIWorkerMutation();
  const [disable, disableState] = useDisableAIWorkerMutation();
  const busy = deployState.isLoading || disableState.isLoading;
  const changeStatus = async () => {
    try {
      if (worker.status === "deployed")
        await disable({
          workerId: worker.id,
          projectId: worker.project_id,
        }).unwrap();
      else
        await deploy({
          workerId: worker.id,
          projectId: worker.project_id,
        }).unwrap();
      toast({
        title: worker.status === "deployed" ? "Worker paused" : "Worker ready",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not update worker",
        description: errorDetail(error),
      });
    }
  };
  return (
    <Card
      className={`min-w-0 ${highlighted ? "border-primary/50" : ""}`}
      data-worker-id={worker.id}
    >
      <CardHeader className="flex min-w-0 flex-row items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
          <Bot aria-hidden="true" className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-semibold leading-6">
            {worker.name}
          </h2>
          <p
            className="mt-1 truncate text-xs text-muted-foreground"
            title={worker.project_name ?? "Workspace worker"}
          >
            {worker.project_name ?? "Workspace worker"}
          </p>
        </div>
        <Badge
          className="shrink-0"
          variant={worker.status === "deployed" ? "default" : "outline"}
        >
          {worker.status === "deployed"
            ? "Ready"
            : worker.status === "disabled"
              ? "Paused"
              : "Draft"}
        </Badge>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="line-clamp-3 break-words text-sm leading-6 text-muted-foreground">
          {worker.instructions}
        </p>
        <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Cloud aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{worker.model_name}</span>
        </p>
        <details className="rounded-lg border px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium">
            Worker configuration
          </summary>
          <dl className="mt-3 grid gap-2 text-muted-foreground">
            <div>
              <dt className="inline font-medium">Workspace: </dt>
              <dd className="inline">
                {worker.sandbox_mode === "docker"
                  ? "Isolated sandbox"
                  : "Project tools"}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Limits: </dt>
              <dd className="inline">
                {worker.max_steps} steps · $
                {(worker.max_cost_cents / 100).toFixed(2)} estimated budget
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Tools: </dt>
              <dd className="inline break-words">
                {worker.allowed_tools.length
                  ? worker.allowed_tools
                      .map((tool) => tool.replaceAll("_", " "))
                      .join(", ")
                  : "None"}
              </dd>
            </div>
          </dl>
        </details>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            disabled={worker.status !== "deployed" || busy}
            onClick={onRun}
          >
            <Play className="size-3.5" />
            Run task
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/work?worker=${encodeURIComponent(worker.id)}`}>
              <Sparkles className="size-3.5" />
              Work with agent
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/ai-workers/${worker.id}/executions`}
              aria-label={`View executions for ${worker.name}`}
            >
              <History className="size-3.5" />
              View executions
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/ai-workers/${worker.id}/edit`}
              aria-label={`Edit ${worker.name}`}
            >
              <Pencil className="size-3.5" />
              Edit
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={changeStatus}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : worker.status === "deployed" ? (
              <CircleStop className="size-3.5" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            {worker.status === "deployed" ? "Pause" : "Activate"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
