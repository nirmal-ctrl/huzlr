import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
    ProjectProperties,
    ProjectCreate,
    ProjectResponse,
    Project
} from '../../types';

// Re-export for convenience
export type { ProjectProperties, ProjectCreate, ProjectResponse, Project };

interface ProjectState {
    items: Project[];
    loading: boolean;
    error: string | null;
    lastFetchedWorkspaceId: number | null;
    lastFetchedTeamId: number | null;
}

const initialState: ProjectState = {
    items: [],
    loading: true,  // Start with loading true to prevent empty state flash
    error: null,
    lastFetchedWorkspaceId: null,
    lastFetchedTeamId: null,
};

export const fetchProjects = createAsyncThunk(
    'projects/fetchAll',
    async ({ workspaceId, teamId }: { workspaceId?: number | null, teamId?: number | null }, { getState, rejectWithValue }) => {
        try {
            const state = getState() as any;
            const token = state.auth.token || localStorage.getItem('token');

            if (!token) return rejectWithValue('No token found');

            const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/projects/`);
            if (teamId) {
                url.searchParams.append('team_id', teamId.toString());
            }
            if (workspaceId) {
                url.searchParams.append('workspace_id', workspaceId.toString());
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch projects');
            }

            const data = await response.json();
            return {
                data: data as Project[],
                workspaceId,
                teamId
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    },
    {
        condition: ({ workspaceId, teamId }, { getState }) => {
            const state = getState() as any;
            // Cancel the fetch if we already have projects loaded for THIS exact context
            if (
                state.projects.items.length > 0 && 
                !state.projects.error &&
                state.projects.lastFetchedWorkspaceId === workspaceId &&
                state.projects.lastFetchedTeamId === teamId
            ) {
                return false;
            }
            return true;
        }
    }
);

export const fetchProjectById = createAsyncThunk(
    'projects/fetchById',
    async (projectId: string | number, { getState, rejectWithValue }) => {
        try {
            const state = getState() as any;
            const token = state.auth.token || localStorage.getItem('token');

            if (!token) return rejectWithValue('No token found');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch project details');
            }

            const data = await response.json();
            return data as Project;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createProject = createAsyncThunk(
    'projects/create',
    async (projectData: ProjectCreate, { getState, rejectWithValue }) => {
        try {
            const state = getState() as any;
            const token = state.auth.token || localStorage.getItem('token');

            if (!token) return rejectWithValue('No token found');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(projectData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create project');
            }

            const data = await response.json();
            return data as Project;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateProject = createAsyncThunk(
    'projects/update',
    async ({ projectId, updates }: { projectId: string | number, updates: Partial<ProjectProperties> }, { getState, rejectWithValue }) => {
        try {
            const state = getState() as any;
            const token = state.auth.token || localStorage.getItem('token');

            if (!token) return rejectWithValue('No token found');

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // Send only the delta update (modified properties) to keep integration atomic
                body: JSON.stringify({ properties: updates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update project');
            }

            const data = await response.json();
            return data as Project;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// Thunk to handle importing multiple Jira projects
const projectSlice = createSlice({
    name: 'projects',
    initialState,
    reducers: {
        clearProjectError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Projects
            .addCase(fetchProjects.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.items = [];
            })
            .addCase(fetchProjects.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.data;
                state.lastFetchedWorkspaceId = action.payload.workspaceId ?? null;
                state.lastFetchedTeamId = action.payload.teamId ?? null;
            })
            .addCase(fetchProjects.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch Single Project
            .addCase(fetchProjectById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProjectById.fulfilled, (state, action) => {
                state.loading = false;
                // If the project already exists in items, update it; otherwise add it
                const existingIndex = state.items.findIndex(p => p.project_id === action.payload.project_id);
                if (existingIndex >= 0) {
                    state.items[existingIndex] = action.payload;
                } else {
                    state.items.push(action.payload);
                }
            })
            .addCase(fetchProjectById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Create Project
            .addCase(createProject.pending, (state) => {
                // We don't necessarily want to show global loading for create, 
                // typically this is handled by local component loading state or 'importing' state
            })
            .addCase(createProject.fulfilled, (state, action) => {
                state.items.push(action.payload);
            })
            // Update Project
            .addCase(updateProject.fulfilled, (state, action) => {
                const existingIndex = state.items.findIndex(p => p.project_id === action.payload.project_id);
                if (existingIndex >= 0) {
                    state.items[existingIndex] = action.payload;
                }
            });
    },
});

export const { clearProjectError } = projectSlice.actions;
export default projectSlice.reducer;