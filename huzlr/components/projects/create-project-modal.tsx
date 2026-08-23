"use client"

import { useState, useEffect, useRef, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchProjectById, updateProject } from "@/lib/redux/slices/projectSlice"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InlineEditor } from "@/components/editor/inline-editor"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { ProjectVoiceAgent } from "@/components/projects/project-voice-agent"
import {
    ArrowRight,
    CalendarDays,
    FileText,
    Flag,
    Layers3,
    Loader2,
    Plus,
    Trash2,
} from "lucide-react"
import {
    useCreateMilestoneMutation,
    useDeleteMilestoneMutation,
    useGetProjectMilestonesQuery,
} from "@/services/milestonesApi"
import {
    useCreateDocumentMutation,
    useDeleteDocumentMutation,
    useGetProjectDocumentsQuery,
    type ProjectDocumentResponse,
} from "@/services/documentsApi"
import { useToast } from "@/hooks/use-toast"
import { DocIcon } from "@/components/ui/emoji-selector"
import {
    ProjectStatusSelector,
    ProjectPrioritySelector,
    MemberSelector,
    DateSelector,
    LabelSelector
} from "@/components/properties/factory"

interface DraftMilestone {
    id: string
    milestoneId?: number
    title: string
    description: string
    estimated_start_date?: string
    estimated_end_date?: string
}

function markdownToHtml(markdown: string): string {
    let html = markdown;

    // Convert headers (e.g. ### Header)
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Convert bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert italic (*text*)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert bullet points (- item)
    let inList = false;
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            let result = `<li>${content}</li>`;
            if (!inList) {
                result = `<ul>${result}`;
                inList = true;
            }
            return result;
        } else {
            if (inList) {
                inList = false;
                return `</ul>\n<p>${line}</p>`;
            }
            return line.trim() ? `<p>${line}</p>` : '';
        }
    });
    if (inList) {
        processedLines.push('</ul>');
    }

    return processedLines.filter(Boolean).join('\n');
}

function normalizeAgentText(value: unknown): string {
    if (typeof value !== "string") return ""

    return value
        .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (entity, hexValue, decimalValue) => {
            const codePoint = Number.parseInt(hexValue ?? decimalValue, hexValue ? 16 : 10)

            try {
                return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity
            } catch {
                return entity
            }
        })
        .replace(/&nbsp;/gi, " ")
        .replace(/\u00a0/g, " ")
}

interface CreateProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userId?: number
    inline?: boolean
    page?: boolean
    draftProjectId?: number
}

export function CreateProjectModal({
    open,
    onOpenChange,
    userId = 0, // Default to 0 as API ignores it usually, but checks for it
    inline = false,
    page = false,
    draftProjectId,
}: CreateProjectModalProps) {
    const router = useRouter()
    const [projectTitle, setProjectTitle] = useState("")
    const [shortSummary, setShortSummary] = useState("")
    const [status, setStatus] = useState("Backlog")
    const [priority, setPriority] = useState("None")
    const [lead, setLead] = useState<string | undefined>(undefined)
    const [members, setMembers] = useState<string[]>([])
    const [startDate, setStartDate] = useState<string | undefined>(undefined)
    const [targetDate, setTargetDate] = useState<string | undefined>(undefined)
    const [labels, setLabels] = useState<string[]>([])
    const [dependencies, setDependencies] = useState<string[]>([])
    const [description, setDescription] = useState("")
    const [milestones, setMilestones] = useState<DraftMilestone[]>([])
    const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false)
    const [hasHydratedDraft, setHasHydratedDraft] = useState(false)
    const [isProjectDraft, setIsProjectDraft] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Highlight states for visual pulsing
    const [highlightTitle, setHighlightTitle] = useState(false)
    const [highlightSummary, setHighlightSummary] = useState(false)
    const [highlightDescription, setHighlightDescription] = useState(false)
    const [highlightStatus, setHighlightStatus] = useState(false)
    const [highlightPriority, setHighlightPriority] = useState(false)

    const triggerHighlight = (field: string) => {
        if (field === "title") {
            setHighlightTitle(true)
            setTimeout(() => setHighlightTitle(false), 3000)
        } else if (field === "summary") {
            setHighlightSummary(true)
            setTimeout(() => setHighlightSummary(false), 3000)
        } else if (field === "description") {
            setHighlightDescription(true)
            setTimeout(() => setHighlightDescription(false), 3000)
        } else if (field === "status") {
            setHighlightStatus(true)
            setTimeout(() => setHighlightStatus(false), 3000)
        } else if (field === "priority") {
            setHighlightPriority(true)
            setTimeout(() => setHighlightPriority(false), 3000)
        }
    }

    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const [createMilestone] = useCreateMilestoneMutation()
    const [deleteMilestone] = useDeleteMilestoneMutation()
    const [createDocument, { isLoading: isCreatingDocument }] = useCreateDocumentMutation()
    const [deleteDocument] = useDeleteDocumentMutation()
    const { data: documents = [], isLoading: isLoadingDocuments } = useGetProjectDocumentsQuery(draftProjectId ?? 0, {
        skip: !draftProjectId,
    })
    const { data: savedMilestones } = useGetProjectMilestonesQuery(draftProjectId ?? 0, {
        skip: !draftProjectId || isProjectDraft,
    })
    const draftProject = useAppSelector((state) => state.projects.items.find((project) => project.project_id === draftProjectId))
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
    const teams = useAppSelector((state) => state.workspace.teams)
    const hasActiveTeam = teams.some(
        (team) => team.id === activeTeamId && team.workspace_id === activeWorkspaceId,
    )
    const descriptionRef = useRef(description)
    const hydratedProjectIdRef = useRef<number | null>(null)

    const getProjectProperties = (isDraft = isProjectDraft) => ({
        project_title: projectTitle.trim() || "Untitled project",
        short_summary: shortSummary,
        status,
        priority,
        lead,
        members,
        start_date: startDate,
        target_date: targetDate,
        labels,
        dependencies,
        description,
        milestones: isDraft ? milestones : [],
        is_draft: isDraft,
        draft_updated_at: isDraft ? new Date().toISOString() : undefined,
    })

    useEffect(() => {
        if (draftProjectId && !draftProject) {
            dispatch(fetchProjectById(draftProjectId))
        }
    }, [dispatch, draftProject, draftProjectId])

    useEffect(() => {
        if (!draftProjectId || !draftProject || hydratedProjectIdRef.current === draftProjectId) return

        const properties = draftProject.properties as Record<string, any>
        const projectIsDraft = Boolean(properties.is_draft)
        const draftMilestones = Array.isArray(properties.milestones) ? properties.milestones : []
        const savedDescription = properties.description ?? ""

        setProjectTitle(projectIsDraft && properties.project_title === "Untitled project" ? "" : properties.project_title ?? "")
        setShortSummary(properties.short_summary ?? "")
        setStatus(properties.status ?? "Backlog")
        setPriority(properties.priority ?? "None")
        setLead(properties.lead?.toString())
        setMembers((properties.members ?? []).map((member: string | number) => member.toString()))
        setStartDate(properties.start_date ?? undefined)
        setTargetDate(properties.target_date ?? undefined)
        setLabels((properties.labels ?? []).map((label: string | number) => label.toString()))
        setDependencies((properties.dependencies ?? []).map((dependency: string | number) => dependency.toString()))
        setDescription(savedDescription)
        setMilestones(projectIsDraft ? draftMilestones : [])
        setIsProjectDraft(projectIsDraft)
        descriptionRef.current = savedDescription
        hydratedProjectIdRef.current = draftProjectId
        setHasHydratedDraft(true)
    }, [draftProject, draftProjectId])

    useEffect(() => {
        if (isProjectDraft || !hasHydratedDraft || !savedMilestones) return

        setMilestones(savedMilestones.map((milestone) => ({
            id: `saved-${milestone.milestone_id}`,
            milestoneId: milestone.milestone_id,
            title: milestone.title,
            description: milestone.description ?? "",
            estimated_start_date: milestone.estimated_start_date ?? undefined,
            estimated_end_date: milestone.estimated_end_date ?? undefined,
        })))
    }, [hasHydratedDraft, isProjectDraft, savedMilestones])

    useEffect(() => {
        if (!draftProjectId || !hasHydratedDraft || isSubmitting) return

        const timeout = window.setTimeout(() => {
            dispatch(updateProject({
                projectId: draftProjectId,
                updates: getProjectProperties(),
            }))
        }, 800)

        return () => window.clearTimeout(timeout)
    }, [
        dispatch,
        draftProjectId,
        hasHydratedDraft,
        isSubmitting,
        projectTitle,
        shortSummary,
        status,
        priority,
        lead,
        members,
        startDate,
        targetDate,
        labels,
        dependencies,
        description,
        milestones,
        isProjectDraft,
    ])

    useEffect(() => {
        descriptionRef.current = description
    }, [description])

    useEffect(() => {
        const handleAgentUpdate = (e: Event) => {
            const data = (e as CustomEvent).detail
            
            if (data.project_title !== undefined) {
                triggerHighlight("title")
                setProjectTitle(normalizeAgentText(data.project_title))
            }
            
            if (data.short_summary !== undefined) {
                triggerHighlight("summary")
                setShortSummary(normalizeAgentText(data.short_summary))
            }
            
            if (data.status !== undefined) {
                setStatus(data.status)
                triggerHighlight("status")
            }
            
            if (data.priority !== undefined) {
                setPriority(data.priority)
                triggerHighlight("priority")
            }
            
            if (data.description !== undefined) {
                triggerHighlight("description")
                const incomingDescription = markdownToHtml(normalizeAgentText(data.description))
                const baseContent = descriptionRef.current
                const nextDescription = baseContent
                    ? `${baseContent}\n${incomingDescription}`
                    : incomingDescription

                descriptionRef.current = nextDescription
                setDescription(nextDescription)
            }
        }
        
        window.addEventListener("agent-update-project", handleAgentUpdate)
        return () => {
            window.removeEventListener("agent-update-project", handleAgentUpdate)
        }
    }, [])

    const handleSubmit = async () => {
        if (!projectTitle.trim() || !draftProjectId || !activeTeamId || !hasActiveTeam) return

        setIsSubmitting(true)
        try {
            await dispatch(updateProject({
                projectId: draftProjectId,
                updates: {
                    ...getProjectProperties(false),
                    milestones: [],
                },
            })).unwrap()

            const unsavedMilestones = milestones.filter((milestone) => !milestone.milestoneId)
            const milestoneResults = await Promise.allSettled(
                unsavedMilestones.map((milestone) => createMilestone({
                    projectId: draftProjectId,
                    milestone: {
                        project_id: draftProjectId,
                        title: milestone.title,
                        description: milestone.description || undefined,
                        estimated_start_date: milestone.estimated_start_date,
                        estimated_end_date: milestone.estimated_end_date,
                        order_index: milestones.findIndex((item) => item.id === milestone.id),
                    },
                }).unwrap()),
            )
            const failedMilestones = milestoneResults.filter((result) => result.status === "rejected").length
            const createdItems = [
                milestones.length > 0
                    ? `${milestones.length} milestone${milestones.length === 1 ? "" : "s"}`
                    : null,
                documents.length > 0
                    ? `${documents.length} document${documents.length === 1 ? "" : "s"}`
                    : null,
            ].filter(Boolean)

            const wasDraft = isProjectDraft
            setIsProjectDraft(false)
            toast({
                title: wasDraft ? "Project created" : "Project updated",
                description: failedMilestones > 0
                    ? `${failedMilestones} milestone${failedMilestones === 1 ? "" : "s"} could not be created.`
                    : createdItems.length > 0
                        ? `Project with ${createdItems.join(" and ")} ${wasDraft ? "created" : "updated"}.`
                        : wasDraft ? "Your project is ready." : "Your changes have been saved.",
                variant: failedMilestones > 0 ? "destructive" : "default",
            })

            if (wasDraft) {
                router.replace(`/projects/${draftProjectId}`)
            }

        } catch (error) {
            console.error("Failed to create project:", error)
            toast({
                title: isProjectDraft ? "Project could not be created" : "Project could not be updated",
                description: "Check the project details and try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCreateDocumentDraft = async () => {
        if (!draftProjectId) return

        try {
            await dispatch(updateProject({
                projectId: draftProjectId,
                updates: getProjectProperties(),
            })).unwrap()
            const document = await createDocument({
                projectId: draftProjectId,
                document: {
                    project_id: draftProjectId,
                    title: "Untitled document",
                    content: "",
                    emoji: "📄",
                },
            }).unwrap()

            router.push(`/projects/${draftProjectId}/documents/${document.document_id}`)
        } catch (error) {
            console.error("Failed to create document draft:", error)
            toast({
                title: "Document draft could not be created",
                description: "Please try again.",
                variant: "destructive",
            })
        }
    }

    const handleOpenDocumentDraft = async (documentId: number) => {
        if (!draftProjectId) return

        try {
            await dispatch(updateProject({
                projectId: draftProjectId,
                updates: getProjectProperties(),
            })).unwrap()
        } catch (error) {
            console.error("Failed to save project draft before opening document:", error)
        }
        router.push(`/projects/${draftProjectId}/documents/${documentId}`)
    }

    const handleCloseDraft = async () => {
        if (draftProjectId && hasHydratedDraft) {
            try {
                await dispatch(updateProject({
                    projectId: draftProjectId,
                    updates: getProjectProperties(),
                })).unwrap()
            } catch (error) {
                console.error("Failed to save project draft before closing:", error)
            }
        }
        onOpenChange(false)
    }

    const formContent = (
        <form
            onSubmit={(event) => {
                event.preventDefault()
                handleSubmit()
            }}
            className="flex h-full min-h-full flex-col bg-background"
        >
            <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
                <section className="flex min-w-0 flex-col px-5 py-6 sm:px-6 lg:px-8 lg:py-7">
                    <div className="flex min-h-full w-full flex-1 flex-col">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                            <div className="flex min-w-0 flex-1 items-start gap-4">
                                <div className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                                    <Layers3 className="size-5" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                                        <span>{isProjectDraft ? "Draft" : "Project"}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>#{draftProjectId}</span>
                                    </div>
                                    <div className={`rounded-lg px-1 transition-all duration-300 ${highlightTitle ? "bg-primary/5 ring-2 ring-primary/50" : ""}`}>
                                        <InlineEditor
                                            value={projectTitle}
                                            onChange={setProjectTitle}
                                            placeholder="Project name"
                                            className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
                                        />
                                    </div>
                                    <div className={`rounded-lg px-1 transition-all duration-300 ${highlightSummary ? "bg-primary/5 ring-2 ring-primary/50" : ""}`}>
                                        <InlineEditor
                                            value={shortSummary}
                                            onChange={setShortSummary}
                                            placeholder="What outcome will this project deliver?"
                                            className="text-base leading-relaxed text-muted-foreground"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 border-t border-border/50 pt-5">
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Project brief</h2>
                                </div>
                                <span className="hidden text-[10px] text-muted-foreground/70 sm:inline">
                                    Press / for commands
                                </span>
                            </div>
                            <div className={`min-h-[180px] transition-all duration-300 ${
                                highlightDescription ? "rounded-lg bg-primary/5 px-3 ring-2 ring-primary/40" : ""
                            }`}>
                                <TiptapEditor
                                    value={description}
                                    onChange={setDescription}
                                    placeholder="Describe the problem, proposed solution, scope, and what success looks like…"
                                    className="min-h-[180px] max-w-none text-[15px] leading-7 prose-headings:tracking-tight prose-p:text-foreground/90"
                                />
                            </div>
                        </div>

                        <DraftMilestonesSection
                            milestones={milestones}
                            onAdd={() => setIsMilestoneDialogOpen(true)}
                            onRemove={async (milestone) => {
                                if (milestone.milestoneId && draftProjectId) {
                                    try {
                                        await deleteMilestone({
                                            milestoneId: milestone.milestoneId,
                                            projectId: draftProjectId,
                                        }).unwrap()
                                    } catch (error) {
                                        console.error("Failed to delete milestone:", error)
                                        toast({
                                            title: "Milestone could not be removed",
                                            description: "Please try again.",
                                            variant: "destructive",
                                        })
                                        return
                                    }
                                }
                                setMilestones((current) => current.filter((item) => item.id !== milestone.id))
                            }}
                        />

                        <div className="mt-auto flex items-center justify-end gap-2 pt-8">
                            <Button type="button" variant="ghost" size="sm" onClick={handleCloseDraft}>
                                Close
                            </Button>
                            <ProjectVoiceAgent />
                            <Button
                                type="submit"
                                size="sm"
                                className="rounded-full px-4"
                                disabled={isSubmitting || !hasHydratedDraft || !draftProjectId || !projectTitle.trim() || !hasActiveTeam}
                            >
                                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                                {isSubmitting
                                    ? isProjectDraft ? "Creating…" : "Saving…"
                                    : isProjectDraft ? "Create project" : "Save changes"}
                            </Button>
                        </div>
                    </div>
                </section>

                <aside className="border-t border-border/70 bg-muted/15 px-4 py-5 lg:border-l lg:border-t-0">
                    <div className="lg:sticky lg:top-6">
                        <div>
                            <div className="mb-4 flex items-center gap-2">
                                <Flag className="size-4 text-muted-foreground" />
                                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Project details</h2>
                            </div>
                            <div className="space-y-1">
                                <ProjectDetailRow label="Status" highlighted={highlightStatus}>
                                    <ProjectStatusSelector value={status} onChange={setStatus} className="h-8 w-full justify-start px-2" />
                                </ProjectDetailRow>
                                <ProjectDetailRow label="Priority" highlighted={highlightPriority}>
                                    <ProjectPrioritySelector value={priority} onChange={setPriority} className="h-8 w-full justify-start px-2" />
                                </ProjectDetailRow>
                                <ProjectDetailRow label="Lead">
                                    <MemberSelector value={lead} onChange={(value) => setLead(value as string)} className="h-8 w-full justify-start px-2" />
                                </ProjectDetailRow>
                                <ProjectDetailRow label="Members">
                                    <MemberSelector value={members} onChange={(value) => setMembers(value as string[])} multiple className="h-8 w-full justify-start px-2" />
                                </ProjectDetailRow>
                                <ProjectDetailRow label="Start date">
                                    <DateSelector value={startDate} onChange={setStartDate} placeholder="Set start date" className="h-8 w-full justify-start px-2" />
                                </ProjectDetailRow>
                                <ProjectDetailRow label="Target date">
                                    <DateSelector value={targetDate} onChange={setTargetDate} placeholder="Set target date" className="h-8 w-full justify-start px-2" />
                                </ProjectDetailRow>
                                <ProjectDetailRow label="Labels">
                                    <LabelSelector value={labels} onChange={setLabels} className="h-8 w-full justify-start px-2" />
                                </ProjectDetailRow>
                            </div>
                        </div>

                        <DraftDocumentsSection
                            documents={documents}
                            isLoading={isLoadingDocuments}
                            isCreating={isCreatingDocument}
                            onAdd={handleCreateDocumentDraft}
                            onEdit={handleOpenDocumentDraft}
                            onRemove={(documentId) => {
                                if (!draftProjectId) return
                                deleteDocument({ documentId, projectId: draftProjectId })
                            }}
                        />
                    </div>
                </aside>
            </div>

            <DraftMilestoneDialog
                open={isMilestoneDialogOpen}
                onOpenChange={setIsMilestoneDialogOpen}
                onAdd={(milestone) => setMilestones((current) => [...current, milestone])}
            />
        </form>
    )

    if (page) {
        return formContent
    }

    if (inline) {
        return (
            <div className={`border-l bg-background h-full flex flex-col relative z-20 transition-all duration-500 ease-in-out ${
                open 
                    ? "w-[450px] lg:w-[550px] xl:w-[650px] opacity-100" 
                    : "w-0 opacity-0 pointer-events-none border-l-0 overflow-hidden"
            }`}>
                <div className="min-w-[450px] lg:min-w-[550px] xl:min-w-[650px] h-full flex flex-col">
                    {formContent}
                </div>
            </div>
        )
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-[800px] p-0 gap-0 border-l bg-background shadow-2xl transition-all duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:w-[85vw] md:w-[75vw] lg:w-[60vw] xl:w-[50vw]">
                {formContent}
            </SheetContent>
        </Sheet>
    )
}

function ProjectDetailRow({
    label,
    highlighted = false,
    children,
}: {
    label: string
    highlighted?: boolean
    children: ReactNode
}) {
    return (
        <div className={`grid grid-cols-[76px_minmax(0,1fr)] items-center gap-2 rounded-lg px-2 py-1 transition-all ${
            highlighted ? "bg-primary/5 ring-2 ring-primary/40" : "hover:bg-muted/40"
        }`}>
            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
            <div className="min-w-0">{children}</div>
        </div>
    )
}

function DraftDocumentsSection({
    documents,
    isLoading,
    isCreating,
    onAdd,
    onEdit,
    onRemove,
}: {
    documents: ProjectDocumentResponse[]
    isLoading: boolean
    isCreating: boolean
    onAdd: () => void
    onEdit: (documentId: number) => void
    onRemove: (documentId: number) => void
}) {
    return (
        <section className="mt-6 border-t border-border/60 pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Documents</h2>
                    {documents.length > 0 && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {documents.length}
                        </span>
                    )}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 text-muted-foreground"
                    onClick={onAdd}
                    disabled={isCreating}
                    aria-label="Add document"
                >
                    <Plus className="size-3.5" />
                </Button>
            </div>

            {isLoading ? (
                <div className="px-2 py-3 text-[11px] text-muted-foreground">Loading documents…</div>
            ) : documents.length === 0 ? (
                <button
                    type="button"
                    onClick={onAdd}
                    disabled={isCreating}
                    className="group flex w-full items-center gap-3 rounded-lg border border-dashed border-border/80 px-3 py-3 text-left transition-colors hover:border-primary/35 hover:bg-background"
                >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-primary">
                        <FileText className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-xs font-medium text-foreground">Create a document</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">Add a brief, spec, or project note.</span>
                    </span>
                </button>
            ) : (
                <div className="space-y-1">
                    {documents.map((document) => (
                        <div key={document.document_id} className="group flex items-center rounded-md transition-colors hover:bg-background">
                            <button
                                type="button"
                                onClick={() => onEdit(document.document_id)}
                                className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left"
                            >
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/70 text-sm">
                                    <DocIcon value={document.emoji} className="flex size-3.5 items-center justify-center" />
                                </span>
                                <span className="truncate text-xs font-medium text-foreground/90">{document.title}</span>
                            </button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="mr-1 size-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                onClick={() => onRemove(document.document_id)}
                                aria-label={`Remove ${document.title}`}
                            >
                                <Trash2 className="size-3.5 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={onAdd}
                        disabled={isCreating}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    >
                        <span className="flex size-6 items-center justify-center"><Plus className="size-3.5" /></span>
                        Add document
                    </button>
                </div>
            )}
        </section>
    )
}

function DraftMilestonesSection({
    milestones,
    onAdd,
    onRemove,
}: {
    milestones: DraftMilestone[]
    onAdd: () => void
    onRemove: (milestone: DraftMilestone) => void
}) {
    return (
        <section className="mt-5 border-t border-border/50 pt-5">
            <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-foreground">Milestones</h2>
                        {milestones.length > 0 && (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {milestones.length}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Organize the project into measurable delivery checkpoints.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 rounded-md text-xs text-muted-foreground" onClick={onAdd}>
                    <Plus className="size-3.5" />
                    Add milestone
                </Button>
            </div>

            <div className="overflow-hidden border-y border-border/60">
                {milestones.length === 0 ? (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/35"
                    >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/35 text-muted-foreground transition-colors group-hover:border-primary/50 group-hover:text-primary">
                            <Plus className="size-3.5" />
                        </span>
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">Add the first milestone</span>
                        <span className="ml-auto hidden text-[11px] text-muted-foreground/70 sm:block">Define a checkpoint and target date</span>
                    </button>
                ) : (
                    <div className="divide-y divide-border/60">
                        {milestones.map((milestone, index) => (
                            <div
                                key={milestone.id}
                                className="group grid min-h-12 grid-cols-[minmax(0,1fr)_auto_32px] items-center gap-4 px-3 py-2 transition-colors hover:bg-muted/30"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="relative flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold text-muted-foreground">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-medium text-foreground">{milestone.title}</p>
                                        {milestone.description && (
                                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{milestone.description}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground">
                                    <CalendarDays className="size-3.5" />
                                    {formatDraftMilestoneDates(milestone) || "No dates"}
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="size-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    onClick={() => onRemove(milestone)}
                                    aria-label={`Remove ${milestone.title}`}
                                >
                                    <Trash2 className="size-3.5 text-muted-foreground" />
                                </Button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={onAdd}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                        >
                            <span className="flex size-6 items-center justify-center"><Plus className="size-3.5" /></span>
                            Add milestone
                        </button>
                    </div>
                )}
            </div>
        </section>
    )
}

function formatDraftMilestoneDates(milestone: DraftMilestone): string {
    const format = (value?: string) => value
        ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : null
    const start = format(milestone.estimated_start_date)
    const end = format(milestone.estimated_end_date)

    if (start && end) return `${start} – ${end}`
    if (end) return `Due ${end}`
    return start ? `Starts ${start}` : ""
}

function DraftMilestoneDialog({
    open,
    onOpenChange,
    onAdd,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onAdd: (milestone: DraftMilestone) => void
}) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const hasInvalidDates = Boolean(startDate && endDate && endDate < startDate)

    const reset = () => {
        setTitle("")
        setDescription("")
        setStartDate("")
        setEndDate("")
    }

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen)
        if (!nextOpen) reset()
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!title.trim() || hasInvalidDates) return

        onAdd({
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            title: title.trim(),
            description: description.trim(),
            estimated_start_date: startDate || undefined,
            estimated_end_date: endDate || undefined,
        })
        handleOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="border-border/70 bg-background/98 p-0 shadow-2xl backdrop-blur-xl sm:max-w-xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="border-b border-border/60 px-5 py-3.5">
                        <div className="flex items-center gap-2">
                            <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <Flag className="size-3.5" />
                            </div>
                            <DialogTitle className="text-sm">New milestone</DialogTitle>
                            <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Draft</span>
                        </div>
                        <DialogDescription className="sr-only">
                            Create a delivery checkpoint. It will be saved with the project.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-5">
                        <Input
                            id="milestone-title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Milestone name"
                            className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-xl font-semibold shadow-none focus-visible:ring-0"
                            autoFocus
                        />
                        <textarea
                            id="milestone-description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="Add a short description or success criteria…"
                            className="mt-3 min-h-20 w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                        />

                        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 shadow-xs">
                                <CalendarDays className="size-3.5 text-muted-foreground" />
                                <label htmlFor="milestone-start" className="text-[11px] text-muted-foreground">Start</label>
                                <Input
                                    id="milestone-start"
                                    type="date"
                                    value={startDate}
                                    onChange={(event) => setStartDate(event.target.value)}
                                    className="h-8 w-[122px] border-0 px-0 text-xs shadow-none focus-visible:ring-0"
                                />
                            </div>
                            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 shadow-xs">
                                <CalendarDays className="size-3.5 text-muted-foreground" />
                                <label htmlFor="milestone-end" className="text-[11px] text-muted-foreground">Target</label>
                                <Input
                                    id="milestone-end"
                                    type="date"
                                    value={endDate}
                                    onChange={(event) => setEndDate(event.target.value)}
                                    className="h-8 w-[122px] border-0 px-0 text-xs shadow-none focus-visible:ring-0"
                                />
                            </div>
                        </div>
                        {hasInvalidDates && (
                            <p className="mt-3 text-xs text-destructive">Target date must be on or after the start date.</p>
                        )}
                    </div>

                    <DialogFooter className="border-t border-border/60 bg-muted/20 px-5 py-3">
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={!title.trim() || hasInvalidDates}>Create milestone</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
