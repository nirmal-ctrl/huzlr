"use client"

import {
  Bot, CalendarDays, ChevronLeft, ChevronRight, Clock3, ExternalLink, History, Link2, Loader2,
  Plus, RefreshCw, ScrollText, ShieldAlert, Trash2, Users, Video, VideoOff,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector } from "@/lib/redux/hooks"
import {
  MeetingStatus,
  useCancelMeetingBotMutation,
  useConnectGoogleCalendarMutation,
  useDisconnectGoogleCalendarMutation,
  useGetCalendarStatusQuery,
  useGetScrumMeetingsQuery,
  useJoinMeetingBotMutation,
  useScheduleMeetingBotMutation,
  useSyncGoogleCalendarMutation,
} from "@/services/scrumMasterApi"
import Link from "next/link"

const statusLabels: Record<MeetingStatus, string> = {
  not_scheduled: "Not scheduled",
  scheduled: "Scheduled",
  queued: "Queued",
  starting: "Starting",
  authenticating: "Authenticating",
  waiting_for_admission: "Waiting for admission",
  joined: "Joined",
  leaving: "Leaving",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
}

const statusStyles: Record<MeetingStatus, string> = {
  not_scheduled: "border-border bg-background text-muted-foreground",
  scheduled: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  queued: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  starting: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  authenticating: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  waiting_for_admission: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  joined: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  leaving: "border-border bg-muted text-muted-foreground",
  completed: "border-border bg-muted text-muted-foreground",
  failed: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  cancelled: "border-border bg-muted text-muted-foreground",
}

const formatMeetingDate = (startsAt: string, endsAt: string) => {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const date = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(start)
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" })
  return `${date} | ${time.format(start)}-${time.format(end)}`
}

const errorDetail = (error: unknown) => {
  if (typeof error === "object" && error && "data" in error) {
    const data = (error as { data?: { detail?: string } }).data
    if (data?.detail) return data.detail
  }
  return "The request could not be completed."
}

export default function ScrumMasterMeetingsPage() {
  const { toast } = useToast()
  const workspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
  const [upcomingPageNumber, setUpcomingPageNumber] = useState(1)
  const [historyPageNumber, setHistoryPageNumber] = useState(1)
  const [calendarNeedsReconnect, setCalendarNeedsReconnect] = useState(false)
  const upcomingQuery = useGetScrumMeetingsQuery(
    { workspaceId: workspaceId ?? 0, page: upcomingPageNumber, pageSize: 20, view: "upcoming" },
    { skip: !workspaceId, pollingInterval: 5000 },
  )
  const historyQuery = useGetScrumMeetingsQuery(
    { workspaceId: workspaceId ?? 0, page: historyPageNumber, pageSize: 20, view: "history" },
    { skip: !workspaceId, pollingInterval: 5000 },
  )
  const calendarQuery = useGetCalendarStatusQuery(workspaceId ?? 0, { skip: !workspaceId })
  const [connectCalendar, connectState] = useConnectGoogleCalendarMutation()
  const [disconnectCalendar, disconnectState] = useDisconnectGoogleCalendarMutation()
  const [syncCalendar, syncState] = useSyncGoogleCalendarMutation()
  const [scheduleBot, scheduleState] = useScheduleMeetingBotMutation()
  const [joinBot, joinState] = useJoinMeetingBotMutation()
  const [cancelBot, cancelState] = useCancelMeetingBotMutation()

  const upcomingPage = upcomingQuery.data
  const upcomingMeetings = upcomingPage?.items ?? []
  const historyPage = historyQuery.data
  const historyMeetings = historyPage?.items ?? []
  const calendar = calendarQuery.data
  const actionPending = scheduleState.isLoading || joinState.isLoading || cancelState.isLoading

  useEffect(() => {
    setUpcomingPageNumber(1)
    setHistoryPageNumber(1)
    setCalendarNeedsReconnect(false)
  }, [workspaceId])

  useEffect(() => {
    if (upcomingPage && upcomingPageNumber > upcomingPage.totalPages) setUpcomingPageNumber(upcomingPage.totalPages)
  }, [upcomingPage, upcomingPageNumber])

  useEffect(() => {
    if (historyPage && historyPageNumber > historyPage.totalPages) setHistoryPageNumber(historyPage.totalPages)
  }, [historyPage, historyPageNumber])

  const run = async (action: () => Promise<unknown>, title: string) => {
    try {
      await action()
      toast({ title })
    } catch (error) {
      toast({ variant: "destructive", title: "Scrum Master request failed", description: errorDetail(error) })
    }
  }

  const redirectToCalendarAuthorization = useCallback(async () => {
    if (!workspaceId) return
    try {
      const response = await connectCalendar(workspaceId).unwrap()
      window.location.assign(response.authorization_url)
    } catch (error) {
      toast({ variant: "destructive", title: "Could not connect Google Calendar", description: errorDetail(error) })
    }
  }, [connectCalendar, toast, workspaceId])

  useEffect(() => {
    if (!workspaceId || !calendar) return
    setCalendarNeedsReconnect(calendar.requiresReconnect)

    const reconnectKey = `calendar-reconnect-attempted:${workspaceId}`
    if (!calendar.requiresReconnect) {
      sessionStorage.removeItem(reconnectKey)
      return
    }
    if (!calendar.canManage || connectState.isLoading || sessionStorage.getItem(reconnectKey)) return

    sessionStorage.setItem(reconnectKey, "true")
    void redirectToCalendarAuthorization()
  }, [calendar, connectState.isLoading, redirectToCalendarAuthorization, workspaceId])

  const handleConnectCalendar = async () => {
    if (calendar && !calendar.canManage) {
      toast({
        variant: "destructive",
        title: "Workspace admin required",
        description: "Only a workspace admin can connect or reconnect Google Calendar.",
      })
      return
    }
    await redirectToCalendarAuthorization()
  }

  const handleSyncCalendar = async () => {
    if (!workspaceId) return

    try {
      await syncCalendar(workspaceId).unwrap()
      setCalendarNeedsReconnect(false)
      toast({ title: "Calendar synced" })
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error
        ? (error as { status?: number }).status
        : undefined
      const needsReconnect = status === 409
      setCalendarNeedsReconnect(needsReconnect)
      if (needsReconnect && calendar?.canManage) {
        toast({ title: "Google Calendar authorization expired", description: "Redirecting to reconnect…" })
        await redirectToCalendarAuthorization()
        return
      }
      toast({
        variant: "destructive",
        title: needsReconnect ? "Ask a workspace admin to reconnect Google Calendar" : "Calendar sync failed",
        description: errorDetail(error),
      })
    }
  }

  return (
    <>
      <SiteHeader>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          disabled={!workspaceId || !calendar?.connected || syncState.isLoading}
          onClick={handleSyncCalendar}
        >
          <RefreshCw className={`size-3.5 ${syncState.isLoading ? "animate-spin" : ""}`} /> Sync
        </Button>
      </SiteHeader>
      <main className="flex flex-1 flex-col gap-6 px-4 py-5 lg:px-6">
        <section className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-base font-semibold">Scrum Master</h1>
            <p className="mt-1 text-sm text-muted-foreground">Schedule and control the meeting bot from one place.</p>
          </div>
          <Button
            variant="outline"
            disabled={!workspaceId || connectState.isLoading || disconnectState.isLoading || (calendar ? !calendar.canManage : false)}
            onClick={handleConnectCalendar}
            className="w-fit gap-2"
            title={calendar && !calendar.canManage ? "Only workspace admins can manage calendar connections" : undefined}
          >
            {connectState.isLoading ? <Loader2 className="size-4 animate-spin" /> : calendar && !calendar.canManage ? <ShieldAlert className="size-4" /> : <Plus className="size-4" />}
            {calendar && !calendar.canManage ? "Admin access required" : calendarNeedsReconnect ? "Reconnect Google Calendar" : "Add Google Calendar"}
          </Button>
        </section>

        {!workspaceId ? (
          <EmptyState title="Select a workspace" description="Scrum Master settings and meetings belong to a workspace." />
        ) : upcomingQuery.isLoading || historyQuery.isLoading || calendarQuery.isLoading ? (
          <div className="flex min-h-52 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : upcomingQuery.isError || historyQuery.isError || calendarQuery.isError ? (
          <EmptyState title="Could not load Scrum Master" description="Check that the backend is running and your workspace access is valid." />
        ) : (
          <>
            {calendar?.connected && (
              <section className="overflow-hidden rounded-lg border">
                <div className="border-b bg-muted/30 px-4 py-3">
                  <h2 className="text-sm font-semibold">Connected calendars</h2>
                </div>
                <div className="divide-y">
                  {calendar.connections.map((connection) => (
                    <div key={connection.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{connection.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {connection.requiresReconnect ? "Authorization expired · reconnect required" : connection.lastSyncedAt ? `Last synced ${new Date(connection.lastSyncedAt).toLocaleString()}` : "Authorization valid · not synced yet"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        title={`Disconnect ${connection.email}`}
                        aria-label={`Disconnect ${connection.email}`}
                        disabled={disconnectState.isLoading || !calendar.canManage}
                        onClick={() => workspaceId && run(
                          () => disconnectCalendar({ workspaceId, connectionId: connection.id }).unwrap(),
                          "Google Calendar disconnected",
                        )}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Upcoming meetings", value: upcomingPage?.total ?? 0, icon: CalendarDays },
                { label: "Meetings joined", value: historyPage?.total ?? 0, icon: History },
                { label: "Bot scheduled", value: upcomingPage?.botScheduledTotal ?? 0, icon: Bot },
                { label: "Calendars", value: calendar?.connections.length ?? 0, icon: Link2 },
              ].map((item) => (
                <div key={item.label} className="flex min-h-24 items-center gap-4 bg-background p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40"><item.icon className="size-4 text-muted-foreground" /></div>
                  <div><p className="text-lg font-semibold">{item.value}</p><p className="text-xs text-muted-foreground">{item.label}</p></div>
                </div>
              ))}
            </section>

            <Tabs defaultValue="upcoming">
              <TabsList>
                <TabsTrigger value="upcoming"><CalendarDays />Upcoming</TabsTrigger>
                <TabsTrigger value="history"><History />History</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-3">
                <div className="mb-3"><h2 className="text-sm font-semibold">Upcoming meetings</h2><p className="mt-1 text-xs text-muted-foreground">Worker status refreshes automatically while a bot is active.</p></div>
                {upcomingMeetings.length === 0 ? (
                  <EmptyState title="No calendar meetings" description={calendar?.connected ? "Sync Calendar to import upcoming Google Meet events." : "Connect Google Calendar to import meetings."} />
                ) : (
                  <div className="grid gap-3">
                    {upcomingMeetings.map((meeting) => {
                      const active = ["queued", "starting", "authenticating", "waiting_for_admission", "joined", "leaving"].includes(meeting.status)
                      return (
                        <Card key={meeting.id} className="gap-0 rounded-lg py-0 shadow-none">
                          <CardHeader className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2"><CardTitle className="truncate text-sm">{meeting.title}</CardTitle><Badge variant="outline" className={statusStyles[meeting.status]}>{statusLabels[meeting.status]}</Badge></div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{formatMeetingDate(meeting.startsAt, meeting.endsAt)}</span>
                                <span className="flex items-center gap-1.5"><Users className="size-3.5" />{meeting.attendees} attendees</span>
                                {meeting.organizer && <span>{meeting.organizer}</span>}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button variant="ghost" size="sm" asChild className="h-8"><Link href={`/scrum-master/meetings/${meeting.id}`}>View details</Link></Button>
                              {meeting.meetUrl && <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5"><a href={meeting.meetUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />Open Meet</a></Button>}
                              <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={!meeting.meetUrl || actionPending} onClick={() => run(() => meeting.botEnabled ? cancelBot(meeting.id).unwrap() : scheduleBot(meeting.id).unwrap(), meeting.botEnabled ? "Bot cancelled" : "Bot scheduled")}>
                                {meeting.botEnabled ? <VideoOff className="size-3.5" /> : <Video className="size-3.5" />}{meeting.botEnabled ? "Cancel bot" : "Schedule bot"}
                              </Button>
                              <Button size="sm" className="h-8 gap-1.5" disabled={!meeting.meetUrl || active || actionPending} onClick={() => run(() => joinBot(meeting.id).unwrap(), "Bot queued to join")}><Bot className="size-3.5" />{meeting.status === "joined" ? "Bot joined" : "Join now"}</Button>
                            </div>
                          </CardHeader>
                          {(!meeting.meetUrl || meeting.errorMessage) && <CardContent className="border-t px-4 py-3 text-xs text-muted-foreground">{meeting.errorMessage || "This event needs a Google Meet link before the bot can join."}</CardContent>}
                        </Card>
                      )
                    })}
                    {upcomingPage && <MeetingPagination page={upcomingPage.page} totalPages={upcomingPage.totalPages} total={upcomingPage.total} isFetching={upcomingQuery.isFetching} onPageChange={setUpcomingPageNumber} />}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-3">
                <div className="mb-3"><h2 className="text-sm font-semibold">Meeting history</h2><p className="mt-1 text-xs text-muted-foreground">Every meeting the bot successfully entered is kept here with its transcript and generated notes.</p></div>
                {historyMeetings.length === 0 ? (
                  <EmptyState title="No meeting history yet" description="A meeting will appear here as soon as the bot is admitted." />
                ) : (
                  <div className="grid gap-3">
                    {historyMeetings.map((meeting) => (
                      <Card key={meeting.id} className="gap-0 rounded-lg py-0 shadow-none">
                        <CardHeader className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2"><CardTitle className="truncate text-sm">{meeting.title}</CardTitle><Badge variant="outline" className={statusStyles[meeting.status]}>{statusLabels[meeting.status]}</Badge></div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5"><History className="size-3.5" />Joined {new Date(meeting.joinedAt ?? meeting.startsAt).toLocaleString()}</span>
                              <span className="flex items-center gap-1.5"><Users className="size-3.5" />{meeting.attendees} attendees</span>
                              {meeting.organizer && <span>{meeting.organizer}</span>}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild className="h-8 gap-1.5"><Link href={`/scrum-master/meetings/${meeting.id}`}><ScrollText className="size-3.5" />View transcript</Link></Button>
                        </CardHeader>
                        {meeting.errorMessage && <CardContent className="border-t px-4 py-3 text-xs text-muted-foreground">{meeting.errorMessage}</CardContent>}
                      </Card>
                    ))}
                    {historyPage && <MeetingPagination page={historyPage.page} totalPages={historyPage.totalPages} total={historyPage.total} isFetching={historyQuery.isFetching} onPageChange={setHistoryPageNumber} />}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center"><CalendarDays className="mb-3 size-5 text-muted-foreground" /><p className="text-sm font-medium">{title}</p><p className="mt-1 max-w-md text-xs text-muted-foreground">{description}</p></div>
}

function MeetingPagination({ page, totalPages, total, isFetching, onPageChange }: { page: number; totalPages: number; total: number; isFetching: boolean; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t pt-3">
      <p className="text-xs text-muted-foreground">Page {page} of {totalPages} · {total} meetings</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8" aria-label="Previous meetings page" disabled={page <= 1 || isFetching} onClick={() => onPageChange(Math.max(1, page - 1))}><ChevronLeft className="size-4" /></Button>
        <Button variant="outline" size="icon" className="size-8" aria-label="Next meetings page" disabled={page >= totalPages || isFetching} onClick={() => onPageChange(Math.min(totalPages, page + 1))}><ChevronRight className="size-4" /></Button>
      </div>
    </div>
  )
}
