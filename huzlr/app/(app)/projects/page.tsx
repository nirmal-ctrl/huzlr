"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

import { SiteHeader } from "@/components/site-header"
import { DataTable } from "@/components/data-table"
import { DataTableSkeleton } from "@/components/data-table-skeleton"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { ConnectedIntegrationsSheet } from "@/components/connected-integrations"
import { JiraImportDialog } from "@/components/jira-import-dialog"
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks"
import { useEffect, useState } from "react"
import { fetchProjects } from "@/lib/redux/slices/projectSlice"
import { fetchPropertyDefinitions } from "@/lib/redux/slices/metaSlice"
import { buildColumnsFromProperties } from "@/components/properties/table-builder"
import { useMemo } from "react"
import { createActionsColumn, createDragColumn, createSelectColumn } from "@/components/columns/shared"
import { createTitleColumn } from "@/components/properties/table"
import { ColumnDef } from "@tanstack/react-table"
import { WorkspaceSetupState } from "@/components/workspace-setup-state"

export default function Page() {
  const dispatch = useAppDispatch()
  const { items: data, loading: isLoading, error } = useAppSelector((state) => state.projects)
  const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
  const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
  const workspaces = useAppSelector((state) => state.workspace.workspaces)
  const teams = useAppSelector((state) => state.workspace.teams)
  const properties = useAppSelector((state) => state.meta.propertyDefinitions['project'])
  const viewState = useAppSelector((state) => state.view.views['project'])
  const layout = viewState?.layout || 'list'
  const isPropertiesLoading = useAppSelector((state) => state.meta.loading['project'] ?? true)
  const isPageLoading = isLoading || isPropertiesLoading
  const user = useAppSelector((state) => state.auth.user)
  const [jiraImportOpen, setJiraImportOpen] = useState(false)
  const hasWorkspace = workspaces.some((workspace) => workspace.id === activeWorkspaceId)
  const hasTeam = teams.some(
    (team) => team.id === activeTeamId && team.workspace_id === activeWorkspaceId,
  )
  const canCreateProject = hasWorkspace && hasTeam

  // Fetch projects and properties on mount and when team/workspace changes
  useEffect(() => {
    if (canCreateProject) {
      dispatch(fetchProjects({ 
        workspaceId: activeWorkspaceId,
        teamId: activeTeamId
      }))
    }
    
    dispatch(fetchPropertyDefinitions('project'))
  }, [dispatch, activeTeamId, activeWorkspaceId, canCreateProject])

  const columns = useMemo(() => {
    if (!properties) return [];

    // Default columns that always exist
    const baseColumns: ColumnDef<any>[] = [
      createDragColumn(),
      createSelectColumn(),
      createTitleColumn("properties.project_title", "Header"), // Always keep header linked to title
    ];

    // Dynamic columns from properties
    const dynamicColumns = buildColumnsFromProperties(properties).filter(col => {
      const accessor = (col as any).accessorKey;
      return !["header", "project_title", "title", "properties.project_title"].includes(accessor);
    });

    return [
      ...baseColumns,
      ...dynamicColumns,
      createActionsColumn()
    ];
  }, [properties]);

  const isError = !!error;

  return (
    <>
      <SiteHeader entityType="project">
        {canCreateProject && (
          <Link href="/projects/new">
            <Button size="sm" className="gap-2 rounded-full">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </Link>
        )}
      </SiteHeader>
      <div className="flex flex-1 flex-col gap-4 py-4">
        <div className="w-full flex flex-1 flex-col gap-2">
          <div className="flex flex-1 flex-col gap-4 md:gap-6">
            {!canCreateProject ? (
              <WorkspaceSetupState />
            ) : isPageLoading ? (
              <DataTableSkeleton />
            ) : isError ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-destructive">
                  Error loading projects: {error?.toString()}
                </div>
              </div>
            ) : data && data.length > 0 ? (
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
            )}
          </div>
        </div>
      </div>

      {/* Jira Import Dialog */}
      <JiraImportDialog
        open={jiraImportOpen}
        onOpenChange={setJiraImportOpen}
      />
    </>
  )
}
