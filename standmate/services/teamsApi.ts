import { baseApi } from './baseApi'

export interface TeamWithMembers {
    id: number
    name: string
    description: string | null
    is_default: boolean
    workspace_id: number
    created_at: string
    memberships: {
        id: number
        user_id: number
        team_id: number
        user?: {
            id: number
            username: string
            email: string
        }
    }[]
}

export const teamsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        addTeamMember: builder.mutation<TeamWithMembers, { teamId: number; userId: number }>({
            query: ({ teamId, userId }) => ({
                url: `/teams/${teamId}/members/${userId}`,
                method: 'POST',
            }),
            invalidatesTags: ['Dashboard'],
        }),
        removeTeamMember: builder.mutation<TeamWithMembers, { teamId: number; userId: number }>({
            query: ({ teamId, userId }) => ({
                url: `/teams/${teamId}/members/${userId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Dashboard'],
        }),
    }),
})

export const {
    useAddTeamMemberMutation,
    useRemoveTeamMemberMutation,
} = teamsApi
