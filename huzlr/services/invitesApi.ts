import { baseApi } from './baseApi'

export interface WorkspaceMember {
    id: number
    workspace_id: number
    user_id: number
    role: 'admin' | 'user'
    created_at: string
    user: {
        id: number
        username: string
        email: string
    }
}

export interface WorkspaceWithMembers {
    id: number
    name: string
    owner_id: number
    created_by: number
    created_at: string
    memberships: WorkspaceMember[]
}

export interface Invite {
    id: number
    email: string
    role: 'admin' | 'user'
    workspace_id: number
    status: 'pending' | 'accepted' | 'expired' | 'revoked'
    expires_at: string
}

export interface InviteWithWorkspace extends Invite {
    workspace: {
        id: number
        name: string
    }
}

export interface CreateInviteInput {
    email: string
    role: 'admin' | 'user'
    workspace_id: number
}

export const invitesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getWorkspaceWithMembers: builder.query<WorkspaceWithMembers, number>({
            query: (workspaceId) => `/workspaces/${workspaceId}`,
            providesTags: (result, error, id) => [{ type: 'Dashboard', id: 'workspace-members' }],
        }),
        getWorkspaceInvites: builder.query<Invite[], number>({
            query: (workspaceId) => `/invites/workspace/${workspaceId}`,
            providesTags: (result, error, id) => [{ type: 'Dashboard', id: 'workspace-invites' }],
        }),
        getMyPendingInvites: builder.query<InviteWithWorkspace[], void>({
            query: () => `/invites/user/pending`,
            providesTags: ['Dashboard'],
        }),
        createInvite: builder.mutation<Invite, CreateInviteInput>({
            query: (body) => ({
                url: `/invites/`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, { workspace_id }) => [
                { type: 'Dashboard', id: 'workspace-invites' }
            ],
        }),
        acceptInvite: builder.mutation<{ detail: string }, { invite_id: number }>({
            query: (body) => ({
                url: `/invites/accept`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Dashboard'],
        }),
        remindInvite: builder.mutation<{ detail: string }, number>({
            query: (inviteId) => ({
                url: `/invites/${inviteId}/remind`,
                method: 'POST',
            }),
        }),
    }),
})

export const {
    useGetWorkspaceWithMembersQuery,
    useGetWorkspaceInvitesQuery,
    useGetMyPendingInvitesQuery,
    useCreateInviteMutation,
    useAcceptInviteMutation,
    useRemindInviteMutation,
} = invitesApi
