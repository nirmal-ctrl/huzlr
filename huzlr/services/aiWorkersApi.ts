import { baseApi } from "./baseApi";

export type DeploymentKind = "cloud";
export type WorkerStatus = "draft" | "deployed" | "disabled";
export type ExecutionStatus =
  | "queued"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export interface AIWorkerInput {
  workspace_id?: number | null;
  project_id?: number | null;
  name: string;
  instructions: string;
  model_provider: "gemini" | "openai" | "openai_compatible" | "test";
  model_name: string;
  deployment_kind: DeploymentKind;
  allowed_tools: string[];
  max_steps: number;
  max_cost_cents: number;
  sandbox_mode: "off" | "docker";
  max_runtime_seconds: number;
}

export interface AIWorker extends AIWorkerInput {
  workspace_id: number | null;
  project_id: number | null;
  id: string;
  status: WorkerStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkerFeedItem extends AIWorker {
  project_name: string | null;
}
export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
}

export interface ExecutionSummary {
  id: string;
  worker_id: string;
  project_id?: number | null;
  task_id: number | null;
  task_description: string;
  status: ExecutionStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkerEvent {
  id: number;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface WorkerApproval {
  id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  decided_at: string | null;
  decision_note: string | null;
}

export interface ExecutionDetail extends ExecutionSummary {
  worker_version: number;
  deployment_kind: DeploymentKind;
  attempt: number;
  max_attempts: number;
  usage: Record<string, unknown> | null;
  cancel_requested: boolean;
  started_at: string | null;
  finished_at: string | null;
  events: WorkerEvent[];
  approvals: WorkerApproval[];
  artifacts: string[];
}

export interface WorkerSessionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  execution_id: string | null;
  execution_status: ExecutionStatus | null;
  execution_error: string | null;
  created_at: string;
}

export interface WorkerSession {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_status: WorkerStatus;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface WorkerSessionDetail extends WorkerSession {
  messages: WorkerSessionMessage[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  requires_approval: boolean;
  requires_sandbox?: boolean;
}

export interface WorkerProject {
  project_id: number;
  team_id: number;
  properties: { project_title?: string; title?: string };
}

export type WorkerCreationProposal = Pick<
  AIWorkerInput,
  | "name"
  | "instructions"
  | "allowed_tools"
  | "sandbox_mode"
  | "max_steps"
  | "max_cost_cents"
  | "max_runtime_seconds"
>;
export interface WorkerCreationMessage {
  role: "user" | "assistant";
  content: string;
}
export interface WorkerCreationReply {
  message: string;
  configuration: WorkerCreationProposal | null;
}

export const aiWorkersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkerProjects: builder.query<
      WorkerProject[],
      { workspaceId: number; teamId: number | null }
    >({
      query: ({ workspaceId, teamId }) => ({
        url: "/projects/",
        params: {
          workspace_id: workspaceId,
          ...(teamId ? { team_id: teamId } : {}),
          limit: 100,
        },
      }),
      providesTags: ["Projects"],
    }),
    getWorkerTools: builder.query<ToolDefinition[], void>({
      query: () => "/ai-workers/tools",
    }),
    getWorkerCapabilities: builder.query<
      { managed_sandbox: boolean; creation_chat: boolean },
      void
    >({ query: () => "/ai-workers/capabilities" }),
    draftAIWorker: builder.mutation<
      WorkerCreationReply,
      {
        workspace_id: number;
        messages: WorkerCreationMessage[];
        current_configuration: Partial<
          Omit<AIWorkerInput, "project_id" | "workspace_id">
        >;
      }
    >({
      query: (body) => ({ url: "/ai-workers/draft", method: "POST", body }),
    }),
    getWorkerSessions: builder.query<WorkerSession[], number>({
      query: (workspaceId) => ({ url: "/ai-workers/sessions/", params: { workspace_id: workspaceId, limit: 100 } }),
      providesTags: (result) => [
        { type: "WorkerSessions", id: "LIST" },
        ...(result?.map(({ id }) => ({ type: "WorkerSessions" as const, id })) ?? []),
      ],
    }),
    createWorkerSession: builder.mutation<WorkerSessionDetail, { worker_id: string }>({
      query: (body) => ({ url: "/ai-workers/sessions/", method: "POST", body }),
      invalidatesTags: [{ type: "WorkerSessions", id: "LIST" }],
    }),
    getWorkerSession: builder.query<WorkerSessionDetail, string>({
      query: (id) => `/ai-workers/sessions/${id}`,
      providesTags: (_result, _error, id) => [{ type: "WorkerSessions", id }],
    }),
    sendWorkerSessionMessage: builder.mutation<WorkerSessionDetail, { sessionId: string; content: string; project_id?: number }>({
      query: ({ sessionId, ...body }) => ({ url: `/ai-workers/sessions/${sessionId}/messages`, method: "POST", body }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: "WorkerSessions", id: sessionId },
        { type: "WorkerSessions", id: "LIST" },
      ],
    }),
    getAIWorker: builder.query<AIWorker, string>({
      query: (id) => `/ai-workers/${id}`,
      providesTags: (_result, _error, id) => [{ type: "AIWorkers", id }],
    }),
    getWorkerFeed: builder.infiniteQuery<
      CursorPage<WorkerFeedItem>,
      number,
      string | null
    >({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (page) => page.next_cursor ?? undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: "/ai-workers/feed",
        params: {
          workspace_id: queryArg,
          limit: 12,
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      }),
      keepUnusedDataFor: 300,
      providesTags: (result) => [
        { type: "AIWorkers", id: "FEED" },
        ...(result?.pages.flatMap((page) =>
          page.items.map(({ id }) => ({ type: "AIWorkers" as const, id })),
        ) ?? []),
      ],
    }),
    getExecutionFeed: builder.infiniteQuery<
      CursorPage<ExecutionSummary>,
      string,
      string | null
    >({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (page) => page.next_cursor ?? undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: `/ai-workers/${queryArg}/executions/feed`,
        params: { limit: 20, ...(pageParam ? { cursor: pageParam } : {}) },
      }),
      keepUnusedDataFor: 300,
      providesTags: (_result, _error, id) => [
        { type: "WorkerExecutions", id: `WORKER-${id}` },
      ],
    }),
    getWorkerArtifact: builder.query<
      { path: string; content_base64: string },
      { workerId: string; executionId: string; path: string }
    >({
      query: ({ workerId, executionId, path }) => ({
        url: `/ai-workers/${workerId}/executions/${executionId}/artifact`,
        params: { path },
      }),
      keepUnusedDataFor: 0,
    }),
    getAIWorkers: builder.query<AIWorker[], number>({
      query: (projectId) => `/ai-workers/?project_id=${projectId}`,
      providesTags: (result, _error, projectId) => [
        { type: "AIWorkers", id: `PROJECT-${projectId}` },
        ...(result?.map(({ id }) => ({ type: "AIWorkers" as const, id })) ??
          []),
      ],
    }),
    createAIWorker: builder.mutation<AIWorker, AIWorkerInput>({
      query: (body) => ({ url: "/ai-workers/", method: "POST", body }),
      invalidatesTags: (_result, _error, body) => [
        { type: "AIWorkers", id: `PROJECT-${body.project_id}` },
        { type: "AIWorkers", id: "FEED" },
      ],
    }),
    updateAIWorker: builder.mutation<
      AIWorker,
      {
        workerId: string;
        updates: Partial<Omit<AIWorkerInput, "project_id" | "workspace_id">>;
        projectId: number | null;
      }
    >({
      query: ({ workerId, updates }) => ({
        url: `/ai-workers/${workerId}`,
        method: "PATCH",
        body: updates,
      }),
      invalidatesTags: (_result, _error, { workerId, projectId }) => [
        { type: "AIWorkers", id: workerId },
        { type: "AIWorkers", id: `PROJECT-${projectId}` },
        { type: "AIWorkers", id: "FEED" },
      ],
    }),
    deployAIWorker: builder.mutation<
      AIWorker,
      { workerId: string; projectId: number | null }
    >({
      query: ({ workerId }) => ({
        url: `/ai-workers/${workerId}/deploy`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { workerId, projectId }) => [
        { type: "AIWorkers", id: workerId },
        { type: "AIWorkers", id: `PROJECT-${projectId}` },
        { type: "AIWorkers", id: "FEED" },
      ],
    }),
    disableAIWorker: builder.mutation<
      AIWorker,
      { workerId: string; projectId: number | null }
    >({
      query: ({ workerId }) => ({
        url: `/ai-workers/${workerId}/disable`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { workerId, projectId }) => [
        { type: "AIWorkers", id: workerId },
        { type: "AIWorkers", id: `PROJECT-${projectId}` },
        { type: "AIWorkers", id: "FEED" },
      ],
    }),
    getWorkerExecutions: builder.query<ExecutionSummary[], string>({
      query: (workerId) => `/ai-workers/${workerId}/executions`,
      providesTags: (_result, _error, workerId) => [
        { type: "WorkerExecutions", id: `WORKER-${workerId}` },
      ],
    }),
    getWorkerExecution: builder.query<
      ExecutionDetail,
      { workerId: string; executionId: string }
    >({
      query: ({ workerId, executionId }) =>
        `/ai-workers/${workerId}/executions/${executionId}`,
      providesTags: (_result, _error, { executionId }) => [
        { type: "WorkerExecutions", id: executionId },
      ],
    }),
    dispatchWorkerExecution: builder.mutation<
      ExecutionSummary,
      {
        workerId: string;
        project_id?: number;
        task_description?: string;
        task_id?: number;
      }
    >({
      query: ({ workerId, ...body }) => ({
        url: `/ai-workers/${workerId}/executions`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { workerId }) => [
        { type: "WorkerExecutions", id: `WORKER-${workerId}` },
      ],
    }),
    cancelWorkerExecution: builder.mutation<
      ExecutionSummary,
      { workerId: string; executionId: string }
    >({
      query: ({ workerId, executionId }) => ({
        url: `/ai-workers/${workerId}/executions/${executionId}/cancel`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { workerId, executionId }) => [
        { type: "WorkerExecutions", id: executionId },
        { type: "WorkerExecutions", id: `WORKER-${workerId}` },
      ],
    }),
    decideWorkerApproval: builder.mutation<
      WorkerApproval,
      {
        workerId: string;
        executionId: string;
        approvalId: string;
        decision: "approved" | "rejected";
        note?: string;
      }
    >({
      query: ({ workerId, executionId, approvalId, decision, note }) => ({
        url: `/ai-workers/${workerId}/executions/${executionId}/approvals/${approvalId}`,
        method: "POST",
        body: { decision, note },
      }),
      invalidatesTags: (_result, _error, { workerId, executionId }) => [
        { type: "WorkerExecutions", id: executionId },
        { type: "WorkerExecutions", id: `WORKER-${workerId}` },
      ],
    }),
  }),
});

export const {
  useGetWorkerProjectsQuery,
  useGetWorkerToolsQuery,
  useGetWorkerCapabilitiesQuery,
  useDraftAIWorkerMutation,
  useGetWorkerSessionsQuery,
  useCreateWorkerSessionMutation,
  useGetWorkerSessionQuery,
  useSendWorkerSessionMessageMutation,
  useGetAIWorkerQuery,
  useGetWorkerFeedInfiniteQuery,
  useGetExecutionFeedInfiniteQuery,
  useLazyGetWorkerArtifactQuery,
  useGetAIWorkersQuery,
  useCreateAIWorkerMutation,
  useUpdateAIWorkerMutation,
  useDeployAIWorkerMutation,
  useDisableAIWorkerMutation,
  useGetWorkerExecutionsQuery,
  useGetWorkerExecutionQuery,
  useDispatchWorkerExecutionMutation,
  useCancelWorkerExecutionMutation,
  useDecideWorkerApprovalMutation,
} = aiWorkersApi;
