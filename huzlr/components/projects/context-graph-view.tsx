"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { AlertTriangle, ExternalLink, Loader2, Network, RefreshCw, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  contextError,
  type ContextGraphNode,
  useProjectContextGraphQuery,
  useReindexProjectContextMutation,
} from "@/services/contextApi"
import { useToast } from "@/hooks/use-toast"

const KIND_COLORS: Record<string, string> = {
  Project: "#f59e0b",
  Issue: "#3b82f6",
  Milestone: "#8b5cf6",
  Document: "#14b8a6",
  DocumentChunk: "#2dd4bf",
  Risk: "#ef4444",
  Assumption: "#f97316",
  Meeting: "#06b6d4",
  Note: "#84cc16",
  Claim: "#ec4899",
}

function positions(nodes: ContextGraphNode[], relations: { source: string; target: string }[]) {
  const root = nodes.find((node) => node.kind === "Project")?.canonical_id
  const adjacency = new Map<string, Set<string>>()
  for (const node of nodes) adjacency.set(node.canonical_id, new Set())
  for (const relation of relations) {
    adjacency.get(relation.source)?.add(relation.target)
    adjacency.get(relation.target)?.add(relation.source)
  }

  const depth = new Map<string, number>()
  if (root) {
    depth.set(root, 0)
    const queue = [root]
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index]
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!depth.has(neighbor)) {
          depth.set(neighbor, (depth.get(current) ?? 0) + 1)
          queue.push(neighbor)
        }
      }
    }
  }
  const highest = Math.max(0, ...depth.values())
  for (const node of nodes) if (!depth.has(node.canonical_id)) depth.set(node.canonical_id, highest + 1)

  const rings = new Map<number, ContextGraphNode[]>()
  for (const node of nodes) {
    const ring = depth.get(node.canonical_id) ?? 1
    rings.set(ring, [...(rings.get(ring) ?? []), node])
  }

  const result = new Map<string, { x: number; y: number }>()
  for (const [ring, members] of rings) {
    if (ring === 0) {
      result.set(members[0].canonical_id, { x: 0, y: 0 })
      continue
    }
    const radius = Math.max(ring * 260, members.length * 72)
    members.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / members.length - Math.PI / 2
      result.set(node.canonical_id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
    })
  }
  return result
}

export function ContextGraphView({ projectId }: { projectId: number }) {
  const { toast } = useToast()
  const { data, error, isLoading, isFetching, refetch } = useProjectContextGraphQuery(projectId, {
    pollingInterval: 10000,
  })
  const [reindex, { isLoading: isReindexing }] = useReindexProjectContextMutation()
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const kinds = useMemo(() => [...new Set(data?.nodes.map((node) => node.kind) ?? [])].sort(), [data])
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const allNodes = data?.nodes ?? []
    const ids = new Set(allNodes.filter((node) =>
      (kind ? node.kind === kind : node.kind !== "DocumentChunk") &&
      (!needle || `${node.title} ${node.text}`.toLowerCase().includes(needle)),
    ).map((node) => node.canonical_id))
    // Keep the path back to the project/document parent so filtered results retain meaning.
    let changed = true
    while (changed) {
      changed = false
      for (const edge of data?.relationships ?? []) {
        if (ids.has(edge.target) && !ids.has(edge.source)) {
          ids.add(edge.source)
          changed = true
        }
      }
    }
    const nodes = allNodes.filter((node) => ids.has(node.canonical_id))
    const relationships = (data?.relationships ?? []).filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    return { nodes, relationships }
  }, [data, kind, query])

  const layout = useMemo(() => positions(visible.nodes, visible.relationships), [visible])
  const flowNodes = useMemo<Node[]>(() => visible.nodes.map((node) => ({
    id: node.canonical_id,
    position: layout.get(node.canonical_id) ?? { x: 0, y: 0 },
    data: { label: node.title || node.kind },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: {
      width: node.kind === "Project" ? 190 : 165,
      border: `2px solid ${KIND_COLORS[node.kind] ?? "#64748b"}`,
      borderRadius: 12,
      background: "hsl(var(--card))",
      color: "hsl(var(--card-foreground))",
      boxShadow: selectedId === node.canonical_id ? `0 0 0 4px ${KIND_COLORS[node.kind] ?? "#64748b"}33` : undefined,
      fontSize: 12,
      fontWeight: node.kind === "Project" ? 700 : 500,
      padding: "10px 12px",
    },
  })), [layout, selectedId, visible.nodes])
  const flowEdges = useMemo<Edge[]>(() => visible.relationships.map((edge, index) => ({
    id: `${edge.source}:${edge.kind}:${edge.target}:${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.kind.replaceAll("_", " ").toLowerCase(),
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    style: { stroke: "#94a3b8", strokeWidth: 1.25 },
    labelStyle: { fill: "#64748b", fontSize: 9 },
  })), [visible.relationships])
  const selected = data?.nodes.find((node) => node.canonical_id === selectedId) ?? null
  const projectTitle = data?.nodes.find((node) => node.kind === "Project")?.title ?? `Project ${projectId}`

  const handleReindex = async () => {
    try {
      await reindex(projectId).unwrap()
      toast({ title: "Context refresh queued", description: "The graph will update when indexing completes." })
      refetch()
    } catch (cause) {
      toast({ variant: "destructive", title: "Could not refresh graph", description: contextError(cause) })
    }
  }

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (error) return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-xl border bg-card p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 size-7 text-destructive" />
        <h2 className="font-semibold">Context graph unavailable</h2>
        <p className="mt-1 text-sm text-muted-foreground">{contextError(error)}</p>
        <Button className="mt-4" variant="outline" onClick={() => refetch()}><RefreshCw className="size-4" /> Retry</Button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="mr-auto min-w-0">
          <div className="flex items-center gap-2"><Network className="size-4 text-primary" /><h1 className="truncate text-sm font-semibold">{projectTitle} context graph</h1></div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data?.total_nodes ?? 0} nodes · {data?.relationships.length ?? 0} relationships
            {data?.freshness.indexed_at ? ` · indexed ${new Date(data.freshness.indexed_at).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a node…" className="h-9 pl-8" />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={handleReindex} disabled={isReindexing}>
          {isReindexing ? <Loader2 className="size-4 animate-spin" /> : <Network className="size-4" />} Reindex
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b px-4 py-2">
        <Button variant={kind === null ? "secondary" : "ghost"} size="sm" className="h-7" onClick={() => setKind(null)}>Overview</Button>
        {kinds.map((item) => (
          <Button key={item} variant={kind === item ? "secondary" : "ghost"} size="sm" className="h-7" onClick={() => setKind(item)}>
            <span className="size-2 rounded-full" style={{ background: KIND_COLORS[item] ?? "#64748b" }} />{item}
          </Button>
        ))}
      </div>

      {data?.freshness.status !== "ready" && (
        <div className="border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
          {data?.freshness.status === "failed" ? `Indexing failed: ${data.freshness.error ?? "unknown error"}` :
            data?.freshness.status === "pending" ? "Changes are being indexed; this view will refresh automatically." :
              "This project has not been indexed yet. Ask a workspace admin to reindex it."}
        </div>
      )}
      {data?.truncated && <div className="border-b px-4 py-2 text-xs text-muted-foreground">Showing the first {data.nodes.length} of {data.total_nodes} nodes.</div>}

      <div className="relative min-h-[480px] flex-1">
        {flowNodes.length ? (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.08}
            maxZoom={2}
            nodesDraggable
            nodesConnectable={false}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            <Controls showInteractive={false} />
            <MiniMap nodeColor={(node) => KIND_COLORS[(data?.nodes.find((item) => item.canonical_id === node.id)?.kind ?? "")] ?? "#64748b"} pannable zoomable />
          </ReactFlow>
        ) : (
          <div className="flex h-full min-h-[480px] items-center justify-center text-center text-sm text-muted-foreground">
            {data?.nodes.length ? "No nodes match these filters." : "No context nodes yet. Reindex after adding project information."}
          </div>
        )}

        {selected && (
          <aside className="absolute right-3 top-3 z-10 max-h-[calc(100%-1.5rem)] w-[min(22rem,calc(100%-1.5rem))] overflow-y-auto rounded-xl border bg-card p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: KIND_COLORS[selected.kind] ?? "#64748b" }}>{selected.kind}</p>
                <h2 className="mt-1 text-sm font-semibold">{selected.title}</h2>
              </div>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setSelectedId(null)}><X className="size-4" /></Button>
            </div>
            {selected.status && <p className="mt-3 text-xs text-muted-foreground">Status: <span className="text-foreground">{selected.status}</span></p>}
            {selected.confidence != null && <p className="mt-1 text-xs text-muted-foreground">Confidence: <span className="text-foreground">{Math.round(selected.confidence * 100)}%</span></p>}
            {selected.text && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selected.text}</p>}
            {selected.path && <Button asChild variant="outline" size="sm" className="mt-4"><Link href={selected.path}><ExternalLink className="size-3.5" /> Open source</Link></Button>}
          </aside>
        )}
      </div>
    </div>
  )
}
