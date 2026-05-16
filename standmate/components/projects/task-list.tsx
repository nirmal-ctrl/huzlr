"use client"

import React, { useMemo } from "react"
import { Task } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { DataTableSkeleton } from "@/components/data-table-skeleton"
import { ColumnDef } from "@tanstack/react-table"
import { buildColumnsFromProperties } from "@/components/properties/table-builder"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchPropertyDefinitions } from "@/lib/redux/slices/metaSlice"
import { CheckCircle2, Trash2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskDetailsDrawer } from "./task-details-drawer"

interface TaskListProps {
    tasks: Task[]
    projectId?: number
    isLoading: boolean
    onUpdateTask: (taskId: number, updates: Partial<Task>) => void
    onDeleteTask: (taskId: number) => void
}

export function TaskList({ tasks, projectId, isLoading, onUpdateTask, onDeleteTask }: TaskListProps) {
    const dispatch = useAppDispatch()
    
    // Load schema definitions from Redux
    const entityType = "task"
    const schemaDefinitions = useAppSelector(state => state.meta.propertyDefinitions[entityType])
    const isSchemaLoading = useAppSelector(state => state.meta.loading[entityType])
    
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
                        <input 
                            type="text"
                            className={`bg-transparent border-none outline-none focus:ring-0 w-full text-sm ${t.status === "completed" ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}
                            defaultValue={t.title}
                            onBlur={(e) => {
                                if (e.target.value !== t.title) {
                                    onUpdateTask(t.id!, { title: e.target.value })
                                }
                            }}
                        />
                    )
                },
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
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    setSelectedTask(t)
                                    setIsDrawerOpen(true)
                                }}
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onDeleteTask(t.id!)}
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
    }, [schemaDefinitions, onUpdateTask, onDeleteTask])

    if (isLoading || isSchemaLoading) {
        return <DataTableSkeleton rows={3} />
    }

    return (
        <>
            <div className="group/table">
                <DataTable 
                    data={tasks} 
                    columns={columns}
                    entityType="task"
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
