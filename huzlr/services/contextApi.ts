import { baseApi } from "./baseApi"

export type ContextSource = {
  canonical_id: string
  project_id: number
  title: string
  path: string
  text: string
  status: string
}

export type ContextAction = {
  id: string
  status: string
  payload: { project_id: number; title: string; description: string }
}

export type ContextSession = { id: string; project_ids: number[]; expires_at: string }
export type ContextAnswer = {
  message: string
  sources: ContextSource[]
  freshness: { project_id: number; pending: boolean; indexed_at: string | null }[]
  action: ContextAction | null
}

export type ContextGraphNode = {
  canonical_id: string
  workspace_id: number
  project_id: number
  kind: string
  title: string
  text: string
  path: string
  status?: string | null
  confidence?: number | null
  source_id?: string | null
  source_version?: string | null
  updated_at?: string | null
  source_system?: string | null
  issue_key?: string | null
  issue_status?: string | null
}

export type ContextGraphEdge = {
  source: string
  target: string
  kind: string
  source_id?: string | null
}

export type ProjectContextGraph = {
  project_id: number
  nodes: ContextGraphNode[]
  relationships: ContextGraphEdge[]
  total_nodes: number
  truncated: boolean
  freshness: { status: "not_indexed" | "pending" | "ready" | "failed"; indexed_at: string | null; error: string | null }
}

export type ContextProjectSummary = {
  id: number
  title: string
  summary: string | null
  project_status: string | null
  updated_at: string
  graph: {
    status: "not_indexed" | "pending" | "ready" | "failed"
    indexed_at: string | null
    has_error: boolean
  }
}

export const contextApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    contextProjects: builder.query<{ enabled: boolean; projects: ContextProjectSummary[] }, number>({
      query: (workspaceId) => `/context/projects?workspace_id=${workspaceId}`,
    }),
    createContextSession: builder.mutation<ContextSession, { workspace_id: number; project_ids: number[] }>({
      query: (body) => ({ url: "/context/sessions", method: "POST", body }),
    }),
    contextChat: builder.mutation<ContextAnswer, { session_id: string; message: string }>({
      query: (body) => ({ url: "/context/chat", method: "POST", body }),
    }),
    confirmContextAction: builder.mutation<{ status: string; issue_id: number }, string>({
      query: (id) => ({ url: `/context/actions/${id}/confirm`, method: "POST" }),
      invalidatesTags: ["Tasks", "ProjectTasks", "TeamTasks"],
    }),
    rememberContext: builder.mutation<{ id: string; status: string }, { id: string; project_id: number; text: string }>({
      query: (body) => ({ url: "/context/notes", method: "POST", body }),
    }),
    contextStatus: builder.query<{ status: string; indexed_at: string | null; error: string | null }, number>({
      query: (id) => `/context/projects/${id}/status`,
    }),
    projectContextGraph: builder.query<ProjectContextGraph, number>({
      query: (id) => `/context/projects/${id}/graph`,
    }),
    reindexProjectContext: builder.mutation<{ status: string }, number>({
      query: (id) => ({ url: `/context/projects/${id}/reindex`, method: "POST" }),
    }),
  }),
})

export const { useContextProjectsQuery, useCreateContextSessionMutation, useContextChatMutation,
  useConfirmContextActionMutation, useRememberContextMutation, useContextStatusQuery,
  useProjectContextGraphQuery, useReindexProjectContextMutation } = contextApi

export function contextError(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data as { detail?: unknown }
    if (typeof data?.detail === "string") return data.detail
  }
  return "Project context is unavailable. Please try again."
}
