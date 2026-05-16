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
    const { items: projects } = useAppSelector((state) => state.projects)
    
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState(defaultStatus)
    const [priority, setPriority] = useState("medium")
    const [projectId, setProjectId] = useState<string>("")

    useEffect(() => {
        if (open) {
            if (projects.length === 0) {
                dispatch(fetchProjects())
            }
            setStatus(defaultStatus)
            setTitle("")
            setDescription("")
            setPriority("medium")
        }
    }, [open, defaultStatus, dispatch, projects.length])

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
                
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Task Title</Label>
                        <Input 
                            id="title" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            placeholder="E.g. Setup database schema"
                            autoFocus
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Project</Label>
                            <Select value={projectId} onValueChange={setProjectId}>
                                <SelectTrigger>
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
                        
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="capitalize">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger className="capitalize">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <div className="border border-input rounded-md overflow-hidden bg-background shadow-sm">
                            <TiptapEditor 
                                value={description} 
                                onChange={setDescription} 
                                placeholder="Add any extra details here..."
                                className="p-3"
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
