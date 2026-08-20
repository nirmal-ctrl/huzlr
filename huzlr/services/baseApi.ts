import {
    createApi,
    fetchBaseQuery,
    type BaseQueryFn,
    type FetchArgs,
    type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'

const getCookieToken = () => {
    if (typeof document === 'undefined') return null

    const tokenCookie = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('token='))

    return tokenCookie ? decodeURIComponent(tokenCookie.slice('token='.length)) : null
}

const rawBaseQuery = fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    prepareHeaders: (headers, { getState }) => {
        const state = getState() as { auth?: { token?: string | null } }
        const browserToken = typeof window !== 'undefined'
            ? getCookieToken() || state.auth?.token || localStorage.getItem('token')
            : state.auth?.token

        if (browserToken) {
            headers.set('authorization', `Bearer ${browserToken}`)
        }
        return headers
    },
})

const baseQueryWithSessionHandling: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions)

    if (result.error?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token')
        document.cookie = 'token=; path=/; max-age=0; SameSite=Lax'
        api.dispatch({ type: 'auth/logout' })

        if (window.location.pathname !== '/signup') {
            window.location.replace('/signup?reason=session-expired')
        }
    }

    return result
}

// Define a service using a base URL and expected endpoints
export const baseApi = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithSessionHandling,
    tagTypes: ['Projects', 'Brainstorms', 'Dashboard', 'Milestones', 'ProjectMilestones', 'Tasks', 'ProjectTasks', 'TeamTasks', 'Documents', 'ProjectDocuments', 'ScrumMeetings', 'ScrumSettings', 'CalendarStatus'],
    endpoints: () => ({}),
})
