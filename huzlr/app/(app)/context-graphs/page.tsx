"use client"

import Link from "next/link"
import { ArrowRight, Loader2, Network } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { WorkspaceSetupState } from "@/components/workspace-setup-state"
import { useAppSelector } from "@/lib/redux/hooks"
import { contextError, useContextProjectsQuery } from "@/services/contextApi"

export default function ContextGraphsPage() {
  const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
  const workspaces = useAppSelector((state) => state.workspace.workspaces)
  const hasWorkspace = workspaces.some((workspace) => workspace.id === activeWorkspaceId)
  const { data, error, isLoading, refetch } = useContextProjectsQuery(activeWorkspaceId ?? 0, {
    skip: !activeWorkspaceId || !hasWorkspace,
  })

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader title="Context Graphs" />
      {!hasWorkspace ? (
        <WorkspaceSetupState />
      ) : (
        <main className="flex-1 bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <Network className="size-5 text-primary" />
                <h1 className="text-xl font-semibold tracking-tight">Project context graphs</h1>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Open a project’s evolving graph of issues, milestones, documents, meetings, risks, notes, and validated claims.
              </p>
            </div>

            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center" role="status">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="rounded-xl border bg-card p-6 text-center">
                <p className="text-sm font-medium">Could not load context graphs</p>
                <p className="mt-1 text-sm text-muted-foreground">{contextError(error)}</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
              </div>
            ) : !data?.enabled ? (
              <div className="rounded-xl border border-dashed bg-card p-8 text-center">
                <Network className="mx-auto size-8 text-muted-foreground/50" />
                <h2 className="mt-3 font-semibold">Context graphs are not enabled</h2>
                <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
                  Enable context graphs for this workspace and run the projection worker before graphs can be viewed.
                </p>
              </div>
            ) : data.projects.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                Create a project first; its context graph will appear here.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}/context`}
                    className="group rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary"><Network className="size-4" /></div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-semibold">{project.title}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">Project {project.id}</p>
                      </div>
                      <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">View nodes, relationships, sources, and indexing health</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  )
}
