"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from "react-force-graph-2d"
import { forceCollide } from "d3-force-3d"
import { Info, Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ContextGraphEdge, ContextGraphNode } from "@/services/contextApi"

const COLORS: Record<string, string> = {
  Project: "#9ab9ca", Issue: "#d6c6a9", Milestone: "#b4c5cc", Document: "#94bf99",
  DocumentChunk: "#85b28b", Risk: "#dc7d80", Assumption: "#c6a683", Meeting: "#9bb5bf",
  Note: "#a9c89e", Claim: "#d3bba1", JiraSpace: "#91afc6", Comment: "#a7bca0",
  ChangeEvent: "#b2bbbd", Worklog: "#a0b49c", Attachment: "#95b49b", Version: "#c9bca3",
  Component: "#a4bdb2", Board: "#9cb4c6", Sprint: "#c4b997", Person: "#8aba95",
}
const kindLabel = (kind: string) => kind === "DocumentChunk" ? "Excerpt" : kind.replace(/([a-z])([A-Z])/g, "$1 $2")
const color = (kind: string) => COLORS[kind] ?? "#b9c2bf"

type Point = NodeObject<{ id: string; kind: string; degree: number; radius: number }>
type Connection = LinkObject<Point, { id: string; kind: string; rootLink: boolean }> & {
  source: string | number | Point; target: string | number | Point;
}
type NetworkData = { signature: string; nodes: Point[]; links: Connection[] }

export function ContextNetwork({ nodes, relationships, selectedId, matchedIds, showNodeLabels, showLinkLabels, focusId, onFocusHandled, onSelect, onClear }: {
  nodes: ContextGraphNode[]; relationships: ContextGraphEdge[]; selectedId: string | null;
  matchedIds: Set<string>; showNodeLabels: boolean; showLinkLabels: boolean; focusId: string | null;
  onFocusHandled: () => void; onSelect: (node: ContextGraphNode) => void; onClear: () => void;
}) {
  const container = useRef<HTMLDivElement>(null)
  const graph = useRef<ForceGraphMethods<Point, Connection> | undefined>(undefined)
  const pointCache = useRef(new Map<string, Point>())
  const fitPending = useRef(true)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [network, setNetwork] = useState<NetworkData>({ signature: "", nodes: [], links: [] })
  const records = useMemo(() => new Map(nodes.map(node => [node.canonical_id, node])), [nodes])
  const neighbors = useMemo(() => {
    const ids = new Set<string>()
    if (selectedId) {
      ids.add(selectedId)
      for (const edge of relationships) {
        if (edge.source === selectedId) ids.add(edge.target)
        if (edge.target === selectedId) ids.add(edge.source)
      }
    }
    return ids
  }, [relationships, selectedId])
  const endpoint = (value: Connection["source"]) => typeof value === "object" ? value.id : value
  const connected = (link: Connection) => endpoint(link.source) === selectedId || endpoint(link.target) === selectedId

  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const signature = JSON.stringify([nodes.map(node => [node.canonical_id, node.kind]), relationships.map(edge => [edge.source, edge.kind, edge.target])])
    setNetwork(previous => {
      // A metadata refresh must not restart the simulation or lose dragged positions.
      if (previous.signature === signature) return previous
      const degree = new Map<string, number>()
      for (const edge of relationships) {
        degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
        degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
      }
      const points = nodes.map(node => {
        const point = pointCache.current.get(node.canonical_id) ?? { id: node.canonical_id }
        Object.assign(point, { kind: node.kind, degree: degree.get(node.canonical_id) ?? 0,
          radius: node.kind === "Project" ? 6 : Math.min(4.5, 2.1 + Math.sqrt(degree.get(node.canonical_id) ?? 0) * 0.45) })
        pointCache.current.set(node.canonical_id, point as Point)
        return point as Point
      })
      const kinds = new Map(nodes.map(node => [node.canonical_id, node.kind]))
      fitPending.current = true
      // force-graph mutates nodes and link endpoints. Never give it the RTK Query cache.
      return { signature, nodes: points, links: relationships.map((edge, index) => ({
        id: `${edge.source}:${edge.kind}:${edge.target}:${index}`, source: edge.source, target: edge.target,
        kind: edge.kind, rootLink: kinds.get(edge.source) === "Project" || kinds.get(edge.target) === "Project",
      })) }
    })
  }, [nodes, relationships])

  useEffect(() => {
    const instance = graph.current
    if (!instance || !network.nodes.length) return
    instance.d3Force("charge")?.strength((node: Point) => -18 - Math.min(55, node.degree * 3)).distanceMax(400)
    // Configure the engine-owned link force. Replacing it before graphData is
    // initialized can resolve endpoints against an empty node collection.
    instance.d3Force("link")?.distance((link: Connection) => link.rootLink ? 105 : link.kind === "HAS_CHUNK" || link.kind === "HAS_COMMENT" ? 18 : 34)
      .strength((link: Connection) => link.rootLink ? 0.045 : 0.65)
    instance.d3Force("collision", forceCollide<Point>(node => node.radius + 1.5).iterations(2))
    instance.d3ReheatSimulation()
  }, [network, size.width > 0])

  useEffect(() => {
    if (!focusId || !graph.current) return
    const point = network.nodes.find(node => node.id === focusId)
    if (point?.x == null || point.y == null) return
    fitPending.current = false
    graph.current.centerAt(point.x, point.y, 300)
    graph.current.zoom(Math.max(2, graph.current.zoom()), 300)
    onFocusHandled()
  }, [focusId, network, size, onFocusHandled])

  useEffect(() => {
    if (!selectedId || !graph.current) return
    const point = network.nodes.find(node => node.id === selectedId)
    if (point?.x != null && point.y != null) graph.current.centerAt(point.x, point.y, 200)
  }, [size, selectedId, network])

  const fit = useCallback(() => {
    graph.current?.zoomToFit(300, Math.min(80, size.width * 0.12, size.height * 0.12))
  }, [size])
  const paintNode = useCallback((point: Point, ctx: CanvasRenderingContext2D, scale: number) => {
    const record = records.get(point.id)
    if (!record || point.x == null || point.y == null) return
    const active = selectedId === point.id || hoverId === point.id
    const dim = selectedId ? !neighbors.has(point.id) : !matchedIds.has(point.id)
    const radius = point.radius / Math.sqrt(Math.max(0.6, scale))
    ctx.save()
    ctx.globalAlpha = dim ? 0.18 : 0.95
    if (active) {
      ctx.beginPath(); ctx.arc(point.x, point.y, radius + 4 / scale, 0, 2 * Math.PI)
      ctx.strokeStyle = "#e8e3d6"; ctx.lineWidth = 1 / scale; ctx.stroke()
      ctx.beginPath(); ctx.arc(point.x, point.y, radius + 8 / scale, 0, 2 * Math.PI)
      ctx.fillStyle = "rgba(232,227,214,0.08)"; ctx.fill()
    }
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = color(point.kind); ctx.fill()
    if (active || showNodeLabels || point.kind === "Project" || (scale > 5 && !dim)) {
      const title = record.title || kindLabel(record.kind)
      const label = title.length > 38 ? title.slice(0, 36) + "…" : title
      ctx.font = `${10 / scale}px Inter, system-ui, sans-serif`
      ctx.textAlign = "center"; ctx.textBaseline = "top"
      const width = ctx.measureText(label).width
      const y = point.y + radius + 6 / scale
      ctx.fillStyle = "rgba(40,44,49,0.92)"; ctx.fillRect(point.x - width / 2 - 4 / scale, y - 2 / scale, width + 8 / scale, 15 / scale)
      ctx.fillStyle = active ? "#f0ece2" : "#c0c8cc"; ctx.fillText(label, point.x, y)
    }
    ctx.restore()
  }, [records, selectedId, hoverId, neighbors, matchedIds, showNodeLabels])

  const hovered = hoverId ? records.get(hoverId) : null
  const legend = [...new Set(nodes.map(node => node.kind))].sort()

  return (
    <div ref={container} className="relative h-full min-h-0 w-full overflow-hidden bg-[#282c31]" role="group" aria-label="Interactive project context network" data-node-count={network.nodes.length} data-link-count={network.links.length}>
      <p className="sr-only">A force-directed network of project records. Use Explore to browse records with the keyboard, or select a point to inspect its source and connections.</p>
      {size.width > 0 && size.height > 0 && <ForceGraph2D<Point, Connection>
        ref={graph} width={size.width} height={size.height} graphData={network} backgroundColor="#282c31"
        nodeLabel="" linkLabel="" nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node, paintColor, ctx, scale) => {
          if (node.x == null || node.y == null) return
          ctx.beginPath(); ctx.arc(node.x, node.y, Math.max(node.radius / Math.sqrt(Math.max(0.6, scale)), 9 / scale), 0, 2 * Math.PI)
          ctx.fillStyle = paintColor; ctx.fill()
        }}
        linkColor={link => selectedId ? connected(link) ? "rgba(172,195,207,0.75)" : "rgba(172,186,192,0.055)" : "rgba(168,181,186,0.22)"}
        linkWidth={link => selectedId && connected(link) ? 1 : 0.45}
        linkDirectionalArrowLength={link => selectedId && connected(link) ? 3 : 0}
        linkDirectionalArrowColor="#c1d0d6" linkDirectionalArrowRelPos={0.85}
        linkCanvasObjectMode="after"
        linkCanvasObject={(link, ctx, scale) => {
          if (!showLinkLabels && !(selectedId && connected(link) && neighbors.size < 15)) return
          const source = typeof link.source === "object" ? link.source : null
          const target = typeof link.target === "object" ? link.target : null
          if (source?.x == null || source.y == null || target?.x == null || target.y == null) return
          const label = link.kind.replaceAll("_", " ").toLowerCase()
          const x = (source.x + target.x) / 2, y = (source.y + target.y) / 2
          ctx.save(); ctx.font = `${9 / scale}px Inter, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"
          const width = ctx.measureText(label).width
          ctx.fillStyle = "rgba(40,44,49,0.9)"; ctx.fillRect(x - width / 2 - 3 / scale, y - 6 / scale, width + 6 / scale, 12 / scale)
          ctx.fillStyle = "#aebcc3"; ctx.fillText(label, x, y); ctx.restore()
        }}
        warmupTicks={120} cooldownTicks={80} d3AlphaDecay={0.035} d3VelocityDecay={0.4}
        minZoom={0.1} maxZoom={12} enableNodeDrag enableZoomInteraction enablePanInteraction
        onEngineStop={() => { if (fitPending.current && !selectedId) { fitPending.current = false; fit() } }}
        onNodeHover={node => { setHoverId(node?.id ?? null); if (container.current) container.current.style.cursor = node ? "pointer" : "grab" }}
        onNodeClick={node => { const record = records.get(node.id); if (record) onSelect(record) }}
        onNodeDragEnd={node => { node.fx = node.x; node.fy = node.y }}
        onBackgroundClick={onClear}
      />}
      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-white/10 bg-[#30353b]/90 px-2.5 py-1.5 text-[10px] text-[#c0c8cc]">
        {selectedId ? "Connected records highlighted" : "Select a point to explore its context"}
      </div>
      {hovered && <div className="pointer-events-none absolute right-4 top-4 max-w-64 rounded-lg border border-white/10 bg-[#30353b]/95 px-3 py-2 shadow-lg"><p className="text-[10px] text-[#a6b1b7]">{kindLabel(hovered.kind)}</p><p className="mt-1 text-xs text-[#eee8dc]">{hovered.title}</p></div>}
      <div className="absolute bottom-4 left-4 flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#30353b]/95 p-1 shadow-sm">
        {[
          { label: "Zoom in", icon: ZoomIn, action: () => graph.current?.zoom((graph.current?.zoom() ?? 1) * 1.4, 200) },
          { label: "Zoom out", icon: ZoomOut, action: () => graph.current?.zoom((graph.current?.zoom() ?? 1) / 1.4, 200) },
          { label: "Fit graph", icon: Maximize2, action: fit },
        ].map(({ label, icon: Icon, action }) => <Tooltip key={label}><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={label} onClick={action} className="text-[#c9d1d5] hover:bg-white/10 hover:text-white"><Icon className="size-3.5" /></Button></TooltipTrigger><TooltipContent side="top">{label}</TooltipContent></Tooltip>)}
      </div>
      <Popover><PopoverTrigger asChild><Button variant="ghost" size="sm" className="absolute bottom-4 right-4 h-8 border border-white/10 bg-[#30353b]/95 text-[11px] text-[#c9d1d5] hover:bg-[#3a4047] hover:text-white"><Info className="size-3.5" />Legend</Button></PopoverTrigger><PopoverContent align="end" side="top" className="w-56"><h3 className="mb-3 text-xs font-medium">Record types</h3><div className="grid grid-cols-2 gap-3">{legend.map(kind => <div key={kind} className="flex items-center gap-2 text-[11px]"><span className="size-2 shrink-0 rounded-full" style={{ background: color(kind) }} />{kindLabel(kind)}</div>)}</div></PopoverContent></Popover>
    </div>
  )
}
