import { Radar, Bot, Network, Eye } from "lucide-react"

export function Benefits() {
  const benefits = [
    {
      title: "Risks surface early",
      desc: "Dependencies, drifting scope, and stalled work are connected to their real impact while there is still time to act.",
      icon: Radar,
    },
    {
      title: "AI workers stay aligned",
      desc: "Agents receive current priorities, constraints, and context instead of operating from an outdated prompt or isolated task.",
      icon: Bot,
    },
    {
      title: "Handoffs keep moving",
      desc: "Huzlr follows up across people, agents, and tools so ownership does not disappear between systems.",
      icon: Network,
    },
    {
      title: "One operating picture",
      desc: "Decisions, execution, and outcomes remain connected without another dashboard to maintain or status meeting to schedule.",
      icon: Eye,
    },
  ]

  return (
    <section className="relative py-24 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-hairline overflow-hidden">
      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-clay">
            The management harness
          </p>
          <h2 className="mt-4 font-serif text-4xl sm:text-5xl tracking-tight text-ink text-balance">
            More capacity. <em className="italic text-clay">Less coordination overhead.</em>
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-ink/60">
            Huzlr provides the alignment, prioritization, accountability, and follow-through
            a hybrid team needs to execute as one organization.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div
                key={benefit.title}
                className="group rounded-lg border border-hairline bg-sand/40 p-7 transition-colors duration-300 hover:bg-sand/70"
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
