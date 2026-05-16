import { createApi } from '@reduxjs/toolkit/query/react'
import { baseApi } from './baseApi'
import type { TaskResponse, TaskCreate } from '@/lib/types'

export const tasksApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Query to get all tasks across all projects
        getAllTasks: builder.query<TaskResponse[], void>({
            query: () => `/tasks/`,
            providesTags: (result) =>
                result
                    ? [
                          ...result.map(({ id }) => ({ type: 'Tasks' as const, id })),
                          { type: 'Tasks', id: 'LIST' },
                      ]
                    : [{ type: 'Tasks', id: 'LIST' }],
        }),

        // Query to get all tasks for a project
        getProjectTasks: builder.query<TaskResponse[], number>({
            query: (projectId) => `/tasks/project/${projectId}`,
            providesTags: (result, error, projectId) =>
                result
                    ? [
                          ...result.map(({ id }) => ({ type: 'Tasks' as const, id })),
                          { type: 'ProjectTasks', id: projectId },
                      ]
                    : [{ type: 'ProjectTasks', id: projectId }],
        }),

        // Mutation to create a new task
        createTask: builder.mutation<TaskResponse, { projectId: number; task: TaskCreate }>({
            query: ({ projectId, task }) => ({
                url: `/tasks/project/${projectId}`,
                method: 'POST',
                body: task,
            }),
            invalidatesTags: (result, error, { projectId }) => [
                { type: 'ProjectTasks', id: projectId },
                { type: 'Tasks', id: 'LIST' },
            ],
        }),

        // Mutation to update an existing task
        updateTask: builder.mutation<TaskResponse, { taskId: number; updates: any }>({
            query: ({ taskId, updates }) => ({
                url: `/tasks/${taskId}`,
                method: 'PUT',
                body: updates,
            }),
            invalidatesTags: (result, error, { taskId }) => [
                { type: 'Tasks', id: taskId },
                { type: 'Tasks', id: 'LIST' },
                ...(result ? [{ type: 'ProjectTasks' as const, id: result.project_id }] : []),
            ],
        }),

        // Mutation to delete a task
        deleteTask: builder.mutation<void, { taskId: number; projectId: number }>({
            query: ({ taskId }) => ({
                url: `/tasks/${taskId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { taskId, projectId }) => [
                { type: 'Tasks', id: taskId },
                { type: 'Tasks', id: 'LIST' },
                { type: 'ProjectTasks', id: projectId },
            ],
        }),
    }),
    overrideExisting: false,
})

// Export hooks for usage in functional components
export const {
    useGetAllTasksQuery,
    useGetProjectTasksQuery,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useDeleteTaskMutation,
} = tasksApi
