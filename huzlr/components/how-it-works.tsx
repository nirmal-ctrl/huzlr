import { ArrowRight } from "lucide-react"

import { TrackedLink } from "@/components/tracked-link"

const steps = [
  { number: "01", verb: "Connect", description: "Projects, milestones, meetings, and documents.", visual: "connect" },
  { number: "02", verb: "Capture", description: "Decisions, blockers, and changes as they happen.", visual: "capture" },
  { number: "03", verb: "Structure", description: "Impact, ownership, and proposed next actions.", visual: "structure" },
  { number: "04", verb: "Move", description: "Human-reviewed work with a clear owner.", visual: "move" },
] as const

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-paper px-5 py-24 sm:py-32 md:px-8">
      <div className="mx-auto max-w-[1344px]">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">How Huzlr works</p>
          <h2 className="mt-5 font-serif text-[clamp(3rem,5.8vw,5.5rem)] font-medium leading-[0.96] tracking-[-0.07em] text-balance">
            From scattered activity to a clear next move.
          </h2>
        </div>

        <div className="mt-16 grid overflow-hidden rounded-2xl border border-hairline bg-paper sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <article key={step.number} className={`${index > 0 ? "border-t border-hairline sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0" : ""}`}>
              <div className={`flex aspect-[4/3] items-center justify-center p-8 ${index === 3 ? "bg-clay text-white" : "bg-sand text-ink"}`}>
                <WorkflowVisual type={step.visual} />
              </div>
              <div className="min-h-48 p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <p className="font-serif text-2xl tracking-[-0.04em]">{step.verb}</p>
                  <span className="font-mono text-[10px] text-ink/30">{step.number}</span>
                </div>
                <p className="mt-8 max-w-xs text-sm leading-relaxed text-ink/50">{step.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col justify-between gap-6 border-t border-hairline pt-8 sm:flex-row sm:items-center">
          <p className="max-w-xl font-serif text-2xl leading-snug tracking-[-0.035em] text-ink/75">
            Every approved action strengthens the context behind the next one.
          </p>
          <TrackedLink
            href="/how-it-works"
            eventName="CTA Click"
            eventProperties={{ location: "how_it_works", destination: "how-it-works", label: "Explore the workflow" }}
            className="group inline-flex shrink-0 items-center gap-2 border-b border-ink/30 pb-1 text-sm font-medium text-ink transition-colors hover:border-clay hover:text-clay"
          >
            Explore the workflow
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </TrackedLink>
        </div>
      </div>
    </section>
  )
}

function WorkflowVisual({ type }: { type: (typeof steps)[number]["visual"] }) {
  if (type === "connect") {
    return (
      <svg viewBox="0 0 180 130" className="w-full max-w-52" fill="none" aria-hidden="true">
        <path d="M38 25H76C91 25 92 61 108 61H143M38 65H143M38 105H76C91 105 92 69 108 69H143" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
        <rect x="17" y="14" width="22" height="22" stroke="currentColor" /><rect x="17" y="54" width="22" height="22" stroke="currentColor" /><rect x="17" y="94" width="22" height="22" stroke="currentColor" />
        <circle cx="146" cy="65" r="15" fill="currentColor" /><circle cx="90" cy="65" r="3" fill="currentColor" />
      </svg>
    )
  }

  if (type === "capture") {
    return (
      <svg viewBox="0 0 180 130" className="w-full max-w-52" fill="none" aria-hidden="true">
        <path d="M12 66H29L38 38L50 94L63 54L73 76L84 27L96 102L108 58L119 73L130 45L141 85L151 66H168" stroke="currentColor" strokeWidth="1.5" />
        <path d="M84 16V114" stroke="currentColor" strokeOpacity=".25" strokeDasharray="3 4" />
        <circle cx="84" cy="27" r="5" fill="currentColor" /><circle cx="84" cy="102" r="5" fill="currentColor" />
      </svg>
    )
  }

  if (type === "structure") {
    return (
      <svg viewBox="0 0 180 130" className="w-full max-w-52" fill="none" aria-hidden="true">
        <rect x="14" y="16" width="48" height="38" stroke="currentColor" /><rect x="70" y="16" width="96" height="38" fill="currentColor" fillOpacity=".12" stroke="currentColor" />
        <rect x="14" y="64" width="96" height="50" fill="currentColor" fillOpacity=".12" stroke="currentColor" /><rect x="118" y="64" width="48" height="50" stroke="currentColor" />
        <path d="M28 33H49M84 33H145M28 81H91M28 95H72M132 82H153" stroke="currentColor" strokeOpacity=".55" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 180 130" className="w-full max-w-52" fill="none" aria-hidden="true">
      <path d="M17 99H56C76 99 72 35 95 35H150" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.5" />
      <circle cx="17" cy="99" r="8" stroke="currentColor" /><circle cx="56" cy="99" r="5" fill="currentColor" /><circle cx="95" cy="35" r="5" fill="currentColor" />
      <path d="M137 22L150 35L137 48" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17 15V115M17 115H164" stroke="currentColor" strokeOpacity=".2" />
    </svg>
  )
}
