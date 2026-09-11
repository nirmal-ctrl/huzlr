"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useContextProjectsQuery, useCreateContextSessionMutation, contextError, type ContextSession } from "@/services/contextApi"

export function ProjectContextPicker({ workspaceId, disabled, onSelect }: {
  workspaceId: number | null
  disabled: boolean
  onSelect: (session: ContextSession, labels: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const { data, isLoading, isError } = useContextProjectsQuery(workspaceId ?? 0, { skip: !workspaceId || !open })
  const [create, { isLoading: saving }] = useCreateContextSessionMutation()

  async function attach() {
    if (!workspaceId) return
    setError(null)
    try {
      const session = await create({ workspace_id: workspaceId, project_ids: selected }).unwrap()
      onSelect(session, selected.map((id) => data?.projects.find((p) => p.id === id)?.title || `Project ${id}`))
      setOpen(false)
    } catch (e) { setError(contextError(e)) }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={disabled || !workspaceId}
          aria-label="Add project context" className="size-8 rounded-full text-muted-foreground">
          <Plus className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <p className="text-sm font-medium">Choose project context</p>
        <p className="text-xs text-muted-foreground">Select up to 10 projects. Changing projects starts a fresh conversation.</p>
        {isLoading && <p className="text-sm">Loading projects…</p>}
        {isError && <p className="text-sm text-destructive">Could not load project context.</p>}
        {data && !data.enabled && <p className="text-sm text-muted-foreground">Project context is not enabled for this workspace yet.</p>}
        {data?.enabled && data.projects.length === 0 && <p className="text-sm">No accessible projects.</p>}
        <div className="max-h-60 space-y-2 overflow-auto">
          {data?.projects.map((p) => <label key={p.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(p.id)} disabled={saving || (!selected.includes(p.id) && selected.length >= 10)}
              onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, p.id] : previous.filter((id) => id !== p.id))} />
            {p.title}
          </label>)}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="button" size="sm" onClick={() => void attach()} disabled={saving || !selected.length || !data?.enabled}>
          {saving ? "Attaching…" : "Attach projects"}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
