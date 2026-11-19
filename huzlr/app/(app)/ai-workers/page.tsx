"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bot,
  Check,
  CircleStop,
  Cloud,
  Copy,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  X,
} from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchProjects } from "@/lib/redux/slices/projectSlice"
import { useGetProjectIssuesQuery } from "@/services/issuesApi"
import {
  AIWorker,
  AIWorkerInput,
  ExecutionStatus,
  useCancelWorkerExecutionMutation,
  useCreateAIWorkerMutation,
  useCreateWorkerNodeMutation,
  useDecideWorkerApprovalMutation,
  useDeployAIWorkerMutation,
  useDisableAIWorkerMutation,
  useDispatchWorkerExecutionMutation,
  useGetAIWorkersQuery,
  useGetWorkerExecutionQuery,
  useGetWorkerExecutionsQuery,
  useGetWorkerNodesQuery,
  useGetWorkerToolsQuery,
  useRevokeWorkerNodeMutation,
} from "@/services/aiWorkersApi"

const DEFAULT_WORKER: Omit<AIWorkerInput, "project_id"> = {
  name: "",
  instructions: "Complete the assigned project task accurately. Use tools only when needed and explain the verified outcome.",
  model_provider: "gemini",
  model_name: "gemini-2.5-flash",
  deployment_kind: "cloud",
  allowed_tools: ["get_task", "list_project_tasks"],
  max_steps: 12,
  max_cost_cents: 100,
}

function projectName(project: { project_id: number; properties?: unknown }) {
  const properties = (project.properties || {}) as Record<string, unknown>
  return String(properties.project_title || properties.title || `Project ${project.project_id}`)
}

function errorDetail(error: unknown) {
  if (typeof error === "object" && error && "data" in error) {
    const data = (error as { data?: { detail?: string | Array<{ msg?: string }> } }).data
    if (typeof data?.detail === "string") return data.detail
    if (Array.isArray(data?.detail)) return data.detail.map((item) => item.msg).filter(Boolean).join(", ")
  }
  return "The request could not be completed."
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed" || status === "deployed" || status === "active") return "default"
  if (status === "failed" || status === "disabled" || status === "revoked") return "destructive"
  if (status === "running" || status === "waiting_approval") return "secondary"
  return "outline"
}

export default function AIWorkersPage() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const projects = useAppSelector((state) => state.projects.items)
  const projectsLoading = useAppSelector((state) => state.projects.loading)
  const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
  const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
  const [projectId, setProjectId] = useState<number | null>(null)
  const [workerId, setWorkerId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [runOpen, setRunOpen] = useState(false)
  const [nodeOpen, setNodeOpen] = useState(false)
  const [executionId, setExecutionId] = useState<string | null>(null)

  useEffect(() => {
    if (activeTeamId) dispatch(fetchProjects({ workspaceId: activeWorkspaceId, teamId: activeTeamId }))
  }, [activeTeamId, activeWorkspaceId, dispatch])

  useEffect(() => {
    if (!projectId || !projects.some((project) => project.project_id === projectId)) {
      setProjectId(projects[0]?.project_id ?? null)
    }
  }, [projectId, projects])

  const workersQuery = useGetAIWorkersQuery(projectId ?? 0, { skip: !projectId, pollingInterval: 5000 })
  const workers = workersQuery.data ?? []
  useEffect(() => {
    if (!workerId || !workers.some((worker) => worker.id === workerId)) setWorkerId(workers[0]?.id ?? null)
  }, [workerId, workers])
  const selectedWorker = workers.find((worker) => worker.id === workerId) ?? null

  return (
    <>
      <SiteHeader>
        <Button variant="outline" size="sm" className="gap-2" disabled={!projectId} onClick={() => setNodeOpen(true)}>
          <Server className="size-3.5" /> Worker nodes
        </Button>
        <Button size="sm" className="gap-2" disabled={!projectId} onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" /> Create worker
        </Button>
      </SiteHeader>
      <main className="flex flex-1 flex-col gap-5 px-4 py-5 lg:px-6">
        <div className="flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-lg font-semibold">AI Workers</h1>
            <p className="mt-1 text-sm text-muted-foreground">Deploy bounded agents, assign tasks, inspect every action, and approve sensitive changes.</p>
          </div>
          <Select value={projectId?.toString() || ""} onValueChange={(value) => { setProjectId(Number(value)); setWorkerId(null) }}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select project" /></SelectTrigger>
            <SelectContent>{projects.map((project) => <SelectItem key={project.project_id} value={project.project_id.toString()}>{projectName(project)}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {projectsLoading && !projects.length ? (
          <div className="flex min-h-56 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : !projectId ? (
          <Empty title="Select or create a project" description="AI Workers are scoped to a project and inherit its access controls." />
        ) : workersQuery.isLoading ? (
          <div className="flex min-h-56 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : workersQuery.isError ? (
          <Empty title="Could not load workers" description="Check the backend connection and database migration." />
        ) : workers.length === 0 ? (
          <Empty title="No workers yet" description="Create a worker, choose its permissions, then deploy it." action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-2 size-4" />Create worker</Button>} />
        ) : (
          <div className="grid min-h-[560px] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-2">
              {workers.map((worker) => (
                <button key={worker.id} onClick={() => setWorkerId(worker.id)} className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${worker.id === workerId ? "border-foreground/30 bg-muted/50" : ""}`}>
                  <div className="flex items-start justify-between gap-3"><span className="font-medium">{worker.name}</span><Badge variant={statusVariant(worker.status)}>{worker.status}</Badge></div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">{worker.deployment_kind === "cloud" ? <Cloud className="size-3.5" /> : <Server className="size-3.5" />}{worker.model_name}</div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{worker.instructions}</p>
                </button>
              ))}
            </div>
            {selectedWorker && <WorkerPanel worker={selectedWorker} onRun={() => setRunOpen(true)} onExecution={setExecutionId} />}
          </div>
        )}
      </main>

      {projectId && <CreateWorkerDialog open={createOpen} onOpenChange={setCreateOpen} projectId={projectId} />}
      {selectedWorker && <RunDialog open={runOpen} onOpenChange={setRunOpen} worker={selectedWorker} />}
      {projectId && <NodesDialog open={nodeOpen} onOpenChange={setNodeOpen} projectId={projectId} />}
      {selectedWorker && executionId && <ExecutionDialog worker={selectedWorker} executionId={executionId} open={Boolean(executionId)} onOpenChange={(open) => !open && setExecutionId(null)} />}
    </>
  )
}

function WorkerPanel({ worker, onRun, onExecution }: { worker: AIWorker; onRun: () => void; onExecution: (id: string) => void }) {
  const { toast } = useToast()
  const executions = useGetWorkerExecutionsQuery(worker.id, { pollingInterval: 3000 })
  const [deploy, deployState] = useDeployAIWorkerMutation()
  const [disable, disableState] = useDisableAIWorkerMutation()

  const changeStatus = async () => {
    try {
      if (worker.status === "deployed") await disable({ workerId: worker.id, projectId: worker.project_id }).unwrap()
      else await deploy({ workerId: worker.id, projectId: worker.project_id }).unwrap()
      toast({ title: worker.status === "deployed" ? "Worker disabled" : "Worker deployed" })
    } catch (error) {
      toast({ variant: "destructive", title: "Could not update worker", description: errorDetail(error) })
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div><CardTitle className="text-base">{worker.name}</CardTitle><CardDescription className="mt-1">Version {worker.version} · {worker.model_provider} / {worker.model_name}</CardDescription></div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={deployState.isLoading || disableState.isLoading} onClick={changeStatus}>{worker.status === "deployed" ? <><CircleStop className="mr-2 size-3.5" />Disable</> : <><ShieldCheck className="mr-2 size-3.5" />Deploy</>}</Button>
            <Button size="sm" disabled={worker.status !== "deployed"} onClick={onRun}><Play className="mr-2 size-3.5" />Run task</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
          <Info label="Environment" value={worker.deployment_kind === "cloud" ? "Huzlr Cloud" : "Customer hosted"} />
          <Info label="Limits" value={`${worker.max_steps} steps · $${(worker.max_cost_cents / 100).toFixed(2)}`} />
          <Info label="Tools" value={worker.allowed_tools.length ? worker.allowed_tools.join(", ") : "No tools"} />
          <div className="sm:col-span-3"><p className="text-xs font-medium text-muted-foreground">Instructions</p><p className="mt-1 whitespace-pre-wrap leading-6">{worker.instructions}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Executions</CardTitle><CardDescription className="mt-1">Live status and audit history</CardDescription></div>{executions.isFetching && <RefreshCw className="size-4 animate-spin text-muted-foreground" />}</CardHeader>
        <CardContent>
          {!executions.data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No executions yet.</p> : <div className="divide-y rounded-lg border">{executions.data.map((execution) => (
            <button key={execution.id} onClick={() => onExecution(execution.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50">
              <StatusDot status={execution.status} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{execution.task_description}</p><p className="mt-0.5 text-xs text-muted-foreground">{new Date(execution.created_at).toLocaleString()}</p></div>
              <Badge variant={statusVariant(execution.status)}>{execution.status.replace("_", " ")}</Badge>
            </button>
          ))}</div>}
        </CardContent>
      </Card>
    </div>
  )
}

function CreateWorkerDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (open: boolean) => void; projectId: number }) {
  const { toast } = useToast()
  const [draft, setDraft] = useState(DEFAULT_WORKER)
  const tools = useGetWorkerToolsQuery()
  const [create, state] = useCreateAIWorkerMutation()
  useEffect(() => { if (!open) setDraft(DEFAULT_WORKER) }, [open])
  const submit = async () => {
    try {
      await create({ project_id: projectId, ...draft }).unwrap()
      toast({ title: "Worker created", description: "Review its policy, then deploy it when ready." })
      onOpenChange(false)
    } catch (error) { toast({ variant: "destructive", title: "Could not create worker", description: errorDetail(error) }) }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Create AI Worker</DialogTitle><DialogDescription>Define behavior, execution environment, tools, and hard limits.</DialogDescription></DialogHeader><div className="grid gap-5 py-2">
    <div className="grid gap-2"><Label htmlFor="worker-name">Name</Label><Input id="worker-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Project delivery worker" /></div>
    <div className="grid gap-2"><Label htmlFor="worker-instructions">Instructions</Label><Textarea id="worker-instructions" className="min-h-28" value={draft.instructions} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label>Provider</Label><Select value={draft.model_provider} onValueChange={(value) => setDraft({ ...draft, model_provider: value as AIWorkerInput["model_provider"], model_name: value === "gemini" ? "gemini-2.5-flash" : value === "test" ? "stub" : "gpt-4.1-mini" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gemini">Gemini</SelectItem><SelectItem value="openai">OpenAI</SelectItem><SelectItem value="openai_compatible">OpenAI compatible</SelectItem><SelectItem value="test">Test adapter</SelectItem></SelectContent></Select></div>
      <div className="grid gap-2"><Label htmlFor="model-name">Model</Label><Input id="model-name" value={draft.model_name} onChange={(event) => setDraft({ ...draft, model_name: event.target.value })} /></div>
      <div className="grid gap-2"><Label>Environment</Label><Select value={draft.deployment_kind} onValueChange={(value) => setDraft({ ...draft, deployment_kind: value as AIWorkerInput["deployment_kind"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cloud">Huzlr Cloud</SelectItem><SelectItem value="customer_hosted">Customer hosted</SelectItem></SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label htmlFor="max-steps">Max steps</Label><Input id="max-steps" type="number" min={1} max={100} value={draft.max_steps} onChange={(event) => setDraft({ ...draft, max_steps: Number(event.target.value) })} /></div><div className="grid gap-2"><Label htmlFor="max-cost">Max cost ($)</Label><Input id="max-cost" type="number" min={0.01} step={0.01} value={draft.max_cost_cents / 100} onChange={(event) => setDraft({ ...draft, max_cost_cents: Math.max(1, Math.round(Number(event.target.value) * 100)) })} /></div></div>
    </div>
    <div><Label>Allowed tools</Label><div className="mt-2 space-y-2 rounded-lg border p-3">{tools.data?.map((tool) => <label key={tool.name} className="flex items-start gap-3"><Checkbox checked={draft.allowed_tools.includes(tool.name)} onCheckedChange={(checked) => setDraft({ ...draft, allowed_tools: checked ? [...draft.allowed_tools, tool.name] : draft.allowed_tools.filter((name) => name !== tool.name) })} /><span><span className="flex items-center gap-2 text-sm font-medium">{tool.name}{tool.requires_approval && <Badge variant="secondary">Approval required</Badge>}</span><span className="text-xs text-muted-foreground">{tool.description}</span></span></label>)}</div></div>
  </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!draft.name.trim() || !draft.instructions.trim() || state.isLoading} onClick={submit}>{state.isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}Create worker</Button></DialogFooter></DialogContent></Dialog>
}

function RunDialog({ open, onOpenChange, worker }: { open: boolean; onOpenChange: (open: boolean) => void; worker: AIWorker }) {
  const { toast } = useToast()
  const [task, setTask] = useState("")
  const [taskId, setTaskId] = useState<string>("custom")
  const issues = useGetProjectIssuesQuery(worker.project_id, { skip: !open })
  const [dispatch, state] = useDispatchWorkerExecutionMutation()
  const submit = async () => { try { await dispatch({ workerId: worker.id, task_id: taskId === "custom" ? undefined : Number(taskId), task_description: task.trim() || undefined }).unwrap(); setTask(""); setTaskId("custom"); onOpenChange(false); toast({ title: "Execution queued" }) } catch (error) { toast({ variant: "destructive", title: "Could not queue execution", description: errorDetail(error) }) } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Run {worker.name}</DialogTitle><DialogDescription>The execution will use version {worker.version} in {worker.deployment_kind === "cloud" ? "Huzlr Cloud" : "your customer-hosted node"}.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-2"><Label>Huzlr task</Label><Select value={taskId} onValueChange={setTaskId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="custom">Custom task</SelectItem>{issues.data?.map((issue) => <SelectItem key={issue.id} value={issue.id.toString()}>#{issue.id} · {issue.title}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="task-description">{taskId === "custom" ? "Task" : "Additional instructions (optional)"}</Label><Textarea id="task-description" className="min-h-32" placeholder={taskId === "custom" ? "Describe the outcome the worker should produce…" : "The linked task title and description are used automatically."} value={task} onChange={(event) => setTask(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={(taskId === "custom" && !task.trim()) || state.isLoading} onClick={submit}>{state.isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}Queue task</Button></DialogFooter></DialogContent></Dialog>
}

function ExecutionDialog({ worker, executionId, open, onOpenChange }: { worker: AIWorker; executionId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast()
  const query = useGetWorkerExecutionQuery({ workerId: worker.id, executionId }, { pollingInterval: 2000 })
  const [cancel, cancelState] = useCancelWorkerExecutionMutation()
  const [decide, decideState] = useDecideWorkerApprovalMutation()
  const execution = query.data
  const pending = execution?.approvals.find((approval) => approval.status === "pending")
  const decideApproval = async (decision: "approved" | "rejected") => { if (!pending) return; try { await decide({ workerId: worker.id, executionId, approvalId: pending.id, decision }).unwrap(); toast({ title: decision === "approved" ? "Action approved" : "Action rejected" }) } catch (error) { toast({ variant: "destructive", title: "Could not record decision", description: errorDetail(error) }) } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle className="flex items-center gap-2">Execution <span className="font-mono text-sm text-muted-foreground">{executionId.slice(0, 8)}</span>{execution && <Badge variant={statusVariant(execution.status)}>{execution.status.replace("_", " ")}</Badge>}</DialogTitle><DialogDescription>Events are persisted in order and refreshed while this dialog is open.</DialogDescription></DialogHeader>{!execution ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="size-5 animate-spin" /></div> : <div className="space-y-5">
    <div className="rounded-lg bg-muted/50 p-4"><p className="text-xs font-medium text-muted-foreground">Task</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{execution.task_description}</p></div>
    {pending && <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4"><div className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4" />Approval required</div><p className="mt-2 text-sm">Allow <code>{pending.tool_name}</code> with these arguments?</p><pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-xs">{JSON.stringify(pending.arguments, null, 2)}</pre><div className="mt-3 flex gap-2"><Button size="sm" disabled={decideState.isLoading} onClick={() => decideApproval("approved")}><Check className="mr-2 size-3.5" />Approve</Button><Button size="sm" variant="outline" disabled={decideState.isLoading} onClick={() => decideApproval("rejected")}><X className="mr-2 size-3.5" />Reject</Button></div></div>}
    {execution.result && <div><p className="text-sm font-medium">Result</p><pre className="mt-2 max-h-56 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">{JSON.stringify(execution.result, null, 2)}</pre></div>}
    {execution.error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{execution.error}</div>}
    <div><div className="flex items-center justify-between"><p className="text-sm font-medium">Event timeline</p><span className="text-xs text-muted-foreground">{execution.events.length} events</span></div><div className="mt-2 divide-y rounded-lg border">{execution.events.map((event) => <div key={event.id} className="grid gap-1 p-3 sm:grid-cols-[160px_1fr]"><div><p className="text-xs font-medium">{event.event_type}</p><p className="text-[11px] text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p></div><pre className="overflow-x-auto text-xs text-muted-foreground whitespace-pre-wrap">{Object.keys(event.payload).length ? JSON.stringify(event.payload, null, 2) : "—"}</pre></div>)}</div></div>
  </div>}<DialogFooter>{execution && !["completed", "failed", "cancelled"].includes(execution.status) && <Button variant="destructive" disabled={cancelState.isLoading} onClick={() => cancel({ workerId: worker.id, executionId })}><CircleStop className="mr-2 size-4" />Cancel execution</Button>}<Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
}

function NodesDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (open: boolean) => void; projectId: number }) {
  const { toast } = useToast()
  const query = useGetWorkerNodesQuery(projectId, { skip: !open })
  const [name, setName] = useState("")
  const [token, setToken] = useState<string | null>(null)
  const [create, createState] = useCreateWorkerNodeMutation()
  const [revoke] = useRevokeWorkerNodeMutation()
  const createNode = async () => { try { const result = await create({ project_id: projectId, name }).unwrap(); setToken(result.token); setName("") } catch (error) { toast({ variant: "destructive", title: "Could not create node", description: errorDetail(error) }) } }
  const copy = async () => { if (token) { await navigator.clipboard.writeText(token); toast({ title: "Node token copied" }) } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Customer-hosted worker nodes</DialogTitle><DialogDescription>Nodes connect outbound and keep model credentials in your environment.</DialogDescription></DialogHeader>{token && <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4"><p className="text-sm font-medium">Copy this token now</p><p className="mt-1 text-xs text-muted-foreground">It is stored as a digest and cannot be shown again.</p><div className="mt-3 flex gap-2"><Input readOnly value={token} className="font-mono text-xs" /><Button variant="outline" size="icon" onClick={copy}><Copy className="size-4" /></Button></div></div>}<div className="flex gap-2"><Input placeholder="Node name" value={name} onChange={(event) => setName(event.target.value)} /><Button disabled={!name.trim() || createState.isLoading} onClick={createNode}><Plus className="mr-2 size-4" />Enroll</Button></div><Separator />{query.isLoading ? <Loader2 className="mx-auto size-5 animate-spin" /> : !query.data?.length ? <p className="py-6 text-center text-sm text-muted-foreground">No nodes enrolled.</p> : <div className="divide-y rounded-lg border">{query.data.map((node) => <div key={node.id} className="flex items-center gap-3 p-3"><Server className="size-4 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{node.name}</p><p className="text-xs text-muted-foreground">{node.last_seen_at ? `Last seen ${new Date(node.last_seen_at).toLocaleString()}` : "Never connected"}</p></div><Badge variant={statusVariant(node.status)}>{node.status}</Badge>{node.status === "active" && <Button size="sm" variant="ghost" onClick={() => revoke({ nodeId: node.id, projectId })}>Revoke</Button>}</div>)}</div>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 break-words">{value}</p></div> }
function StatusDot({ status }: { status: ExecutionStatus }) { const color = status === "completed" ? "bg-emerald-500" : status === "failed" ? "bg-destructive" : status === "running" ? "bg-blue-500 animate-pulse" : status === "waiting_approval" ? "bg-amber-500" : "bg-muted-foreground"; return <span className={`size-2.5 shrink-0 rounded-full ${color}`} /> }
function Empty({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center"><Bot className="mb-3 size-8 text-muted-foreground" /><p className="font-medium">{title}</p><p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div> }
