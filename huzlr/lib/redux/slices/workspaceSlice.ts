import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Workspace {
    id: number;
    name: string;
    owner_id: number;
    created_by: number;
    created_at: string;
}

export interface Team {
    id: number;
    name: string;
    description: string | null;
    is_default: boolean;
    workspace_id: number;
    created_at: string;
}

interface WorkspaceState {
    workspaces: Workspace[];
    activeWorkspaceId: number | null;
    teams: Team[];
    activeTeamId: number | null;
    workspacesLoading: boolean;
    workspacesLoaded: boolean;
    teamsLoading: boolean;
    teamsLoaded: boolean;
    teamsRequestId: string | null;
    error: string | null;
}

const getSavedWorkspaceId = (): number | null => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('activeWorkspaceId');
        return saved ? parseInt(saved, 10) : null;
    }
    return null;
};

const getSavedTeamId = (): number | null => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('activeTeamId');
        return saved ? parseInt(saved, 10) : null;
    }
    return null;
};

const initialState: WorkspaceState = {
    workspaces: [],
    activeWorkspaceId: getSavedWorkspaceId(),
    teams: [],
    activeTeamId: getSavedTeamId(),
    workspacesLoading: false,
    workspacesLoaded: false,
    teamsLoading: false,
    teamsLoaded: false,
    teamsRequestId: null,
    error: null,
};

export const fetchWorkspaces = createAsyncThunk(
    'workspace/fetchWorkspaces',
    async (_, { getState, rejectWithValue }) => {
        try {
            const state = getState() as any;
            const token = state.auth.token || localStorage.getItem('token');
            if (!token) return rejectWithValue('No token found');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workspaces/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to fetch workspaces');
            return data as Workspace[];
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createWorkspace = createAsyncThunk(
    'workspace/createWorkspace',
    async (name: string, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState() as any;
            const token = state.auth.token || localStorage.getItem('token');
            if (!token) return rejectWithValue('No token found');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workspaces/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to create workspace');
            
            // After creating a workspace, fetch all again (ignoring condition)
            await dispatch(fetchWorkspaces());
            return data as Workspace;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createTeam = createAsyncThunk(
    'workspace/createTeam',
    async ({ workspaceId, name, description }: { workspaceId: number; name: string; description?: string }, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState() as any;
            const token = state.auth.token || localStorage.getItem('token');
            if (!token) return rejectWithValue('No token found');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${workspaceId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, description, is_default: false }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to create team');
            
            // Force fetch teams again
            await dispatch(fetchTeams(workspaceId));
            return data as Team;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateTeam = createAsyncThunk(
    'workspace/updateTeam',
    async ({ teamId, name, description, workspaceId }: { teamId: number; name: string; description?: string; workspaceId: number }, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState() as any;
            const token = state.auth.token || localStorage.getItem('token');
            if (!token) return rejectWithValue('No token found');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, description }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to update team');
            
            await dispatch(fetchTeams(workspaceId));
            return data as Team;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteTeam = createAsyncThunk(
    'workspace/deleteTeam',
    async ({ teamId, workspaceId }: { teamId: number; workspaceId: number }, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState() as any;
            const token = state.auth.token || localStorage.getItem('token');
            if (!token) return rejectWithValue('No token found');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to delete team');
            }
            
            await dispatch(fetchTeams(workspaceId));
            return teamId;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchTeams = createAsyncThunk(
    'workspace/fetchTeams',
    async (workspaceId: number, { getState, rejectWithValue }) => {
        try {
            const state = getState() as any;
            const token = state.auth.token || localStorage.getItem('token');
            if (!token) return rejectWithValue('No token found');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/workspace/${workspaceId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to fetch teams');
            return data as Team[];
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const workspaceSlice = createSlice({
    name: 'workspace',
    initialState,
    reducers: {
        setActiveWorkspace: (state, action: PayloadAction<number>) => {
            if (state.activeWorkspaceId === action.payload) return;
            state.activeWorkspaceId = action.payload;
            state.teams = []; // Reset teams when workspace changes
            state.activeTeamId = null;
            state.teamsLoading = true;
            state.teamsLoaded = false;
            if (typeof window !== 'undefined') {
                localStorage.setItem('activeWorkspaceId', action.payload.toString());
                localStorage.removeItem('activeTeamId');
            }
        },
        setActiveTeam: (state, action: PayloadAction<number>) => {
            state.activeTeamId = action.payload;
            if (typeof window !== 'undefined') {
                localStorage.setItem('activeTeamId', action.payload.toString());
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWorkspaces.pending, (state) => {
                state.workspacesLoading = true;
                state.error = null;
            })
            .addCase(fetchWorkspaces.fulfilled, (state, action) => {
                state.workspacesLoading = false;
                state.workspacesLoaded = true;
                state.workspaces = action.payload;
                
                // Validate or select active workspace ID
                const exists = action.payload.some(w => w.id === state.activeWorkspaceId);
                if (!exists && action.payload.length > 0) {
                    state.activeWorkspaceId = action.payload[0].id;
                    state.activeTeamId = null;
                    state.teams = [];
                    state.teamsLoading = true;
                    state.teamsLoaded = false;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('activeWorkspaceId', action.payload[0].id.toString());
                        localStorage.removeItem('activeTeamId');
                    }
                } else if (action.payload.length === 0) {
                    state.activeWorkspaceId = null;
                    state.activeTeamId = null;
                    state.teams = [];
                    state.teamsLoaded = true;
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('activeWorkspaceId');
                        localStorage.removeItem('activeTeamId');
                    }
                }
            })
            .addCase(fetchWorkspaces.rejected, (state, action) => {
                state.workspacesLoading = false;
                state.workspacesLoaded = true;
                state.error = action.payload as string;
            })
            .addCase(createWorkspace.fulfilled, (state, action) => {
                // We set the active workspace to the newly created one
                state.activeWorkspaceId = action.payload.id;
                state.activeTeamId = null;
                state.teams = [];
                state.teamsLoading = true;
                state.teamsLoaded = false;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('activeWorkspaceId', action.payload.id.toString());
                    localStorage.removeItem('activeTeamId');
                }
            })
            .addCase(createTeam.fulfilled, (state, action) => {
                state.activeTeamId = action.payload.id;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('activeTeamId', action.payload.id.toString());
                }
            })
            .addCase(fetchTeams.pending, (state, action) => {
                state.teamsLoading = true;
                state.teamsRequestId = action.meta.requestId;
                state.error = null;
            })
            .addCase(fetchTeams.fulfilled, (state, action) => {
                if (state.teamsRequestId !== action.meta.requestId) return;
                state.teamsLoading = false;
                state.teamsLoaded = true;
                state.teamsRequestId = null;
                state.teams = action.payload;
                
                // Validate or select active team ID
                const exists = action.payload.some(t => t.id === state.activeTeamId);
                if (!exists && action.payload.length > 0) {
                    const generalTeam = action.payload.find((t: Team) => t.is_default);
                    const defaultTeamId = generalTeam ? generalTeam.id : action.payload[0].id;
                    state.activeTeamId = defaultTeamId;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('activeTeamId', defaultTeamId.toString());
                    }
                }
            })
            .addCase(fetchTeams.rejected, (state, action) => {
                if (state.teamsRequestId !== action.meta.requestId) return;
                state.teamsLoading = false;
                state.teamsLoaded = true;
                state.teamsRequestId = null;
                state.error = action.payload as string;
            });
    },
});

export const { setActiveWorkspace, setActiveTeam } = workspaceSlice.actions;
export default workspaceSlice.reducer;
