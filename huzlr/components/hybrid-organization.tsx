import { Bot, Boxes, UsersRound } from "lucide-react"

const participants = [
  {
    icon: UsersRound,
    label: "Humans",
    title: "Set direction and make judgment calls",
    description: "Leaders and teams stay focused on the decisions where human context matters most.",
  },
  {
    icon: Bot,
    label: "AI workers",
    title: "Execute with shared context",
    description: "Agents receive clear priorities, constraints, ownership, and the context needed to act.",
  },
  {
    icon: Boxes,
    label: "Systems",
    title: "Become one operating picture",
    description: "Projects, conversations, documents, meetings, and code remain connected as work changes.",
  },
]

export function HybridOrganization() {
  return (
    <section id="why-huzlr" className="border-t border-hairline py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">
              Your team has changed
            </p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight text-ink text-balance sm:text-5xl">
              Organizations are no longer <em className="italic text-clay">only human.</em>
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg lg:pb-1">
            AI adds capacity, but it also adds handoffs, decisions, context, and work to supervise.
            The tools built to track human tasks were never designed to coordinate a hybrid workforce.
          </p>
        </div>

        <div className="mt-14 grid border-y border-hairline md:grid-cols-3">
          {participants.map(({ icon: Icon, label, title, description }, index) => (
            <div
              key={label}
              className={`py-8 md:px-8 ${index > 0 ? "border-t border-hairline md:border-l md:border-t-0" : ""}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-clay/10 text-clay">
                <Icon size={18} />
              </div>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay">
                {label}
              </p>
              <h3 className="mt-2 font-serif text-2xl text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/55">{description}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center font-serif text-xl text-ink/70 sm:text-2xl">
          More intelligence needs a better way to coordinate it.
        </p>
      </div>
    </section>
  )
}
