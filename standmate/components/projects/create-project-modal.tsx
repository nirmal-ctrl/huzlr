"use client"

import { useState, useEffect, useRef } from "react"
import { useAppDispatch } from "@/lib/redux/hooks"
import { createProject } from "@/lib/redux/slices/projectSlice"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { InlineEditor } from "@/components/editor/inline-editor"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import {
    Calendar,
    CheckCircle2,
    Circle,
    Clock,
    HelpCircle,
    MoreHorizontal,
    Box,
    Plus,
    User,
    Tag,
    ListTodo,
    X
} from "lucide-react"
import { components } from "@/lib/types/generated-api"
import {
    ProjectStatusSelector,
    ProjectPrioritySelector,
    MemberSelector,
    DateSelector,
    LabelSelector
} from "@/components/properties/factory"

type ProjectCreate = components["schemas"]["ProjectCreate"]
type ProjectProperties = components["schemas"]["ProjectProperties"]

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

interface CreateProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userId?: number
    inline?: boolean
}

const DEFAULT_PROPERTIES: Partial<ProjectProperties> = {
    status: "Draft",
    priority: "None",
    health: "On Track",
    source: "native",
}

export function CreateProjectModal({
    open,
    onOpenChange,
    userId = 0, // Default to 0 as API ignores it usually, but checks for it
    inline = false
}: CreateProjectModalProps) {
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
    const [milestones, setMilestones] = useState<any[]>([])
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
    const descriptionRef = useRef(description)

    useEffect(() => {
        descriptionRef.current = description
    }, [description])

    useEffect(() => {
        const handleAgentUpdate = (e: Event) => {
            const data = (e as CustomEvent).detail
            
            if (data.project_title !== undefined) {
                triggerHighlight("title")
                let index = 0
                const targetText = data.project_title
                setProjectTitle("")
                const timer = setInterval(() => {
                    if (index < targetText.length) {
                        setProjectTitle(prev => prev + targetText[index])
                        index++
                    } else {
                        clearInterval(timer)
                    }
                }, 30)
            }
            
            if (data.short_summary !== undefined) {
                triggerHighlight("summary")
                let index = 0
                const targetText = data.short_summary
                setShortSummary("")
                const timer = setInterval(() => {
                    if (index < targetText.length) {
                        setShortSummary(prev => prev + targetText[index])
                        index++
                    } else {
                        clearInterval(timer)
                    }
                }, 20)
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
                const htmlToType = markdownToHtml(data.description)
                let index = 0
                let currentTyped = ""
                const baseContent = descriptionRef.current

                const timer = setInterval(() => {
                    if (index < htmlToType.length) {
                        if (htmlToType[index] === '<') {
                            const closeIndex = htmlToType.indexOf('>', index)
                            if (closeIndex !== -1) {
                                currentTyped += htmlToType.substring(index, closeIndex + 1)
                                index = closeIndex + 1
                            } else {
                                currentTyped += htmlToType[index]
                                index++
                            }
                        } else {
                            currentTyped += htmlToType[index]
                            index++
                        }
                        
                        const separator = baseContent ? "\n" : ""
                        setDescription(currentTyped + separator + baseContent)
                    } else {
                        clearInterval(timer)
                    }
                }, 15)
            }
        }
        
        window.addEventListener("agent-update-project", handleAgentUpdate)
        return () => {
            window.removeEventListener("agent-update-project", handleAgentUpdate)
        }
    }, [])

    const handleSubmit = async () => {
        if (!projectTitle.trim()) return

        setIsSubmitting(true)
        try {
            const projectData: ProjectCreate = {
                properties: {
                    project_title: projectTitle,
                    short_summary: shortSummary,
                    status: status,
                    priority: priority,
                    lead: lead,
                    members: members,
                    start_date: startDate,
                    target_date: targetDate,
                    labels: labels,
                    dependencies: dependencies,
                    description: description,
                    milestones: milestones,
                },
                team_id: 1 // TODO: get active team from redux
            } as unknown as ProjectCreate

            const data = await dispatch(createProject(projectData)).unwrap()
            console.log("Project created:", data)

            onOpenChange(false)
            // Reset form
            setProjectTitle("")
            setDescription("")
            setShortSummary("")
            setStatus("Backlog")
            setPriority("None")
            setLead(undefined)
            setMembers([])
            setStartDate(undefined)
            setTargetDate(undefined)
            setLabels([])
            setDependencies([])
            setMilestones([])

        } catch (error) {
            console.error("Failed to create project:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const formContent = (
        <div className="flex flex-col h-full bg-background">
            {/* Header Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                        <Box className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium text-foreground">HUZ</span>
                    </div>
                    <span className="text-muted-foreground/40">/</span>
                    <span className="text-foreground font-medium">New project</span>
                </div>
                {inline && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onOpenChange(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="flex flex-col h-[calc(100vh-60px)] overflow-y-auto">
                <div className="flex flex-col gap-6 p-6 pb-32">

                    {/* Title & Icon Area */}
                    <div className="group relative flex gap-4 items-start">
                        <div className="mt-1 flex-shrink-0">
                            <Button variant="outline" size="icon" className="w-10 h-10 rounded-lg border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-border">
                                <Box className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className={`transition-all duration-300 rounded p-1 ${highlightTitle ? "ring-2 ring-primary/80 bg-primary/5 shadow-sm" : ""}`}>
                                <InlineEditor
                                    value={projectTitle}
                                    onChange={setProjectTitle}
                                    placeholder="Project name"
                                    className="text-2xl font-semibold leading-tight"
                                />
                            </div>
                            <div className={`transition-all duration-300 rounded p-1 ${highlightSummary ? "ring-2 ring-primary/80 bg-primary/5 shadow-sm" : ""}`}>
                                <InlineEditor
                                    value={shortSummary}
                                    onChange={setShortSummary}
                                    placeholder="Add a short summary..."
                                    className="text-base text-muted-foreground"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Property Row - Horizontal Scrollable */}
                    <div className="flex flex-wrap items-center gap-2 -ml-2">
                        <div className={`transition-all duration-300 rounded p-1 ${highlightStatus ? "ring-2 ring-primary/80 bg-primary/5 shadow-sm" : ""}`}>
                            <ProjectStatusSelector value={status} onChange={setStatus} />
                        </div>
                        <div className={`transition-all duration-300 rounded p-1 ${highlightPriority ? "ring-2 ring-primary/80 bg-primary/5 shadow-sm" : ""}`}>
                            <ProjectPrioritySelector value={priority} onChange={setPriority} />
                        </div>
                        <div className="w-px h-4 bg-border mx-1" />
                        <MemberSelector value={lead} onChange={(val) => setLead(val as string)} />
                        <MemberSelector value={members} onChange={(val) => setMembers(val as string[])} multiple />
                        <div className="w-px h-4 bg-border mx-1" />
                        <DateSelector value={startDate} onChange={setStartDate} />
                        <DateSelector value={targetDate} onChange={setTargetDate} />
                        <div className="w-px h-4 bg-border mx-1" />
                        <LabelSelector value={labels} onChange={setLabels} />
                    </div>

                    <div className="h-px bg-border/40 w-full my-2" />

                    {/* Editor - Full space */}
                    <div className={`min-h-[200px] text-base text-foreground/90 transition-all duration-300 rounded p-2 ${
                        highlightDescription ? "ring-2 ring-primary/80 bg-primary/5 shadow-sm" : ""
                    }`}>
                        <TiptapEditor
                            value={description}
                            onChange={setDescription}
                            placeholder="Write a description, project brief, or collect ideas... (Type '/' for commands)"
                            className="min-h-[200px] prose-sm"
                        />
                    </div>

                    {/* Milestones Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between group cursor-pointer hover:bg-muted/30 p-2 rounded-md -ml-2" onClick={() => {/* Add Milestone logic */ }}>
                            <span className="font-semibold text-muted-foreground group-hover:text-foreground">Milestones</span>
                            <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="border rounded-lg bg-muted/20 p-6 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground border-dashed">
                            <ListTodo className="w-8 h-8 opacity-20" />
                            <p className="text-xs">No milestones yet</p>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-background/50 backdrop-blur-sm sticky bottom-0 flex justify-end gap-3 z-10 mt-auto">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!projectTitle}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isSubmitting ? "Creating..." : "Create project"}
                    </Button>
                </div>
            </div>
        </div>
    )

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
