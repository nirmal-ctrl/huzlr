"use client"

import { useDeferredValue, useMemo, useState } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertCircle, ArrowRight, CheckCircle2, Clock3, FolderKanban, Loader2,
  Network, RefreshCw, Search, X,
} from "lucide-react"

import { DataTable } from "@/components/data-table"
import { DataTableSkeleton } from "@/components/data-table-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SiteHeader } from "@/components/site-header"
import { WorkspaceSetupState } from "@/components/workspace-setup-state"
import { useAppSelector } from "@/lib/redux/hooks"
import { cn } from "@/lib/utils"
import {
  contextError, type ContextProjectSummary, useContextProjectsQuery,
} from "@/services/contextApi"

type Filter = "all" | "ready" | "pending" | "attention"

const graphStatus = {
  ready: { label: "Up to date", icon: CheckCircle2, className: "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300" },
  pending: { label: "Updating", icon: Loader2, className: "border-blue-500/20 bg-blue-500/8 text-blue-700 dark:text-blue-300" },
  failed: { label: "Needs attention", icon: AlertCircle, className: "border-destructive/20 bg-destructive/8 text-destructive" },
  not_indexed: { label: "Ready to build", icon: Clock3, className: "border-border bg-muted/40 text-muted-foreground" },
} as const

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready", label: "Up to date" },
  { value: "pending", label: "Updating" },
  { value: "attention", label: "Needs attention" },
]

const titleCase = (value: string | null) => value
  ? value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase())
  : "—"

const indexedLabel = (value: string | null) => {
  if (!value) return "Not indexed"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unavailable"
  return date.toLocaleDateString(undefined, {
    month: "short", day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  })
}

function GraphMark({ projectId, status }: { projectId: number; status: ContextProjectSummary["graph"]["status"] }) {
  const accent = status === "failed" ? "#dc7d80" : status === "pending" ? "#91afc6" : "#94bf99"
  const offset = projectId % 7
  return (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/8 bg-[#282c31] shadow-sm" aria-hidden="true">
      <svg viewBox="0 0 56 56" className="size-full">
        <g stroke="#a8b5ba" strokeOpacity=".27" strokeWidth=".7">
          <line x1="28" y1="27" x2={12 + offset} y2="12" /><line x1="28" y1="27" x2="44" y2={11 + offset / 2} />
          <line x1="28" y1="27" x2={10 + offset / 2} y2="41" /><line x1="28" y1="27" x2={43 - offset / 2} y2="44" />
          <line x1={12 + offset} y1="12" x2="20" y2="7" /><line x1="44" y1={11 + offset / 2} x2="50" y2="21" />
          <line x1={10 + offset / 2} y1="41" x2="19" y2="49" /><line x1={43 - offset / 2} y1="44" x2="50" y2="36" />
        </g>
        <g fill="#d6c6a9"><circle cx="20" cy="7" r="2" /><circle cx="50" cy="21" r="2" /><circle cx="19" cy="49" r="2" /></g>
        <g fill="#94bf99"><circle cx={12 + offset} cy="12" r="2.3" /><circle cx={10 + offset / 2} cy="41" r="2.3" /><circle cx="50" cy="36" r="2" /></g>
        <circle cx="44" cy={11 + offset / 2} r="2.3" fill="#d6c6a9" /><circle cx={43 - offset / 2} cy="44" r="2.4" fill={accent} />
        <circle cx="28" cy="27" r="3.5" fill="#9ab9ca" />
      </svg>
    </span>
  )
}

function StatusBadge({ status }: { status: ContextProjectSummary["graph"]["status"] }) {
  const config = graphStatus[status]
  const Icon = config.icon
  return <Badge variant="outline" className={cn("h-6 gap-1.5 px-2 text-[10px] font-medium", config.className)}><Icon className={cn("size-3", status === "pending" && "animate-spin")} />{config.label}</Badge>
}

const columns: ColumnDef<ContextProjectSummary>[] = [
  {
    id: "graph",
    header: "Graph",
    cell: ({ row }) => <div className="flex min-w-56 items-center gap-3"><GraphMark projectId={row.original.id} status={row.original.graph.status} /><div className="min-w-0"><Link href={`/projects/${row.original.id}/context`} className="block truncate font-medium hover:underline">{row.original.title}</Link><p className="max-w-md truncate text-xs text-muted-foreground">{row.original.summary || "Project records and source-backed context"}</p></div></div>,
  },
  {
    accessorKey: "project_status",
    header: "Project status",
    cell: ({ row }) => <Badge variant="secondary" className="font-normal">{titleCase(row.original.project_status)}</Badge>,
  },
  {
    id: "graph_status",
    accessorFn: row => row.graph.status,
    header: "Graph status",
    cell: ({ row }) => <StatusBadge status={row.original.graph.status} />,
  },
  {
    id: "indexed_at",
    accessorFn: row => row.graph.indexed_at,
    header: "Last indexed",
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{indexedLabel(row.original.graph.indexed_at)}</span>,
  },
  {
    id: "open",
    header: "",
    enableHiding: false,
    cell: ({ row }) => <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs"><Link href={`/projects/${row.original.id}/context`} aria-label={`Open ${row.original.title} context graph`}>Open graph<ArrowRight className="size-3.5" /></Link></Button>,
  },
]

export default function ContextGraphsPage() {
  const activeWorkspaceId = useAppSelector(state => state.workspace.activeWorkspaceId)
  const workspaces = useAppSelector(state => state.workspace.workspaces)
  const hasWorkspace = workspaces.some(workspace => workspace.id === activeWorkspaceId)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const { data, error, isLoading, isFetching, refetch } = useContextProjectsQuery(activeWorkspaceId ?? 0, {
    skip: !activeWorkspaceId || !hasWorkspace,
    pollingInterval: 30000,
  })

  const counts = useMemo(() => {
    const projects = data?.projects ?? []
    return {
      all: projects.length,
      ready: projects.filter(project => project.graph.status === "ready").length,
      pending: projects.filter(project => project.graph.status === "pending").length,
      attention: projects.filter(project => ["failed", "not_indexed"].includes(project.graph.status)).length,
    }
  }, [data?.projects])

  const projects = useMemo(() => (data?.projects ?? []).filter(project => {
    const matchesQuery = !deferredQuery || `${project.title} ${project.summary ?? ""} ${project.project_status ?? ""}`.toLowerCase().includes(deferredQuery)
    const matchesFilter = filter === "all" || project.graph.status === filter ||
      (filter === "attention" && ["failed", "not_indexed"].includes(project.graph.status))
    return matchesQuery && matchesFilter
  }), [data?.projects, deferredQuery, filter])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      {!hasWorkspace ? <WorkspaceSetupState /> : (
        <main className="flex flex-1 flex-col gap-4 py-4">
          <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Network className="size-4 text-primary" /><h1 className="text-sm font-semibold tracking-tight">Context graphs</h1><Badge variant="secondary" className="rounded-full px-2 text-[10px] font-normal">{counts.all}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Project knowledge, sources, and indexing health.</p></div><Button variant="outline" size="sm" className="h-8 shrink-0 rounded-full text-xs sm:hidden" onClick={() => refetch()} disabled={isFetching || isLoading}><RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />Refresh</Button></div>
            <div className="flex w-full items-center gap-2 sm:w-auto"><div className="relative min-w-0 flex-1 sm:w-64"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} aria-label="Search context graphs" placeholder="Search graphs…" className="h-9 pl-8 pr-8 text-xs" />{query && <button onClick={() => setQuery("")} aria-label="Clear graph search" className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>}</div><Button variant="outline" size="sm" className="hidden h-9 shrink-0 rounded-full text-xs sm:inline-flex" onClick={() => refetch()} disabled={isFetching || isLoading}><RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />Refresh</Button></div>
          </div>
          <div className="flex flex-wrap items-center gap-1 px-4 lg:px-6" aria-label="Filter context graphs">
            {filters.map(item => <button key={item.value} onClick={() => setFilter(item.value)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring", filter === item.value ? "bg-foreground text-background hover:bg-foreground/90" : "text-muted-foreground")}>
              {item.label}<span className={cn("ml-1.5 tabular-nums", filter === item.value ? "text-background/65" : "text-muted-foreground/70")}>{counts[item.value]}</span>
            </button>)}
          </div>

          {isLoading ? <DataTableSkeleton rows={6} /> : error ? (
            <EmptyState icon={AlertCircle} title="Could not load context graphs" description={contextError(error)}><Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button></EmptyState>
          ) : !data?.enabled ? (
            <EmptyState icon={Network} title="Context graphs are unavailable" description="Context indexing needs to be enabled for this workspace before its project graphs can be opened." />
          ) : !data.projects.length ? (
            <EmptyState icon={FolderKanban} title="No projects yet" description="Create a project and its context graph will appear here."><Button asChild size="sm"><Link href="/projects/new">Create project</Link></Button></EmptyState>
          ) : !projects.length ? (
            <EmptyState icon={Search} title="No matching graphs" description="Try a different search or status."><Button variant="ghost" size="sm" onClick={() => { setQuery(""); setFilter("all") }}>Clear filters</Button></EmptyState>
          ) : (
            <DataTable data={projects} columns={columns} getRowId={project => String(project.id)} enableDragDrop={false} enableRowSelection={false} showDisplayOptions={false} defaultPageSize={10} />
          )}
        </main>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description, children }: { icon: typeof Network; title: string; description: string; children?: React.ReactNode }) {
  return <div className="mx-4 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center lg:mx-6"><Icon className="size-7 text-muted-foreground/60" /><h2 className="mt-3 text-sm font-semibold">{title}</h2><p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{description}</p>{children && <div className="mt-4">{children}</div>}</div>
}
