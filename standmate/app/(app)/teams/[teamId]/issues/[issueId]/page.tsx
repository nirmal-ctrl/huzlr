"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, ChevronRight, CornerDownRight, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { useGetIssueQuery, useUpdateIssueMutation, useCreateIssueMutation, useDeleteIssueMutation } from "@/services/issuesApi"
import { InlineEditor } from "@/components/editor/inline-editor"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { ProjectStatusSelector, ProjectPrioritySelector, MemberSelector } from "@/components/properties/factory"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { SpinnerEmpty } from "@/components/spinner-empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

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

    useEffect(() => {
        if (issue) {
            setTitle(issue.title || "")
            setDescription(issue.description || "")
        }
    }, [issue])

    const handleUpdateTitle = useCallback(async (newTitle: string) => {
        if (!issue || !newTitle.trim()) return
        setTitle(newTitle)
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

    const handleUpdateLead = useCallback(async (leadId: string) => {
        if (!issue) return
        try {
            await updateIssue({
                issueId: issue.id,
                updates: {
                    properties: {
                        ...(issue.properties || {}),
                        lead_id: leadId
                    }
                },
                teamId,
                projectId: issue.project_id
            }).unwrap()
        } catch (err) {
            console.error("Failed to update lead:", err)
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
            <div className="flex flex-col h-full bg-background animate-pulse">
                <SiteHeader>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-12" />
                        <span className="text-muted-foreground/30">/</span>
                        <Skeleton className="h-4 w-8" />
                    </div>
                </SiteHeader>

                <div className="flex-1 px-8 py-6 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-9 w-3/4 rounded-md" />
                        </div>

                        <Separator className="border-border/30" />

                        {/* Description */}
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-[210px] w-full rounded-lg" />
                        </div>

                        <Separator className="border-border/30" />

                        {/* Recursive Subtasks Area */}
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-20" />
                            <div className="space-y-3">
                                <Skeleton className="h-12 w-full rounded-lg" />
                                <Skeleton className="h-12 w-full rounded-lg" />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Properties */}
                    <div className="space-y-6 bg-muted/10 border border-border/30 rounded-xl p-5 h-fit">
                        <Skeleton className="h-4 w-24 mb-4" />
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-9 w-full rounded-md" />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-9 w-full rounded-md" />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-9 w-full rounded-md" />
                            </div>
                        </div>
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
        <div className="flex flex-col h-full bg-background">
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

            <div className="flex-1 overflow-y-auto px-8 py-6 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-2">
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                            <InlineEditor
                                value={title}
                                onChange={handleUpdateTitle}
                                placeholder="Issue title"
                                className="text-2xl font-bold tracking-tight text-foreground w-full"
                            />
                        </div>
                    </div>

                    <Separator className="border-border/30" />

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Description</Label>
                        <div className="border border-border/50 rounded-lg overflow-hidden bg-background/50 focus-within:ring-1 focus-within:ring-primary/25 focus-within:border-primary/50">
                            <TiptapEditor
                                value={description}
                                onChange={handleUpdateDescription}
                                placeholder="Add rich description with slash commands..."
                                className="p-4 prose prose-sm max-w-none min-h-[180px] focus:outline-none"
                            />
                        </div>
                    </div>

                    <Separator className="border-border/30" />

                    {/* Recursive Subtasks Area */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Subtasks</h3>
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

                {/* Sidebar Properties */}
                <div className="space-y-6 bg-muted/10 border border-border/30 rounded-xl p-5 h-fit">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Properties</h3>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground font-medium">Status</Label>
                            <ProjectStatusSelector
                                value={issue.status}
                                onChange={handleUpdateStatus}
                                className="justify-start px-2 bg-background hover:bg-muted/40 border-border/30 h-9 w-full"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground font-medium">Priority</Label>
                            <ProjectPrioritySelector
                                value={issue.properties?.priority || "None"}
                                onChange={handleUpdatePriority}
                                className="justify-start px-2 bg-background hover:bg-muted/40 border-border/30 h-9 w-full"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground font-medium">Assignee</Label>
                            <MemberSelector
                                value={issue.properties?.lead_id}
                                onChange={handleUpdateLead}
                                className="justify-start px-2 bg-background hover:bg-muted/40 border-border/30 h-9 w-full"
                            />
                        </div>
                    </div>
                </div>
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
