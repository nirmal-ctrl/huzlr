"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, Layers3, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { authorizeJira, jiraRequest, type JiraBindingStatus } from "@/lib/jira-api"
import { useAppSelector } from "@/lib/redux/hooks"

const humanize = (value: string) => value.replaceAll("_", " ")
const syncedAt = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not synced yet"

export function JiraSources({ projectId }: { projectId: number }) {
  const [sources, setSources] = useState<JiraBindingStatus[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const userId = useAppSelector(state => state.auth.user?.id)
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const result = await jiraRequest<JiraBindingStatus[]>(`/bindings?project_id=${projectId}`, { signal })
    if (!signal?.aborted) { setSources(result); setError(null) }
  }, [projectId])
  useEffect(() => {
    const controller = new AbortController()
    setSources([]); setError(null)
    const read = () => refresh(controller.signal).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to read Jira status")
    })
    read()
    const timer = setInterval(read, 5000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [refresh, userId])

  const update = async (id: string, remove = false) => {
    setBusy(id); setError(null)
    try {
      await jiraRequest(`/bindings/${id}${remove ? "" : "/sync"}`, remove ? { method: "DELETE" } : {
        method: "POST", body: JSON.stringify({ full: true }),
      })
      await refresh()
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to update Jira source") }
    finally { setBusy(null) }
  }
  const reconnect = async () => {
    setReconnecting(true); setError(null)
    try { await authorizeJira() }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to reconnect Jira"); setReconnecting(false) }
  }
  if (!sources.length && !error) return null
  const needsAttention = Boolean(error) || sources.some(source => source.connection_status === "needs_reconnect" || source.graph === "failed" || source.run?.status === "failed")
  const syncing = sources.some(source => source.run?.status === "running" || source.run?.status === "queued" || source.graph === "pending")

  return (
      <Popover>
        <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" aria-label="Manage Jira sources"><Layers3 className="size-3.5" /><span className="hidden 2xl:inline">Sources</span><Badge variant="secondary" className="h-4 min-w-4 rounded-full px-1 text-[9px] font-normal">{sources.length}</Badge>{needsAttention ? <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" /> : syncing ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />}<ChevronDown className="size-3 text-muted-foreground" /></Button></PopoverTrigger>
        <PopoverContent align="end" className="max-h-[70svh] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-xl p-0">
          <div className="border-b px-4 py-3"><h2 className="text-xs font-semibold">Connected Jira sources</h2><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Context available through your Jira account.</p></div>
          {error && <div role="alert" className="border-b bg-destructive/5 px-4 py-3 text-xs text-destructive">{error}<Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => refresh().catch(cause => setError(cause instanceof Error ? cause.message : "Unable to read Jira status"))}><RefreshCw className="size-3" />Try again</Button></div>}
          <div className="divide-y">{sources.map(source => {
            const running = source.run?.status === "running" || source.run?.status === "queued"
            const reconnectRequired = source.connection_status === "needs_reconnect"
            return (
              <div key={source.id} className="space-y-3 p-4">
                <div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Layers3 className="size-4" /></span><div className="min-w-0 flex-1"><h3 className="truncate text-xs font-medium">{source.name}</h3><p className="mt-1 text-[10px] text-muted-foreground">{source.key} · {syncedAt(source.synced_at)}</p></div><Badge variant="outline" className="text-[10px]">{reconnectRequired ? "Reconnect" : running ? "Syncing" : humanize(source.run?.status || "queued")}</Badge></div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground"><span>Graph: <span className="text-foreground">{humanize(source.graph)}</span></span><span>Enrichment: <span className="text-foreground">{humanize(source.enrichment)}</span></span></div>
                {reconnectRequired && <p role="alert" className="rounded-md bg-amber-500/10 p-2.5 text-[11px] leading-5 text-amber-700 dark:text-amber-300">Reconnect your Jira account to resume syncing this source.</p>}
                {!!source.run?.tasks.length && <div className="grid grid-cols-2 gap-2">{source.run.tasks.map(task => <div key={task.dataset} className="rounded-md border bg-muted/20 px-2.5 py-2"><div className="flex items-center justify-between gap-2"><span className="truncate text-[11px] font-medium capitalize">{humanize(task.dataset)}</span><span className="text-[11px] tabular-nums">{task.records.toLocaleString()}</span></div><p className="mt-1 text-[10px] text-muted-foreground">{humanize(task.status)}</p>{task.error && <p className="mt-1 text-[10px] text-destructive">{humanize(task.error)}</p>}</div>)}</div>}
                <div className="flex flex-wrap items-center gap-2">
                  {reconnectRequired && <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={reconnecting || busy !== null} onClick={reconnect}>{reconnecting ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}Reconnect Jira</Button>}
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy !== null || running || source.connection_status !== "connected"} onClick={() => update(source.id)}>{busy === source.id ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}Sync again</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground" disabled={busy !== null} onClick={() => update(source.id, true)}>Disconnect</Button>
                </div>
              </div>
            )
          })}</div>
          <div className="border-t bg-muted/20 px-4 py-3 text-[10px] leading-5 text-muted-foreground">Text attachments and attachment metadata are included. PDF, images, archives, and linked external document content are outside this import.</div>
        </PopoverContent>
      </Popover>
  )
}
