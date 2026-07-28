import { Radar, MessagesSquare, HeartPulse, Eye } from "lucide-react"

export function Benefits() {
  const benefits = [
    {
      title: "Risks surface early",
      desc: "Dependencies, drifting scope, and stalled work are flagged while there's still time to act — not at the retrospective.",
      icon: Radar,
    },
    {
      title: "Standups run themselves",
      desc: "Huzlr collects updates asynchronously, follows up on blockers, and summarizes what actually matters.",
      icon: MessagesSquare,
    },
    {
      title: "Teams stay healthy",
      desc: "Workload imbalances and morale dips are detected early, so leads can support people before burnout sets in.",
      icon: HeartPulse,
    },
    {
      title: "One honest picture",
      desc: "A living view of delivery health across every project — no stale dashboards, no manual status chasing.",
      icon: Eye,
    },
  ]

  return (
    <section className="relative py-24 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-hairline overflow-hidden">
      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-clay">
            Why teams choose huzlr
          </p>
          <h2 className="mt-4 font-serif text-4xl sm:text-5xl tracking-tight text-ink text-balance">
            Less managing. <em className="italic text-clay">More shipping.</em>
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-ink/60">
            Huzlr takes on the coordination work that slows teams down, so
            yours can spend its energy on the work itself.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div
                key={benefit.title}
                className="group rounded-2xl border border-hairline bg-sand/40 p-7 transition-colors duration-300 hover:bg-sand/70"
              >
                <div className="w-10 h-10 rounded-full bg-clay/10 text-clay flex items-center justify-center">
                  <Icon size={18} strokeWidth={2} />
                </div>
                <h3 className="mt-5 font-serif text-2xl tracking-tight text-ink">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  {benefit.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
