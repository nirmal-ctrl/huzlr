"use client"

import Link from "next/link"
import { ArrowRight, Loader2, Network } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { WorkspaceSetupState } from "@/components/workspace-setup-state"
import { useAppSelector } from "@/lib/redux/hooks"
import { contextError, useContextProjectsQuery } from "@/services/contextApi"

// Keep the complete context-graphs experience in place while the feature is hidden.
// Flip this to true when the page is ready to be exposed.
const CONTEXT_GRAPHS_AVAILABLE = false

export default function ContextGraphsPage() {
  const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
  const workspaces = useAppSelector((state) => state.workspace.workspaces)
  const hasWorkspace = workspaces.some((workspace) => workspace.id === activeWorkspaceId)
  const { data, error, isLoading, refetch } = useContextProjectsQuery(activeWorkspaceId ?? 0, {
    skip: !CONTEXT_GRAPHS_AVAILABLE || !activeWorkspaceId || !hasWorkspace,
  })

  if (!CONTEXT_GRAPHS_AVAILABLE) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader title="Context Graphs" />
        <main className="flex flex-1 items-center justify-center bg-muted/20 px-4 py-10 sm:px-6 lg:px-8">
          <section className="relative w-full max-w-2xl overflow-hidden rounded-2xl border bg-card px-6 py-14 text-center shadow-sm sm:px-12 sm:py-16">
            <div
              className="absolute inset-x-16 top-0 h-40 rounded-full bg-primary/8 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
              <Network className="size-6" aria-hidden="true" />
            </div>

            <p className="relative mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Coming soon
            </p>
            <h1 className="relative mx-auto mt-3 max-w-lg text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              See the full story behind every project.
            </h1>
            <p className="relative mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Context Graphs will bring issues, milestones, documents, meetings, risks, and validated
              decisions into one connected, explainable view.
            </p>

            <Button asChild className="relative mt-8 rounded-full px-6">
              <Link href="/projects">
                Back to projects
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </section>
        </main>
      </div>
    )
  }

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
