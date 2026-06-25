"use client"

import { useState } from "react"
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks"
import { SiteHeader } from "@/components/site-header"
import {
    useGetWorkspaceWithMembersQuery,
    useGetWorkspaceInvitesQuery,
    useRemindInviteMutation,
} from "@/services/invitesApi"
import { Button } from "@/components/ui/button"
import { InviteMembersModal } from "@/components/teams/invite-members-modal"
import { CreateWorkspaceModal } from "@/components/teams/create-workspace-modal"
import { CreateTeamModal } from "@/components/teams/create-team-modal"
import { EditTeamModal } from "@/components/teams/edit-team-modal"
import { ManageTeamMembersModal } from "@/components/teams/manage-team-members-modal"
import { deleteTeam } from "@/lib/redux/slices/workspaceSlice"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
    UserPlus, 
    Mail, 
    Shield, 
    User, 
    Clock, 
    AlertCircle, 
    Building, 
    Users, 
    Calendar, 
    Plus,
    Lock,
    Edit,
    Trash2,
    MoreHorizontal
} from "lucide-react"

export default function TeamsPage() {
    const { toast } = useToast()
    const dispatch = useAppDispatch()
    
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const workspaces = useAppSelector((state) => state.workspace.workspaces)
    const teams = useAppSelector((state) => state.workspace.teams)
    const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
    const workspaceStateLoading = useAppSelector((state) => state.workspace.loading)
    const currentUser = useAppSelector((state) => state.auth.user)

    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false)
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
    const [isEditTeamOpen, setIsEditTeamOpen] = useState(false)
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
    const [selectedTeam, setSelectedTeam] = useState<{ id: number; name: string; description: string | null; workspace_id: number } | null>(null)
    const [activeRemindingId, setActiveRemindingId] = useState<number | null>(null)
    const [remindInvite] = useRemindInviteMutation()

    const handleDeleteTeam = async (teamId: number, teamName: string) => {
        if (!confirm(`Are you sure you want to delete the team "${teamName}"? This action cannot be undone.`)) {
            return
        }
        try {
            await dispatch(deleteTeam({ teamId, workspaceId: activeWorkspaceId! })).unwrap()
            toast({
                title: "Team Deleted",
                description: `Successfully deleted team "${teamName}".`,
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed to delete team",
                description: error || "Something went wrong.",
            })
        }
    }

    const {
        data: workspaceData,
        isLoading: isMembersLoading,
        error: membersError,
    } = useGetWorkspaceWithMembersQuery(activeWorkspaceId || 0, {
        skip: !activeWorkspaceId,
    })

    const activeWorkspaceObj = workspaces.find((w) => w.id === activeWorkspaceId)
    const isUserWorkspaceAdmin = currentUser && activeWorkspaceObj?.owner_id === currentUser.id

    const {
        data: invitesData,
        isLoading: isInvitesLoading,
        error: invitesError,
    } = useGetWorkspaceInvitesQuery(activeWorkspaceId || 0, {
        skip: !activeWorkspaceId || !isUserWorkspaceAdmin,
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
            <>
                <SiteHeader title="Workspace & Teams" />
                <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 bg-background rounded-lg border border-border w-full">
                    <AlertCircle className="size-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">No Active Workspace</h3>
                    <p className="text-sm text-muted-foreground">Select or create a workspace to view settings.</p>
                    <Button 
                        onClick={() => setIsWorkspaceModalOpen(true)}
                        className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        <Plus className="size-4 mr-2" />
                        Create Workspace
                    </Button>
                    <CreateWorkspaceModal open={isWorkspaceModalOpen} onOpenChange={setIsWorkspaceModalOpen} />
                </div>
            </>
        )
    }

    return (
        <>
            <SiteHeader title="Workspace & Teams" />
            <div className="w-full p-6 lg:p-8 space-y-8 bg-background min-h-screen text-foreground">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-6 w-full">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">Workspace & Teams</h1>
                    <p className="text-sm text-muted-foreground pt-1.5">
                        Manage your workspaces, organize your teams, and invite members.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsTeamModalOpen(true)}
                        className="border-border hover:bg-muted/30 text-sm font-medium h-9 px-4 flex items-center gap-2 rounded-lg"
                    >
                        <Plus className="size-4" />
                        Create Team
                    </Button>
                    {isUserWorkspaceAdmin && (
                        <Button
                            onClick={() => setIsInviteOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-9 px-4 flex items-center gap-2 rounded-lg shadow-sm"
                        >
                            <UserPlus className="size-4" />
                            Invite Members
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="workspace" className="space-y-6 w-full">
                <TabsList className="bg-muted/40 border border-border p-1 rounded-lg">
                    <TabsTrigger value="workspace" className="px-4 py-1.5 text-sm rounded-md">
                        Workspace
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="px-4 py-1.5 text-sm rounded-md">
                        Teams ({teams.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="members" className="px-4 py-1.5 text-sm rounded-md">
                        Members ({workspaceData?.memberships.length || 0})
                    </TabsTrigger>
                    {isUserWorkspaceAdmin && (
                        <TabsTrigger value="invites" className="px-4 py-1.5 text-sm rounded-md">
                            Pending Invites ({invitesData?.length || 0})
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Workspace Tab Content */}
                <TabsContent value="workspace" className="outline-none space-y-6 w-full">
                    {workspaceStateLoading && !activeWorkspaceObj ? (
                        <div className="grid gap-6 md:grid-cols-3">
                            {[1, 2, 3].map((n) => (
                                <Card key={n} className="border border-border bg-card/40 backdrop-blur-md">
                                    <CardHeader className="pb-2">
                                        <Skeleton className="h-4 w-24" />
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Skeleton className="h-8 w-36" />
                                        <Skeleton className="h-3 w-16" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-3">
                            <Card className="border border-border bg-card/40 backdrop-blur-md shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                        <Building className="size-4" /> Workspace Name
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-foreground">
                                        {activeWorkspaceObj?.name || "Active Workspace"}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        ID: {activeWorkspaceId}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border border-border bg-card/40 backdrop-blur-md shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                        <Users className="size-4" /> Workspace Stats
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-foreground">
                                        {workspaceData?.memberships.length || 0} Members
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Across {teams.length} distinct teams
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border border-border bg-card/40 backdrop-blur-md shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                        <Calendar className="size-4" /> Created Date
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-foreground">
                                        {activeWorkspaceObj?.created_at ? new Date(activeWorkspaceObj.created_at).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        }) : "N/A"}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {isUserWorkspaceAdmin ? "Owned by you" : "Joined Workspace"}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <Card className="border border-border bg-card/40 backdrop-blur-md shadow-sm w-full">
                        <CardHeader className="px-6 py-5 border-b border-border/60">
                            <CardTitle className="text-lg font-medium">Workspace Details & Settings</CardTitle>
                            <CardDescription>
                                High-level configuration and details for {activeWorkspaceObj?.name}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {workspaceStateLoading && !activeWorkspaceObj ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-5 w-48" />
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-5 w-48" />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid gap-1.5">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Workspace Owner
                                        </span>
                                        <span className="text-sm text-foreground font-medium flex items-center gap-2">
                                            <User className="size-4 text-muted-foreground" />
                                            {isUserWorkspaceAdmin ? "You (Owner)" : `User ID: ${activeWorkspaceObj?.owner_id}`}
                                        </span>
                                    </div>

                                    <div className="grid gap-1.5 pt-2">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Access Type
                                        </span>
                                        <span className="text-sm text-foreground font-medium flex items-center gap-2">
                                            <Lock className="size-4 text-muted-foreground" />
                                            Private Workspace
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-border/60 pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-foreground">Create Another Workspace</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Need a separate space for another organization or private pod?
                                        </p>
                                    </div>
                                    <Button 
                                        variant="outline"
                                        onClick={() => setIsWorkspaceModalOpen(true)}
                                        className="border-border text-xs h-8"
                                    >
                                        Create New Workspace
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Teams Tab Content */}
                <TabsContent value="teams" className="outline-none w-full">
                    <Card className="border border-border bg-card/40 backdrop-blur-md shadow-sm w-full">
                        <CardHeader className="px-6 py-5 border-b border-border/60 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-medium">Workspace Teams</CardTitle>
                                <CardDescription>
                                    Group members into teams to represent your organizational structure.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setIsTeamModalOpen(true)}
                                className="bg-primary text-primary-foreground text-xs"
                            >
                                <Plus className="size-3.5 mr-1" /> Add Team
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {workspaceStateLoading ? (
                                <div className="p-6 space-y-4">
                                    {[1, 2].map((n) => (
                                        <div key={n} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 w-full">
                                                <Skeleton className="size-8 rounded-md" />
                                                <div className="space-y-2 flex-1">
                                                    <Skeleton className="h-4 w-1/4" />
                                                    <Skeleton className="h-3 w-1/2" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : !teams.length ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center gap-3 border-dashed border border-border m-6 rounded-lg">
                                    <Users className="size-8 text-muted-foreground/40" />
                                    <h4 className="text-sm font-semibold text-foreground">No Teams Found</h4>
                                    <p className="text-xs text-muted-foreground max-w-[280px]">
                                        There are no active teams in this workspace. Create one to start grouping discussions.
                                    </p>
                                </div>
                            ) : (
                                <Table className="w-full">
                                    <TableHeader className="bg-muted/20 border-b border-border/60">
                                        <TableRow>
                                            <TableHead className="h-10 pl-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Name</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created Date</TableHead>
                                            <TableHead className="h-10 pr-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {teams.map((team) => (
                                            <TableRow key={team.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                                                <TableCell className="py-4 pl-6 font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex size-7 items-center justify-center rounded-md border bg-background text-foreground">
                                                            <Users className="size-4 text-muted-foreground" />
                                                        </div>
                                                        <span className="text-foreground text-sm font-semibold">{team.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 text-muted-foreground text-sm max-w-[240px] truncate">
                                                    {team.description || <span className="text-muted-foreground/50">No description provided</span>}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {team.is_default ? (
                                                        <Badge className="h-5 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/10 border border-primary/20">
                                                            Default Team
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="h-5 text-[10px] font-medium text-muted-foreground border-border bg-muted/10">
                                                            Custom Team
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 text-muted-foreground text-sm">
                                                    {new Date(team.created_at).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </TableCell>
                                                <TableCell className="py-4 pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setSelectedTeam(team)
                                                                setIsAddMemberOpen(true)
                                                            }}
                                                            className="h-7 text-xs font-semibold px-3 border border-transparent hover:border-border/40 text-primary hover:text-primary hover:bg-primary/5 cursor-pointer"
                                                        >
                                                            Add Member
                                                        </Button>

                                                        {isUserWorkspaceAdmin && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="size-7 border border-transparent hover:border-border/40 text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                                                                    >
                                                                        <MoreHorizontal className="size-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-36 bg-background border border-border rounded-lg shadow-lg">
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            setSelectedTeam(team)
                                                                            setIsEditTeamOpen(true)
                                                                        }}
                                                                        className="text-xs font-medium text-foreground flex items-center gap-2 cursor-pointer focus:bg-muted/50"
                                                                    >
                                                                        <Edit className="size-3.5" />
                                                                        Edit Team
                                                                    </DropdownMenuItem>
                                                                    {!team.is_default && (
                                                                        <DropdownMenuItem
                                                                            onClick={() => handleDeleteTeam(team.id, team.name)}
                                                                            className="text-xs font-medium text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer focus:bg-destructive/5"
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                            Delete Team
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Members Content */}
                <TabsContent value="members" className="outline-none w-full">
                    <Card className="border border-border bg-card/40 backdrop-blur-md shadow-sm w-full">
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
                                            <div className="flex items-center gap-3 w-full">
                                                <Skeleton className="size-10 rounded-full" />
                                                <div className="space-y-2 flex-1">
                                                    <Skeleton className="h-4 w-1/4" />
                                                    <Skeleton className="h-3 w-1/2" />
                                                </div>
                                            </div>
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
                                <Table className="w-full">
                                    <TableHeader className="bg-muted/20 border-b border-border/60">
                                        <TableRow>
                                            <TableHead className="h-10 pl-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspace</TableHead>
                                            <TableHead className="h-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teams</TableHead>
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
                                                        <Badge variant="outline" className="h-5 text-[11px] font-medium border-border bg-muted/10">
                                                            {activeWorkspaceObj?.name || "Workspace"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            <Badge className="h-5 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/10 border border-primary/20">
                                                                General
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
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
                {isUserWorkspaceAdmin && (
                    <TabsContent value="invites" className="outline-none w-full">
                        <Card className="border border-border bg-card/40 backdrop-blur-md shadow-sm w-full">
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
                                                <div className="flex items-center gap-3 w-full">
                                                    <Skeleton className="size-10 rounded-full" />
                                                    <div className="space-y-2 flex-1">
                                                        <Skeleton className="h-4 w-1/4" />
                                                        <Skeleton className="h-3 w-1/2" />
                                                    </div>
                                                </div>
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
                                    <Table className="w-full">
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
                )}
            </Tabs>

            {/* Modals */}
            <InviteMembersModal open={isInviteOpen} onOpenChange={setIsInviteOpen} />
            <CreateWorkspaceModal open={isWorkspaceModalOpen} onOpenChange={setIsWorkspaceModalOpen} />
            <CreateTeamModal open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen} />
            <EditTeamModal open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen} team={selectedTeam} />
            <ManageTeamMembersModal 
                open={isAddMemberOpen} 
                onOpenChange={setIsAddMemberOpen} 
                team={selectedTeam} 
                workspaceData={workspaceData} 
                isUserWorkspaceAdmin={isUserWorkspaceAdmin}
            />
            </div>
        </>
    )
}
