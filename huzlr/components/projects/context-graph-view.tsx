"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import Link from "next/link"
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, ChevronDown, CircleDot, Clock3,
  Expand, ExternalLink, FileText, Flag, GitBranch, Layers3, ListCollapse, ListFilter, Loader2,
  MessageSquare, Network, PanelLeft, RefreshCw, Search, SlidersHorizontal, Users,
  Video, X, type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  contextError, type ContextGraphEdge, type ContextGraphNode,
  useProjectContextGraphQuery, useReindexProjectContextMutation,
} from "@/services/contextApi"

const KINDS: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  Project: { label: "Project", icon: Network, tone: "bg-primary/10 text-primary" },
  Issue: { label: "Issue", icon: CircleDot, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  Milestone: { label: "Milestone", icon: Flag, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  Document: { label: "Document", icon: FileText, tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  DocumentChunk: { label: "Excerpt", icon: FileText, tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  Risk: { label: "Risk", icon: AlertTriangle, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  Assumption: { label: "Assumption", icon: MessageSquare, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  Meeting: { label: "Meeting", icon: Video, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  Note: { label: "Note", icon: FileText, tone: "bg-muted text-muted-foreground" },
  Claim: { label: "Claim", icon: MessageSquare, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  JiraSpace: { label: "Jira project", icon: Layers3, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  Comment: { label: "Comment", icon: MessageSquare, tone: "bg-muted text-muted-foreground" },
  ChangeEvent: { label: "Change", icon: GitBranch, tone: "bg-muted text-muted-foreground" },
  Worklog: { label: "Worklog", icon: Clock3, tone: "bg-muted text-muted-foreground" },
  Attachment: { label: "Attachment", icon: FileText, tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  Version: { label: "Release", icon: Flag, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  Component: { label: "Component", icon: Layers3, tone: "bg-muted text-muted-foreground" },
  Board: { label: "Board", icon: Layers3, tone: "bg-muted text-muted-foreground" },
  Sprint: { label: "Sprint", icon: Flag, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  Person: { label: "Person", icon: Users, tone: "bg-muted text-muted-foreground" },
}
const DETAIL_KINDS = new Set(["DocumentChunk", "Comment", "ChangeEvent", "Worklog", "Person"])
const kindInfo = (kind: string) => KINDS[kind] ?? { label: kind, icon: Layers3, tone: "bg-muted text-muted-foreground" }
const readable = (value: string) => value.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
const dateLabel = (date: string | null | undefined) => {
  if (!date) return "Not updated yet"
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? "Update time unavailable" : parsed.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

const ContextNetwork = dynamic(() => import("./context-network").then(module => module.ContextNetwork), { ssr: false })

function NodeDetails({ node, relations, allNodes, onSelect, onClose }: {
  node: ContextGraphNode; relations: ContextGraphEdge[]; allNodes: ContextGraphNode[];
  onSelect: (node: ContextGraphNode) => void; onClose: () => void;
}) {
  const { label, icon: Icon, tone } = kindInfo(node.kind)
  const neighbors = relations.flatMap(edge => {
    if (edge.source !== node.canonical_id && edge.target !== node.canonical_id) return []
    const outgoing = edge.source === node.canonical_id
    const other = allNodes.find(item => item.canonical_id === (outgoing ? edge.target : edge.source))
    return other ? [{ edge, other, outgoing }] : []
  })
  return (
    <aside aria-label="Context details" className="absolute inset-x-0 bottom-0 z-20 flex max-h-[75%] flex-col rounded-t-xl border bg-card shadow-lg sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-80 sm:rounded-xl xl:static xl:w-80 xl:shrink-0 xl:rounded-none xl:border-0 xl:border-l xl:shadow-none">
      <div className="flex shrink-0 items-center gap-3 border-b p-4">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone)}><Icon className="size-4" /></span>
        <div className="min-w-0 flex-1"><p className="text-xs font-medium">Context details</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
        <Button variant="ghost" size="icon-sm" aria-label="Close context details" onClick={onClose}><X className="size-3.5" /></Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold leading-5">{node.title || label}</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">{node.source_system === "jira" ? "Jira source" : "Project source"}</Badge>
          {node.status && <Badge variant="outline" className={cn("text-[10px]", node.status === "proposed" && "border-amber-500/25 text-amber-600 dark:text-amber-400")}>{node.status === "proposed" ? "Unconfirmed" : node.issue_status || readable(node.status)}</Badge>}
        </div>
        {node.status === "proposed" && <p className="mt-3 rounded-md bg-amber-500/10 p-2.5 text-xs leading-5 text-amber-700 dark:text-amber-300">This claim was extracted from a source and has not been confirmed.</p>}
        {node.text && <div className="mt-5"><h3 className="text-[11px] font-medium text-muted-foreground">Source content</h3><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6">{node.text}</p></div>}
        {node.confidence != null && <div className="mt-4 flex justify-between text-xs"><span className="text-muted-foreground">Extraction confidence</span><span className="tabular-nums">{Math.round(node.confidence * 100)}%</span></div>}
        {node.updated_at && <p className="mt-3 text-[11px] text-muted-foreground">Updated {dateLabel(node.updated_at)}</p>}
        <div className="mt-5 border-t pt-4">
          <div className="mb-2 flex items-center justify-between"><h3 className="text-[11px] font-medium text-muted-foreground">Connections</h3><span className="text-[10px] tabular-nums text-muted-foreground">{neighbors.length}</span></div>
          {neighbors.length ? neighbors.map(({ edge, other, outgoing }, index) => (
            <button key={`${other.canonical_id}:${edge.kind}:${index}`} className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSelect(other)}>
              {outgoing ? <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> : <ArrowDownLeft className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
              <span className="min-w-0"><span className="block truncate text-xs font-medium">{other.title || kindInfo(other.kind).label}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{outgoing ? "Outgoing" : "Incoming"} · {readable(edge.kind)}</span></span>
            </button>
          )) : <p className="py-2 text-xs text-muted-foreground">No connections in this graph.</p>}
        </div>
      </div>
      {node.path && <div className="shrink-0 border-t p-4"><Button asChild variant="outline" size="sm" className="w-full text-xs"><Link href={node.path} target={node.path.startsWith("http") ? "_blank" : undefined} rel={node.path.startsWith("http") ? "noopener noreferrer" : undefined}>Open source<ExternalLink className="size-3.5" /></Link></Button></div>}
    </aside>
  )
}

export function ContextGraphView({ projectId, sourceControl }: { projectId: number; sourceControl?: React.ReactNode }) {
  const isMobile = useIsMobile()
  const { currentData: data, error, isLoading: initialLoading, isFetching, refetch } = useProjectContextGraphQuery(projectId, { pollingInterval: 10000 })
  const isLoading = initialLoading || (!data && isFetching)
  const [reindex, { isLoading: isReindexing }] = useReindexProjectContextMutation()
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState("overview")
  const [showDetails, setShowDetails] = useState(true)
  const [showNodeLabels, setShowNodeLabels] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const kinds = useMemo(() => [...new Set(data?.nodes.map(node => node.kind) ?? [])].sort(), [data?.nodes])
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const allNodes = data?.nodes ?? []
    const matched = allNodes.filter(node =>
      (kind !== "overview" ? node.kind === kind : showDetails || !DETAIL_KINDS.has(node.kind)) &&
      (!needle || `${node.title} ${node.text} ${node.issue_key ?? ""}`.toLowerCase().includes(needle)),
    )
    const matches = new Set(matched.map(node => node.canonical_id))
    const ids = new Set(matches)
    const known = new Set(allNodes.map(node => node.canonical_id))
    let changed = true
    while (changed) {
      changed = false
      for (const edge of data?.relationships ?? []) {
        if (ids.has(edge.target) && !ids.has(edge.source) && known.has(edge.source)) {
          ids.add(edge.source)
          changed = true
        }
      }
    }
    return {
      nodes: allNodes.filter(node => ids.has(node.canonical_id)),
      relationships: (data?.relationships ?? []).filter(edge => ids.has(edge.source) && ids.has(edge.target)),
      matched, matches,
    }
  }, [data?.nodes, data?.relationships, kind, query, showDetails])
  const selected = data?.nodes.find(node => node.canonical_id === selectedId) ?? null
  const projectTitle = data?.nodes.find(node => node.kind === "Project")?.title ?? `Project ${projectId}`
  const resetFilters = () => { setQuery(""); setKind("overview"); setShowDetails(true); setSelectedId(null) }
  const selectNode = (node: ContextGraphNode) => {
    if (!visible.nodes.some(item => item.canonical_id === node.canonical_id)) {
      setQuery(""); setKind("overview"); setShowDetails(true)
    }
    setSelectedId(node.canonical_id); setFocusId(node.canonical_id)
    if (isMobile) setExplorerOpen(false)
  }
  const handleReindex = async () => {
    try {
      await reindex(projectId).unwrap()
      toast.success("Context refresh queued", { description: "The graph will update when indexing completes." })
      refetch()
    } catch (cause) {
      toast.error("Could not refresh graph", { description: contextError(cause) })
    }
  }
  const ready = data?.freshness.status === "ready"
  const pending = data?.freshness.status === "pending"
  const filtered = Boolean(query.trim() || kind !== "overview" || !showDetails)

  return (
    <section aria-label="Project context graph" className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/10 px-3 py-2 lg:px-4">
        <div className="mr-1 min-w-0 basis-full lg:max-w-56 lg:basis-auto lg:border-r lg:pr-3">
          <div className="flex min-w-0 items-center gap-2"><h1 className="truncate text-sm font-semibold tracking-tight">{projectTitle}</h1><Badge variant="outline" className="h-5 shrink-0 gap-1.5 px-1.5 text-[10px] font-normal">{isLoading ? <Loader2 className="size-3 animate-spin" /> : ready ? <Check className="size-3 text-emerald-600 dark:text-emerald-400" /> : pending ? <Loader2 className="size-3 animate-spin" /> : <Clock3 className="size-3" />}{isLoading ? "Loading" : error && !data ? "Unavailable" : ready ? "Up to date" : pending ? "Updating" : data?.freshness.status === "failed" ? "Refresh needed" : "Not indexed"}</Badge></div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="tabular-nums">{data?.total_nodes ?? 0} records</span><span aria-hidden="true">·</span><span className="tabular-nums">{data?.relationships.length ?? 0} connections</span>{data?.freshness.indexed_at && <span className="hidden 2xl:inline">· Indexed {dateLabel(data.freshness.indexed_at)}</span>}</div>
        </div>
        <div className="flex min-w-0 basis-full items-center gap-2 overflow-x-auto lg:basis-auto lg:flex-1">
        <Button variant={explorerOpen ? "secondary" : "ghost"} size="sm" className="h-8 text-xs" aria-expanded={explorerOpen} aria-controls="context-explorer" onClick={() => setExplorerOpen(!explorerOpen)}><PanelLeft className="size-3.5" />Explore</Button>
        <div className="relative min-w-36 flex-1 lg:max-w-40"><Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground" /><Input aria-label="Search project context" value={query} onChange={event => { setQuery(event.target.value); setSelectedId(null) }} placeholder="Search context…" className="h-8 pr-7 pl-8 text-xs" />{query && <button aria-label="Clear context search" className="absolute right-2 top-2 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setQuery("")}><X className="size-3.5" /></button>}</div>
        <Select value={kind} onValueChange={value => { setKind(value); setSelectedId(null) }}><SelectTrigger aria-label="Filter context type" className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="overview">Overview</SelectItem>{kinds.map(item => <SelectItem key={item} value={item}>{kindInfo(item).label}<span className="ml-2 text-muted-foreground">{data?.nodes.filter(node => node.kind === item).length}</span></SelectItem>)}</SelectContent></Select>
        <ButtonGroup aria-label="Graph detail level" className="hidden xl:flex">
          <Button variant={!showDetails ? "secondary" : "outline"} size="sm" className="h-8 px-2.5 text-[11px]" aria-pressed={!showDetails} onClick={() => { setShowDetails(false); setSelectedId(null) }}><ListCollapse className="size-3.5" />Collapsed</Button>
          <Button variant={showDetails ? "secondary" : "outline"} size="sm" className="h-8 px-2.5 text-[11px]" aria-pressed={showDetails} onClick={() => setShowDetails(true)}><Expand className="size-3.5" />Expanded</Button>
        </ButtonGroup>
        <DropdownMenu><DropdownMenuTrigger asChild><Button aria-label="Graph display options" variant="ghost" size="sm" className="h-8 text-xs"><SlidersHorizontal className="size-3.5" /><span className="hidden 2xl:inline">Display</span><ChevronDown className="size-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel className="text-xs">Graph display</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuCheckboxItem className="xl:hidden" checked={showDetails} onCheckedChange={value => { setShowDetails(value); setSelectedId(null) }}>Expanded detail</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={showNodeLabels} onCheckedChange={setShowNodeLabels}>Show node labels</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={showLabels} onCheckedChange={setShowLabels}>Show relationship labels</DropdownMenuCheckboxItem></DropdownMenuContent></DropdownMenu>
        {filtered && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}><X className="size-3" />Reset</Button>}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 hidden text-[10px] tabular-nums text-muted-foreground 2xl:block">{filtered ? `${visible.matched.length} matches · ${visible.nodes.length} visible` : `${visible.nodes.length} visible`}{data?.truncated ? ` · ${data.nodes.length} of ${data.total_nodes} loaded` : ""}</span>
          {sourceControl}
          <Button variant="ghost" size="icon-sm" aria-label="Refresh graph" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} /></Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" aria-label="Rebuild graph" onClick={handleReindex} disabled={isReindexing || isLoading || pending}>{isReindexing ? <Loader2 className="size-3.5 animate-spin" /> : <Network className="size-3.5" />}<span className="hidden 2xl:inline">Rebuild</span></Button>
        </div>
        </div>
      </header>

      {data && !ready && <div role="status" className={cn("flex shrink-0 items-start gap-2 border-b px-4 py-2 text-xs leading-5 lg:px-6", data.freshness.status === "failed" ? "bg-destructive/5 text-destructive" : "bg-primary/5 text-muted-foreground")}>{pending ? <Loader2 className="mt-1 size-3 animate-spin" /> : <AlertTriangle className="mt-1 size-3 shrink-0" />}<span>{data.freshness.status === "failed" ? `The graph could not refresh. ${data.freshness.error ? readable(data.freshness.error) + ". " : ""}Try rebuilding it.` : pending ? "Project changes are being indexed. This view updates automatically." : "This project has not been indexed yet. Rebuild the graph to get started."}</span></div>}
      {error && data && <div role="alert" className="shrink-0 border-b bg-destructive/5 px-4 py-2 text-xs text-destructive">Could not refresh this view. Showing the last loaded graph.</div>}

      <div className="relative flex min-h-0 flex-1">
        {explorerOpen && <aside id="context-explorer" aria-label="Explore context" className="absolute inset-y-0 left-0 z-20 flex w-64 shrink-0 flex-col border-r bg-card shadow-lg lg:static lg:w-56 lg:shadow-none"><div className="flex items-center justify-between border-b px-4 py-3"><h2 className="text-xs font-medium">Explore context</h2><Button variant="ghost" size="icon-sm" aria-label="Close context explorer" onClick={() => setExplorerOpen(false)}><X className="size-3.5" /></Button></div><div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">{visible.matched.map(node => { const { icon: Icon, tone, label } = kindInfo(node.kind); return <button key={node.canonical_id} className={cn("flex w-full items-center gap-2.5 rounded-md p-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring", selectedId === node.canonical_id && "bg-primary/5")} onClick={() => selectNode(node)}><span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", tone)}><Icon className="size-3.5" /></span><span className="min-w-0"><span className="block truncate text-[11px] font-medium">{node.title || label}</span><span className="block text-[10px] text-muted-foreground">{label}</span></span></button> })}{!visible.matched.length && <p className="px-2 py-4 text-xs text-muted-foreground">No matching records.</p>}</div></aside>}
        <div className="relative min-h-0 min-w-0 flex-1">
          {isLoading ? <GraphState icon={Loader2} title="Loading project context" description="Gathering the project's records and connections." loading /> : error && !data ? <GraphState icon={AlertTriangle} title="Context graph unavailable" description={contextError(error)}><Button variant="outline" size="sm" className="text-xs" onClick={() => refetch()}><RefreshCw className="size-3.5" />Try again</Button></GraphState> : visible.nodes.length ? (
            <ContextNetwork nodes={visible.nodes} relationships={visible.relationships} selectedId={selectedId}
              matchedIds={visible.matches} showNodeLabels={showNodeLabels} showLinkLabels={showLabels}
              focusId={focusId} onFocusHandled={() => setFocusId(null)} onSelect={selectNode} onClear={() => setSelectedId(null)} />
          ) : <GraphState icon={filtered ? Search : Network} title={filtered ? "No matching context" : "Your project context starts here"} description={filtered ? "Try another search or context type to find a record." : "Issues, milestones, documents, and meeting evidence will appear as connected records."}>{filtered ? <Button variant="outline" size="sm" className="text-xs" onClick={resetFilters}><ListFilter className="size-3.5" />Clear filters</Button> : <Button variant="outline" size="sm" className="text-xs" onClick={handleReindex} disabled={isReindexing || pending}>{isReindexing || pending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}{pending ? "Building graph" : "Build context graph"}</Button>}</GraphState>}
        </div>
        {selected && <NodeDetails node={selected} relations={data?.relationships ?? []} allNodes={data?.nodes ?? []} onSelect={selectNode} onClose={() => setSelectedId(null)} />}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/10 px-4 py-2 text-[10px] text-muted-foreground lg:px-6"><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-primary/60" />Source-backed project context</span><span className="hidden sm:block">Drag to move · Scroll to zoom</span><span className="sm:hidden">Pinch to zoom</span></div>
    </section>
  )
}

function GraphState({ icon: Icon, title, description, loading, children }: { icon: LucideIcon; title: string; description: string; loading?: boolean; children?: React.ReactNode }) {
  return <div className="flex h-full min-h-64 items-center justify-center px-6 py-10 text-center" role={loading ? "status" : undefined}><div className="max-w-sm"><div className="mx-auto flex size-11 items-center justify-center rounded-xl border bg-muted/50"><Icon className={cn("size-5 text-muted-foreground", loading && "animate-spin")} /></div><h2 className="mt-4 text-sm font-semibold">{title}</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">{description}</p>{children && <div className="mt-5">{children}</div>}</div></div>
}
