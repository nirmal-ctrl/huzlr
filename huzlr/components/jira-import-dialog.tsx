"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { AlertCircle, ArrowRight, CheckCircle2, GitBranch, Globe2, Layers3, Loader2, RefreshCw, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchJiraProjects } from "@/lib/redux/slices/jiraSlice"
import { createProject } from "@/lib/redux/slices/projectSlice"
import { authorizeJira, jiraRequest, JiraSite, JiraBindingStatus } from "@/lib/jira-api"

interface JiraImportDialogProps { open: boolean; onOpenChange: (open: boolean) => void }

export function JiraImportDialog({ open, onOpenChange }: JiraImportDialogProps) {
  const dispatch = useAppDispatch()
  const { projects: spaces, loading, error: discoveryError, siteId: discoveredSiteId } = useAppSelector(state => state.jira)
  const destinations = useAppSelector(state => state.projects.items)
  const { activeWorkspaceId, activeTeamId, teams } = useAppSelector(state => state.workspace)
  const [sites, setSites] = useState<JiraSite[]>([])
  const [siteId, setSiteId] = useState("")
  const [spaceId, setSpaceId] = useState("")
  const [destinationId, setDestinationId] = useState("new")
  const [createdDestinationId, setCreatedDestinationId] = useState<number | null>(null)
  const [filterId, setFilterId] = useState("")
  const [bindingId, setBindingId] = useState("")
  const [status, setStatus] = useState<JiraBindingStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [loadingSites, setLoadingSites] = useState(false)
  const [pollRevision, setPollRevision] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const team = teams.find(t => t.id === activeTeamId && t.workspace_id === activeWorkspaceId)

  useEffect(() => {
    setCreatedDestinationId(null)
    setDestinationId("new")
  }, [activeWorkspaceId, activeTeamId])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setError(null)
    setLoadingSites(true)
    jiraRequest<JiraSite[]>("/sites", { signal: controller.signal }).then(value => {
      setSites(value)
      setSiteId(previous => value.some(s => s.id === previous) ? previous : value[0]?.id || "")
    }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setLoadingSites(false) })
    return () => controller.abort()
  }, [open])

  useEffect(() => {
    if (!open || !siteId) return
    setSpaceId("")
    const request = dispatch(fetchJiraProjects(siteId))
    return () => request.abort()
  }, [open, siteId, dispatch])

  useEffect(() => {
    if (!open || !bindingId) return
    let stopped = false
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const value = await jiraRequest<JiraBindingStatus>(`/bindings/${bindingId}`, { signal: controller.signal })
        if (stopped) return
        setStatus(value)
        if (value.run?.status === "queued" || value.run?.status === "running" || value.graph === "pending") timer = setTimeout(poll, 3000)
      } catch (error) { if (!stopped) setError(error instanceof Error ? error.message : "Unable to read import progress") }
    }
    poll()
    return () => { stopped = true; controller.abort(); clearTimeout(timer) }
  }, [open, bindingId, pollRevision])

  const start = async () => {
    if (!team || !spaceId || discoveredSiteId !== siteId) return
    setBusy(true); setError(null)
    try {
      if (filterId && !/^[1-9]\d*$/.test(filterId)) throw new Error("Enter a valid saved Jira filter ID")
      const source = spaces.find(s => s.id === spaceId)
      if (!source) throw new Error("Choose a Jira space")
      let projectId = destinationId === "new" ? createdDestinationId : Number(destinationId)
      if (!projectId) {
        const created = await dispatch(createProject({ team_id: team.id,
          properties: { project_title: source.name, description: source.description || null, status: "Backlog",
            priority: "None", members: [], labels: [], dependencies: [], milestones: [] },
        })).unwrap()
        projectId = created.project_id
        setCreatedDestinationId(projectId)
      }
      const binding = await jiraRequest<{ id: string }>("/bindings", { method: "POST", body: JSON.stringify({
        project_id: projectId, cloud_id: siteId, jira_project_id: spaceId, filter_id: filterId ? Number(filterId) : null,
      }) })
      setBindingId(binding.id)
      setStatus(await jiraRequest<JiraBindingStatus>(`/bindings/${binding.id}`))
    } catch (error) { setError(error instanceof Error ? error.message : "Could not start import") }
    finally { setBusy(false) }
  }

  const retry = async () => {
    setBusy(true); setError(null)
    try {
      await jiraRequest(`/bindings/${bindingId}/sync`, { method: "POST", body: JSON.stringify({ full: true }) })
      setStatus(await jiraRequest<JiraBindingStatus>(`/bindings/${bindingId}`))
      setPollRevision(value => value + 1)
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to retry import") }
    finally { setBusy(false) }
  }

  const reconnect = async () => {
    setReconnecting(true); setError(null)
    try { await authorizeJira() }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to reconnect Jira"); setReconnecting(false) }
  }

  const selectedSite = sites.find(site => site.id === siteId)
  const availableSpaces = discoveredSiteId === siteId ? spaces : []
  const selectedSpace = availableSpaces.find(space => space.id === spaceId)
  const selectedDestination = destinations.find(project => String(project.project_id) === destinationId)
  const disabled = busy || reconnecting
  const selectClass = "h-11 w-full rounded-xl bg-background shadow-none data-[size=default]:h-11"
  const needsReconnect = status?.connection_status === "needs_reconnect"
  const tasks = status?.run?.tasks || []
  const completedTasks = tasks.filter(task => task.status === "complete").length

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto rounded-2xl border-border bg-background p-0 shadow-xl dark:bg-background sm:max-w-[820px]">
      <DialogHeader className="border-b px-6 py-6 text-left sm:px-8">
        <div className="mb-3 flex items-center gap-3">
          <Image src="/integrations/jira.svg" alt="Jira" width={40} height={40} className="size-10" />
          <span className="text-xs font-medium tracking-wide text-muted-foreground">PROJECT CONTEXT</span>
        </div>
        <DialogTitle className="text-2xl font-semibold tracking-tight">{status ? "Your Jira import" : "Bring Jira into the picture"}</DialogTitle>
        <DialogDescription className="max-w-xl text-sm leading-relaxed">Connect a Jira space to a Huzlr project so your agent can understand the work, its history, and what depends on it.</DialogDescription>
      </DialogHeader>

      <div className="px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {needsReconnect || error || discoveryError ? <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" /> : <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{needsReconnect ? "Jira needs to reconnect" : selectedSite?.name || "Your Jira connection"}</p>
              <p className="text-xs text-muted-foreground">{needsReconnect ? "Authorize your account to resume syncing." : "Change accounts or refresh your Jira access."}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 gap-2 rounded-lg bg-background" onClick={reconnect} disabled={disabled}>
            {reconnecting ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {reconnecting ? "Opening Atlassian…" : "Reconnect Jira"}
          </Button>
        </div>
        {(error || discoveryError) && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{error || discoveryError}</p></div>}
      </div>

      {!status ? <div className="grid gap-6 px-6 pb-6 sm:px-8 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-4" aria-labelledby="jira-source-heading">
            <h3 id="jira-source-heading" className="flex items-center gap-2 text-sm font-semibold"><span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">1</span> Choose your source</h3>
            <div className="space-y-2">
              <Label htmlFor="jira-site">Jira site</Label>
              <Select value={siteId} onValueChange={value => { setSiteId(value); setSpaceId(""); setCreatedDestinationId(null) }} disabled={disabled || loadingSites}>
                <SelectTrigger id="jira-site" className={selectClass}><SelectValue placeholder={loadingSites ? "Loading sites…" : "Choose a site"} /></SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-popover dark:bg-popover">{sites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}</SelectContent>
              </Select>
              {!loadingSites && !sites.length && !error && <p className="text-xs text-muted-foreground">No Jira sites available. Reconnect to review your account access.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jira-space">Jira space</Label>
              <Select value={spaceId} onValueChange={value => { setSpaceId(value); setCreatedDestinationId(null) }} disabled={disabled || loading || loadingSites || !siteId || discoveredSiteId !== siteId}>
                <SelectTrigger id="jira-space" className={selectClass}><SelectValue placeholder={loading ? "Loading spaces…" : "Choose a space"} /></SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-popover dark:bg-popover">{availableSpaces.map(space => <SelectItem key={space.id} value={space.id}>{space.name} ({space.key})</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Choose the space containing the work your agent should know.</p>
              {!loading && !loadingSites && siteId && discoveredSiteId === siteId && !availableSpaces.length && !discoveryError && <p className="text-xs text-muted-foreground">No accessible spaces found for this site.</p>}
            </div>
          </section>

          <section className="space-y-4 border-t pt-5" aria-labelledby="jira-destination-heading">
            <h3 id="jira-destination-heading" className="flex items-center gap-2 text-sm font-semibold"><span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">2</span> Choose a home in Huzlr</h3>
            <div className="space-y-2">
              <Label htmlFor="jira-destination">Destination project</Label>
              <Select value={destinationId} onValueChange={setDestinationId} disabled={disabled || !team}>
                <SelectTrigger id="jira-destination" className={selectClass}><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-popover dark:bg-popover">
                  <SelectItem value="new">Create a new project</SelectItem>
                  {destinations.filter(project => project.team_id === activeTeamId).map(project => <SelectItem key={project.project_id} value={String(project.project_id)}>{project.properties.project_title}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{destinationId === "new" ? `We'll create a project in ${team?.name || "your active team"}, using the Jira space name.` : "Jira context will be available to you in this project."}</p>
            </div>
            {!team && <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">Choose an active workspace and team before importing.</p>}
          </section>

          <details className="rounded-xl border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">Limit to a saved Jira filter <span className="ml-1 text-xs font-normal text-muted-foreground">Optional</span></summary>
            <div className="mt-3 space-y-2">
              <Label htmlFor="jira-filter">Saved filter ID</Label>
              <Input id="jira-filter" className="h-10 rounded-lg" inputMode="numeric" value={filterId} onChange={event => setFilterId(event.target.value)} placeholder="e.g. 10042" disabled={disabled} aria-describedby="jira-filter-help" />
              <p id="jira-filter-help" className="text-xs leading-relaxed text-muted-foreground">Leave empty to import all accessible work. A saved filter narrows the import within your selected Jira space.</p>
            </div>
          </details>
        </div>

        <aside className="self-start rounded-2xl border bg-muted/25 p-5" aria-label="Import preview">
          <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground">IMPORT PREVIEW</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2.5"><Globe2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="break-words font-medium">{selectedSpace?.name || "Your Jira space"}</p><p className="break-words text-xs text-muted-foreground">{selectedSite?.name || "Choose a source above"}</p></div></div>
            <ArrowRight className="ml-0.5 size-4 text-muted-foreground" />
            <div className="flex items-start gap-2.5"><Layers3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="break-words font-medium">{destinationId === "new" ? selectedSpace?.name || "New Huzlr project" : selectedDestination?.properties.project_title || "Huzlr project"}</p><p className="text-xs text-muted-foreground">{filterId ? `Filter ${filterId} · selected space` : "All accessible work in this space"}</p></div></div>
          </div>
          <div className="mt-5 space-y-3 border-t pt-4">
            <p className="flex items-center gap-2 text-sm font-medium"><GitBranch className="size-4" /> Context for your agent</p>
            <p className="text-xs leading-relaxed text-muted-foreground">Issues, comments, history, owners, and dependencies, connected with links back to Jira.</p>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" />Only work your Jira account can access is available to your agent.</p>
          </div>
        </aside>
      </div> : <div className="space-y-5 px-6 pb-6 sm:px-8" aria-live="polite">
        <div className="rounded-2xl border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold">{status.name}</h3><p className="mt-1 text-xs text-muted-foreground">Last source sync: {status.synced_at ? new Date(status.synced_at).toLocaleString() : "Waiting for first sync"}</p></div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">{status.run?.status || "queued"}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Import datasets</p><p className="mt-1 text-sm font-medium">{completedTasks} of {tasks.length} complete</p></div>
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Context graph</p><p className="mt-1 flex items-center gap-1.5 text-sm font-medium capitalize">{status.graph === "ready" && <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />}{status.graph}</p></div>
          </div>
        </div>
        <ul className="divide-y rounded-xl border">{tasks.map((task, index) => <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm" key={`${task.dataset}-${index}`}>
          <div><p className="font-medium capitalize">{task.dataset.replaceAll("_", " ")}</p>{task.error && <p className="mt-1 text-xs text-destructive">{task.error.replaceAll("_", " ")}</p>}</div>
          <p className="text-xs text-muted-foreground">{task.records} records · {task.status}</p>
        </li>)}</ul>
        {status.run?.status === "partial" && <p className="text-sm text-muted-foreground">Some data is unavailable. Check Jira permissions and sync again. Your agent can see which datasets are available.</p>}
        {status.run?.status === "queued" && <p className="text-sm text-muted-foreground">Your import is queued. You can close this dialog; the import continues in the background.</p>}
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-2 rounded-lg"><Link href={`/projects/${status.project_id}/context`}>Open project context <ArrowRight className="size-4" /></Link></Button>
          <Button variant="outline" className="gap-2 rounded-lg" onClick={retry} disabled={disabled || status.run?.status === "running" || status.run?.status === "queued" || status.connection_status !== "connected"}><RefreshCw className="size-4" />Sync again</Button>
          <Button variant="ghost" className="rounded-lg" disabled={disabled} onClick={() => { setStatus(null); setBindingId(""); setCreatedDestinationId(null); setError(null) }}>Import another space</Button>
        </div>
      </div>}

      <DialogFooter className="border-t bg-muted/20 px-6 py-4 sm:items-center sm:justify-between sm:px-8">
        <p className="text-xs text-muted-foreground">{status ? "Follow progress from your project's context page." : "Text attachments included. PDF, images, and external documents excluded."}</p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>{status ? "Close" : "Cancel"}</Button>
          {!status && <Button className="gap-2 rounded-lg" onClick={start} disabled={disabled || loading || loadingSites || !siteId || !spaceId || !team || discoveredSiteId !== siteId}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}{busy ? "Starting import…" : "Start import"}</Button>}
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
