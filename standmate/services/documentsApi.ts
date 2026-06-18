import { createApi } from '@reduxjs/toolkit/query/react'
import { baseApi } from './baseApi'

export interface ProjectDocumentResponse {
    document_id: number;
    project_id: number;
    title: string;
    content?: string;
    emoji: string;
    created_at: string;
    updated_at: string;
}

export interface ProjectDocumentCreate {
    project_id: number;
    title: string;
    content?: string;
    emoji?: string;
}

export interface ProjectDocumentUpdate {
    title?: string;
    content?: string;
    emoji?: string;
}

export const documentsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Query to get all documents for a project
        getProjectDocuments: builder.query<ProjectDocumentResponse[], number>({
            query: (projectId) => `/projects/${projectId}/documents`,
            providesTags: (result, error, projectId) =>
                result
                    ? [
                          ...result.map(({ document_id }) => ({ type: 'Documents' as const, id: document_id })),
                          { type: 'ProjectDocuments', id: projectId },
                      ]
                    : [{ type: 'ProjectDocuments', id: projectId }],
        }),

        // Mutation to create a new document
        createDocument: builder.mutation<ProjectDocumentResponse, { projectId: number; document: ProjectDocumentCreate }>({
            query: ({ projectId, document }) => ({
                url: `/projects/${projectId}/documents`,
                method: 'POST',
                body: document,
            }),
            invalidatesTags: (result, error, { projectId }) => [{ type: 'ProjectDocuments', id: projectId }],
        }),

        // Mutation to update an existing document
        updateDocument: builder.mutation<ProjectDocumentResponse, { documentId: number; updates: ProjectDocumentUpdate }>({
            query: ({ documentId, updates }) => ({
                url: `/documents/${documentId}`,
                method: 'PUT',
                body: updates,
            }),
            invalidatesTags: (result, error, { documentId }) => [
                { type: 'Documents', id: documentId },
                ...(result ? [{ type: 'ProjectDocuments' as const, id: result.project_id }] : []),
            ],
        }),

        // Mutation to delete a document
        deleteDocument: builder.mutation<void, { documentId: number; projectId: number }>({
            query: ({ documentId }) => ({
                url: `/documents/${documentId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { documentId, projectId }) => [
                { type: 'Documents', id: documentId },
                { type: 'ProjectDocuments', id: projectId },
            ],
        }),
    }),
    overrideExisting: false,
})

// Export hooks for usage in functional components
export const {
    useGetProjectDocumentsQuery,
    useCreateDocumentMutation,
    useUpdateDocumentMutation,
    useDeleteDocumentMutation,
} = documentsApi
