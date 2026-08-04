"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks"
import { fetchProjects } from "@/lib/redux/slices/projectSlice"
import { TaskCreate } from "@/lib/types"
import { ProjectStatusSelector, ProjectPrioritySelector, MemberSelector } from "@/components/properties/factory"

interface CreateTaskModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultStatus?: string
    defaultProjectId?: number
    onSubmit: (taskData: Partial<TaskCreate> & { properties?: any }) => void
}

export function CreateTaskModal({
    open,
    onOpenChange,
    defaultStatus = "Planning",
    defaultProjectId,
    onSubmit
}: CreateTaskModalProps) {
    const dispatch = useAppDispatch()
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
    const { items: projects } = useAppSelector((state) => state.projects)
    
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState(defaultStatus)
    const [priority, setPriority] = useState("Medium")
    const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined)
    const [projectId, setProjectId] = useState<string>("")

    useEffect(() => {
        if (open) {
            if (projects.length === 0 && activeWorkspaceId) {
                dispatch(fetchProjects({ workspaceId: activeWorkspaceId, teamId: activeTeamId }))
            }
            setStatus(defaultStatus)
            setTitle("")
            setDescription("")
            setPriority("Medium")
            setAssigneeId(undefined)
        }
    }, [open, defaultStatus, dispatch, projects.length, activeWorkspaceId, activeTeamId])

    useEffect(() => {
        if (open) {
            const initialProject = defaultProjectId?.toString() || (projects.length > 0 ? projects[0].project_id?.toString() : "")
            setProjectId(initialProject)
        }
    }, [open, defaultProjectId, projects])

    const handleSubmit = () => {
        if (!title.trim() || !projectId) return

        onSubmit({
            title,
            description,
            status,
            project_id: parseInt(projectId),
            properties: {
                priority,
                assignee: assigneeId
            }
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] p-6 gap-0 bg-popover/95 border border-border/60 shadow-2xl backdrop-blur-md rounded-xl">
                {/* Hidden header title for screen readers only */}
                <DialogHeader className="sr-only">
                    <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                    {/* Borderless bold title */}
                    <div className="w-full">
                        <Input 
                            id="title" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            placeholder="Issue title"
                            autoFocus
                            className="text-lg font-semibold placeholder:text-muted-foreground/50 border-none focus-visible:ring-0 focus-visible:outline-none p-0 bg-transparent shadow-none w-full"
                        />
                    </div>
                    
                    {/* Completely borderless inline Tiptap editor */}
                    <div className="w-full">
                        <TiptapEditor 
                            value={description} 
                            onChange={setDescription} 
                            placeholder="Add description..."
                            className="prose-sm max-w-none text-sm placeholder:text-muted-foreground/40 bg-transparent focus-visible:outline-none min-h-[140px]"
                        />
                    </div>

                    {/* Inline micro-selector row resembling Linear screenshot exactly */}
                    <div className="flex items-center gap-1.5 flex-wrap border-b border-border/40 pb-4 mb-2">
                        <ProjectStatusSelector 
                            value={status} 
                            onChange={setStatus} 
                        />
                        <ProjectPrioritySelector 
                            value={priority} 
                            onChange={setPriority} 
                        />
                        <MemberSelector
                            value={assigneeId}
                            onChange={setAssigneeId}
                            placeholder="Assignee"
                        />
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger className="h-7 text-xs font-medium text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 gap-1.5 border border-transparent hover:border-border/40 transition-all rounded-md px-2 bg-transparent shadow-none w-auto">
                                <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map(p => (
                                    <SelectItem key={p.project_id} value={p.project_id?.toString() || ""}>
                                        {p.properties?.project_title || `Project ${p.project_id}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                    {/* Left: Optional shortcuts context info matching Linear style */}
                    <span className="text-[11px] text-muted-foreground/50 font-medium select-none hidden sm:inline">
                        Press <kbd className="font-semibold bg-muted/60 px-1 py-0.5 rounded text-[10px]">C</kbd> to open
                    </span>
                    
                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            className="h-8 text-xs font-semibold px-3 cursor-pointer rounded-lg hover:bg-muted/50"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={!title.trim() || !projectId}
                            className="h-8 text-xs font-semibold px-4 cursor-pointer rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            Create Issue
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
