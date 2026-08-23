"use client"

import * as React from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Maximize2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ProjectDetailsDrawer } from "@/components/project-details-drawer"
import { useAppDispatch } from "@/lib/redux/hooks"
import { updateProject } from "@/lib/redux/slices/projectSlice"

import {
    ProjectStatusSelector,
    ProjectPrioritySelector,
    MemberSelector,
    DateSelector,
    LabelSelector
} from "./factory"

// ----------------------------------------------------------------------
// Cell Wrapper Components for React Hooks Compatibility in TanStack
// ----------------------------------------------------------------------

function StatusCell({ row, value, accessorKey }: { row: any; value: string; accessorKey: string }) {
    const dispatch = useAppDispatch()
    const projectId = row.original.project_id || row.original.id
    const key = accessorKey.split(".")[1] || accessorKey
    return (
        <ProjectStatusSelector
            value={value}
            onChange={(val) => {
                dispatch(updateProject({ projectId, updates: { [key]: val } }))
            }}
        />
    )
}

function PriorityCell({ row, value, accessorKey }: { row: any; value: string; accessorKey: string }) {
    const dispatch = useAppDispatch()
    const projectId = row.original.project_id || row.original.id
    const key = accessorKey.split(".")[1] || accessorKey
    return (
        <ProjectPrioritySelector
            value={value}
            onChange={(val) => {
                dispatch(updateProject({ projectId, updates: { [key]: val } }))
            }}
        />
    )
}

function MemberCell({ row, value, accessorKey, multiple = false }: { row: any; value: string | string[]; accessorKey: string; multiple?: boolean }) {
    const dispatch = useAppDispatch()
    const projectId = row.original.project_id || row.original.id
    const key = accessorKey.split(".")[1] || accessorKey
    return (
        <MemberSelector
            value={value}
            multiple={multiple}
            onChange={(val) => {
                dispatch(updateProject({ projectId, updates: { [key]: val } }))
            }}
        />
    )
}

function DateCell({ row, value, accessorKey }: { row: any; value: string | undefined; accessorKey: string }) {
    const dispatch = useAppDispatch()
    const projectId = row.original.project_id || row.original.id
    const key = accessorKey.split(".")[1] || accessorKey
    return (
        <DateSelector
            value={value}
            onChange={(val) => {
                dispatch(updateProject({ projectId, updates: { [key]: val } }))
            }}
        />
    )
}

function LabelCell({ row, value, accessorKey }: { row: any; value: string[]; accessorKey: string }) {
    const dispatch = useAppDispatch()
    const projectId = row.original.project_id || row.original.id
    const key = accessorKey.split(".")[1] || accessorKey
    return (
        <LabelSelector
            value={value}
            onChange={(val) => {
                dispatch(updateProject({ projectId, updates: { [key]: val } }))
            }}
        />
    )
}

function InputCell({ row, value, accessorKey, header }: { row: any; value: string | number; accessorKey: string; header: string }) {
    const dispatch = useAppDispatch()
    const projectId = row.original.project_id || row.original.id
    const key = accessorKey.split(".")[1] || accessorKey
    const id = row.id

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const input = form.elements.namedItem(`${id}-${accessorKey}`) as HTMLInputElement
                const val = input.value
                toast.promise(
                    dispatch(updateProject({ projectId, updates: { [key]: val } })).unwrap(),
                    {
                        loading: `Saving ${header}...`,
                        success: `${header} saved!`,
                        error: `Failed to save ${header}`,
                    }
                )
            }}
        >
            <Label htmlFor={`${id}-${accessorKey}`} className="sr-only">
                {header}
            </Label>
            <Input
                className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent"
                defaultValue={value}
                id={`${id}-${accessorKey}`}
                name={`${id}-${accessorKey}`}
            />
        </form>
    )
}

// ----------------------------------------------------------------------
// Factory Configurations
// ----------------------------------------------------------------------

// Factory for Status Column
export function createStatusColumn<TData>(accessorKey: string, header: string = "Status"): ColumnDef<TData> {
    return {
        accessorKey,
        header,
        cell: ({ row, getValue }) => {
            const status = getValue() as string
            return <StatusCell row={row} value={status} accessorKey={accessorKey} />
        },
    }
}

// Factory for Priority Column
export function createPriorityColumn<TData>(accessorKey: string, header: string = "Priority"): ColumnDef<TData> {
    return {
        accessorKey,
        header,
        cell: ({ row, getValue }) => {
            const priority = getValue() as string
            return <PriorityCell row={row} value={priority} accessorKey={accessorKey} />
        },
    }
}

// Factory for Badge Column (e.g. Type)
export function createBadgeColumn<TData>(accessorKey: string, header: string): ColumnDef<TData> {
    return {
        accessorKey,
        header,
        cell: ({ getValue }) => {
            const value = getValue() as string
            return (
                <div className="w-32">
                    <Badge variant="outline" className="text-muted-foreground px-1.5">
                        {value}
                    </Badge>
                </div>
            )
        },
    }
}

// Factory for Input Column (e.g. Target, Limit)
export function createInputColumn<TData>(accessorKey: string, header: string): ColumnDef<TData> {
    return {
        accessorKey,
        header: () => <div className="w-full text-right">{header}</div>,
        cell: ({ row, getValue }) => {
            const value = getValue() as string | number
            return <InputCell row={row} value={value} accessorKey={accessorKey} header={header} />
        },
    }
}

// Factory for Member Column (Single)
export function createMemberColumn<TData>(accessorKey: string, header: string = "Lead"): ColumnDef<TData> {
    return {
        accessorKey,
        header,
        cell: ({ row, getValue }) => {
            const value = getValue() as string | undefined
            return <MemberCell row={row} value={value || ""} accessorKey={accessorKey} />
        },
    }
}

// Factory for Members Column (Multi)
export function createMembersColumn<TData>(accessorKey: string, header: string = "Members"): ColumnDef<TData> {
    return {
        accessorKey,
        header,
        cell: ({ row, getValue }) => {
            const value = getValue() as string[] | undefined
            return <MemberCell row={row} value={value || []} accessorKey={accessorKey} multiple />
        },
    }
}

// Factory for Date Column
export function createDateColumn<TData>(accessorKey: string, header: string = "Date"): ColumnDef<TData> {
    return {
        accessorKey,
        header,
        cell: ({ row, getValue }) => {
            const value = getValue() as string | undefined
            return <DateCell row={row} value={value} accessorKey={accessorKey} />
        },
    }
}

// Factory for Labels Column
export function createLabelsColumn<TData>(accessorKey: string, header: string = "Labels"): ColumnDef<TData> {
    return {
        accessorKey,
        header,
        cell: ({ row, getValue }) => {
            const value = getValue() as string[] | undefined
            return <LabelCell row={row} value={value || []} accessorKey={accessorKey} />
        },
    }
}

// Factory for Text Column (Summary)
export function createTextColumn<TData>(accessorKey: string, header: string): ColumnDef<TData> {
    return {
        accessorKey,
        header,
        cell: ({ getValue }) => {
            const value = getValue() as string
            return (
                <div className="truncate max-w-[200px] text-muted-foreground" title={value}>
                    {value}
                </div>
            )
        },
    }
}

// Factory for Rich Text Column (Description, etc.)
export function createRichTextColumn<TData>(accessorKey: string, header: string): ColumnDef<TData> {
    return {
        accessorKey,
        header,
        cell: ({ getValue }) => {
            const value = getValue() as string
            if (!value) return null

            // Strip HTML to show a plain text preview in the cell
            const tempDiv = document.createElement("div")
            tempDiv.innerHTML = value
            const plainTextPreview = tempDiv.textContent || tempDiv.innerText || ""

            return (
                <div className="flex items-center gap-2">
                    <div
                        className="truncate max-w-[200px] text-muted-foreground"
                        title={plainTextPreview}
                    >
                        {plainTextPreview}
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100">
                                <Maximize2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Expand content</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-6 sm:max-w-[700px]">
                            <DialogHeader>
                                <DialogTitle className="text-xl">{header}</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                                <div
                                    className="prose prose-sm dark:prose-invert whitespace-pre-wrap max-w-none text-muted-foreground"
                                    dangerouslySetInnerHTML={{ __html: value }}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            )
        },
    }
}

// Factory for the Header/Title Column (with Link to project details)
export function createTitleColumn<TData>(accessorKey: string, header: string = "Header"): ColumnDef<TData> {
    return {
        accessorKey,
        header,
        cell: ({ row }) => {
            const item = row.original as any;
            const projectId = item.project_id || item.id;
            const title = item.properties?.project_title || "Untitled Project";
            const isDraft = Boolean(item.properties?.is_draft);

            return (
                <Link
                    href={`/projects/${projectId}`}
                    className="flex items-center gap-2 text-foreground font-medium hover:underline"
                >
                    <span>{title}</span>
                    {isDraft && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium uppercase tracking-wide">
                            Draft
                        </Badge>
                    )}
                </Link>
            )
        },
        enableHiding: false,
    }
}
