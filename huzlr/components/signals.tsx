import {
  ArrowDown,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  MessageSquareMore,
  RefreshCw,
  UserRoundCheck,
} from "lucide-react"

const pullSteps = [
  { icon: LayoutDashboard, text: "Open every dashboard" },
  { icon: MessageSquareMore, text: "Chase people for updates" },
  { icon: RefreshCw, text: "Rebuild context by hand" },
  { icon: Clock3, text: "React after work has drifted" },
]

const pushSteps = [
  { icon: CheckCircle2, text: "Detect the change and its impact" },
  { icon: Bot, text: "Give AI workers current context" },
  { icon: UserRoundCheck, text: "Route decisions to the right human" },
  { icon: RefreshCw, text: "Follow execution through to outcome" },
]

export function Signals() {
  return (
    <section id="signals" className="border-t border-hairline py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">
            Coordination over noise
          </p>
          <h2 className="mt-4 font-serif text-4xl tracking-tight text-ink text-balance sm:text-5xl">
            From pull coordination to <em className="italic text-clay">push coordination.</em>
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
            Huzlr turns scattered activity into coordinated next steps across people,
            AI workers, and the systems where work already happens.
          </p>
        </div>

        <div className="mt-14 grid overflow-hidden rounded-lg border border-hairline lg:grid-cols-[1fr_auto_1fr]">
          <div className="bg-sand/35 p-7 sm:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
              Today · Pull coordination
            </p>
            <h3 className="mt-3 font-serif text-3xl text-ink">Humans carry the system.</h3>
            <div className="mt-7 divide-y divide-hairline border-y border-hairline">
              {pullSteps.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 py-4 text-sm text-ink/55">
                  <Icon size={16} className="shrink-0 text-ink/35" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center border-y border-hairline bg-paper px-5 py-4 lg:border-x lg:border-y-0">
            <ArrowRight size={18} className="hidden text-clay lg:block" />
            <ArrowDown size={18} className="text-clay lg:hidden" />
          </div>

          <div className="bg-paper p-7 sm:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clay">
              With huzlr · Push coordination
            </p>
            <h3 className="mt-3 font-serif text-3xl text-ink">The system carries the context.</h3>
            <div className="mt-7 divide-y divide-hairline border-y border-hairline">
              {pushSteps.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 py-4 text-sm font-medium text-ink/70">
                  <Icon size={16} className="shrink-0 text-clay" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-ink/50">
          Humans keep judgment. Huzlr carries the coordination load.
        </p>
      </div>
    </section>
  )
}
