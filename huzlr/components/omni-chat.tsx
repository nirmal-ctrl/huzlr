"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowUp,
  Loader2,
  Mic,
  Plus,
  Presentation,
  Search,
  SlidersHorizontal,
  Sparkles,
  Table2,
  WandSparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useAppSelector } from "@/lib/redux/hooks"
import { ProjectContextPicker } from "@/components/project-context-picker"
import { ContextActionPreview } from "@/components/context-action-preview"
import { contextError, useContextChatMutation, useRememberContextMutation, type ContextSession, type ContextAnswer } from "@/services/contextApi"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  context?: ContextAnswer
}

const quickActions = [
  { label: "Create slides", icon: Presentation, prompt: "Help me create a slide deck about " },
  { label: "Spreadsheets", icon: Table2, prompt: "Help me build a spreadsheet for " },
  { label: "Research", icon: Search, prompt: "Research and summarize " },
  { label: "Visualize", icon: WandSparkles, prompt: "Help me visualize " },
]

type LogoProps = { className?: string }

const SlackLogo = ({ className }: LogoProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#36C5F0" d="M6 9.8a2.4 2.4 0 1 1 0-4.8h2.4v2.4A2.4 2.4 0 0 1 6 9.8Zm1.2-6A2.4 2.4 0 1 1 12 3.8v6H9.6a2.4 2.4 0 0 1-2.4-2.4V3.8Z" />
    <path fill="#2EB67D" d="M14.2 6a2.4 2.4 0 1 1 4.8 0v2.4h-2.4A2.4 2.4 0 0 1 14.2 6Zm6 1.2a2.4 2.4 0 1 1 0 4.8h-6V9.6a2.4 2.4 0 0 1 2.4-2.4h3.6Z" />
    <path fill="#ECB22E" d="M18 14.2a2.4 2.4 0 1 1 0 4.8h-2.4v-2.4a2.4 2.4 0 0 1 2.4-2.4Zm-1.2 6a2.4 2.4 0 1 1-4.8 0v-6h2.4a2.4 2.4 0 0 1 2.4 2.4v3.6Z" />
    <path fill="#E01E5A" d="M9.8 18A2.4 2.4 0 1 1 5 18v-2.4h2.4A2.4 2.4 0 0 1 9.8 18Zm-6-1.2a2.4 2.4 0 1 1 0-4.8h6v2.4a2.4 2.4 0 0 1-2.4 2.4H3.8Z" />
  </svg>
)

const GitHubLogo = ({ className }: LogoProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.97 10.97 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
  </svg>
)

const GoogleLogo = ({ className }: LogoProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.25c1.9-1.75 2.97-4.34 2.97-7.39Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.25-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.03v2.61A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.47H3.03A10 10 0 0 0 2 12c0 1.61.39 3.14 1.03 4.53l3.36-2.61Z" />
    <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.97 5.47l3.36 2.61C7.18 7.71 9.39 5.95 12 5.95Z" />
  </svg>
)

const MicrosoftLogo = ({ className }: LogoProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
    <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
    <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
    <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
  </svg>
)

const JiraLogo = ({ className }: LogoProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="#2684FF" aria-hidden="true">
    <path d="M11.53 16.22v5.03H6.5V11.19l5.03 5.03Zm0-10.06v5.03H6.5V6.16h5.03ZM12.73 1.14v5.02h5.03l-5.03-5.02Zm0 9.28 5.03 5.03h-5.03v-5.03Zm5.83-2.68v5.03h5.03V7.74h-5.03Z" />
  </svg>
)

const appLogos = [
  { name: "Slack", icon: SlackLogo },
  { name: "GitHub", icon: GitHubLogo },
  { name: "Google", icon: GoogleLogo },
  { name: "Microsoft", icon: MicrosoftLogo },
  { name: "Jira", icon: JiraLogo },
]

export function OmniChat() {
  const workspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
  const contextUserId = useAppSelector((state) => state.auth.user?.id)
  const [contextSession, setContextSession] = useState<ContextSession | null>(null)
  const [contextLabels, setContextLabels] = useState<string[]>([])
  const [contextChat] = useContextChatMutation()
  const [rememberContext, { isLoading: remembering }] = useRememberContextMutation()
  const [rememberProject, setRememberProject] = useState("")
  const scopeVersion = useRef(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAppContext, setShowAppContext] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scopeVersion.current += 1
    setContextSession(null)
    setContextLabels([])
    setMessages([])
    setError(null)
    setIsResponding(false)
    setRememberProject("")
  }, [workspaceId, contextUserId])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, isResponding])

  const sendMessage = async () => {
    const content = input.trim()
    if (!content || isResponding) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput("")
    setError(null)
    setIsResponding(true)
    const version = scopeVersion.current

    try {
      if (contextSession) {
        const data = await contextChat({ session_id: contextSession.id, message: content }).unwrap()
        if (scopeVersion.current !== version) return
        setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: data.message, context: data }])
        return
      }
      const response = await fetch("/api/omni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        }),
      })
      const data = await response.json()
      if (scopeVersion.current !== version) return

      if (!response.ok) {
        throw new Error(data.error || "Omni could not respond")
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
        },
      ])
    } catch (requestError) {
      if (scopeVersion.current === version) setError(requestError instanceof Error ? requestError.message : contextError(requestError))
    } finally {
      if (scopeVersion.current === version) setIsResponding(false)
    }
  }

  const useQuickAction = (prompt: string) => {
    setInput(prompt)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(prompt.length, prompt.length)
    })
  }

  const renderComposer = (withExtras = false) => (
    <div className="w-full">
      {contextSession && <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {contextLabels.map((label, i) => <span key={contextSession.project_ids[i]} className="rounded-full bg-muted px-3 py-1">{label}</span>)}
        <button type="button" disabled={isResponding} aria-label="Clear project context" onClick={() => {
          scopeVersion.current += 1; setContextSession(null); setContextLabels([]); setMessages([]); setError(null)
        }}>Clear context</button>
      </div>}
      <div className="relative z-10 w-full rounded-[24px] border-2 border-primary bg-card/95 p-2 shadow-xl shadow-primary/10 transition-shadow focus-within:shadow-primary/20">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              void sendMessage()
            }
          }}
          placeholder="Do anything with AI..."
          aria-label="Message Omni"
          rows={3}
          className="max-h-48 min-h-20 resize-none border-0 bg-transparent px-4 py-3 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="flex items-center gap-1">
            <ProjectContextPicker key={workspaceId} workspaceId={workspaceId} disabled={isResponding}
              onSelect={(session, labels) => {
                scopeVersion.current += 1; setContextSession(session); setContextLabels(labels); setMessages([]); setError(null)
              }} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Omni settings"
              title="Omni settings coming soon"
              className="size-8 rounded-full text-muted-foreground disabled:opacity-70"
            >
              <SlidersHorizontal className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-1 text-xs font-medium text-muted-foreground">Auto</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Use voice input"
              title="Voice input coming soon"
              className="size-8 rounded-full text-muted-foreground disabled:opacity-70"
            >
              <Mic className="size-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isResponding}
              aria-label="Send message"
              className="size-8 rounded-full"
            >
              {isResponding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {contextSession && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <select aria-label="Project to remember information in" value={rememberProject} onChange={(event) => setRememberProject(event.target.value)}
          className="max-w-52 rounded border bg-background px-2 py-1">
          <option value="">Remember draft in project…</option>
          {contextSession.project_ids.map((id, i) => <option key={id} value={id}>{contextLabels[i]}</option>)}
        </select>
        <Button type="button" size="sm" variant="ghost" disabled={!rememberProject || !input.trim() || remembering}
          onClick={async () => {
            const version = scopeVersion.current
            try {
              await rememberContext({ id: crypto.randomUUID(), project_id: Number(rememberProject), text: input.trim() }).unwrap()
              if (scopeVersion.current === version) { setInput(""); setError(null) }
            } catch (e) { if (scopeVersion.current === version) setError(contextError(e)) }
          }}>{remembering ? "Saving…" : "Remember"}</Button>
        <span>New information is indexed in the background.</span>
      </div>}

      {withExtras && showAppContext && (
        <div className="mx-1 -mt-1 flex min-h-12 items-center justify-between gap-3 rounded-b-2xl border border-t-0 border-border bg-muted/70 px-4 pb-2 pt-3">
          <span className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
            Get better answers from your apps
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 min-[420px]:flex">
              {appLogos.map((app) => {
                const Logo = app.icon

                return (
                  <span
                    key={app.name}
                    className="flex size-7 items-center justify-center rounded-md bg-background shadow-sm ring-1 ring-border/70"
                    title={app.name}
                  >
                    <Logo className="size-5" />
                    <span className="sr-only">{app.name}</span>
                  </span>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowAppContext(false)}
              aria-label="Dismiss app suggestions"
              className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {withExtras && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon

            return (
              <button
                key={action.label}
                type="button"
                onClick={() => useQuickAction(action.prompt)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4" />
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-[8vh]">
        <div className="flex w-full max-w-3xl flex-col items-center gap-7">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg shadow-ink/10">
              <Sparkles className="size-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
              How can I help you today?
            </h1>
          </div>
          {renderComposer(true)}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto px-1 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap text-sm leading-6",
                message.role === "user"
                  ? "rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground"
                  : "px-1 py-1 text-foreground",
              )}
            >
              {message.content}
              {message.context && <>
                {message.context.freshness.some((p) => p.pending || !p.indexed_at) && <p className="mt-2 text-xs text-muted-foreground">Some project context is still being indexed.</p>}
                {message.context.sources.length > 0 && <ol className="mt-2 list-inside list-decimal text-xs text-muted-foreground">
                  {message.context.sources.map((source, i) => <li key={`${source.canonical_id}-${i}`}>
                    <a className="underline" href={source.path}>{source.title}</a> · Project {source.project_id}
                    {source.status === "proposed" && " · Unconfirmed"}
                  </li>)}
                </ol>}
                {message.context.action && <ContextActionPreview action={message.context.action} />}
              </>}
            </div>
          </div>
        ))}
        {isResponding && (
          <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Omni is thinking...
          </div>
        )}
      </div>
      <div className="shrink-0 pt-4">
        {renderComposer()}
        {error && <p className="mt-2 px-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
