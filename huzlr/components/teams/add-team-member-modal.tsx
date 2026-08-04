"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAddTeamMemberMutation } from "@/services/teamsApi"
import { useToast } from "@/hooks/use-toast"
import { WorkspaceWithMembers } from "@/services/invitesApi"

interface AddTeamMemberModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    team: { id: number; name: string } | null
    workspaceData: WorkspaceWithMembers | undefined
}

export function AddTeamMemberModal({ open, onOpenChange, team, workspaceData }: AddTeamMemberModalProps) {
    const { toast } = useToast()
    const [userId, setUserId] = useState<string>("")
    const [addTeamMember, { isLoading }] = useAddTeamMemberMutation()

    if (!team) return null

    const handleAdd = async () => {
        if (!userId) return
        try {
            await addTeamMember({ teamId: team.id, userId: parseInt(userId) }).unwrap()
            toast({
                title: "Member Added",
                description: `Successfully added member to ${team.name}.`,
            })
            setUserId("")
            onOpenChange(false)
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed to add member",
                description: error?.data?.detail || "Something went wrong.",
            })
        }
    }

    const availableMembers = workspaceData?.memberships || []

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Add Member to {team.name}</DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="member">Select Workspace Member</Label>
                        <Select value={userId} onValueChange={setUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a member..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableMembers.map((m) => (
                                    <SelectItem key={m.user_id} value={m.user_id.toString()}>
                                        {m.user?.username || m.user?.email} ({m.user?.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={!userId || isLoading}>
                        {isLoading ? "Adding..." : "Add to Team"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
