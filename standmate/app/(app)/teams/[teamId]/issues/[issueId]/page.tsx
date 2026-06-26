"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, ChevronRight, CornerDownRight, Check, Trash2, MoreHorizontal, Link as LinkIcon, Box, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { useGetIssueQuery, useUpdateIssueMutation, useCreateIssueMutation, useDeleteIssueMutation } from "@/services/issuesApi"
import { InlineEditor } from "@/components/editor/inline-editor"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { ProjectStatusSelector, ProjectPrioritySelector, MemberSelector, DateSelector, LabelSelector } from "@/components/properties/factory"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { SpinnerEmpty } from "@/components/spinner-empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from "@/components/ui/resizable"

export default function IssueDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const teamIdStr = params.teamId as string
    const teamId = parseInt(teamIdStr)
    const issueIdStr = params.issueId as string
    const issueId = parseInt(issueIdStr)

    const { data: issue, isLoading, error } = useGetIssueQuery(issueId, {
        skip: isNaN(issueId)
    })

    const [updateIssue] = useUpdateIssueMutation()
    const [createIssue] = useCreateIssueMutation()
    const [deleteIssue] = useDeleteIssueMutation()

    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [propertiesExpanded, setPropertiesExpanded] = useState(true)
    const [descriptionExpanded, setDescriptionExpanded] = useState(true)

    // We use a ref for high-frequency text updates (title/description) to avoid massive React re-renders on every keystroke
    const textUpdatesRef = useRef<Partial<any>>({})

    useEffect(() => {
        if (issue) {
            setTitle(issue.title || "")
            setDescription(issue.description || "")
            textUpdatesRef.current = {}
        }
    }, [issue])

    const handleUpdateTitle = useCallback(async (newTitle: string) => {
        if (!issue || !newTitle.trim()) return
        setTitle(newTitle)
        textUpdatesRef.current.title = newTitle;
        try {
            await updateIssue({
                issueId: issue.id,
                updates: { title: newTitle },
                teamId,
                projectId: issue.project_id
            }).unwrap()
        } catch (err) {
            console.error("Failed to update title:", err)
        }
    }, [issue, teamId, updateIssue])

    const handleUpdateDescription = useCallback(async (newDesc: string) => {
        if (!issue) return
        setDescription(newDesc)
        textUpdatesRef.current.description = newDesc;
        try {
            await updateIssue({
                issueId: issue.id,
                updates: { description: newDesc },
                teamId,
                projectId: issue.project_id
            }).unwrap()
        } catch (err) {
            console.error("Failed to update description:", err)
        }
    }, [issue, teamId, updateIssue])

    const handleUpdateStatus = useCallback(async (status: string) => {
        if (!issue) return
        try {
            await updateIssue({
                issueId: issue.id,
                updates: { status },
                teamId,
                projectId: issue.project_id
            }).unwrap()
        } catch (err) {
            console.error("Failed to update status:", err)
        }
    }, [issue, teamId, updateIssue])

    const handleUpdatePriority = useCallback(async (priority: string) => {
        if (!issue) return
        try {
            await updateIssue({
                issueId: issue.id,
                updates: {
                    properties: {
                        ...(issue.properties || {}),
                        priority
                    }
                },
                teamId,
                projectId: issue.project_id
            }).unwrap()
        } catch (err) {
            console.error("Failed to update priority:", err)
        }
    }, [issue, teamId, updateIssue])

    const handleUpdateAssignee = useCallback(async (assigneeId: string) => {
        if (!issue) return
        try {
            await updateIssue({
                issueId: issue.id,
                updates: {
                    properties: {
                        ...(issue.properties || {}),
                        assignee: assigneeId
                    }
                },
                teamId,
                projectId: issue.project_id
            }).unwrap()
        } catch (err) {
            console.error("Failed to update assignee:", err)
        }
    }, [issue, teamId, updateIssue])

    const handleUpdateLabels = useCallback(async (labels: any[]) => {
        if (!issue) return
        try {
            await updateIssue({
                issueId: issue.id,
                updates: {
                    properties: {
                        ...(issue.properties || {}),
                        labels
                    }
                },
                teamId,
                projectId: issue.project_id
            }).unwrap()
        } catch (err) {
            console.error("Failed to update labels:", err)
        }
    }, [issue, teamId, updateIssue])

    const handleUpdateDueDate = useCallback(async (dateStr: string | undefined) => {
        if (!issue) return
        try {
            await updateIssue({
                issueId: issue.id,
                updates: {
                    estimated_end_date: dateStr ? dateStr.split("T")[0] : null
                },
                teamId,
                projectId: issue.project_id
            }).unwrap()
        } catch (err) {
            console.error("Failed to update due date:", err)
        }
    }, [issue, teamId, updateIssue])

    const handleDelete = async () => {
        if (!issue) return
        if (confirm("Are you sure you want to delete this issue?")) {
            try {
                await deleteIssue({ issueId: issue.id, projectId: issue.project_id }).unwrap()
                router.push(`/teams/${teamId}/issues`)
            } catch (err) {
                console.error("Failed to delete issue:", err)
            }
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col h-screen overflow-hidden animate-pulse">
                <SiteHeader>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                </SiteHeader>

                <div className="flex-1 flex px-8 py-6 gap-8">
                    <div className="flex-1 space-y-6">
                        <Skeleton className="h-9 w-3/4 rounded-md" />
                        <Skeleton className="h-[210px] w-full rounded-lg" />
                    </div>
                    <div className="w-[300px] space-y-6">
                        <Skeleton className="h-9 w-full rounded-md" />
                        <Skeleton className="h-9 w-full rounded-md" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                </div>
            </div>
        )
    }

    if (!issue) {
        return (
            <div className="flex flex-1 items-center justify-center flex-col gap-4">
                <p className="text-muted-foreground">Issue not found</p>
                <Button onClick={() => router.push(`/teams/${teamId}/issues`)}>Back to Issues</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <SiteHeader>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push(`/teams/${teamId}/issues`)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground font-medium">Issues</span>
                    <span className="text-muted-foreground/30">/</span>
                    <span className="text-sm font-semibold text-foreground">#{issue.id}</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </SiteHeader>

            <div className="flex flex-1 overflow-hidden h-full">
                <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
                    <ResizablePanel defaultSize={75} className="h-full overflow-y-auto">
                        <div className="w-full max-w-5xl px-8 py-6 space-y-8">
                            {/* Title Area */}
                            <div>
                                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                                    <div className="w-10 h-10 border border-dashed rounded-md flex items-center justify-center bg-muted/30">
                                        <Check className="w-5 h-5 text-muted-foreground/50" />
                                    </div>
                                </div>
                                <InlineEditor
                                    value={textUpdatesRef.current.title ?? title ?? ""}
                                    onChange={handleUpdateTitle}
                                    placeholder="Issue title"
                                    className="text-4xl font-semibold leading-tight tracking-tight mt-2"
                                />
                            </div>

                            {/* Inline Properties Row */}
                            <div className="flex flex-wrap items-center gap-2 -ml-2 py-2">
                                <span className="text-sm text-muted-foreground mr-2 ml-2">Properties</span>
                                <ProjectStatusSelector value={issue.status} onChange={handleUpdateStatus} />
                                <ProjectPrioritySelector value={issue.properties?.priority || "None"} onChange={handleUpdatePriority} />
                                <MemberSelector value={issue.properties?.assignee?.toString()} onChange={(v) => handleUpdateAssignee(v as string)} placeholder="Assignee" />

                                <DateSelector
                                    value={issue.estimated_end_date ? String(issue.estimated_end_date) : undefined}
                                    onChange={handleUpdateDueDate}
                                    placeholder="Due date"
                                    className="ml-1"
                                />

                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 gap-1.5 border border-transparent hover:border-border/40 transition-all">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                </Button>
                            </div>

                            <Separator className="border-border/40" />

                            {/* Description Editor */}
                            <div className="mt-8">
                                <div 
                                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                                    className="flex items-center gap-2 mb-4 group cursor-pointer w-fit select-none"
                                >
                                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Description</span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-transform duration-200 ${descriptionExpanded ? "" : "-rotate-90"}`} />
                                </div>
                                {descriptionExpanded && (
                                    <div className="min-h-[200px] animate-in fade-in duration-200">
                                        <TiptapEditor
                                            value={textUpdatesRef.current.description ?? description ?? ""}
                                            onChange={handleUpdateDescription}
                                            placeholder="Add a detailed description..."
                                            className="prose-lg text-foreground/90 max-w-none"
                                        />
                                    </div>
                                )}
                            </div>

                            <Separator className="border-border/40" />

                            {/* Subtasks Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-foreground tracking-wide">Subtasks</h3>
                                <SubtaskTreeSection 
                                    parentIssue={issue} 
                                    teamId={teamId} 
                                    projectId={issue.project_id} 
                                    createIssue={createIssue}
                                    updateIssue={updateIssue}
                                    router={router}
                                />
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="hidden md:flex bg-border/40" />

                    <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="h-full hidden md:block border-l bg-accent/5">
                        <div className="h-full overflow-y-auto">
                            <div className="p-6 space-y-8">
                                {/* Properties Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between group mb-4 select-none">
                                        <h4 
                                            onClick={() => setPropertiesExpanded(!propertiesExpanded)}
                                            className="text-sm font-medium flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors"
                                        >
                                            Properties <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${propertiesExpanded ? "" : "-rotate-90"}`} />
                                        </h4>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>

                                    {propertiesExpanded && (
                                        <div className="space-y-4 animate-in fade-in duration-200">
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-muted-foreground text-xs w-20">Status</span>
                                                <ProjectStatusSelector value={issue.status} onChange={handleUpdateStatus} className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-muted-foreground text-xs w-20">Priority</span>
                                                <ProjectPrioritySelector value={issue.properties?.priority || "None"} onChange={handleUpdatePriority} className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-muted-foreground text-xs w-20">Assignee</span>
                                                <MemberSelector value={issue.properties?.assignee?.toString()} onChange={(v) => handleUpdateAssignee(v as string)} placeholder="Assignee" className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-muted-foreground text-xs w-20">Due date</span>
                                                <DateSelector value={issue.estimated_end_date ? String(issue.estimated_end_date) : undefined} onChange={handleUpdateDueDate} placeholder="Due date" className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-muted-foreground text-xs w-20">Labels</span>
                                                <LabelSelector value={((issue.properties?.labels || []) as any[]).map(l => l.toString())} onChange={(v) => handleUpdateLabels(Array.isArray(v) ? v : [v])} className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    )
}

/* Recursive Subtask Tree Component */
interface SubtaskTreeSectionProps {
    parentIssue: any
    teamId: number
    projectId: number
    createIssue: any
    updateIssue: any
    router: any
    depth?: number
}

function SubtaskTreeSection({
    parentIssue,
    teamId,
    projectId,
    createIssue,
    updateIssue,
    router,
    depth = 0
}: SubtaskTreeSectionProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [subtaskTitle, setSubtaskTitle] = useState("")

    const handleCreateSubtask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!subtaskTitle.trim()) return
        try {
            await createIssue({
                projectId,
                issue: {
                    title: subtaskTitle,
                    project_id: projectId,
                    parent_id: parentIssue.id,
                    status: "pending",
                    properties: {
                        priority: "None"
                    }
                }
            }).unwrap()
            setSubtaskTitle("")
            setIsCreating(false)
        } catch (err) {
            console.error("Failed to create subtask:", err)
        }
    }

    const subtasks = parentIssue.subtasks || []

    return (
        <div className="space-y-2.5">
            {/* Subtasks List */}
            {subtasks.length > 0 && (
                <div className="space-y-3">
                    {subtasks.map((sub: any) => (
                        <div key={sub.id} className="border-l-2 border-primary/20 pl-4 space-y-3">
                            <div className="flex items-center justify-between gap-3 group bg-muted/20 hover:bg-muted/40 p-2.5 rounded-lg transition-all border border-border/30">
                                <div className="flex items-center gap-2">
                                    <CornerDownRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                                    <button 
                                        className="text-xs font-semibold text-foreground hover:underline hover:text-primary text-left"
                                        onClick={() => router.push(`/teams/${teamId}/issues/${sub.id}`)}
                                    >
                                        #{sub.id} - {sub.title}
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <ProjectStatusSelector
                                        value={sub.status}
                                        onChange={async (newStatus) => {
                                            try {
                                                await updateIssue({
                                                    issueId: sub.id,
                                                    updates: { status: newStatus },
                                                    teamId,
                                                    projectId
                                                }).unwrap()
                                            } catch (err) {
                                                console.error(err)
                                            }
                                        }}
                                        className="h-6 text-[10px] px-1.5 border-none shadow-none bg-transparent"
                                    />
                                </div>
                            </div>
                            
                            {/* Recursively Render nested children subtasks */}
                            <SubtaskTreeSection 
                                parentIssue={sub}
                                teamId={teamId}
                                projectId={projectId}
                                createIssue={createIssue}
                                updateIssue={updateIssue}
                                router={router}
                                depth={depth + 1}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Create Subtask Control */}
            {isCreating ? (
                <form onSubmit={handleCreateSubtask} className="flex items-center gap-2 border-l-2 border-dashed border-primary/30 pl-4">
                    <Input
                        value={subtaskTitle}
                        onChange={(e) => setSubtaskTitle(e.target.value)}
                        placeholder="What needs to be done?"
                        className="h-8 text-xs bg-muted/20 border-border/60 focus:ring-1 focus:ring-primary/20 shadow-none px-2.5"
                        autoFocus
                    />
                    <Button type="submit" size="sm" className="h-8 px-3 text-xs">Add</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setIsCreating(false)}>Cancel</Button>
                </form>
            ) : (
                <button 
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-semibold pl-4 transition-colors duration-150"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add subtask...</span>
                </button>
            )}
        </div>
    )
}
