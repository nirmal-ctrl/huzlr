"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { useDebouncedUpdate } from "@/hooks/use-debounced-update"
import { fetchProjectById, updateProject } from "@/lib/redux/slices/projectSlice"
import { SpinnerEmpty } from "@/components/spinner-empty"
import {
    ProjectStatusSelector,
    ProjectPrioritySelector,
    MemberSelector,
    DateSelector,
    LabelSelector,
    ProjectDateRangeSelector
} from "@/components/properties/factory"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from "@/components/ui/resizable"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { InlineEditor } from "@/components/editor/inline-editor"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Link as LinkIcon, Box, ChevronDown, Plus, Trash2 } from "lucide-react"
import { useGetProjectMilestonesQuery, useCreateMilestoneMutation, useDeleteMilestoneMutation, useUpdateMilestoneMutation } from "@/services/milestonesApi"
import { CreateMilestoneModal } from "@/components/projects/create-milestone-modal"
import { useGetProjectDocumentsQuery, useCreateDocumentMutation } from "@/services/documentsApi"
import { DocIcon } from "@/components/ui/emoji-selector"

export default function ProjectDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const projectId = params.projectId as string

    const dispatch = useAppDispatch()
    const { items: projects, loading: isLoading } = useAppSelector((state) => state.projects)

    // Find current project
    const project = projects.find(p => p.project_id?.toString() === projectId)

    const { data: milestones, isLoading: isLoadingMilestones } = useGetProjectMilestonesQuery(parseInt(projectId), {
        skip: !project
    })
    const { data: documents, isLoading: isLoadingDocs } = useGetProjectDocumentsQuery(parseInt(projectId), {
        skip: !project
    })
    const [createMilestone] = useCreateMilestoneMutation()
    const [updateMilestone] = useUpdateMilestoneMutation()
    const [deleteMilestone] = useDeleteMilestoneMutation()
    const [createDocument, { isLoading: isCreatingDoc }] = useCreateDocumentMutation()

    const handleCreateDocument = async () => {
        try {
            const res = await createDocument({
                projectId: parseInt(projectId),
                document: {
                    project_id: parseInt(projectId),
                    title: "Untitled document",
                    content: "",
                    emoji: "📄"
                }
            }).unwrap()
            router.push(`/projects/${projectId}/documents/${res.document_id}`)
        } catch (error) {
            console.error("Failed to create document draft:", error)
        }
    }

    useEffect(() => {
        if (!project) {
            dispatch(fetchProjectById(projectId))
        }
    }, [dispatch, projectId, project])

    // Local state for edits
    const [draftProperties, setDraftProperties] = useState<any>({})
    const [completedMilestones, setCompletedMilestones] = useState<Record<number, boolean>>({})
    
    // Collapsible states
    const [propertiesExpanded, setPropertiesExpanded] = useState(true)
    const [milestonesExpanded, setMilestonesExpanded] = useState(true)
    const [progressExpanded, setProgressExpanded] = useState(true)
    const [descriptionExpanded, setDescriptionExpanded] = useState(true)

    // We use a ref for high-frequency text updates (title/description) to avoid massive React re-renders on every keystroke
    const textUpdatesRef = useRef<Partial<any>>({})

    useEffect(() => {
        if (project) {
            // Sync full properties for instant UI feedback without waiting for Redux
            setDraftProperties(project.properties || {})
            // Clear pending text edits when we get fresh DB state to avoid UI divergence
            textUpdatesRef.current = {}
        }
    }, [project])

    // Handling updates
    const handleUpdate = React.useCallback(
        (updates: Partial<any>) => {
            dispatch(updateProject({ projectId, updates }))
        },
        [dispatch, projectId]
    )

    const { triggerUpdate } = useDebouncedUpdate<Partial<any>>(handleUpdate, 800)

    // A helper to update local UI state instantly while triggerUpdate batches the backend call
    const applyUpdate = (updates: Partial<any>) => {
        setDraftProperties((prev: any) => ({ ...prev, ...updates }))
        triggerUpdate(updates)
    }

    const handleTitleChange = (newTitle: string) => {
        textUpdatesRef.current.project_title = newTitle;
        triggerUpdate({ project_title: newTitle });
    };

    const handleDescriptionChange = (newDesc: string) => {
        textUpdatesRef.current.description = newDesc;
        triggerUpdate({ description: newDesc });
    };

    if (isLoading && !project) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <SpinnerEmpty />
            </div>
        )
    }

    if (!project) {
        return (
            <div className="flex flex-1 items-center justify-center flex-col gap-4">
                <p>Project not found</p>
                <Button onClick={() => router.push('/projects')}>Back to Projects</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <SiteHeader>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
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
                                <Box className="w-5 h-5" />
                            </div>
                        </div>
                        <InlineEditor
                            value={textUpdatesRef.current.project_title ?? draftProperties.project_title ?? ""}
                            onChange={handleTitleChange}
                            placeholder="Project name"
                            className="text-4xl font-semibold leading-tight tracking-tight mt-2"
                        />
                        {draftProperties.short_summary && (
                            <p className="text-lg text-muted-foreground mt-4">
                                {draftProperties.short_summary}
                            </p>
                        )}
                    </div>

                    {/* Inline Properties Row */}
                    <div className="flex flex-wrap items-center gap-2 -ml-2 py-2">
                        <span className="text-sm text-muted-foreground mr-2 ml-2">Properties</span>
                        <ProjectStatusSelector value={draftProperties.status} onChange={(v) => applyUpdate({ status: v })} />
                        <ProjectPrioritySelector value={draftProperties.priority} onChange={(v) => applyUpdate({ priority: v })} />
                        <MemberSelector value={draftProperties.lead ? draftProperties.lead.toString() : undefined} onChange={(v) => applyUpdate({ lead: v })} />

                        <DateSelector
                            value={draftProperties.target_date || undefined}
                            onChange={(v) => applyUpdate({ target_date: v })}
                            placeholder="Due date"
                            className="ml-1"
                        />

                        <MemberSelector value={(draftProperties.members || []).map((m: any) => m.toString())} onChange={(v) => applyUpdate({ members: Array.isArray(v) ? v : [v] })} multiple className="h-7 text-xs" />

                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 gap-1.5 border border-transparent hover:border-border/40 transition-all">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 -ml-2 py-2 pb-6 border-b border-border/40">
                        <span className="text-sm text-muted-foreground mr-2 ml-2 flex items-center">
                            Resources
                        </span>
                        {isLoadingDocs ? (
                            <span className="text-xs text-muted-foreground ml-2">Loading...</span>
                        ) : documents && documents.length > 0 ? (
                            documents.map(doc => (
                                <Button 
                                    key={doc.document_id}
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => router.push(`/projects/${projectId}/documents/${doc.document_id}`)}
                                    className="h-7 px-2.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-background hover:shadow-sm gap-1.5 border border-border cursor-pointer"
                                >
                                    <DocIcon value={doc.emoji} className="w-3.5 h-3.5 flex items-center justify-center shrink-0" />
                                    {doc.title}
                                </Button>
                            ))
                        ) : (
                            <span className="text-xs text-muted-foreground/60 select-none italic ml-2 mr-1">No documents created yet</span>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleCreateDocument}
                            disabled={isCreatingDoc}
                            className="h-7 w-7 rounded-md hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground border border-transparent hover:border-border/40 transition-all cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Write update call to action */}
                    <div className="border rounded-md p-4 text-center cursor-not-allowed my-8 group opacity-60 pointer-events-none relative transition-colors">
                        <div className="flex flex-col items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Box className="w-4 h-4 opacity-50" />
                                Write first project update
                            </div>
                            <Badge variant="secondary" className="text-[9px] uppercase tracking-wider font-semibold py-0 h-4 px-1.5 mt-1">Coming Soon</Badge>
                        </div>
                    </div>

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
                            <div className="min-h-[400px] animate-in fade-in duration-200">
                                <TiptapEditor
                                    value={textUpdatesRef.current.description ?? draftProperties.description ?? `<h1>Next Steps 4-Week Solo Build Plan (Owner: You)</h1><p>Start date: <strong>Wed, Nov 19, 2025</strong> (today). Deadlines are final-date of each week.</p><h3>Week 1 Nov 19 → Nov 25</h3><p>Goal: Core backend + Smart Initialization</p>`}
                                    onChange={handleDescriptionChange}
                                    className="prose-lg text-foreground/90 max-w-none"
                                />
                            </div>
                        )}
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
                                        <ProjectStatusSelector value={draftProperties.status} onChange={(v) => applyUpdate({ status: v })} className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground text-xs w-20">Priority</span>
                                        <ProjectPrioritySelector value={draftProperties.priority} onChange={(v) => applyUpdate({ priority: v })} className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground text-xs w-20">Lead</span>
                                        <MemberSelector value={draftProperties.lead ? draftProperties.lead.toString() : undefined} onChange={(v) => applyUpdate({ lead: v })} className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground text-xs w-20">Members</span>
                                        <MemberSelector value={(draftProperties.members || []).map((m: any) => m.toString())} onChange={(v) => applyUpdate({ members: Array.isArray(v) ? v : [v] })} multiple className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground text-xs w-20">Due date</span>
                                        <DateSelector value={draftProperties.target_date || undefined} onChange={(v) => applyUpdate({ target_date: v })} placeholder="Due date" className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground text-xs w-20">Teams</span>
                                        <div className="flex-1 flex items-center h-8 px-2 text-xs font-medium rounded-md text-foreground gap-1.5 cursor-pointer hover:bg-muted border border-transparent hover:border-border/40">
                                            <div className="w-3.5 h-3.5 bg-green-500/20 text-green-500 rounded-sm flex items-center justify-center text-[8px]">H</div>
                                            huzlr
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground text-xs w-20">Labels</span>
                                        <LabelSelector value={((draftProperties.labels || []) as any[]).map(l => l.toString())} onChange={(v) => applyUpdate({ labels: Array.isArray(v) ? v : [v] })} className="flex-1 justify-start h-8 px-2 bg-transparent hover:bg-muted border border-transparent hover:border-border/40" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-border/40 w-full" />

                        {/* Milestones Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between group mb-2 select-none">
                                <h4 
                                    onClick={() => setMilestonesExpanded(!milestonesExpanded)}
                                    className="text-sm font-medium flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors"
                                >
                                    Milestones <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${milestonesExpanded ? "" : "-rotate-90"}`} />
                                </h4>
                                <CreateMilestoneModal projectId={parseInt(projectId)} />
                            </div>
                            
                            {milestonesExpanded && (
                                <div className="animate-in fade-in duration-200">
                                    {isLoadingMilestones ? (
                                        <div className="text-xs text-muted-foreground">Loading...</div>
                                    ) : milestones && milestones.length > 0 ? (
                                        <div className="space-y-1.5 mt-2">
                                            {milestones.map((m) => {
                                                const isCompleted = completedMilestones[m.milestone_id] || false;
                                                return (
                                                    <div key={m.milestone_id} className="flex items-center gap-2.5 group text-sm py-1 px-1.5 hover:bg-muted/30 rounded-md transition-all">
                                                        {/* Circular Checkbox */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setCompletedMilestones(prev => ({ ...prev, [m.milestone_id]: !isCompleted }))}
                                                            className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 ${
                                                                isCompleted 
                                                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 scale-95" 
                                                                    : "border-muted-foreground/30 hover:border-muted-foreground/60 text-transparent"
                                                            }`}
                                                        >
                                                            <span className={`block w-1.5 h-1.5 rounded-full ${isCompleted ? "bg-emerald-500" : "bg-transparent"}`} />
                                                        </button>

                                                        {/* Inline Input Title */}
                                                        <InlineEditor
                                                            value={m.title}
                                                            onChange={(val) => {
                                                                if (val !== m.title) {
                                                                    updateMilestone({ milestoneId: m.milestone_id, updates: { title: val } });
                                                                }
                                                            }}
                                                            className={`bg-transparent border-none outline-none focus:ring-0 flex-1 text-xs font-normal transition-all duration-200 ${
                                                                isCompleted ? "line-through text-muted-foreground/50" : "text-foreground/90"
                                                            }`}
                                                        />

                                                        {/* Delete Button */}
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-destructive transition-opacity"
                                                            onClick={() => deleteMilestone({ milestoneId: m.milestone_id, projectId: parseInt(projectId) })}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground leading-relaxed mt-2 pr-4">
                                            Add milestones to organize work within your project and break it into more granular stages.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-border/40 w-full" />

                        {/* Progress Section */}
                        <div className="space-y-3 opacity-60 pointer-events-none">
                            <div className="flex items-center justify-between group cursor-not-allowed mb-4 select-none">
                                <h4 
                                    onClick={() => setProgressExpanded(!progressExpanded)}
                                    className="text-sm font-medium flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors"
                                >
                                    Progress <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${progressExpanded ? "" : "-rotate-90"}`} />
                                    <Badge variant="secondary" className="ml-1 text-[9px] uppercase tracking-wider font-semibold py-0 h-4 px-1.5">Coming Soon</Badge>
                                </h4>
                            </div>
                            {progressExpanded && (
                                <div className="space-y-3 animate-in fade-in duration-200">
                                    <div className="flex gap-4">
                                        <div className="flex-1 px-2 py-1">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                <div className="w-1.5 h-1.5 rounded-[1px] bg-muted-foreground/30" />
                                                Scope
                                            </div>
                                            <div className="text-sm font-medium ml-3.5">17</div>
                                        </div>
                                        <div className="flex-1 px-2 py-1">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                <div className="w-1.5 h-1.5 rounded-[1px] bg-primary" />
                                                Completed
                                            </div>
                                            <div className="text-sm font-medium ml-3.5">2</div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex rounded-md border text-xs font-medium overflow-hidden">
                                            <div className="flex-1 flex items-center justify-center p-1.5 bg-background shadow-sm border-r text-foreground cursor-pointer">
                                                Assignees
                                            </div>
                                            <div className="flex-1 flex items-center justify-center p-1.5 bg-muted/30 text-muted-foreground cursor-pointer hover:text-foreground">
                                                Labels
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs py-3 px-1 mt-2">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <div className="w-4 h-4 rounded-full border border-dashed flex items-center justify-center text-[10px]">
                                                    ?
                                                </div>
                                                No assignee
                                            </div>
                                            <span className="text-muted-foreground">11</span>
                                        </div>
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
