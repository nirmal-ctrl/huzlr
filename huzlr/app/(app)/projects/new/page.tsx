'use client'
import { SiteHeader } from "@/components/site-header"
import { BrainstormInterface } from "@/components/brainstorm-interface"
import { CreateProjectModal } from "@/components/projects/create-project-modal"
import { useState } from "react"
import { useAppSelector } from "@/lib/redux/hooks"
import { WorkspaceSetupState } from "@/components/workspace-setup-state"

export default function Page() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const workspaces = useAppSelector((state) => state.workspace.workspaces)
    const teams = useAppSelector((state) => state.workspace.teams)
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
    const canCreateProject = workspaces.some((workspace) => workspace.id === activeWorkspaceId)
        && teams.some((team) => team.id === activeTeamId && team.workspace_id === activeWorkspaceId)

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <SiteHeader />
            {canCreateProject ? (
                <div className="flex flex-row flex-1 overflow-hidden w-full">
                    <div className="flex-1 min-w-0 h-full">
                        <BrainstormInterface onNewProjectClick={() => setIsCreateModalOpen(true)} />
                    </div>
                    <CreateProjectModal
                        open={isCreateModalOpen}
                        onOpenChange={setIsCreateModalOpen}
                        inline={true}
                    />
                </div>
            ) : (
                <WorkspaceSetupState />
            )}
        </div>
    )
}
