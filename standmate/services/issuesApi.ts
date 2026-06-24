import { createApi } from '@reduxjs/toolkit/query/react'
import { baseApi } from './baseApi'
import type { IssueResponse, IssueCreate } from '@/lib/types'

export const issuesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Query to get all issues across all projects
        getAllIssues: builder.query<IssueResponse[], void>({
            query: () => `/issues/`,
            providesTags: (result) =>
                result
                    ? [
                          ...result.map(({ id }) => ({ type: 'Tasks' as const, id })),
                          { type: 'Tasks', id: 'LIST' },
                      ]
                    : [{ type: 'Tasks', id: 'LIST' }],
        }),

        // Query to get a single issue by ID
        getIssue: builder.query<IssueResponse, number>({
            query: (issueId) => `/issues/${issueId}`,
            providesTags: (result, error, issueId) => [{ type: 'Tasks', id: issueId }],
        }),

        // Query to get all issues for a project
        getProjectIssues: builder.query<IssueResponse[], number>({
            query: (projectId) => `/issues/project/${projectId}`,
            providesTags: (result, error, projectId) =>
                result
                    ? [
                          ...result.map(({ id }) => ({ type: 'Tasks' as const, id })),
                          { type: 'ProjectTasks', id: projectId },
                      ]
                    : [{ type: 'ProjectTasks', id: projectId }],
        }),

        // Query to get all issues for a team
        getTeamIssues: builder.query<IssueResponse[], number>({
            query: (teamId) => `/issues/team/${teamId}`,
            providesTags: (result, error, teamId) =>
                result
                    ? [
                          ...result.map(({ id }) => ({ type: 'Tasks' as const, id })),
                          { type: 'TeamTasks', id: teamId },
                          { type: 'Tasks', id: 'LIST' },
                      ]
                    : [{ type: 'TeamTasks', id: teamId }, { type: 'Tasks', id: 'LIST' }],
        }),

        // Mutation to create a new issue
        createIssue: builder.mutation<IssueResponse, { projectId: number; issue: IssueCreate }>({
            query: ({ projectId, issue }) => ({
                url: `/issues/project/${projectId}`,
                method: 'POST',
                body: issue,
            }),
            invalidatesTags: (result, error, { projectId }) => [
                { type: 'ProjectTasks', id: projectId },
                { type: 'Tasks', id: 'LIST' },
            ],
        }),

        // Mutation to update an existing issue
        updateIssue: builder.mutation<IssueResponse, { issueId: number; updates: any; teamId?: number; projectId?: number }>({
            query: ({ issueId, updates }) => ({
                url: `/issues/${issueId}`,
                method: 'PUT',
                body: updates,
            }),
            invalidatesTags: (result, error, { issueId }) => [
                { type: 'Tasks', id: issueId },
                { type: 'Tasks', id: 'LIST' },
                ...(result ? [{ type: 'ProjectTasks' as const, id: result.project_id }] : []),
            ],
            async onQueryStarted({ issueId, updates, teamId, projectId }, { dispatch, queryFulfilled }) {
                const patches: any[] = []
                
                if (teamId) {
                    const patchResult = dispatch(
                        issuesApi.util.updateQueryData('getTeamIssues', teamId, (draft) => {
                            const issue = draft.find(t => t.id === issueId)
                            if (issue) {
                                if (updates.status) issue.status = updates.status
                                if (updates.properties) {
                                    issue.properties = {
                                        ...(issue.properties || {}),
                                        ...updates.properties
                                    }
                                }
                                Object.keys(updates).forEach(key => {
                                    if (key !== 'properties' && key !== 'status') {
                                        (issue as any)[key] = updates[key]
                                    }
                                })
                            }
                        })
                    )
                    patches.push(patchResult)
                }

                if (projectId) {
                    const patchResult = dispatch(
                        issuesApi.util.updateQueryData('getProjectIssues', projectId, (draft) => {
                            const issue = draft.find(t => t.id === issueId)
                            if (issue) {
                                if (updates.status) issue.status = updates.status
                                if (updates.properties) {
                                    issue.properties = {
                                        ...(issue.properties || {}),
                                        ...updates.properties
                                    }
                                }
                                Object.keys(updates).forEach(key => {
                                    if (key !== 'properties' && key !== 'status') {
                                        (issue as any)[key] = updates[key]
                                    }
                                })
                            }
                        })
                    )
                    patches.push(patchResult)
                }

                try {
                    await queryFulfilled
                } catch {
                    patches.forEach((patch) => patch.undo())
                }
            }
        }),

        // Mutation to delete an issue
        deleteIssue: builder.mutation<void, { issueId: number; projectId: number }>({
            query: ({ issueId }) => ({
                url: `/issues/${issueId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { issueId, projectId }) => [
                { type: 'Tasks', id: issueId },
                { type: 'Tasks', id: 'LIST' },
                { type: 'ProjectTasks', id: projectId },
            ],
        }),
    }),
    overrideExisting: false,
})

// Export hooks for usage in functional components
export const {
    useGetAllIssuesQuery,
    useGetIssueQuery,
    useGetProjectIssuesQuery,
    useGetTeamIssuesQuery,
    useCreateIssueMutation,
    useUpdateIssueMutation,
    useDeleteIssueMutation,
} = issuesApi
