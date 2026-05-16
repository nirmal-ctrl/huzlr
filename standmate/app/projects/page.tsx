"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { DataTable } from "@/components/data-table"
import { DataTableSkeleton } from "@/components/data-table-skeleton"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { SpinnerEmpty } from "@/components/spinner-empty"
import { ConnectedIntegrationsSheet } from "@/components/connected-integrations"
import { JiraImportDialog } from "@/components/jira-import-dialog"
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks"
import { useEffect, useState } from "react"
import { fetchProjects } from "@/lib/redux/slices/projectSlice"
import { fetchPropertyDefinitions } from "@/lib/redux/slices/metaSlice"
// import { useEntitySchema } from "@/hooks/use-entity-schema"
import { buildColumnsFromProperties } from "@/components/properties/table-builder"
import { useMemo } from "react"
import { createActionsColumn, createDragColumn, createSelectColumn } from "@/components/columns/shared"
import { createTitleColumn } from "@/components/properties/table"
import { ColumnDef } from "@tanstack/react-table"

export default function Page() {
  const dispatch = useAppDispatch()
  const { items: data, loading: isLoading, error } = useAppSelector((state) => state.projects)
  const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
  const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
  const properties = useAppSelector((state) => state.meta.propertyDefinitions['project'])
  const viewState = useAppSelector((state) => state.view.views['project'])
  const layout = viewState?.layout || 'list'
  const isPropertiesLoading = useAppSelector((state) => state.meta.loading['project'] ?? true)
  const isPageLoading = isLoading || isPropertiesLoading
  const user = useAppSelector((state) => state.auth.user)
  const [jiraImportOpen, setJiraImportOpen] = useState(false)

  // Fetch projects and properties on mount and when team/workspace changes
  useEffect(() => {
    // If activeTeamId exists, it implies activeWorkspaceId exists (and team is more specific).
    // The previous logic fired twice: once when workspace loaded, and again when team loaded sequentially.
    // By only triggering when activeTeamId is present (which the backend requires or prefers anyway),
    // we prevent the double-fetch race condition.
    // Fallback to workspaceId if for some reason a team isn't assigned yet.
    const fetchId = activeTeamId || activeWorkspaceId;
    
    if (fetchId) {
      dispatch(fetchProjects({ 
        workspaceId: activeWorkspaceId, 
        teamId: activeTeamId 
      }))
    }
    
    // fetchPropertyDefinitions is now optimized in the slice to avoid redundant network calls
    dispatch(fetchPropertyDefinitions('project'))
    
    // We purposefully omit activeWorkspaceId from deps to prevent the "waterfall double fetch"
    // because activeTeamId will always update immediately after it in the Redux lifecycle.
  }, [dispatch, activeTeamId])

  const hasConnectedIntegrations = user?.integrations?.jira?.connected || false

  const columns = useMemo(() => {
    if (!properties) return [];

    // Default columns that always exist
    const baseColumns: ColumnDef<any>[] = [
      createDragColumn(),
      createSelectColumn(),
      createTitleColumn("properties.project_title", "Header"), // Always keep header linked to title
    ];

    // Dynamic columns from properties
    const dynamicColumns = buildColumnsFromProperties(properties).filter(col =>
      // Filter out if we have special handling, or just let it be.
      // Status is standard so builder handles it.
      // Title/Header is handled manually above, so filter out if schema has "project_title" or "header"
      !["header", "project_title", "title"].includes((col as any).accessorKey)
    );

    return [
      ...baseColumns,
      ...dynamicColumns,
      createActionsColumn()
    ];
  }, [properties]);

  const isError = !!error;
  console.log(columns, data)
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader entityType="project">
          <Link href="/projects/new">
            <Button size="sm" className="gap-2 rounded-full">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </Link>
        </SiteHeader>
        <div className="flex flex-1 flex-col gap-4 py-4">
          <div className="w-full flex flex-1 flex-col gap-2">
            <div className="flex flex-1 flex-col gap-4 md:gap-6">
              {isPageLoading && <DataTableSkeleton />}

              {isError && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-destructive">
                    Error loading projects: {error?.toString()}
                  </div>
                </div>
              )}

              {data && data.length > 0 ? (
                layout === 'list' ? (
                  <DataTable<any>
                    data={data}
                    getRowId={(row) => row.project_id.toString()}
                    columns={columns}
                    entityType="project"
                  />
                ) : (
                  <KanbanBoard 
                    data={data}
                    columns={columns}
                    entityType="project"
                  />
                )
              ) : (
                // Only show empty state if not loading and no data
                !isPageLoading && !isError && (
                  <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-1 text-center">




                      <h3 className="text-base font-medium tracking-tight">
                        Start planning your projects
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Bring existing work or start fresh. huzlr helps you think, plan,execute, moitor and predict outcomes.
                      </p>

                      <div className="mt-4 flex items-center gap-4">
                        <Link href="/projects/new">
                          <Button className="gap-2 rounded-full cursor-pointer">
                            <Plus className="h-4 w-4" />
                            Start from Scratch
                          </Button>
                        </Link>
                        <ConnectedIntegrationsSheet
                          onImportClick={(integration) => {
                            if (integration === "jira") {
                              setJiraImportOpen(true)
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Jira Import Dialog */}
      <JiraImportDialog
        open={jiraImportOpen}
        onOpenChange={setJiraImportOpen}
      />
    </SidebarProvider>
  )
}
