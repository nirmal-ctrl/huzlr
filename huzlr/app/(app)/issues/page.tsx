"use client"

import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { SiteHeader } from "@/components/site-header"
import { WorkspaceSetupState } from "@/components/workspace-setup-state"
import { useAppSelector } from "@/lib/redux/hooks"

export default function IssuesPage() {
    const router = useRouter()
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
    const workspaces = useAppSelector((state) => state.workspace.workspaces)
    const teams = useAppSelector((state) => state.workspace.teams)
    const workspacesLoaded = useAppSelector((state) => state.workspace.workspacesLoaded)
    const teamsLoaded = useAppSelector((state) => state.workspace.teamsLoaded)

    const hasWorkspace = workspaces.some((workspace) => workspace.id === activeWorkspaceId)
    const hasTeam = teams.some(
        (team) => team.id === activeTeamId && team.workspace_id === activeWorkspaceId,
    )

    useEffect(() => {
        if (hasWorkspace && hasTeam && activeTeamId) {
            router.replace(`/teams/${activeTeamId}/issues`)
        }
    }, [activeTeamId, hasTeam, hasWorkspace, router])

    return (
        <>
            <SiteHeader />
            {workspacesLoaded && teamsLoaded && (!hasWorkspace || !hasTeam) ? (
                <WorkspaceSetupState />
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Opening issues for your active team…</p>
                </div>
            )}
        </>
    )
}
