"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Building, Users, Check, Loader2 } from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { setActiveWorkspace, setActiveTeam, Workspace } from "@/lib/redux/slices/workspaceSlice"
import { CreateWorkspaceModal } from "./teams/create-workspace-modal"
import { CreateTeamModal } from "./teams/create-team-modal"

export function WorkspaceSwitcher() {
    const { isMobile } = useSidebar()
    const dispatch = useAppDispatch()
    const user = useAppSelector((state) => state.auth.user)
    
    const workspaces = useAppSelector((state) => state.workspace.workspaces)
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const teams = useAppSelector((state) => state.workspace.teams)
    const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
    const workspacesLoading = useAppSelector((state) => state.workspace.workspacesLoading)
    const workspacesLoaded = useAppSelector((state) => state.workspace.workspacesLoaded)
    const teamsLoading = useAppSelector((state) => state.workspace.teamsLoading)
    
    const [workspaceModalOpen, setWorkspaceModalOpen] = React.useState(false)
    const [teamModalOpen, setTeamModalOpen] = React.useState(false)
    
    const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0]
    const activeTeam = teams.find((t) => t.id === activeTeamId) || teams[0]

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <Building className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{activeWorkspace?.name || "huzlr."}</span>
                                <span className="flex items-center gap-1 truncate text-xs">
                                    {teamsLoading && activeWorkspace ? <Loader2 className="size-3 shrink-0 animate-spin" /> : null}
                                    {!workspacesLoaded && !activeWorkspace
                                        ? "Loading workspaces..."
                                        : teamsLoading && activeWorkspace
                                            ? "Loading teams..."
                                            : activeTeam?.name || (activeWorkspace ? "Create a team" : "Create a workspace")}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            Workspaces
                        </DropdownMenuLabel>
                        {(!workspacesLoaded || workspacesLoading) && workspaces.length === 0 && (
                            <DropdownMenuItem disabled className="gap-2 p-2">
                                <Loader2 className="size-4 animate-spin" />
                                Loading workspaces...
                            </DropdownMenuItem>
                        )}
                        {workspaces.map((workspace, index) => (
                            <DropdownMenuItem
                                key={workspace.id}
                                onClick={() => dispatch(setActiveWorkspace(workspace.id))}
                                className="gap-2 p-2"
                            >
                                <div className="flex size-6 items-center justify-center rounded-md border">
                                    <Building className="size-3.5 shrink-0" />
                                </div>
                                <span className="flex-1 truncate">{workspace.name}</span>
                                {user && workspace.owner_id === user.id ? (
                                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border">
                                        Personal
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                                        Joined
                                    </span>
                                )}
                                {workspace.id === activeWorkspaceId && <Check className="size-3.5" />}
                                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                            </DropdownMenuItem>
                        ))}

                        {activeWorkspace && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-muted-foreground text-xs">
                                    Teams in {activeWorkspace.name}
                                </DropdownMenuLabel>
                                {teamsLoading ? (
                                    <DropdownMenuItem disabled className="gap-2 p-2">
                                        <Loader2 className="size-4 animate-spin" />
                                        Loading teams...
                                    </DropdownMenuItem>
                                ) : teams.map((team) => (
                                    <DropdownMenuItem
                                        key={team.id}
                                        onClick={() => dispatch(setActiveTeam(team.id))}
                                        className="gap-2 p-2"
                                    >
                                        <div className="flex size-6 items-center justify-center rounded-md border">
                                            <Users className="size-3.5 shrink-0" />
                                        </div>
                                        <span className="flex-1">{team.name}</span>
                                        {team.id === activeTeamId && <Check className="size-3.5" />}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem
                                    className="gap-2 p-2"
                                    disabled={teamsLoading}
                                    onClick={() => setTeamModalOpen(true)}
                                >
                                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                        <Plus className="size-4" />
                                    </div>
                                    <div className="text-muted-foreground font-medium">Add team</div>
                                </DropdownMenuItem>
                            </>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 p-2" onClick={() => setWorkspaceModalOpen(true)}>
                            <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                <Plus className="size-4" />
                            </div>
                            <div className="text-muted-foreground font-medium">Add workspace</div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
            
            <CreateWorkspaceModal open={workspaceModalOpen} onOpenChange={setWorkspaceModalOpen} />
            <CreateTeamModal open={teamModalOpen} onOpenChange={setTeamModalOpen} />
        </SidebarMenu>
    )
}
