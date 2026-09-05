import Image from "next/image"
import {
  ArrowRight,
  CalendarCheck,
  CircleAlert,
  FileCheck2,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { TrackedLink } from "@/components/tracked-link"

const workflowSteps = [
  {
    label: "Standup captured",
    detail: "Updates become shared context",
    icon: CalendarCheck,
  },
  {
    label: "Blocker surfaced",
    detail: "Risks reach the right owner",
    icon: CircleAlert,
  },
  {
    label: "Human review",
    detail: "Your team confirms the record",
    icon: UserRoundCheck,
  },
  {
    label: "Action assigned",
    detail: "The next move is clear",
    icon: FileCheck2,
  },
]

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-hairline px-4 pb-10 pt-28 text-ink sm:px-6 sm:pb-14 sm:pt-32 lg:px-8 xl:min-h-[840px] xl:pb-8 xl:pt-36">
      <NoiseTexture className="absolute inset-0 -z-20 opacity-15 mask-[radial-gradient(720px_circle_at_78%_32%,white,transparent)]" />
      <div className="absolute inset-x-0 top-0 -z-20 h-[78%] bg-[radial-gradient(circle_at_78%_26%,color-mix(in_oklab,var(--clay)_14%,transparent),transparent_40%)]" />
      <div className="absolute -right-32 top-28 -z-10 size-[520px] rounded-full border border-clay/10" />
      <div className="absolute -right-12 top-48 -z-10 size-[340px] rounded-full border border-clay/10" />

      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 xl:grid-cols-[0.82fr_1.18fr] xl:gap-16">
        <div className="relative z-10 max-w-2xl xl:py-10">
          <div className="animate-appear inline-flex items-center gap-2 rounded-full border border-clay/20 bg-clay/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay motion-reduce:animate-none">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-clay opacity-50 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-clay" />
            </span>
            Private beta · Engineering teams
          </div>

          <h1 className="mt-7 animate-appear font-serif text-[clamp(3.15rem,5.2vw,5.45rem)] font-normal leading-[0.98] tracking-[-0.055em] text-balance motion-reduce:animate-none">
            Know what humansand AI<em className="italic text-clay">should do next.</em>
          </h1>

          <p className="mt-7 max-w-xl animate-appear text-base leading-relaxed text-ink/70 opacity-0 [animation-delay:120ms] sm:text-lg motion-reduce:animate-none motion-reduce:opacity-100">
            huzlr connects project work with live Google Meet standups, surfaces blockers,
            and prepares next actions for human reviewso delivery keeps moving without status chasing.
          </p>

          <div className="mt-8 flex animate-appear flex-col gap-3 opacity-0 [animation-delay:220ms] sm:flex-row sm:items-center motion-reduce:animate-none motion-reduce:opacity-100">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-clay px-7 text-sm font-medium text-white shadow-[0_12px_30px_-12px_color-mix(in_oklab,var(--clay)_70%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-clay-deep dark:text-paper"
            >
              <TrackedLink
                href="/signup"
                eventName="CTA Click"
                eventProperties={{ location: "hero", destination: "/signup", label: "Join the private beta" }}
              >
                Join the private beta
                <ArrowRight className="size-4" aria-hidden="true" />
              </TrackedLink>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-hairline bg-paper/60 px-7 text-sm text-ink/75 shadow-none backdrop-blur-sm hover:bg-sand hover:text-ink"
            >
              <TrackedLink
                href="#how-it-works"
                eventName="CTA Click"
                eventProperties={{ location: "hero", destination: "#how-it-works", label: "See the workflow" }}
              >
                See the workflow
              </TrackedLink>
            </Button>
          </div>

          <div className="mt-7 flex animate-appear items-start gap-3 text-[13px] leading-relaxed text-ink/65 opacity-0 [animation-delay:320ms] sm:items-center motion-reduce:animate-none motion-reduce:opacity-100">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay">
              <ShieldCheck className="size-4" strokeWidth={2.25} aria-hidden="true" />
            </span>
            <span>
              Human-reviewed outputs <span aria-hidden="true">·</span> No credit card required
            </span>
          </div>
        </div>

        <figure className="animate-appear overflow-hidden rounded-[1.75rem] border border-hairline bg-paper opacity-0 shadow-[0_36px_90px_-34px_rgba(22,53,156,0.55)] [animation-delay:300ms] xl:-mr-24 motion-reduce:animate-none motion-reduce:opacity-100">
          <div className="relative aspect-[1672/941] overflow-hidden bg-[#071f7c]">
            <Image
              src="/aiworkers.png"
              alt="People and AI workers coordinating around one shared delivery plan"
              fill
              priority
              sizes="(max-width: 1279px) calc(100vw - 2rem), 62vw"
              className="object-cover object-center"
            />
          </div>
          <figcaption className="flex flex-col gap-1.5 border-t border-hairline bg-paper/95 px-5 py-3.5 text-xs text-ink/65 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="font-medium text-ink/80">One shared delivery picture</span>
            <span>Project context, meeting signals, and next actions</span>
          </figcaption>
        </figure>
      </div>

      <div className="mx-auto mt-12 grid max-w-[1440px] overflow-hidden rounded-2xl border border-hairline bg-paper/65 backdrop-blur-sm md:grid-cols-2 xl:mt-10 xl:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div className="flex items-center px-5 py-5 md:col-span-2 xl:col-span-1 xl:px-6">
          <p className="max-w-[230px] font-serif text-lg leading-snug text-ink/80">
            From live standup to an approved next move.
          </p>
        </div>
        {workflowSteps.map(({ label, detail, icon: Icon }, index) => (
          <div
            key={label}
            className={`flex items-start gap-3 border-t border-hairline px-5 py-4 xl:border-l xl:border-t-0 ${index % 2 === 1 ? "md:border-l" : ""}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-clay/10 text-clay">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink/80">{label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink/65">{detail}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
