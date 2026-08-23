"use client"

import { useParams, useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { CreateProjectModal } from "@/components/projects/create-project-modal"
import { WorkspaceSetupState } from "@/components/workspace-setup-state"
import { useAppSelector } from "@/lib/redux/hooks"

export default function ProjectPage() {
    const params = useParams<{ projectId: string }>()
    const router = useRouter()
    const projectId = Number(params.projectId)
    const workspaces = useAppSelector((state) => state.workspace.workspaces)
    const teams = useAppSelector((state) => state.workspace.teams)
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
    const hasWorkspaceContext = workspaces.some((workspace) => workspace.id === activeWorkspaceId)
        && teams.some((team) => team.id === activeTeamId && team.workspace_id === activeWorkspaceId)
    const hasValidProjectId = Number.isInteger(projectId) && projectId > 0

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            <SiteHeader />
            {hasWorkspaceContext && hasValidProjectId ? (
                <main className="flex-1 overflow-y-auto bg-muted/20">
                    <div className="h-full w-full bg-background">
                        <CreateProjectModal
                            open
                            onOpenChange={(open) => {
                                if (!open) router.push("/projects")
                            }}
                            page
                            draftProjectId={projectId}
                        />
                    </div>
                </main>
            ) : hasWorkspaceContext ? (
                <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    Project not found.
                </main>
            ) : (
                <WorkspaceSetupState />
            )}
        </div>
    )
}
