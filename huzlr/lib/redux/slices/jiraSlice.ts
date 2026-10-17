import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { jiraRequest, JiraSpace } from '@/lib/jira-api';

export type JiraProject = JiraSpace;
interface JiraState { projects: JiraProject[]; loading: boolean; error: string | null; siteId: string | null }
const initialState: JiraState = { projects: [], loading: false, error: null, siteId: null };

export const fetchJiraProjects = createAsyncThunk('jira/fetchProjects', async (cloudId: string, { rejectWithValue, signal }) => {
  try {
    return await jiraRequest<JiraSpace[]>(`/sites/${encodeURIComponent(cloudId)}/spaces`, { signal });
  } catch (error) { return rejectWithValue(error instanceof Error ? error.message : 'Failed to discover Jira spaces'); }
});

const jiraSlice = createSlice({
  name: 'jira', initialState,
  reducers: { clearJiraError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder.addCase(fetchJiraProjects.pending, (state, action) => {
      state.loading = true; state.error = null; state.projects = []; state.siteId = action.meta.arg;
    }).addCase(fetchJiraProjects.fulfilled, (state, action) => {
      if (state.siteId !== action.meta.arg) return;
      state.loading = false; state.projects = action.payload;
    }).addCase(fetchJiraProjects.rejected, (state, action) => {
      if (state.siteId !== action.meta.arg) return;
      state.loading = false; state.error = action.payload as string;
    });
  },
});
export const { clearJiraError } = jiraSlice.actions;
export default jiraSlice.reducer;
