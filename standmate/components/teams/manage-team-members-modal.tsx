"use client"

import React, { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    useGetTeamQuery,
    useAddTeamMemberMutation,
    useRemoveTeamMemberMutation,
} from "@/services/teamsApi"
import { useToast } from "@/hooks/use-toast"
import { WorkspaceWithMembers } from "@/services/invitesApi"
import { Users, UserMinus, UserPlus, Loader2, Trash2, Mail } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ManageTeamMembersModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    team: { id: number; name: string } | null
    workspaceData: WorkspaceWithMembers | undefined
    isUserWorkspaceAdmin: boolean
}

export function ManageTeamMembersModal({
    open,
    onOpenChange,
    team,
    workspaceData,
    isUserWorkspaceAdmin,
}: ManageTeamMembersModalProps) {
    const { toast } = useToast()
    const [selectedUserId, setSelectedUserId] = useState<string>("")
    
    // Fetch team details reactively using RTK Query
    const { data: teamDetails, isLoading: isTeamDetailsLoading } = useGetTeamQuery(team?.id || 0, {
        skip: !team?.id || !open,
    })

    const [addTeamMember, { isLoading: isAdding }] = useAddTeamMemberMutation()
    const [removeTeamMember, { isLoading: isRemoving }] = useRemoveTeamMemberMutation()

    if (!team) return null

    const handleAddMember = async () => {
        if (!selectedUserId) return
        try {
            await addTeamMember({ teamId: team.id, userId: parseInt(selectedUserId, 10) }).unwrap()
            toast({
                title: "Member Added",
                description: `Successfully added member to team ${team.name}.`,
            })
            setSelectedUserId("")
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed to add member",
                description: error?.data?.detail || "Something went wrong.",
            })
        }
    }

    const handleRemoveMember = async (userId: number, username: string) => {
        if (!confirm(`Are you sure you want to remove ${username} from team ${team.name}?`)) {
            return
        }
        try {
            await removeTeamMember({ teamId: team.id, userId }).unwrap()
            toast({
                title: "Member Removed",
                description: `Successfully removed ${username} from team ${team.name}.`,
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed to remove member",
                description: error?.data?.detail || "Something went wrong.",
            })
        }
    }

    // Filter workspace members that are NOT already in the team
    const currentMemberIds = teamDetails?.memberships.map((m) => m.user_id) || []
    const availableWorkspaceMembers = (workspaceData?.memberships || []).filter(
        (m) => m.user && !currentMemberIds.includes(m.user_id)
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background border border-border rounded-xl shadow-2xl">
                <div className="p-6 pb-4 border-b border-border/60">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                            <Users className="size-5 text-primary" />
                            Manage Members: {team.name}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground pt-1">
                            Add and remove members to control who belongs to this team.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Add Member Form - Only for Workspace Admins */}
                    {isUserWorkspaceAdmin && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Add Member to Team
                            </Label>
                            <div className="flex gap-2">
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger className="flex-1 bg-muted/20 border-border focus:ring-1 focus:ring-primary">
                                        <SelectValue placeholder="Choose a member to add..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border border-border">
                                        {availableWorkspaceMembers.length === 0 ? (
                                            <div className="p-2 text-xs text-muted-foreground text-center">
                                                All workspace members are already in this team.
                                            </div>
                                        ) : (
                                            availableWorkspaceMembers.map((m) => (
                                                <SelectItem key={m.user_id} value={m.user_id.toString()}>
                                                    {m.user?.username || m.user?.email}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={handleAddMember}
                                    disabled={!selectedUserId || isAdding}
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-10 flex items-center gap-1.5"
                                >
                                    {isAdding ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="size-4" /> Add
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Team Members List */}
                    <div className="space-y-3">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Current Members ({teamDetails?.memberships.length || 0})
                        </Label>

                        {isTeamDetailsLoading ? (
                            <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin text-primary" /> Loading members...
                            </div>
                        ) : !teamDetails?.memberships.length ? (
                            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg flex flex-col items-center gap-2">
                                <Users className="size-6 text-muted-foreground/40" />
                                No members in this team yet.
                            </div>
                        ) : (
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                {teamDetails.memberships.map((membership) => {
                                    const user = membership.user || {
                                        id: membership.user_id,
                                        username: "Unknown User",
                                        email: "No Email",
                                    }
                                    return (
                                        <div
                                            key={membership.id}
                                            className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/20 transition-all"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Avatar className="size-7 border border-border">
                                                    <AvatarFallback className="text-[10px] bg-muted font-bold text-foreground">
                                                        {user.username.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {user.username}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <Mail className="size-3" />
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </div>

                                            {isUserWorkspaceAdmin && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={isRemoving}
                                                    onClick={() => handleRemoveMember(user.id, user.username)}
                                                    className="size-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md cursor-pointer transition-all"
                                                    title="Remove from Team"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="h-9 text-xs font-semibold px-4"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
