"use client"

import React, { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Task } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { buildColumnsFromProperties } from "@/components/properties/table-builder"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchPropertyDefinitions } from "@/lib/redux/slices/metaSlice"
import { CheckCircle2, Trash2, Maximize2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskDetailsDrawer } from "./task-details-drawer"
import { ProjectIdentity } from "./project-identity"

interface TaskListProps {
    tasks: Task[]
    projectId?: number
    isLoading: boolean
    onUpdateTask: (taskId: number, updates: Partial<Task>) => void
    onDeleteTask: (taskId: number) => void
}

export function TaskList({ tasks, projectId, isLoading, onUpdateTask, onDeleteTask }: TaskListProps) {
    const dispatch = useAppDispatch()
    const params = useParams()
    const router = useRouter()
    const teamId = params.teamId as string

    const entityType = "task"
    const schemaDefinitions = useAppSelector(state => state.meta.propertyDefinitions[entityType])
    const isSchemaLoading = useAppSelector(state => state.meta.loading[entityType])
    const projects = useAppSelector(state => state.projects.items)

    const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

    React.useEffect(() => {
        if (!schemaDefinitions && !isSchemaLoading) {
            dispatch(fetchPropertyDefinitions(entityType))
        }
    }, [dispatch, schemaDefinitions, isSchemaLoading])

    const columns = useMemo<ColumnDef<Task>[]>(() => {
        const baseColumns: ColumnDef<Task>[] = [
            {
                id: "completion",
                header: "",
                cell: ({ row }) => {
                    const t = row.original
                    return (
                        <button
                            className="shrink-0 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                            onClick={() => onUpdateTask(t.id!, { status: t.status === "completed" ? "pending" : "completed" })}
                        >
                            {t.status === "completed" ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                            )}
                        </button>
                    )
                },
                size: 40,
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "title",
                header: "Title",
                cell: ({ row }) => {
                    const t = row.original
                    return (
                        <button
                            onClick={() => {
                                const project = projects.find(p => p.project_id === t.project_id)
                                const resolvedTeamId = teamId || project?.team_id
                                if (resolvedTeamId) {
                                    router.push(`/teams/${resolvedTeamId}/issues/${t.id}`)
                                } else {
                                    console.error("Could not resolve team ID for issue redirect")
                                }
                            }}
                            className="bg-transparent border-none outline-none focus:ring-0 text-left cursor-pointer block w-full truncate group/title"
                        >
                            <span className={`text-sm group-hover/title:underline transition-all ${t.status === "completed" ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}>
                                {t.title}
                            </span>
                        </button>
                    )
                },
            },
            {
                id: "project",
                header: "Project",
                cell: ({ row }) => {
                    const project = projects.find((item) => item.project_id === row.original.project_id)
                    const projectName = project?.properties?.project_title

                    return (
                        <button
                            type="button"
                            onClick={() => router.push(`/projects/${row.original.project_id}`)}
                            className="max-w-48 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                            title={projectName || `Project #${row.original.project_id}`}
                        >
                            <ProjectIdentity
                                projectId={row.original.project_id}
                                projectName={projectName}
                            />
                        </button>
                    )
                },
                size: 180,
            },
        ]

        const dynamicColumns = schemaDefinitions
            ? buildColumnsFromProperties<Task>(schemaDefinitions)
            : []

        const actionColumns: ColumnDef<Task>[] = [
            {
                id: "actions",
                header: "",
                cell: ({ row }) => {
                    const t = row.original
                    return (
                        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 sm:h-6 sm:w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    const project = projects.find(p => p.project_id === t.project_id)
                                    const resolvedTeamId = teamId || project?.team_id
                                    if (resolvedTeamId) {
                                        router.push(`/teams/${resolvedTeamId}/issues/${t.id}`)
                                    }
                                }}
                                aria-label="Open issue"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 sm:h-6 sm:w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onDeleteTask(t.id!)}
                                aria-label="Delete issue"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )
                },
                size: 70,
            }
        ]

        return [...baseColumns, ...dynamicColumns, ...actionColumns]
    }, [schemaDefinitions, onUpdateTask, onDeleteTask, projects, router, teamId])

    if (isLoading || isSchemaLoading) {
        return (
            <div className="flex min-h-[240px] flex-1 items-center justify-center" role="status" aria-label="Loading issues">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <>
            <div className="group/table min-w-0 w-full">
                <DataTable
                    data={tasks}
                    columns={columns}
                    entityType="task"
                    showDisplayOptions={false}
                    getRowId={(row) => row.id!.toString()}
                />
            </div>

            <TaskDetailsDrawer
                task={selectedTask}
                open={isDrawerOpen}
                onOpenChange={(open) => {
                    setIsDrawerOpen(open)
                    if (!open) setTimeout(() => setSelectedTask(null), 300)
                }}
                onUpdateTask={(taskId, updates) => {
                    onUpdateTask(taskId, updates)
                    if (selectedTask && selectedTask.id === taskId) {
                        setSelectedTask({ ...selectedTask, ...updates, properties: { ...selectedTask.properties, ...updates.properties } })
                    }
                }}
            />
        </>
    )
}
