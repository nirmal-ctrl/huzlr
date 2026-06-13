"use client"

import { useState } from "react"
import { useAppSelector } from "@/lib/redux/hooks"
import {
    useGetWorkspaceWithMembersQuery,
    useGetWorkspaceInvitesQuery,
    useRemindInviteMutation,
} from "@/services/invitesApi"
import { Button } from "@/components/ui/button"
import { InviteMembersModal } from "@/components/teams/invite-members-modal"
import { useToast } from "@/hooks/use-toast"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Mail, Shield, User, Clock, AlertCircle } from "lucide-react"

export default function TeamsPage() {
    const { toast } = useToast()
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [activeRemindingId, setActiveRemindingId] = useState<number | null>(null)
    const [remindInvite] = useRemindInviteMutation()

    const {
        data: workspaceData,
        isLoading: isMembersLoading,
        error: membersError,
    } = useGetWorkspaceWithMembersQuery(activeWorkspaceId || 0, {
        skip: !activeWorkspaceId,
    })

    const {
        data: invitesData,
        isLoading: isInvitesLoading,
        error: invitesError,
    } = useGetWorkspaceInvitesQuery(activeWorkspaceId || 0, {
        skip: !activeWorkspaceId,
    })

    const handleRemind = async (inviteId: number, email: string) => {
        setActiveRemindingId(inviteId)
        try {
            await remindInvite(inviteId).unwrap()
            toast({
                title: "Reminder Sent",
                description: `Successfully resent invitation to ${email}.`,
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed to send reminder",
                description: error?.data?.detail || "Something went wrong.",
            })
        } finally {
            setActiveRemindingId(null)
        }
    }

    if (!activeWorkspaceId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 bg-background rounded-lg border border-border">
                <AlertCircle className="size-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No Active Workspace</h3>
                <p className="text-sm text-muted-foreground">Select or create a workspace to view team settings.</p>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-8 bg-background min-h-screen text-foreground">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">Team & Members</h1>
                    <p className="text-sm text-muted-foreground pt-1.5">
                        Manage members of your workspace and review pending workspace invitations.
                    </p>
                </div>
                <Button
                    onClick={() => setIsInviteOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-9 px-4 flex items-center gap-2 rounded-lg shadow-sm"
                >
                    <UserPlus className="size-4" />
                    Invite Members
                </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="members" className="space-y-6">
                <TabsList className="bg-muted/40 border border-border p-1 rounded-lg">
                    <TabsTrigger value="members" className="px-4 py-1.5 text-sm rounded-md">
                        Members ({workspaceData?.memberships.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="invites" className="px-4 py-1.5 text-sm rounded-md">
                        Pending Invites ({invitesData?.length || 0})
                    </TabsTrigger>
                </TabsList>

                {/* Members Content */}
                <TabsContent value="members" className="outline-none">
                    <Card className="border border-border bg-card/40 backdrop-blur-md shadow-sm">
                        <CardHeader className="px-6 py-5 border-b border-border/60">
                            <CardTitle className="text-lg font-medium">Active Workspace Members</CardTitle>
                            <CardDescription>
                                These users currently have full access to workspace resources, teams, and projects.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isMembersLoading ? (
                                <div className="p-6 space-y-4">
                                    {[1, 2, 3].map((n) => (
                                        <div key={n} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="size-10 rounded-full" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-32" />
                                                    <Skeleton className="h-3 w-48" />
                                                </div>
                                            </div>
                                            <Skeleton className="h-6 w-16 rounded" />
                                        </div>
                                    ))}
                                </div>
                            ) : membersError ? (
                                <div className="p-8 text-center text-sm text-destructive">
                                    Error loading workspace members. Please try again later.
                                </div>
                            ) : !workspaceData?.memberships.length ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    No active members found.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/20 border-b border-border/60">
                                        <TableRow>
                                            <TableHead className="h-10 pl-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</TableHead>
                                            <TableHead className="h-10 pr-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Joined Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {workspaceData.memberships.map((membership) => {
                                            const u = membership.user || {
                                                username: "Unknown User",
                                                email: "Unknown Email"
                                            }
                                            return (
                                                <TableRow key={membership.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                                                    <TableCell className="py-4 pl-6 font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="size-8 border border-border">
                                                                <AvatarImage src={`/huzlr-no-bg.png`} />
                                                                <AvatarFallback className="text-xs bg-muted font-bold text-foreground">
                                                                    {u.username.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-foreground text-sm font-semibold">{u.username}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-muted-foreground text-sm">{u.email}</TableCell>
                                                    <TableCell className="py-4">
                                                        <Badge variant={membership.role === "admin" ? "default" : "secondary"} className="h-5 text-[11px] font-medium px-2 flex items-center gap-1.5 w-fit">
                                                            {membership.role === "admin" ? (
                                                                <>
                                                                    <Shield className="size-3 text-current" />
                                                                    Admin
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <User className="size-3 text-current" />
                                                                    Member
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4 pr-6 text-right text-muted-foreground text-sm">
                                                        {new Date(membership.created_at).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Invites Content */}
                <TabsContent value="invites" className="outline-none">
                    <Card className="border border-border bg-card/40 backdrop-blur-md shadow-sm">
                        <CardHeader className="px-6 py-5 border-b border-border/60">
                            <CardTitle className="text-lg font-medium">Pending Invitations</CardTitle>
                            <CardDescription>
                                These invitations were sent to the specified emails but have not been accepted yet.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isInvitesLoading ? (
                                <div className="p-6 space-y-4">
                                    {[1, 2].map((n) => (
                                        <div key={n} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="size-10 rounded-full" />
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-32" />
                                                    <Skeleton className="h-3 w-48" />
                                                </div>
                                            </div>
                                            <Skeleton className="h-6 w-16 rounded" />
                                        </div>
                                    ))}
                                </div>
                            ) : invitesError ? (
                                <div className="p-8 text-center text-sm text-destructive">
                                    Error loading workspace invitations. Please make sure you are an admin.
                                </div>
                            ) : !invitesData?.length ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center gap-3 border-dashed border border-border m-6 rounded-lg">
                                    <Mail className="size-8 text-muted-foreground/40" />
                                    <h4 className="text-sm font-semibold text-foreground">No Pending Invitations</h4>
                                    <p className="text-xs text-muted-foreground max-w-[280px]">
                                        There are no active workspace invitations. You can send new invitations to add people.
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/20 border-b border-border/60">
                                        <TableRow>
                                            <TableHead className="h-10 pl-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expires At</TableHead>
                                            <TableHead className="h-10 pr-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invitesData.map((invite) => {
                                            const isThisReminding = activeRemindingId === invite.id

                                            return (
                                                <TableRow key={invite.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                                                    <TableCell className="py-4 pl-6 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="size-4 text-muted-foreground" />
                                                            <span className="text-foreground text-sm">{invite.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <Badge variant="secondary" className="h-5 text-[11px] font-medium px-2">
                                                            {invite.role === "admin" ? "Admin" : "Member"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <Badge variant="outline" className="h-5 text-[11px] font-medium px-2 text-primary border-primary/20 bg-primary/5 flex items-center gap-1.5 w-fit">
                                                            <Clock className="size-3" />
                                                            Pending
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-muted-foreground text-sm">
                                                        {new Date(invite.expires_at).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="py-4 pr-6 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={activeRemindingId !== null}
                                                            onClick={() => handleRemind(invite.id, invite.email)}
                                                            className="h-7 text-xs font-semibold px-3 border-border hover:bg-muted/30"
                                                        >
                                                            {isThisReminding ? "Sending..." : "Remind"}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Invite Modal */}
            <InviteMembersModal open={isInviteOpen} onOpenChange={setIsInviteOpen} />
        </div>
    )
}
