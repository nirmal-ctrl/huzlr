"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { type ContextAction, contextError, useConfirmContextActionMutation } from "@/services/contextApi"

export function ContextActionPreview({ action }: { action: ContextAction }) {
  const [confirm, { isLoading }] = useConfirmContextActionMutation()
  const [issueId, setIssueId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  return <div className="mt-3 space-y-2 rounded-xl border p-3">
    <p className="text-xs text-muted-foreground">Proposed issue · Project {action.payload.project_id}</p>
    <p className="font-medium">{action.payload.title}</p>
    <p>{action.payload.description}</p>
    {issueId ? <p role="status">Created issue #{issueId}.</p> : <Button type="button" size="sm" disabled={isLoading}
      onClick={async () => {
        setError(null)
        try { setIssueId((await confirm(action.id).unwrap()).issue_id) }
        catch (e) { setError(contextError(e)) }
      }}>{isLoading ? "Creating…" : "Confirm and create issue"}</Button>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </div>
}
