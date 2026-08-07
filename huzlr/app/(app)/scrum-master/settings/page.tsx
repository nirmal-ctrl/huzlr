"use client"

import { useEffect, useState } from "react"
import { Bot, CalendarCheck, FileText, ListChecks, Loader2, Save, ScrollText } from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector } from "@/lib/redux/hooks"
import {
  ScrumMasterSettings,
  useGetScrumMasterSettingsQuery,
  useUpdateScrumMasterSettingsMutation,
} from "@/services/scrumMasterApi"

export default function ScrumMasterSettingsPage() {
  const { toast } = useToast()
  const workspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
  const settingsQuery = useGetScrumMasterSettingsQuery(workspaceId ?? 0, { skip: !workspaceId })
  const [updateSettings, updateState] = useUpdateScrumMasterSettingsMutation()
  const [draft, setDraft] = useState<ScrumMasterSettings | null>(null)

  useEffect(() => {
    if (settingsQuery.data) setDraft(settingsQuery.data)
  }, [settingsQuery.data])

  const updateSetting = <K extends keyof ScrumMasterSettings>(key: K, value: ScrumMasterSettings[K]) => {
    if (draft) setDraft({ ...draft, [key]: value })
  }

  const save = async () => {
    if (!workspaceId || !draft) return
    try {
      const saved = await updateSettings({ workspaceId, settings: draft }).unwrap()
      setDraft(saved)
      toast({ title: "Scrum Master settings saved", description: "New meetings will use these policies." })
    } catch (error) {
      const description = typeof error === "object" && error && "data" in error
        ? (error as { data?: { detail?: string } }).data?.detail
        : undefined
      toast({ variant: "destructive", title: "Could not save settings", description: description || "The backend rejected the request." })
    }
  }

  const toggles = [
    { key: "autoJoin" as const, title: "Auto-join eligible meetings", description: "Schedule the bot automatically after calendar sync.", icon: CalendarCheck },
    { key: "joinOnlyOrganized" as const, title: "Only meetings the bot account organizes", description: "Exclude events organized by another account.", icon: Bot },
    { key: "requireScrumTag" as const, title: "Require [scrum] in the title", description: "Limit auto-join to explicitly tagged meetings.", icon: ListChecks },
  ]
  const outputs = [
    { key: "transcriptEnabled" as const, title: "Transcript", description: "Keep a searchable meeting transcript when the agent adapter is enabled.", icon: ScrollText },
    { key: "summaryEnabled" as const, title: "Summary", description: "Generate a concise meeting recap.", icon: FileText },
    { key: "actionItemsEnabled" as const, title: "Action items", description: "Extract owners and due dates from decisions.", icon: ListChecks },
  ]

  return (
    <>
      <SiteHeader>
        <Button size="sm" className="h-8 gap-2" onClick={save} disabled={!draft || updateState.isLoading}>
          {updateState.isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save changes
        </Button>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-5 lg:px-6">
        <section className="border-b pb-5"><h1 className="text-base font-semibold">Scrum Master settings</h1><p className="mt-1 text-sm text-muted-foreground">Control the bot identity, join policy, and meeting outputs.</p></section>

        {!workspaceId ? (
          <Message title="Select a workspace" description="Scrum Master settings belong to the active workspace." />
        ) : settingsQuery.isLoading ? (
          <div className="flex min-h-52 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : settingsQuery.isError || !draft ? (
          <Message title="Could not load settings" description="Check the backend connection and your workspace permissions." />
        ) : (
          <>
            <section className="grid gap-5 md:grid-cols-[220px_1fr]">
              <div><h2 className="text-sm font-semibold">Bot identity</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">This name is visible to everyone in the meeting.</p></div>
              <div className="grid gap-4 rounded-lg border p-4">
                <div><Label htmlFor="bot-name" className="text-xs">Display name</Label><Input id="bot-name" className="mt-2 max-w-md" value={draft.botName} onChange={(event) => updateSetting("botName", event.target.value)} /></div>
                <div><Label htmlFor="bot-email" className="text-xs">Dedicated Google account email</Label><Input id="bot-email" type="email" className="mt-2 max-w-md" placeholder="scrum-master@company.com" value={draft.botAccountEmail || ""} onChange={(event) => updateSetting("botAccountEmail", event.target.value)} /><p className="mt-1.5 text-xs text-muted-foreground">Auto-join only applies when this account is invited to the event.</p></div>
              </div>
            </section>

            <section className="grid gap-5 border-t pt-7 md:grid-cols-[220px_1fr]">
              <div><h2 className="text-sm font-semibold">Join policy</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Auto-join remains off until you explicitly enable it.</p></div>
              <div className="divide-y rounded-lg border">
                {toggles.map(({ key, ...item }) => <SettingToggle key={key} {...item} checked={draft[key]} onCheckedChange={(checked) => updateSetting(key, checked)} />)}
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <NumberSetting id="join-buffer" label="Join buffer" suffix="minutes early" value={draft.joinBufferMinutes} min={0} max={15} onChange={(value) => updateSetting("joinBufferMinutes", value)} />
                  <NumberSetting id="max-duration" label="Maximum duration" suffix="minutes" value={draft.maxMeetingMinutes} min={15} max={240} onChange={(value) => updateSetting("maxMeetingMinutes", value)} />
                </div>
              </div>
            </section>

            <section className="grid gap-5 border-t pt-7 md:grid-cols-[220px_1fr]">
              <div><h2 className="text-sm font-semibold">Meeting outputs</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose what the agent creates after each meeting.</p></div>
              <div className="divide-y rounded-lg border">{outputs.map(({ key, ...item }) => <SettingToggle key={key} {...item} checked={draft[key]} onCheckedChange={(checked) => updateSetting(key, checked)} />)}</div>
            </section>
          </>
        )}
      </main>
    </>
  )
}

function SettingToggle({ title, description, icon: Icon, checked, onCheckedChange }: { title: string; description: string; icon: typeof Bot; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-center gap-4 p-4"><div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"><Icon className="size-4 text-muted-foreground" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} /></div>
}

function NumberSetting({ id, label, suffix, value, min, max, onChange }: { id: string; label: string; suffix: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div><Label htmlFor={id} className="text-xs">{label}</Label><div className="mt-2 flex items-center gap-2"><Input id={id} type="number" className="w-20" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /><span className="text-xs text-muted-foreground">{suffix}</span></div></div>
}

function Message({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center"><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
}
