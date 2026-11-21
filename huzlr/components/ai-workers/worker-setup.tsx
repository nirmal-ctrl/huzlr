"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Bot,
  BrainCircuit,
  ChevronRight,
  Clock3,
  Cloud,
  Cpu,
  GitBranch,
  Loader2,
  LockKeyhole,
  MessageSquare,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { useWorkerWorkspace, workerError } from "./shared";
import {
  useCreateAIWorkerMutation,
  useGetAIWorkerQuery,
  useGetWorkerToolsQuery,
  useGetWorkerCapabilitiesQuery,
  useUpdateAIWorkerMutation,
  type AIWorkerInput,
} from "@/services/aiWorkersApi";

const sections = [
  {
    id: "identity",
    title: "Identity & instructions",
    icon: Bot,
    description: "Give your worker a name and a purpose.",
  },
  {
    id: "model",
    title: "Models & runtime",
    icon: Cpu,
    description: "Choose the intelligence behind your worker.",
  },
  {
    id: "tools",
    title: "Tools & permissions",
    icon: Wrench,
    description: "Decide what your worker can access and change.",
  },
  {
    id: "deployment",
    title: "Deployment & workspace",
    icon: Cloud,
    description: "Configure your worker’s cloud workspace.",
  },
  {
    id: "memory",
    title: "Memory & context",
    icon: BrainCircuit,
    description: "Shape what your worker remembers.",
    upcoming: true,
  },
  {
    id: "skills",
    title: "Skills & files",
    icon: Sparkles,
    description: "Teach repeatable workflows and working conventions.",
    upcoming: true,
  },
  {
    id: "integrations",
    title: "Plugins & MCP",
    icon: Plug,
    description: "Connect your worker to more capabilities.",
    upcoming: true,
  },
  {
    id: "channels",
    title: "Channels & routing",
    icon: MessageSquare,
    description: "Choose where conversations reach your worker.",
    upcoming: true,
  },
  {
    id: "automation",
    title: "Schedules & triggers",
    icon: Clock3,
    description: "Let your worker run at the right time.",
    upcoming: true,
  },
  {
    id: "delegation",
    title: "Subagents",
    icon: GitBranch,
    description: "Let specialists collaborate on a task.",
    upcoming: true,
  },
  {
    id: "limits",
    title: "Limits & behavior",
    icon: SlidersHorizontal,
    description: "Set the boundaries for each run.",
  },
] as const;
type SectionId = (typeof sections)[number]["id"];

const initial: Omit<AIWorkerInput, "project_id" | "workspace_id"> = {
  name: "",
  instructions: "",
  model_provider: "gemini",
  model_name: "gemini-2.5-flash",
  deployment_kind: "cloud",
  allowed_tools: ["get_task", "list_project_tasks"],
  max_steps: 12,
  max_cost_cents: 100,
  sandbox_mode: "off",
  max_runtime_seconds: 600,
};

const toolLabels: Record<string, { title: string; description: string }> = {
  list_files: {
    title: "Browse workspace files",
    description: "List files in the worker’s isolated workspace.",
  },
  read_file: {
    title: "Read workspace files",
    description: "Read text files inside the workspace.",
  },
  write_file: {
    title: "Write workspace files",
    description: "Create or edit workspace files after your approval.",
  },
  run_command: {
    title: "Run terminal commands",
    description:
      "Run commands inside the isolated workspace after your approval.",
  },
  get_task: {
    title: "Read assigned tasks",
    description: "Read task details in the project assigned to each run.",
  },
  list_project_tasks: {
    title: "Browse project tasks",
    description: "See the project’s task list and current statuses.",
  },
  update_task_status: {
    title: "Update task status",
    description: "Propose status changes for a person to approve.",
  },
};

export function WorkerSetup({ workerId }: { workerId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { workspaceId } = useWorkerWorkspace();
  const [active, setActive] = useState<SectionId>("identity");
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [create, createState] = useCreateAIWorkerMutation();
  const [updateWorker, updateState] = useUpdateAIWorkerMutation();
  const workerQuery = useGetAIWorkerQuery(workerId ?? "", { skip: !workerId });
  const loadedWorker = useRef<string | null>(null);
  const tools = useGetWorkerToolsQuery();
  const capabilities = useGetWorkerCapabilitiesQuery();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const submitting = useRef(false);
  const section = sections.find((item) => item.id === active)!;
  const currentIndex = sections.findIndex((item) => item.id === active);
  const isUpcoming = "upcoming" in section;
  const returnUrl = "/ai-workers";
  const ready = Boolean(
    workspaceId &&
      (!workerId || workerQuery.currentData) &&
      draft.name.trim() &&
      draft.instructions.trim() &&
      draft.model_name.trim() &&
      Number.isInteger(draft.max_steps) &&
      draft.max_steps >= 1 &&
      draft.max_steps <= 100 &&
      Number.isInteger(draft.max_cost_cents) &&
      draft.max_cost_cents >= 1 &&
      draft.max_cost_cents <= 100000 &&
      Number.isInteger(draft.max_runtime_seconds) &&
      draft.max_runtime_seconds >= 30 &&
      draft.max_runtime_seconds <= 1800 &&
      (draft.sandbox_mode === "off" || capabilities.data?.managed_sandbox),
  );
  const update = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => setDraft((previous) => ({ ...previous, [key]: value }));

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (draft.name || draft.instructions) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draft.name, draft.instructions]);

  useEffect(() => {
    const worker = workerQuery.currentData;
    if (!worker || loadedWorker.current === worker.id) return;
    loadedWorker.current = worker.id;
    setDraft({
      name: worker.name,
      instructions: worker.instructions,
      model_provider: worker.model_provider,
      model_name: worker.model_name,
      deployment_kind: worker.deployment_kind,
      allowed_tools: worker.allowed_tools,
      max_steps: worker.max_steps,
      max_cost_cents: worker.max_cost_cents,
      sandbox_mode: worker.sandbox_mode,
      max_runtime_seconds: worker.max_runtime_seconds,
    });
  }, [workerQuery.currentData]);

  const navigate = (id: SectionId) => {
    setActive(id);
    requestAnimationFrame(() => {
      if (contentRef.current) contentRef.current.scrollTop = 0;
      navigationRef.current
        ?.querySelector<HTMLElement>('[aria-current="step"]')
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      titleRef.current?.focus({ preventScroll: true });
    });
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || !workspaceId || submitting.current) return;
    submitting.current = true;
    setError(null);
    try {
      const values = {
        ...draft,
        name: draft.name.trim(),
        instructions: draft.instructions.trim(),
        model_name: draft.model_name.trim(),
      };
      const worker = workerId
        ? await updateWorker({
            workerId,
            updates: values,
            projectId: workerQuery.currentData?.project_id ?? null,
          }).unwrap()
        : await create({ ...values, workspace_id: workspaceId }).unwrap();
      toast({
        title: workerId ? "Worker updated" : "Worker created",
        description: workerId
          ? "Your changes are saved. Activate the new version when you’re ready."
          : "Your worker is a draft. Deploy it when you’re ready.",
      });
      router.push(`/ai-workers?worker=${worker.id}`);
    } catch (failure) {
      submitting.current = false;
      setError(workerError(failure));
    }
  };

  return (
    <div
      data-lenis-prevent
      className="flex h-svh min-h-0 min-w-0 flex-col gap-0 overflow-hidden bg-slate-50/80 md:h-[calc(100svh-1rem)] md:rounded-xl dark:bg-background"
    >
      <div className="z-20 shrink-0 bg-background">
        <SiteHeader>
          <Button asChild variant="ghost" size="sm">
            <Link href={returnUrl}>
              <ArrowLeft className="size-3.5" />
              All workers
            </Link>
          </Button>
        </SiteHeader>
      </div>
      <form
        onSubmit={save}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <header className="shrink-0 border-b border-border/70 bg-white px-4 py-4 sm:py-5 lg:px-8 dark:bg-background">
          <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 sm:items-center">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                {workerId ? "Edit worker" : "Create a worker"}
              </h1>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
                {workerId
                  ? "Update its instructions, tools, model, and run limits."
                  : "Give your worker a purpose. Choose how it works."}
              </p>
            </div>
            <Badge
              variant="outline"
              className="mt-0.5 shrink-0 gap-1.5 rounded-full border-border/80 bg-muted/25 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              <span className="size-1.5 rounded-full bg-muted-foreground/60" />
              Draft
            </Badge>
          </div>
        </header>
        {workerId && !workerQuery.currentData && (
          <div
            role={workerQuery.isError ? "alert" : "status"}
            className="shrink-0 border-b bg-background px-4 py-3 text-center text-sm"
          >
            {workerQuery.isError ? (
              <span>
                We couldn’t load this worker.{" "}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => workerQuery.refetch()}
                >
                  Try again
                </button>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading worker configuration…
              </span>
            )}
          </div>
        )}
        <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 py-4 lg:grid-cols-[248px_minmax(0,1fr)] lg:grid-rows-1 lg:gap-8 lg:px-8 lg:py-7">
          <aside className="min-h-0 min-w-0 overscroll-contain rounded-2xl border border-border/60 bg-slate-100/80 p-1.5 lg:overflow-y-auto lg:p-2 dark:bg-muted/25">
            <p className="mb-3 hidden px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/80 lg:block">
              Configuration
            </p>
            <nav
              ref={navigationRef}
              aria-label="Worker configuration"
              className="flex max-w-full gap-1.5 overflow-x-auto px-0.5 pb-2 lg:flex-col lg:overflow-x-hidden"
            >
              {sections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active === item.id ? "step" : undefined}
                  onClick={() => navigate(item.id)}
                  className={cn(
                    "group flex shrink-0 items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    active === item.id
                      ? "border-primary/15 bg-primary/[0.065] font-medium text-primary dark:bg-primary/10"
                      : "border-transparent text-muted-foreground hover:bg-white/65 hover:text-foreground dark:hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-lg",
                      active === item.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-3.5" />
                  </span>
                  <span className="flex-1 whitespace-nowrap">{item.title}</span>
                  {"upcoming" in item && (
                    <span
                      className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                      aria-label="Coming soon"
                    >
                      Soon
                    </span>
                  )}
                  {active === item.id && !("upcoming" in item) && (
                    <ChevronRight
                      aria-hidden="true"
                      className="hidden size-3.5 shrink-0 text-primary/60 lg:block"
                    />
                  )}
                </button>
              ))}
            </nav>
          </aside>
          <div
            ref={contentRef}
            role="region"
            aria-labelledby="worker-section-title"
            tabIndex={0}
            className="min-h-0 min-w-0 overflow-y-auto overscroll-contain scroll-auto pb-2 pr-0.5 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px] lg:pr-2"
          >
            <div className="mb-5 flex items-start justify-between gap-3 px-0.5">
              <div className="min-w-0">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Section {String(currentIndex + 1).padStart(2, "0")}{" "}
                  <span className="mx-1 text-muted-foreground/40">/</span>{" "}
                  {String(sections.length).padStart(2, "0")}
                </p>
                <h2
                  id="worker-section-title"
                  ref={titleRef}
                  tabIndex={-1}
                  className="text-lg font-semibold tracking-[-0.02em] outline-none sm:text-xl"
                >
                  {section.title}
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
                  {section.description}
                </p>
              </div>
              {isUpcoming && (
                <Badge
                  variant="outline"
                  className="shrink-0 rounded-full bg-white/70 text-[10px] font-medium text-muted-foreground dark:bg-card"
                >
                  Coming soon
                </Badge>
              )}
            </div>
            {active === "identity" && (
              <div className="space-y-6">
                <Panel>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary">
                      <Bot className="size-5 stroke-[1.6]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Worker identity</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        A name and a place on your team.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-5">
                    <Field label="Worker name" htmlFor="worker-name">
                      <Input
                        id="worker-name"
                        autoComplete="off"
                        maxLength={120}
                        placeholder="e.g. Delivery partner"
                        value={draft.name}
                        onChange={(event) => update("name", event.target.value)}
                      />
                    </Field>
                  </div>
                  {!workspaceId && (
                    <Notice>Select a workspace to save your worker.</Notice>
                  )}
                </Panel>
                <Panel
                  title="Operating instructions"
                  description="Describe the job, the expected outcome, and when your worker should ask for help."
                >
                  <Field label="Instructions" htmlFor="worker-instructions">
                    <Textarea
                      id="worker-instructions"
                      className="min-h-52 leading-6"
                      maxLength={20000}
                      value={draft.instructions}
                      onChange={(event) =>
                        update("instructions", event.target.value)
                      }
                      placeholder="You are a delivery partner. Review assigned tasks, identify blockers, and suggest clear next steps. Ask for approval before changing task statuses."
                    />
                    <span className="text-right text-[11px] text-muted-foreground">
                      {draft.instructions.length.toLocaleString()} / 20,000
                    </span>
                  </Field>
                </Panel>
              </div>
            )}
            {active === "model" && (
              <div className="space-y-6">
                <Panel
                  title="Primary model"
                  description="Choose a provider and enter the model you want this worker to use."
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Provider" htmlFor="worker-provider">
                      <Select
                        value={draft.model_provider}
                        onValueChange={(value) =>
                          setDraft((previous) => ({
                            ...previous,
                            model_provider:
                              value as AIWorkerInput["model_provider"],
                            model_name:
                              value === "gemini"
                                ? "gemini-2.5-flash"
                                : value === "test"
                                  ? "stub"
                                  : "gpt-4.1-mini",
                          }))
                        }
                      >
                        <SelectTrigger id="worker-provider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini">Google Gemini</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="openai_compatible">
                            OpenAI compatible
                          </SelectItem>
                          <SelectItem value="test">
                            Test model · no provider calls
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Model name" htmlFor="worker-model">
                      <Input
                        id="worker-model"
                        maxLength={120}
                        value={draft.model_name}
                        onChange={(event) =>
                          update("model_name", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Notice>
                    Uses the provider credentials configured for Huzlr Cloud.
                  </Notice>
                </Panel>
                <Upcoming
                  title="More model controls"
                  options={[
                    {
                      label: "Fallback models",
                      value: "Ordered model fallback chain",
                    },
                    {
                      label: "Reasoning level",
                      value: "Thinking and reasoning budget",
                    },
                    {
                      label: "Runtime",
                      value: "Native and external agent harnesses",
                    },
                    {
                      label: "Specialist models",
                      value:
                        "Separate models for images, summaries, and other tasks",
                    },
                  ]}
                />
              </div>
            )}
            {active === "tools" && (
              <div className="space-y-6">
                <Panel
                  title="Project tools"
                  description="Choose its capabilities now. Project access is set when you assign work."
                >
                  {tools.isLoading ? (
                    <p
                      role="status"
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Loader2 className="size-4 animate-spin" />
                      Loading tools…
                    </p>
                  ) : tools.isError ? (
                    <Notice>
                      Tools are unavailable.{" "}
                      <button
                        type="button"
                        onClick={() => tools.refetch()}
                        className="underline"
                      >
                        Try again
                      </button>
                      .
                    </Notice>
                  ) : (
                    tools.data?.map((tool) => (
                      <label
                        key={tool.name}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 p-4 transition-colors hover:bg-muted/15 has-[[data-state=checked]]:border-primary/20 has-[[data-state=checked]]:bg-primary/[0.025]"
                      >
                        <Checkbox
                          className="mt-0.5"
                          disabled={
                            tool.requires_sandbox &&
                            draft.sandbox_mode !== "docker"
                          }
                          checked={draft.allowed_tools.includes(tool.name)}
                          onCheckedChange={(checked) =>
                            update(
                              "allowed_tools",
                              checked === true
                                ? [
                                    ...new Set([
                                      ...draft.allowed_tools,
                                      tool.name,
                                    ]),
                                  ]
                                : draft.allowed_tools.filter(
                                    (name) => name !== tool.name,
                                  ),
                            )
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {toolLabels[tool.name]?.title || tool.name}
                            {tool.requires_approval && (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-[10px]"
                              >
                                <ShieldCheck className="size-3" />
                                Human approval
                              </Badge>
                            )}
                            {tool.requires_sandbox && (
                              <Badge variant="outline">Requires sandbox</Badge>
                            )}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {toolLabels[tool.name]?.description ||
                              tool.description}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </Panel>
                <Upcoming
                  title="Additional tools & approval policies"
                  options={[
                    {
                      label: "Web & browser",
                      value: "Search, fetch pages, and automate a browser",
                    },
                    {
                      label: "Tool profiles",
                      value: "Reusable allowlists and access policies",
                    },
                    {
                      label: "Approval rules",
                      value: "Per-action approval modes and trusted actions",
                    },
                  ]}
                />
              </div>
            )}
            {active === "deployment" && (
              <div className="space-y-6">
                <Panel
                  title="Execution environment"
                  description="Workers run in Huzlr Cloud."
                >
                  <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-5">
                    <Cloud className="size-6 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Huzlr Cloud</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Your worker runs on Huzlr-managed infrastructure.
                      </p>
                    </div>
                  </div>
                </Panel>
                <Panel
                  title="Managed sandbox"
                  description="Give this worker an isolated workspace for files and commands."
                >
                  <label className="flex items-start gap-3 rounded-lg border p-4">
                    <Checkbox
                      checked={draft.sandbox_mode === "docker"}
                      disabled={!capabilities.data?.managed_sandbox}
                      onCheckedChange={(checked) =>
                        setDraft((previous) => ({
                          ...previous,
                          sandbox_mode: checked === true ? "docker" : "off",
                          allowed_tools:
                            checked === true
                              ? previous.allowed_tools
                              : previous.allowed_tools.filter(
                                  (name) =>
                                    ![
                                      "read_file",
                                      "write_file",
                                      "list_files",
                                      "run_command",
                                    ].includes(name),
                                ),
                        }))
                      }
                    />
                    <span className="text-sm">
                      Isolated Docker workspace
                      <span className="mt-1 block text-xs text-muted-foreground">
                        A fresh container for each run, with no network access.
                        Files and commands stay inside /workspace. Writes and
                        commands require your approval.
                      </span>
                    </span>
                  </label>
                  {!capabilities.data?.managed_sandbox && (
                    <Notice>
                      {capabilities.isLoading
                        ? "Checking sandbox availability…"
                        : "Managed sandboxes are not enabled on this Huzlr environment yet."}
                    </Notice>
                  )}
                  <Field
                    label="Active runtime limit (seconds)"
                    htmlFor="runtime-limit"
                  >
                    <Input
                      id="runtime-limit"
                      type="number"
                      min={30}
                      max={1800}
                      value={draft.max_runtime_seconds}
                      onChange={(event) =>
                        update(
                          "max_runtime_seconds",
                          Number(event.target.value),
                        )
                      }
                    />
                  </Field>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Up to 100 files and 1 MiB are saved between approvals and as
                    downloadable results. Individual commands have a 30-second
                    limit. CPU and memory limits are managed by Huzlr.
                  </p>
                </Panel>
                <Upcoming
                  title="Workspace & sandbox"
                  options={[
                    {
                      label: "Repository setup",
                      value:
                        "Clone a repository and install project dependencies",
                    },
                    {
                      label: "Network access",
                      value: "Allowed destinations and connection rules",
                    },
                  ]}
                />
              </div>
            )}
            {active === "memory" && (
              <Upcoming
                title="Memory & session context"
                description="These settings will be available when persistent worker memory is connected."
                options={[
                  {
                    label: "Long-term memory",
                    value: "Remember decisions and facts between runs",
                  },
                  {
                    label: "Project knowledge",
                    value: "Retrieve relevant project context and evidence",
                  },
                  {
                    label: "Context budget",
                    value: "Limit the context sent to the model",
                  },
                  {
                    label: "Compaction",
                    value: "Summarize older turns and preserve recent work",
                  },
                  {
                    label: "Session retention",
                    value: "Reset, expiry, and history retention",
                  },
                ]}
              />
            )}
            {active === "skills" && (
              <Upcoming
                title="Skills & workspace files"
                description="Add reusable workflows and instructions to your worker."
                options={[
                  {
                    label: "Skills library",
                    value: "Select workflow instruction packs",
                  },
                  {
                    label: "AGENTS.md",
                    value: "Operating instructions and conventions",
                  },
                  {
                    label: "SOUL.md & identity",
                    value: "Persona, tone, and working boundaries",
                  },
                  {
                    label: "USER.md & MEMORY.md",
                    value: "User preferences and durable context",
                  },
                  {
                    label: "Bootstrap files",
                    value: "Additional instructions loaded at session start",
                  },
                ]}
              />
            )}
            {active === "integrations" && (
              <Upcoming
                title="Plugins & MCP servers"
                description="Extend the worker with connected tools and services."
                options={[
                  {
                    label: "Plugins",
                    value: "Install capabilities and integration packages",
                  },
                  {
                    label: "MCP servers",
                    value: "Connect remote or local tool servers",
                  },
                  {
                    label: "Credentials",
                    value: "References to secrets in the execution environment",
                  },
                  {
                    label: "Per-worker access",
                    value: "Choose which connected tools this worker can use",
                  },
                ]}
              />
            )}
            {active === "channels" && (
              <Upcoming
                title="Channels & conversation routing"
                description="Bring your worker into the places your team collaborates."
                options={[
                  {
                    label: "Messaging channels",
                    value: "Slack, Teams, Telegram, and other channels",
                  },
                  {
                    label: "Routing bindings",
                    value: "Route accounts and conversations to this worker",
                  },
                  {
                    label: "Sender access",
                    value: "Allowed senders, groups, and mention rules",
                  },
                  {
                    label: "Reply behavior",
                    value: "Streaming, notifications, and delivery preferences",
                  },
                ]}
              />
            )}
            {active === "automation" && (
              <Upcoming
                title="Schedules & triggers"
                description="Configure recurring work once worker automation is available."
                options={[
                  {
                    label: "Schedule",
                    value: "Recurring times and cron expressions",
                  },
                  {
                    label: "Timezone",
                    value: "The timezone used by scheduled work",
                  },
                  {
                    label: "Event triggers",
                    value: "Start work when a project event occurs",
                  },
                  {
                    label: "Periodic check-ins",
                    value: "Check for updates and surface useful changes",
                  },
                ]}
              />
            )}
            {active === "delegation" && (
              <Upcoming
                title="Subagent collaboration"
                description="Configure how your worker delegates to other specialists."
                options={[
                  {
                    label: "Allowed workers",
                    value: "Specialists this worker may delegate to",
                  },
                  {
                    label: "Delegation model",
                    value: "Model used for child runs",
                  },
                  {
                    label: "Parallelism & nesting",
                    value: "Maximum child runs and delegation depth",
                  },
                  {
                    label: "Inherited context",
                    value: "Choose the context and tools child runs receive",
                  },
                  {
                    label: "Result handoff",
                    value: "Return artifacts and evidence to the parent worker",
                  },
                ]}
              />
            )}
            {active === "limits" && (
              <div className="space-y-6">
                <Panel
                  title="Execution limits"
                  description="Bound the number of steps and estimated spend for each task."
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Maximum steps" htmlFor="worker-steps">
                      <Input
                        id="worker-steps"
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        value={
                          Number.isNaN(draft.max_steps) ? "" : draft.max_steps
                        }
                        onChange={(event) =>
                          update("max_steps", event.target.valueAsNumber)
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Between 1 and 100 model decisions.
                      </p>
                    </Field>
                    <Field
                      label="Estimated cost limit (USD)"
                      htmlFor="worker-cost"
                    >
                      <Input
                        id="worker-cost"
                        type="number"
                        min={0.01}
                        max={1000}
                        step={0.01}
                        value={
                          Number.isNaN(draft.max_cost_cents)
                            ? ""
                            : draft.max_cost_cents / 100
                        }
                        onChange={(event) =>
                          update(
                            "max_cost_cents",
                            Math.round(event.target.valueAsNumber * 100),
                          )
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        An estimated spend limit, not a billing guarantee.
                      </p>
                    </Field>
                  </div>
                </Panel>
                <Upcoming
                  title="Advanced behavior"
                  options={[
                    {
                      label: "Timeouts & retries",
                      value: "Per-request deadlines and recovery policy",
                    },
                    {
                      label: "Message queue",
                      value: "Steering, follow-ups, and interruption behavior",
                    },
                    {
                      label: "Streaming",
                      value: "Progress updates and output delivery",
                    },
                    {
                      label: "Loop detection",
                      value: "Detect repetitive or stalled tool calls",
                    },
                  ]}
                />
              </div>
            )}
            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => navigate(sections[currentIndex - 1].id)}
              >
                <ArrowLeft className="size-3.5" />
                Previous
              </Button>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {String(currentIndex + 1).padStart(2, "0")} /{" "}
                {String(sections.length).padStart(2, "0")}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentIndex === sections.length - 1}
                onClick={() => navigate(sections[currentIndex + 1].id)}
              >
                Next
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
            <div className="mt-5 rounded-2xl border border-border/60 bg-white/60 p-5 dark:bg-card/40">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Your worker at a glance
                </p>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Cloud className="size-3" />
                  Huzlr Cloud
                </span>
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-4 text-xs sm:grid-cols-3">
                <Summary label="Name" value={draft.name || "Untitled worker"} />
                <Summary label="Scope" value="Current workspace" />
                <Summary
                  label="Model"
                  value={draft.model_name || "Not selected"}
                />
                <Summary label="Environment" value="Huzlr Cloud" />
                <Summary
                  label="Permissions"
                  value={`${draft.allowed_tools.length} tools enabled`}
                />
                <Summary label="Status" value="Created as a draft" />
              </dl>
            </div>
          </div>
        </div>
        <footer className="z-20 shrink-0 border-t border-border/70 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-4 lg:px-8 dark:bg-background">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  ready
                    ? "bg-primary/10 text-primary"
                    : "border border-border text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {ready ? (
                  <Check className="size-3" />
                ) : (
                  <span className="size-1 rounded-full bg-muted-foreground/70" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium">
                  {ready ? "Ready to create" : "Complete the essentials"}
                </p>
                <p className="mt-1 hidden text-[11px] text-muted-foreground sm:block">
                  Your worker starts as a draft. Activate it when you’re ready.
                </p>
                {error && (
                  <p role="alert" className="mt-1 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button
                asChild
                variant="ghost"
                className="h-11 rounded-xl px-4 text-muted-foreground"
              >
                <Link href={returnUrl}>Cancel</Link>
              </Button>
              <Button
                key="create"
                type="submit"
                className="h-11 rounded-xl px-5 shadow-sm"
                disabled={
                  !ready || createState.isLoading || updateState.isLoading
                }
              >
                {createState.isLoading || updateState.isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {workerId ? "Save changes" : "Create worker"}
                {!createState.isLoading && !updateState.isLoading && (
                  <ArrowRight className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        </footer>
      </form>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6 rounded-2xl border border-border/70 bg-white p-5 shadow-[0_2px_8px_-6px_rgb(15_23_42/0.12)] sm:p-6 dark:bg-card dark:shadow-none">
      {title && (
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description && (
            <p className="mt-1.5 max-w-xl text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2.5 [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:rounded-xl [&_[data-slot=input]]:bg-slate-50/60 [&_[data-slot=input]]:shadow-none [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:rounded-xl [&_[data-slot=select-trigger]]:bg-slate-50/60 [&_[data-slot=select-trigger]]:shadow-none [&_textarea]:rounded-xl [&_textarea]:bg-slate-50/60 [&_textarea]:p-3.5 [&_textarea]:shadow-none dark:[&_[data-slot=input]]:bg-background/50 dark:[&_[data-slot=select-trigger]]:bg-background/50 dark:[&_textarea]:bg-background/50">
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}
function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/25 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
      {children}
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 break-words text-[11px] font-medium leading-5">
        {value}
      </dd>
    </div>
  );
}
function Upcoming({
  title,
  description,
  options,
}: {
  title: string;
  description?: string;
  options: { label: string; value: string }[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-white dark:bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/10 p-5 sm:p-6">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description ||
              "These controls are not yet available for Huzlr workers."}
          </p>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 rounded-full bg-muted/30 text-[10px] font-medium text-muted-foreground"
        >
          Coming soon
        </Badge>
      </div>
      <dl className="divide-y divide-border/50">
        {options.map((option) => (
          <div
            key={option.label}
            className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
          >
            <dt className="flex items-center gap-2 text-xs font-medium">
              <LockKeyhole className="size-3 text-muted-foreground" />
              {option.label}
            </dt>
            <dd className="text-xs text-muted-foreground sm:max-w-[60%] sm:text-right">
              {option.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-t bg-muted/10 px-5 py-3 text-[11px] leading-5 text-muted-foreground">
        Preview only. These options are not applied when you create a worker.
      </div>
    </section>
  );
}
