"use client"

import { Bot, CheckCircle2, Clock3, FileText, ListChecks, Loader2, Users } from "lucide-react"
import { useParams } from "next/navigation"

import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { useGetScrumMeetingQuery } from "@/services/scrumMasterApi"

export default function ScrumMeetingDetailPage() {
  const params = useParams<{ meetingId: string }>()
  const meetingId = Number(params.meetingId)
  const { data: meeting, isLoading, isError } = useGetScrumMeetingQuery(meetingId, {
    skip: !Number.isInteger(meetingId),
    pollingInterval: 5000,
  })

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-5 lg:px-6">
        {isLoading ? (
          <div className="flex min-h-52 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : isError || !meeting ? (
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">Meeting details are unavailable.</div>
        ) : (
          <>
            <section className="border-b pb-5">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-base font-semibold">{meeting.title}</h1><Badge variant="outline">{meeting.status.replaceAll("_", " ")}</Badge></div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{new Date(meeting.startsAt).toLocaleString()}</span>
                <span className="flex items-center gap-1.5"><Users className="size-3.5" />{meeting.attendees} attendees</span>
                <span className="flex items-center gap-1.5"><Bot className="size-3.5" />{meeting.joinedAt ? `Bot joined ${new Date(meeting.joinedAt).toLocaleString()}` : meeting.botEnabled ? "Bot scheduled" : "Bot has not joined"}</span>
              </div>
            </section>

            <section>
              <div className="mb-3"><h2 className="text-sm font-semibold">Transcript</h2><p className="mt-1 text-xs text-muted-foreground">Meet audio is mixed; participant names are not inferred without reliable diarization.</p></div>
              {meeting.transcript.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center"><FileText className="mb-3 size-5 text-muted-foreground" /><p className="text-sm font-medium">No transcript yet</p><p className="mt-1 text-xs text-muted-foreground">Segments appear here while the LiveKit voice agent is active.</p></div>
              ) : (
                <div className="divide-y rounded-lg border">
                  {meeting.transcript.map((segment) => (
                    <div key={segment.id} className="grid gap-2 p-4 sm:grid-cols-[130px_1fr]">
                      <div><p className="text-xs font-medium">{segment.speakerType === "agent" ? "Huzlr Scrum Master" : "Participant"}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Date(segment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div>
                      <p className="text-sm leading-6">{segment.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {(typeof meeting.outputs.summary === "string" || Array.isArray(meeting.outputs.action_items)) && (
              <section className="grid gap-5 border-t pt-6 md:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center gap-2"><FileText className="size-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Summary</h2></div>
                  <div className="min-h-28 rounded-lg border p-4 text-sm leading-6 text-muted-foreground">{typeof meeting.outputs.summary === "string" ? meeting.outputs.summary : "No summary was generated."}</div>
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-2"><ListChecks className="size-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Action items</h2></div>
                  <div className="divide-y rounded-lg border">
                    {Array.isArray(meeting.outputs.action_items) && meeting.outputs.action_items.length > 0 ? meeting.outputs.action_items.map((item, index) => {
                      const action = item as { title?: string; owner?: string | null; due_date?: string | null }
                      return <div key={`${action.title}-${index}`} className="flex gap-3 p-4"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div><p className="text-sm">{action.title || "Untitled action"}</p><p className="mt-1 text-xs text-muted-foreground">{[action.owner, action.due_date].filter(Boolean).join(" | ") || "Owner and due date not confirmed"}</p></div></div>
                    }) : <p className="p-4 text-sm text-muted-foreground">No action items were identified.</p>}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  )
}
