"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfiniteScroll } from "@/components/ai-workers/infinite-scroll";
import {
  ExecutionDialog,
  RunDialog,
  StatusDot,
  statusVariant,
} from "@/components/ai-workers/worker-actions";
import {
  useGetAIWorkerQuery,
  useGetExecutionFeedInfiniteQuery,
} from "@/services/aiWorkersApi";

export default function WorkerExecutionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <WorkerExecutions />
    </Suspense>
  );
}

function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading executions"
      className="flex min-h-64 items-center justify-center"
    >
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}

function WorkerExecutions() {
  const { workerId } = useParams<{ workerId: string }>();
  // Keep modal state local to the worker when following another worker's URL.
  return <ExecutionHistory key={workerId} workerId={workerId} />;
}

function ExecutionHistory({ workerId }: { workerId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [runOpen, setRunOpen] = useState(false);
  const workerQuery = useGetAIWorkerQuery(workerId);
  const worker = workerQuery.currentData;
  const query = useGetExecutionFeedInfiniteQuery(workerId, {
    skip: !worker,
    refetchOnMountOrArgChange: 30,
    refetchOnFocus: true,
  });
  const executions = Array.from(
    new Map(
      query.currentData?.pages
        .flatMap((page) => page.items)
        .map((execution) => [execution.id, execution]) ?? [],
    ).values(),
  );
  const openExecution = (id: string) =>
    router.push(`${pathname}?execution=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  const selectedExecution = params.get("execution");
  const nextPageError = query.isError && query.direction === "forward";

  return (
    <>
      <div className="shrink-0">
        <SiteHeader>
          <Button asChild variant="outline" size="sm">
            <Link href="/ai-workers">
              <ArrowLeft className="size-3.5" />
              Back to workers
            </Link>
          </Button>
        </SiteHeader>
      </div>
      <main
        className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-5 lg:px-6"
        aria-label="Worker executions"
      >
        {workerQuery.isError && !worker ? (
          <div role="alert" className="rounded-xl border p-6 text-center">
            <p className="font-medium">We couldn’t open this worker</p>
            <p className="mt-2 text-sm text-muted-foreground">
              It may be unavailable, or you may not have access.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => workerQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : !worker ? (
          <Loading />
        ) : (
          <>
            <div className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Execution history
                </p>
                <h1 className="mt-1 break-words text-xl font-semibold tracking-tight">
                  {worker.name}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tasks, results, and actions waiting for your approval.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={query.isFetching || !query.currentData}
                  onClick={() => query.refetch()}
                >
                  <RefreshCw
                    className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  disabled={worker.status !== "deployed"}
                  onClick={() => setRunOpen(true)}
                >
                  <Play className="size-3.5" />
                  Run task
                </Button>
              </div>
            </div>
            {worker.status !== "deployed" && (
              <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                Activate this worker from AI Workers to run a new task.
              </p>
            )}
            {!query.currentData && !query.isError ? (
              <Loading />
            ) : query.isError && !query.currentData ? (
              <div role="alert" className="rounded-xl border p-6 text-center">
                <p>We couldn’t load execution history.</p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => query.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : !executions.length ? (
              <section className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center">
                <h2 className="font-medium">No executions yet</h2>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  Run a task to see its progress, approvals, and results here.
                </p>
                {worker.status === "deployed" && (
                  <Button size="sm" onClick={() => setRunOpen(true)}>
                    <Play className="size-3.5" />
                    Run your first task
                  </Button>
                )}
              </section>
            ) : (
              <>
                {query.isError && !nextPageError && (
                  <p role="alert" className="rounded-lg border p-3 text-sm">
                    We couldn’t refresh execution history. Your current list is
                    still here. Use Refresh to try again.
                  </p>
                )}
                <ul
                  aria-label="Executions"
                  className="min-w-0 divide-y rounded-xl border"
                >
                  {executions.map((execution) => (
                    <li
                      key={execution.id}
                      className="min-w-0"
                      data-execution-id={execution.id}
                    >
                      <button
                        onClick={() => openExecution(execution.id)}
                        className="flex w-full min-w-0 items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px] sm:items-center"
                      >
                        <span className="mt-1.5 shrink-0 sm:mt-0">
                          <StatusDot status={execution.status} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 break-words text-sm font-medium">
                            {execution.task_description}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(execution.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            variant={statusVariant(execution.status)}
                            className={
                              execution.status === "waiting_approval"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                : ""
                            }
                          >
                            {execution.status === "waiting_approval"
                              ? "Needs approval"
                              : execution.status.replaceAll("_", " ")}
                          </Badge>
                          <ArrowUpRight
                            aria-hidden="true"
                            className="hidden size-4 text-muted-foreground sm:block"
                          />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <InfiniteScroll
                  count={executions.length}
                  hasMore={query.hasNextPage}
                  fetching={query.isFetching}
                  error={query.isError}
                  loadMore={query.fetchNextPage}
                />
              </>
            )}
          </>
        )}
      </main>
      {worker && (
        <RunDialog
          worker={worker}
          open={runOpen}
          onOpenChange={setRunOpen}
          onQueued={openExecution}
        />
      )}
      {worker && selectedExecution && (
        <ExecutionDialog
          worker={worker}
          executionId={selectedExecution}
          open
          onOpenChange={(open) =>
            !open && router.replace(pathname, { scroll: false })
          }
        />
      )}
    </>
  );
}
