import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Define a service using a base URL and expected endpoints
export const baseApi = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
        prepareHeaders: (headers, { getState }) => {
            const state = getState() as any;
            const token = state.auth?.token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['Projects', 'Brainstorms', 'Dashboard', 'Milestones', 'ProjectMilestones', 'Tasks', 'ProjectTasks'],
    endpoints: () => ({}),
})
