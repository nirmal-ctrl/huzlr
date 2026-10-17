import { configureStore, combineReducers, createListenerMiddleware, type UnknownAction } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import projectReducer from './slices/projectSlice'
import jiraReducer from './slices/jiraSlice'
import metaReducer from './slices/metaSlice'
import { baseApi } from '@/services/baseApi'
import viewReducer from './slices/viewSlice'
import workspaceReducer from './slices/workspaceSlice'

const appReducer = combineReducers({
        // Add the generated reducer as a specific top-level slice
        // [projectsApi.reducerPath]: projectsApi.reducer, // Deprecated in favor of projectSlice
        projects: projectReducer,
        jira: jiraReducer,
        auth: authReducer,
        meta: metaReducer,
        view: viewReducer,
        workspace: workspaceReducer,
        [baseApi.reducerPath]: baseApi.reducer,
})
const privacyListener = createListenerMiddleware()
privacyListener.startListening({
    predicate: (_action, current, previous) =>
        (current as ReturnType<typeof appReducer>).auth.user?.id !== (previous as ReturnType<typeof appReducer>).auth.user?.id,
    effect: (_action, api) => { api.dispatch(baseApi.util.resetApiState()) },
})

export const store = configureStore({
    reducer: (state: ReturnType<typeof appReducer> | undefined, action: UnknownAction) =>
        appReducer(action.type === 'auth/logout' ? undefined : state, action),
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(privacyListener.middleware).concat(baseApi.middleware),
})


// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
