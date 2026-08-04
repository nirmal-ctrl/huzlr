import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import projectReducer from './slices/projectSlice'
import jiraReducer from './slices/jiraSlice'
import metaReducer from './slices/metaSlice'
import { baseApi } from '@/services/baseApi'
import viewReducer from './slices/viewSlice'
import workspaceReducer from './slices/workspaceSlice'

export const store = configureStore({
    reducer: {
        // Add the generated reducer as a specific top-level slice
        // [projectsApi.reducerPath]: projectsApi.reducer, // Deprecated in favor of projectSlice
        projects: projectReducer,
        jira: jiraReducer,
        auth: authReducer,
        meta: metaReducer,
        view: viewReducer,
        workspace: workspaceReducer,
        [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
})


// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
