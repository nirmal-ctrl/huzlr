"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks"
import { fetchProjects } from "@/lib/redux/slices/projectSlice"
import { TaskCreate } from "@/lib/types"
import { ProjectStatusSelector, ProjectPrioritySelector } from "@/components/properties/factory"

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
    defaultStatus = "pending",
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
    const [priority, setPriority] = useState("medium")
    const [projectId, setProjectId] = useState<string>("")

    useEffect(() => {
        if (open) {
            if (projects.length === 0 && activeWorkspaceId) {
                dispatch(fetchProjects({ workspaceId: activeWorkspaceId, teamId: activeTeamId }))
            }
            setStatus(defaultStatus)
            setTitle("")
            setDescription("")
            setPriority("medium")
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
                priority
            }
        })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-5 py-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="title" className="text-xs text-muted-foreground">Issue Title</Label>
                        <Input 
                            id="title" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            placeholder="E.g. Setup database schema"
                            autoFocus
                            className="text-base font-medium h-10 border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/25 bg-background shadow-none"
                        />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 border-y border-border/40 py-3.5 -mx-1">
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground">Project</Label>
                            <Select value={projectId} onValueChange={setProjectId}>
                                <SelectTrigger className="h-8 text-xs border-transparent hover:bg-muted/40 bg-transparent shadow-none px-2 justify-start gap-1">
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
                        
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground">Status</Label>
                            <ProjectStatusSelector 
                                value={status} 
                                onChange={setStatus} 
                                className="justify-start px-2 bg-transparent hover:bg-muted/40 border-transparent h-8 w-full"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground">Priority</Label>
                            <ProjectPrioritySelector 
                                value={priority} 
                                onChange={setPriority} 
                                className="justify-start px-2 bg-transparent hover:bg-muted/40 border-transparent h-8 w-full"
                            />
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <div className="border border-border/80 rounded-lg overflow-hidden bg-background focus-within:ring-1 focus-within:ring-primary/25 focus-within:border-primary/50">
                            <TiptapEditor 
                                value={description} 
                                onChange={setDescription} 
                                placeholder="Add any extra details here..."
                                className="p-3.5 prose-sm max-w-none"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!title.trim() || !projectId}>Create Task</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
