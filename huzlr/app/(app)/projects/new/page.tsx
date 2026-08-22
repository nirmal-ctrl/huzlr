'use client'

import { SiteHeader } from "@/components/site-header"
import { CreateProjectModal } from "@/components/projects/create-project-modal"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { WorkspaceSetupState } from "@/components/workspace-setup-state"
import { useRouter, useSearchParams } from "next/navigation"
import { createProject } from "@/lib/redux/slices/projectSlice"
import { SpinnerEmpty } from "@/components/spinner-empty"
import { Suspense, useEffect, useRef, useState } from "react"

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><SpinnerEmpty /></div>}>
            <NewProjectPage />
        </Suspense>
    )
}

function NewProjectPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dispatch = useAppDispatch()
    const creatingDraftRef = useRef(false)
    const [draftError, setDraftError] = useState<string | null>(null)
    const workspaces = useAppSelector((state) => state.workspace.workspaces)
    const teams = useAppSelector((state) => state.workspace.teams)
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
    const canCreateProject = workspaces.some((workspace) => workspace.id === activeWorkspaceId)
        && teams.some((team) => team.id === activeTeamId && team.workspace_id === activeWorkspaceId)
    const draftParam = Number(searchParams.get("draft"))
    const draftProjectId = Number.isInteger(draftParam) && draftParam > 0 ? draftParam : undefined

    useEffect(() => {
        if (!canCreateProject || !activeTeamId || draftProjectId || creatingDraftRef.current) return

        creatingDraftRef.current = true
        setDraftError(null)
        dispatch(createProject({
            team_id: activeTeamId,
            properties: {
                project_title: "Untitled project",
                short_summary: "",
                status: "Backlog",
                priority: "None",
                members: [],
                labels: [],
                dependencies: [],
                description: "",
                milestones: [],
                is_draft: true,
                draft_updated_at: new Date().toISOString(),
            },
        })).unwrap()
            .then((project) => router.replace(`/projects/new?draft=${project.project_id}`))
            .catch((error) => {
                creatingDraftRef.current = false
                setDraftError(error instanceof Error ? error.message : "Unable to create a project draft.")
            })
    }, [activeTeamId, canCreateProject, dispatch, draftProjectId, router])

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <SiteHeader />
            {canCreateProject ? (
                <main className="flex-1 overflow-y-auto bg-muted/20">
                    <div className="h-full w-full bg-background">
                        {draftError ? (
                            <div className="flex h-full items-center justify-center px-6 text-sm text-destructive">{draftError}</div>
                        ) : draftProjectId ? (
                            <CreateProjectModal
                                open
                                onOpenChange={(open) => {
                                    if (!open) router.push("/projects")
                                }}
                                page
                                draftProjectId={draftProjectId}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center"><SpinnerEmpty /></div>
                        )}
                    </div>
                </main>
            ) : (
                <WorkspaceSetupState />
            )}
        </div>
    )
}
