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
    loading: boolean;
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
    loading: false,
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
    },
    {
        condition: (workspaceId, { getState }) => {
            const state = getState() as any;
            // Cancel the fetch if we already have teams for THIS workspace loaded
            if (state.workspace.teams.length > 0 && state.workspace.teams[0].workspace_id === workspaceId) {
                return false;
            }
            return true;
        }
    }
);

const workspaceSlice = createSlice({
    name: 'workspace',
    initialState,
    reducers: {
        setActiveWorkspace: (state, action: PayloadAction<number>) => {
            state.activeWorkspaceId = action.payload;
            state.teams = []; // Reset teams when workspace changes
            state.activeTeamId = null;
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
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchWorkspaces.fulfilled, (state, action) => {
                state.loading = false;
                state.workspaces = action.payload;
                
                // Validate or select active workspace ID
                const exists = action.payload.some(w => w.id === state.activeWorkspaceId);
                if (!exists && action.payload.length > 0) {
                    state.activeWorkspaceId = action.payload[0].id;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('activeWorkspaceId', action.payload[0].id.toString());
                    }
                }
            })
            .addCase(fetchWorkspaces.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createWorkspace.fulfilled, (state, action) => {
                // We set the active workspace to the newly created one
                state.activeWorkspaceId = action.payload.id;
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
            .addCase(fetchTeams.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTeams.fulfilled, (state, action) => {
                state.loading = false;
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
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setActiveWorkspace, setActiveTeam } = workspaceSlice.actions;
export default workspaceSlice.reducer;