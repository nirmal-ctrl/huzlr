import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CircleDot,
  GitPullRequest,
  MessageSquare,
  UserRound,
} from "lucide-react"

const actions = [
  {
    icon: Bot,
    actor: "AI worker",
    action: "Update the migration plan",
    detail: "Assigned with project context",
    status: "Working",
  },
  {
    icon: UserRound,
    actor: "Nirmal",
    action: "Approve the revised launch scope",
    detail: "Decision requested",
    status: "Review",
  },
  {
    icon: GitPullRequest,
    actor: "GitHub",
    action: "Track the blocking pull request",
    detail: "Linked to launch dependency",
    status: "Watching",
  },
]

export function CoordinationPreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-paper text-left">
      <div className="flex items-center justify-between border-b border-hairline bg-sand/50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-clay text-white">
            <CircleDot size={14} />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink">Launch coordination</p>
            <p className="text-[10px] text-ink/45">Huzlr is monitoring execution</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-ink/50">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live
        </div>
      </div>

      <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
        <div className="border-b border-hairline p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-clay">
            Change detected
          </p>
          <div className="mt-4 flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
              <AlertTriangle size={17} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Authentication work is now blocking beta launch
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-ink/55">
                Huzlr connected the delayed pull request to the launch milestone,
                two dependent tasks, and an AI worker&apos;s active plan.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white/50 px-2.5 py-1.5 text-[10px] text-ink/60 dark:bg-white/[0.03]">
              <MessageSquare size={11} /> Slack
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white/50 px-2.5 py-1.5 text-[10px] text-ink/60 dark:bg-white/[0.03]">
              <GitPullRequest size={11} /> GitHub
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white/50 px-2.5 py-1.5 text-[10px] text-ink/60 dark:bg-white/[0.03]">
              <CircleDot size={11} /> Jira
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-clay">
                Response orchestrated
              </p>
              <p className="mt-1 text-xs text-ink/50">3 actions across the organization</p>
            </div>
            <div className="hidden items-center gap-1 text-[10px] font-medium text-emerald-600 sm:flex">
              <Check size={12} /> Context aligned
            </div>
          </div>

          <div className="mt-4 divide-y divide-hairline border-y border-hairline">
            {actions.map(({ icon: Icon, actor, action, detail, status }) => (
              <div key={actor} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sand text-clay">
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink">{action}</p>
                  <p className="mt-0.5 truncate text-[10px] text-ink/45">
                    {actor} · {detail}
                  </p>
                </div>
                <span className="rounded-md border border-hairline px-2 py-1 text-[9px] font-medium text-ink/55">
                  {status}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-ink/45">
            <span>Next check in 20 minutes</span>
            <span className="flex items-center gap-1 font-medium text-clay">
              View decision <ArrowRight size={11} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
