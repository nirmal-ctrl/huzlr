"use client"

import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { updateTeam } from "@/lib/redux/slices/workspaceSlice"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Users, Loader2, Edit3 } from "lucide-react"

interface EditTeamModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    team: { id: number; name: string; description: string | null; workspace_id: number } | null
}

export function EditTeamModal({ open, onOpenChange, team }: EditTeamModalProps) {
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (team) {
            setName(team.name || "")
            setDescription(team.description || "")
        }
    }, [team, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !activeWorkspaceId || !team) return

        setIsLoading(true)
        try {
            await dispatch(updateTeam({
                teamId: team.id,
                workspaceId: activeWorkspaceId,
                name: name.trim(),
                description: description.trim() || undefined
            })).unwrap()
            
            toast({
                title: "Team Updated",
                description: `Successfully updated team "${name.trim()}".`,
            })
            onOpenChange(false)
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed to update team",
                description: error || "Something went wrong.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-background border border-border rounded-xl shadow-2xl">
                <div className="p-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                            <Edit3 className="size-5 text-primary" />
                            Edit team details
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground pt-1">
                            Update the name and description of your team.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="px-6 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Team Name
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
                                <Input
                                    type="text"
                                    placeholder="e.g. Design, Frontend, Growth"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-9 h-10 bg-muted/20 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Description (Optional)
                            </label>
                            <Input
                                type="text"
                                placeholder="What does this team focus on?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="h-10 bg-muted/20 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="h-9"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 shadow-sm"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
