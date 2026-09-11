"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ContextGraphView } from "@/components/projects/context-graph-view"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"

export default function ProjectContextPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = Number(params.projectId)

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <SiteHeader>
        <Button asChild variant="outline" size="sm">
          <Link href="/context-graphs">All context graphs</Link>
        </Button>
      </SiteHeader>
      {Number.isInteger(projectId) && projectId > 0 ? (
        <ContextGraphView projectId={projectId} />
      ) : (
        <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Project not found.</main>
      )}
    </div>
  )
}
