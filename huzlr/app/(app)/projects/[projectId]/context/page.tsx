"use client"

import { useParams } from "next/navigation"
import { ContextGraphView } from "@/components/projects/context-graph-view"
import { SiteHeader } from "@/components/site-header"
import { JiraSources } from "@/components/projects/jira-sources"

export default function ProjectContextPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = Number(params.projectId)

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden md:h-[calc(100svh-1rem)]">
      <div className="shrink-0">
        <SiteHeader />
      </div>
      {Number.isInteger(projectId) && projectId > 0 ? (
        <ContextGraphView projectId={projectId} sourceControl={<JiraSources projectId={projectId} />} />
      ) : (
        <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Project not found.</main>
      )}
    </div>
  )
}
