"use client"

import { useState } from "react"
import { Clock3, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { contextError, ContextHistory, ContextGraphNode, useCreateContextSessionMutation, useContextHistoryMutation } from "@/services/contextApi"

export function ContextSourceHistory({ node }: { node: ContextGraphNode }) {
  const [createSession] = useCreateContextSessionMutation()
  const [readHistory] = useContextHistoryMutation()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [history, setHistory] = useState<ContextHistory | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (cursor = 0) => {
    setBusy(true); setError(null)
    try {
      let id = sessionId
      if (!id) {
        const session = await createSession({ workspace_id: node.workspace_id, project_ids: [node.project_id] }).unwrap()
        id = session.id
        setSessionId(id)
      }
      const result = await readHistory({ session_id: id, project_id: node.project_id, source_id: node.canonical_id, cursor, limit: 10 }).unwrap()
      setHistory(previous => ({ ...result, episodes: cursor && previous ? [...previous.episodes, ...result.episodes] : result.episodes }))
    } catch (error) { setError(contextError(error)); setSessionId(null) }
    finally { setBusy(false) }
  }

  return <section className="mt-5 border-t pt-4" aria-label="Source history">
    <div className="flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Clock3 className="size-3" />Source history</h3>
      <Button variant="ghost" size="sm" className="h-7 text-[11px]" disabled={busy} onClick={() => load()}>{busy ? <Loader2 className="size-3 animate-spin" /> : history ? "Refresh" : "View history"}</Button>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    {history && <div className="mt-2 space-y-3" aria-live="polite">
      <p className="text-[11px] leading-5 text-muted-foreground">Versions recorded by Huzlr. These times show when a change was observed.</p>
      {!history.episodes.length && <p className="text-xs text-muted-foreground">No accessible history yet. New versions appear after the graph updates.</p>}
      <ol className="space-y-3">{history.episodes.map(episode => <li key={episode.id} className="rounded-lg border p-3">
        <time className="text-[10px] text-muted-foreground" dateTime={episode.recorded_at}>{new Date(episode.recorded_at).toLocaleString()}</time>
        <p className="mt-1 text-xs font-medium">{episode.content.title || "Source version"}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5">{episode.content.text}</p>
      </li>)}</ol>
      {history.truncated && <p className="text-[11px] text-muted-foreground">Source visibility checks reached their limit; some history may be omitted.</p>}
      {history.next_cursor !== null && <Button size="sm" variant="outline" className="w-full text-xs" disabled={busy} onClick={() => load(history.next_cursor!)}>Load earlier versions</Button>}
    </div>}
  </section>
}
