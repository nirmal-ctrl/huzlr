"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { DateSelector } from "@/components/properties/factory"
import { useCreateMilestoneMutation } from "@/services/milestonesApi"
import { Plus, Check, Box } from "lucide-react"

interface CreateMilestoneModalProps {
    projectId: number;
}

export function CreateMilestoneModal({ projectId }: CreateMilestoneModalProps) {
    const [open, setOpen] = useState(false)
    const [createMilestone, { isLoading }] = useCreateMilestoneMutation()
    const [isSuccess, setIsSuccess] = useState(false)
    
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        // Format ISO string to YYYY-MM-DD for backend date parsing
        const formatDateForBackend = (isoString?: string) => {
            if (!isoString) return undefined;
            return isoString.split('T')[0];
        };

        try {
            await createMilestone({
                projectId,
                milestone: {
                    project_id: projectId,
                    title: title.trim(),
                    description: description.trim() || undefined,
                    estimated_start_date: formatDateForBackend(startDate),
                    estimated_end_date: formatDateForBackend(endDate),
                }
            }).unwrap()
            
            setIsSuccess(true)
            setTimeout(() => {
                setOpen(false)
                resetForm()
                setIsSuccess(false)
            }, 1000)
        } catch (error) {
            console.error("Failed to create milestone:", error)
        }
    }

    const resetForm = () => {
        setTitle("")
        setDescription("")
        setStartDate("")
        setEndDate("")
    }

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen)
            if (!newOpen) resetForm()
        }}>
            <DialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-[11px] font-normal rounded-md text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 gap-1 border border-border/20 hover:border-border/60 transition-all shadow-none"
                >
                    <Plus className="w-3 h-3 text-muted-foreground/50" />
                    Create Milestone
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] p-5 gap-0 border bg-background shadow-2xl rounded-lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Header Context Bar */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
                        <Box className="w-3.5 h-3.5 opacity-60" />
                        <span>Milestones</span>
                        <span>/</span>
                        <span className="text-foreground font-medium">New milestone</span>
                    </div>

                    {/* Title Input (Borderless, large) */}
                    <div>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-lg font-semibold border-0 focus-visible:ring-0 p-0 shadow-none bg-transparent placeholder:text-muted-foreground/40 h-auto"
                            placeholder="Milestone name"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Description Tiptap (Borderless, compact) */}
                    <div className="min-h-[120px] text-sm text-foreground/95">
                        <TiptapEditor
                            value={description}
                            onChange={(value) => setDescription(value)}
                            placeholder="Add some details or objectives..."
                            className="prose-sm text-foreground/90 max-w-none"
                        />
                    </div>

                    <div className="h-px bg-border/40 w-full" />

                    {/* Inline Timeline Properties */}
                    <div className="flex flex-wrap items-center gap-3 py-1">
                        <span className="text-xs text-muted-foreground select-none">Timeline</span>
                        
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground/60 select-none">Start</span>
                            <DateSelector
                                value={startDate || undefined}
                                onChange={(v) => setStartDate(v || "")}
                                className="h-7 px-2 text-xs font-normal rounded-md text-foreground bg-muted/20 hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground/60 select-none">End</span>
                            <DateSelector
                                value={endDate || undefined}
                                onChange={(v) => setEndDate(v || "")}
                                className="h-7 px-2 text-xs font-normal rounded-md text-foreground bg-muted/20 hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-border/40 w-full" />

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setOpen(false)}
                            className="h-7 px-3 text-xs font-medium rounded-full"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isLoading || isSuccess || !title.trim()}
                            className={`h-7 px-4 text-xs font-medium rounded-full transition-all duration-300 ${
                                isSuccess 
                                    ? "bg-emerald-600 hover:bg-emerald-600 text-white gap-1.5" 
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                        >
                            {isLoading ? (
                                "Creating..."
                            ) : isSuccess ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-white" />
                                    Created!
                                </>
                            ) : (
                                "Create"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
