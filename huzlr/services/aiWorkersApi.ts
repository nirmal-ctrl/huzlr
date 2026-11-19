import { baseApi } from './baseApi'

export type DeploymentKind = 'cloud' | 'customer_hosted'
export type WorkerStatus = 'draft' | 'deployed' | 'disabled'
export type ExecutionStatus = 'queued' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled'

export interface AIWorkerInput {
  project_id: number
  name: string
  instructions: string
  model_provider: 'gemini' | 'openai' | 'openai_compatible' | 'test'
  model_name: string
  deployment_kind: DeploymentKind
  allowed_tools: string[]
  max_steps: number
  max_cost_cents: number
}

export interface AIWorker extends AIWorkerInput {
  id: string
  status: WorkerStatus
  version: number
  created_at: string
  updated_at: string
}

export interface ExecutionSummary {
  id: string
  worker_id: string
  task_id: number | null
  task_description: string
  status: ExecutionStatus
  result: Record<string, unknown> | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface WorkerEvent {
  id: number
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

export interface WorkerApproval {
  id: string
  tool_name: string
  arguments: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  decided_at: string | null
  decision_note: string | null
}

export interface ExecutionDetail extends ExecutionSummary {
  worker_version: number
  deployment_kind: DeploymentKind
  attempt: number
  max_attempts: number
  usage: Record<string, unknown> | null
  cancel_requested: boolean
  started_at: string | null
  finished_at: string | null
  events: WorkerEvent[]
  approvals: WorkerApproval[]
}

export interface WorkerNode {
  id: string
  project_id: number
  name: string
  status: 'active' | 'revoked'
  last_seen_at: string | null
  created_at: string
}

export interface ToolDefinition {
  name: string
  description: string
  requires_approval: boolean
}

export const aiWorkersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkerTools: builder.query<ToolDefinition[], void>({ query: () => '/ai-workers/tools' }),
    getAIWorkers: builder.query<AIWorker[], number>({
      query: (projectId) => `/ai-workers/?project_id=${projectId}`,
      providesTags: (result, _error, projectId) => [
        { type: 'AIWorkers', id: `PROJECT-${projectId}` },
        ...(result?.map(({ id }) => ({ type: 'AIWorkers' as const, id })) ?? []),
      ],
    }),
    createAIWorker: builder.mutation<AIWorker, AIWorkerInput>({
      query: (body) => ({ url: '/ai-workers/', method: 'POST', body }),
      invalidatesTags: (_result, _error, body) => [{ type: 'AIWorkers', id: `PROJECT-${body.project_id}` }],
    }),
    updateAIWorker: builder.mutation<AIWorker, { workerId: string; updates: Partial<Omit<AIWorkerInput, 'project_id'>>; projectId: number }>({
      query: ({ workerId, updates }) => ({ url: `/ai-workers/${workerId}`, method: 'PATCH', body: updates }),
      invalidatesTags: (_result, _error, { workerId, projectId }) => [{ type: 'AIWorkers', id: workerId }, { type: 'AIWorkers', id: `PROJECT-${projectId}` }],
    }),
    deployAIWorker: builder.mutation<AIWorker, { workerId: string; projectId: number }>({
      query: ({ workerId }) => ({ url: `/ai-workers/${workerId}/deploy`, method: 'POST' }),
      invalidatesTags: (_result, _error, { workerId, projectId }) => [{ type: 'AIWorkers', id: workerId }, { type: 'AIWorkers', id: `PROJECT-${projectId}` }],
    }),
    disableAIWorker: builder.mutation<AIWorker, { workerId: string; projectId: number }>({
      query: ({ workerId }) => ({ url: `/ai-workers/${workerId}/disable`, method: 'POST' }),
      invalidatesTags: (_result, _error, { workerId, projectId }) => [{ type: 'AIWorkers', id: workerId }, { type: 'AIWorkers', id: `PROJECT-${projectId}` }],
    }),
    getWorkerExecutions: builder.query<ExecutionSummary[], string>({
      query: (workerId) => `/ai-workers/${workerId}/executions`,
      providesTags: (_result, _error, workerId) => [{ type: 'WorkerExecutions', id: `WORKER-${workerId}` }],
    }),
    getWorkerExecution: builder.query<ExecutionDetail, { workerId: string; executionId: string }>({
      query: ({ workerId, executionId }) => `/ai-workers/${workerId}/executions/${executionId}`,
      providesTags: (_result, _error, { executionId }) => [{ type: 'WorkerExecutions', id: executionId }],
    }),
    dispatchWorkerExecution: builder.mutation<ExecutionSummary, { workerId: string; task_description?: string; task_id?: number }>({
      query: ({ workerId, ...body }) => ({ url: `/ai-workers/${workerId}/executions`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { workerId }) => [{ type: 'WorkerExecutions', id: `WORKER-${workerId}` }],
    }),
    cancelWorkerExecution: builder.mutation<ExecutionSummary, { workerId: string; executionId: string }>({
      query: ({ workerId, executionId }) => ({ url: `/ai-workers/${workerId}/executions/${executionId}/cancel`, method: 'POST' }),
      invalidatesTags: (_result, _error, { workerId, executionId }) => [{ type: 'WorkerExecutions', id: executionId }, { type: 'WorkerExecutions', id: `WORKER-${workerId}` }],
    }),
    decideWorkerApproval: builder.mutation<WorkerApproval, { workerId: string; executionId: string; approvalId: string; decision: 'approved' | 'rejected'; note?: string }>({
      query: ({ workerId, executionId, approvalId, decision, note }) => ({
        url: `/ai-workers/${workerId}/executions/${executionId}/approvals/${approvalId}`,
        method: 'POST',
        body: { decision, note },
      }),
      invalidatesTags: (_result, _error, { workerId, executionId }) => [{ type: 'WorkerExecutions', id: executionId }, { type: 'WorkerExecutions', id: `WORKER-${workerId}` }],
    }),
    getWorkerNodes: builder.query<WorkerNode[], number>({
      query: (projectId) => `/ai-workers/nodes/?project_id=${projectId}`,
      providesTags: (_result, _error, projectId) => [{ type: 'WorkerNodes', id: `PROJECT-${projectId}` }],
    }),
    createWorkerNode: builder.mutation<WorkerNode & { token: string }, { project_id: number; name: string }>({
      query: (body) => ({ url: '/ai-workers/nodes/', method: 'POST', body }),
      invalidatesTags: (_result, _error, body) => [{ type: 'WorkerNodes', id: `PROJECT-${body.project_id}` }],
    }),
    revokeWorkerNode: builder.mutation<void, { nodeId: string; projectId: number }>({
      query: ({ nodeId }) => ({ url: `/ai-workers/nodes/${nodeId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'WorkerNodes', id: `PROJECT-${projectId}` }, { type: 'AIWorkers', id: `PROJECT-${projectId}` }],
    }),
  }),
})

export const {
  useGetWorkerToolsQuery,
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
  useGetWorkerNodesQuery,
  useCreateWorkerNodeMutation,
  useRevokeWorkerNodeMutation,
} = aiWorkersApi
