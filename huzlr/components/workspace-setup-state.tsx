"use client"

import { useState } from "react"
import { Building, Loader2, Plus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CreateTeamModal } from "@/components/teams/create-team-modal"
import { CreateWorkspaceModal } from "@/components/teams/create-workspace-modal"
import { useAppSelector } from "@/lib/redux/hooks"

export function WorkspaceSetupState() {
  const workspaces = useAppSelector((state) => state.workspace.workspaces)
  const teams = useAppSelector((state) => state.workspace.teams)
  const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
  const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
  const workspacesLoading = useAppSelector((state) => state.workspace.workspacesLoading)
  const workspacesLoaded = useAppSelector((state) => state.workspace.workspacesLoaded)
  const teamsLoading = useAppSelector((state) => state.workspace.teamsLoading)
  const teamsLoaded = useAppSelector((state) => state.workspace.teamsLoaded)
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
  const [teamModalOpen, setTeamModalOpen] = useState(false)

  const hasWorkspace = workspaces.some((workspace) => workspace.id === activeWorkspaceId)
  const hasTeam = teams.some(
    (team) => team.id === activeTeamId && team.workspace_id === activeWorkspaceId,
  )

  if ((!workspacesLoaded || workspacesLoading) && !hasWorkspace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading your workspaces...</p>
      </div>
    )
  }

  if (!hasWorkspace) {
    return (
      <>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building className="size-6" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">Create your workspace first</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Projects and issues belong to a team. Creating a workspace also creates a General team so you can start immediately.
          </p>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground">1. Workspace</span>
            <span>2. Team</span>
            <span>3. Project</span>
          </div>
          <Button className="mt-5 gap-2 rounded-full" onClick={() => setWorkspaceModalOpen(true)}>
            <Plus className="size-4" />
            Create Workspace
          </Button>
        </div>
        <CreateWorkspaceModal open={workspaceModalOpen} onOpenChange={setWorkspaceModalOpen} />
      </>
    )
  }

  if ((!teamsLoaded || teamsLoading) && !hasTeam) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading teams in your workspace...</p>
      </div>
    )
  }

  if (!hasTeam) {
    return (
      <>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-6" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">Create a team to continue</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            A team is required before you can create projects or issues.
          </p>
          <Button className="mt-5 gap-2 rounded-full" onClick={() => setTeamModalOpen(true)}>
            <Plus className="size-4" />
            Create Team
          </Button>
        </div>
        <CreateTeamModal open={teamModalOpen} onOpenChange={setTeamModalOpen} />
      </>
    )
  }

  return null
}
