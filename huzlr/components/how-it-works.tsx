import { ArrowRight, CalendarCheck, FileCheck2, FolderKanban, ListChecks } from "lucide-react"
import { TrackedLink } from "@/components/tracked-link"

const steps = [
  {
    number: "01",
    icon: FolderKanban,
    title: "Organize delivery context",
    description:
      "Keep projects, issues, milestones, documents, and team context in one workspace.",
  },
  {
    number: "02",
    icon: CalendarCheck,
    title: "Connect eligible meetings",
    description:
      "Sync Google Calendar and choose which Google Meet events the identified AI participant may join.",
  },
  {
    number: "03",
    icon: FileCheck2,
    title: "Create a reviewable record",
    description:
      "Retain enabled summaries, decisions, blockers, transcripts, and proposed action items after the meeting.",
  },
  {
    number: "04",
    icon: ListChecks,
    title: "Confirm the next move",
    description:
      "Review owners, dates, risks, and wording before an output becomes a delivery fact or external update.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-hairline py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">
            How huzlr works
          </p>
          <h2 className="mt-4 font-serif text-4xl tracking-tight text-ink text-balance sm:text-5xl">
            Work moves before someone asks <em className="italic text-clay">for an update.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
            huzlr connects project records with controlled Google Meet workflows, then keeps generated
            outputs visible for human review before the team acts.
          </p>
        </div>

        <div className="mt-16 grid border-y border-hairline sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ number, icon: Icon, title, description }, index) => (
            <div
              key={number}
              className={`relative py-8 sm:px-6 lg:px-7 ${index > 0 ? "border-t border-hairline sm:border-t-0 sm:border-l" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t lg:border-l lg:border-t-0" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-clay/10 text-clay">
                  <Icon size={17} />
                </div>
                <span className="font-serif text-sm text-ink/30">{number}</span>
              </div>
              <h3 className="mt-6 font-serif text-2xl text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/55">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-7 border-t border-hairline pt-10 md:flex-row">
          <div className="max-w-2xl text-center md:text-left">
            <h3 className="font-serif text-3xl text-ink">Start with delivery. Build the operating memory.</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink/55 sm:text-base">
              Huzlr begins where coordination is most visible: product delivery. Over time, it becomes the shared management context for the hybrid organization.
            </p>
          </div>
          <TrackedLink
            href="/how-it-works"
            eventName="CTA Click"
            eventProperties={{ location: "how_it_works", destination: "how-it-works", label: "See how huzlr works" }}
            className="group flex shrink-0 items-center gap-2 rounded-full bg-clay px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
          >
            See how huzlr works
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </TrackedLink>
        </div>
      </div>
    </section>
  )
}
