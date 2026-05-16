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

const initialState: WorkspaceState = {
    workspaces: [],
    activeWorkspaceId: null,
    teams: [],
    activeTeamId: null,
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
            
            // After creating a workspace, fetch all again
            await dispatch(fetchWorkspaces());
            return data as Workspace;
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
            state.activeWorkspaceId = action.payload;
            state.teams = []; // Reset teams when workspace changes
            state.activeTeamId = null;
        },
        setActiveTeam: (state, action: PayloadAction<number>) => {
            state.activeTeamId = action.payload;
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
                
                // Auto-select first workspace if none selected and we have workspaces
                if (action.payload.length > 0 && !state.activeWorkspaceId) {
                    state.activeWorkspaceId = action.payload[0].id;
                }
            })
            .addCase(fetchWorkspaces.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createWorkspace.fulfilled, (state, action) => {
                // We set the active workspace to the newly created one
                state.activeWorkspaceId = action.payload.id;
            })
            .addCase(fetchTeams.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTeams.fulfilled, (state, action) => {
                state.loading = false;
                state.teams = action.payload;
                
                // Auto-select General team if none selected
                if (action.payload.length > 0 && !state.activeTeamId) {
                    const generalTeam = action.payload.find(t => t.is_default);
                    state.activeTeamId = generalTeam ? generalTeam.id : action.payload[0].id;
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