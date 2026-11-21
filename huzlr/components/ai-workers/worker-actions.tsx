"use client";
import { useState } from "react";
import { Check, CircleStop, Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useGetProjectIssuesQuery } from "@/services/issuesApi";
import {
  type AIWorker,
  type ExecutionStatus,
  useCancelWorkerExecutionMutation,
  useDecideWorkerApprovalMutation,
  useDispatchWorkerExecutionMutation,
  useGetWorkerExecutionQuery,
  useLazyGetWorkerArtifactQuery,
  useGetWorkerProjectsQuery,
} from "@/services/aiWorkersApi";
import { workerProjectName } from "./shared";

export function errorDetail(error: unknown) {
  if (typeof error === "object" && error && "data" in error) {
    const data = (
      error as { data?: { detail?: string | Array<{ msg?: string }> } }
    ).data;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail))
      return data.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(", ");
  }
  return "The request could not be completed.";
}

export function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed" || status === "deployed" || status === "active")
    return "default";
  if (status === "failed" || status === "disabled" || status === "revoked")
    return "destructive";
  if (status === "running" || status === "waiting_approval") return "secondary";
  return "outline";
}

export function RunDialog({
  open,
  onOpenChange,
  worker,
  onQueued,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: AIWorker;
  onQueued?: (executionId: string) => void;
}) {
  const { toast } = useToast();
  const [task, setTask] = useState("");
  const [taskId, setTaskId] = useState<string>("custom");
  const [chosenProject, setChosenProject] = useState("none");
  const projects = useGetWorkerProjectsQuery(
    { workspaceId: worker.workspace_id ?? 0, teamId: null },
    { skip: !open || !!worker.project_id || !worker.workspace_id },
  );
  const projectId =
    worker.project_id ??
    projects.currentData?.find(
      (project) => project.project_id.toString() === chosenProject,
    )?.project_id ??
    null;
  const issues = useGetProjectIssuesQuery(projectId ?? 0, {
    skip: !open || !projectId,
  });
  const selectedTask = issues.currentData?.some(
    (issue) => issue.id.toString() === taskId,
  )
    ? taskId
    : "custom";
  const [dispatch, state] = useDispatchWorkerExecutionMutation();
  const submit = async () => {
    try {
      const execution = await dispatch({
        workerId: worker.id,
        project_id: projectId ?? undefined,
        task_id: selectedTask === "custom" ? undefined : Number(selectedTask),
        task_description: task.trim() || undefined,
      }).unwrap();
      setTask("");
      setTaskId("custom");
      onOpenChange(false);
      toast({ title: "Execution queued" });
      onQueued?.(execution.id);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not queue execution",
        description: errorDetail(error),
      });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run {worker.name}</DialogTitle>
          <DialogDescription>
            The execution will use version {worker.version} in Huzlr Cloud.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {!worker.project_id && (
            <div className="grid gap-2">
              <Label htmlFor="run-worker-project">Project (optional)</Label>
              <Select
                value={projectId?.toString() ?? "none"}
                onValueChange={(value) => {
                  setChosenProject(value);
                  setTaskId("custom");
                }}
              >
                <SelectTrigger id="run-worker-project">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.currentData?.map((project) => (
                    <SelectItem
                      key={project.project_id}
                      value={project.project_id.toString()}
                    >
                      {workerProjectName(project)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose a project when this task needs access to its tasks.
              </p>
              {projects.isError && (
                <p role="alert" className="text-xs text-destructive">
                  Couldn’t load projects.{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => projects.refetch()}
                  >
                    Try again
                  </button>
                </p>
              )}
            </div>
          )}
          {projectId && (
            <div className="grid gap-2">
              <Label>Huzlr task</Label>
              <Select value={selectedTask} onValueChange={setTaskId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom task</SelectItem>
                  {issues.currentData?.map((issue) => (
                    <SelectItem key={issue.id} value={issue.id.toString()}>
                      #{issue.id} · {issue.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="task-description">
              {selectedTask === "custom"
                ? "Task"
                : "Additional instructions (optional)"}
            </Label>
            <Textarea
              id="task-description"
              className="min-h-32"
              placeholder={
                selectedTask === "custom"
                  ? "Describe the outcome the worker should produce…"
                  : "The linked task title and description are used automatically."
              }
              value={task}
              onChange={(event) => setTask(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              (selectedTask === "custom" && !task.trim()) || state.isLoading
            }
            onClick={submit}
          >
            {state.isLoading && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Queue task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExecutionDialog({
  worker,
  executionId,
  open,
  onOpenChange,
}: {
  worker: AIWorker;
  executionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const query = useGetWorkerExecutionQuery(
    { workerId: worker.id, executionId },
    { pollingInterval: 2000 },
  );
  const [cancel, cancelState] = useCancelWorkerExecutionMutation();
  const [decide, decideState] = useDecideWorkerApprovalMutation();
  const [loadArtifact, artifactState] = useLazyGetWorkerArtifactQuery();
  const downloadArtifact = async (path: string) => {
    try {
      const artifact = await loadArtifact({
        workerId: worker.id,
        executionId,
        path,
      }).unwrap();
      const bytes = Uint8Array.from(
        atob(artifact.content_base64),
        (character) => character.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/octet-stream" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = path.split("/").pop() || "artifact";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not download artifact",
        description: errorDetail(error),
      });
    }
  };
  const execution = query.currentData;
  const pending = execution?.approvals.find(
    (approval) => approval.status === "pending",
  );
  const decideApproval = async (decision: "approved" | "rejected") => {
    if (!pending) return;
    try {
      await decide({
        workerId: worker.id,
        executionId,
        approvalId: pending.id,
        decision,
      }).unwrap();
      toast({
        title: decision === "approved" ? "Action approved" : "Action rejected",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not record decision",
        description: errorDetail(error),
      });
    }
  };
  const cancelExecution = async () => {
    try {
      await cancel({ workerId: worker.id, executionId }).unwrap();
      toast({ title: "Cancellation requested" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not cancel execution",
        description: errorDetail(error),
      });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Execution{" "}
            <span className="font-mono text-sm text-muted-foreground">
              {executionId.slice(0, 8)}
            </span>
            {execution && (
              <Badge variant={statusVariant(execution.status)}>
                {execution.status.replace("_", " ")}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Events are persisted in order and refreshed while this dialog is
            open.
          </DialogDescription>
        </DialogHeader>
        {!execution && query.isError ? (
          <div
            role="alert"
            className="flex min-h-48 flex-col items-center justify-center gap-3 text-center"
          >
            <p className="text-sm">We couldn’t load this execution.</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        ) : !execution ? (
          <div
            role="status"
            aria-label="Loading execution"
            className="flex min-h-48 items-center justify-center"
          >
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs font-medium text-muted-foreground">Task</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                {execution.task_description}
              </p>
            </div>
            {pending && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="size-4" />
                  Approval required
                </div>
                <p className="mt-2 text-sm">
                  Allow <code>{pending.tool_name}</code> with these arguments?
                </p>
                <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-xs">
                  {JSON.stringify(pending.arguments, null, 2)}
                </pre>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    disabled={decideState.isLoading}
                    onClick={() => decideApproval("approved")}
                  >
                    <Check className="mr-2 size-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decideState.isLoading}
                    onClick={() => decideApproval("rejected")}
                  >
                    <X className="mr-2 size-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
            {execution.result && (
              <div>
                <p className="text-sm font-medium">Result</p>
                <pre className="mt-2 max-h-56 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                  {JSON.stringify(execution.result, null, 2)}
                </pre>
              </div>
            )}
            {execution.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {execution.error}
              </div>
            )}
            {!!execution.artifacts?.length && (
              <div>
                <p className="text-sm font-medium">Workspace files</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {execution.artifacts.map((path) => (
                    <Button
                      key={path}
                      variant="outline"
                      size="sm"
                      className="max-w-full"
                      title={path}
                      disabled={artifactState.isFetching}
                      onClick={() => downloadArtifact(path)}
                    >
                      <span className="truncate">Download {path}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Event timeline</p>
                <span className="text-xs text-muted-foreground">
                  {execution.events.length} events
                </span>
              </div>
              <div className="mt-2 divide-y rounded-lg border">
                {execution.events.map((event) => (
                  <div
                    key={event.id}
                    className="grid gap-1 p-3 sm:grid-cols-[160px_1fr]"
                  >
                    <div>
                      <p className="text-xs font-medium">{event.event_type}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                    <pre className="overflow-x-auto text-xs text-muted-foreground whitespace-pre-wrap">
                      {Object.keys(event.payload).length
                        ? JSON.stringify(event.payload, null, 2)
                        : "—"}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          {execution &&
            !["completed", "failed", "cancelled"].includes(
              execution.status,
            ) && (
              <Button
                variant="destructive"
                disabled={cancelState.isLoading}
                onClick={cancelExecution}
              >
                <CircleStop className="mr-2 size-4" />
                Cancel execution
              </Button>
            )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StatusDot({ status }: { status: ExecutionStatus }) {
  const color =
    status === "completed"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-destructive"
        : status === "running"
          ? "bg-blue-500 animate-pulse"
          : status === "waiting_approval"
            ? "bg-amber-500"
            : "bg-muted-foreground";
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2.5 shrink-0 rounded-full ${color}`}
    />
  );
}
