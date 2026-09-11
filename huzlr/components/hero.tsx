import Image from "next/image"
import {
  ArrowRight,
  CalendarCheck,
  Check,
  CircleAlert,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { TrackedLink } from "@/components/tracked-link"

const workflowSteps = [
  {
    label: "Standup captured",
    detail: "Shared context",
    icon: CalendarCheck,
  },
  {
    label: "Blocker surfaced",
    detail: "Right owner notified",
    icon: CircleAlert,
  },
  {
    label: "Human review",
    detail: "Team stays in control",
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
    <section className="relative isolate overflow-clip border-b border-hairline px-4 pb-14 pt-28 text-ink sm:px-6 sm:pb-20 sm:pt-32 lg:px-8 lg:pt-36">
      <div
        className="absolute inset-0 -z-30 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--paper)_94%,var(--clay))_0%,var(--paper)_58%,var(--paper)_100%)]"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-[-22rem] -z-20 h-[46rem] w-[68rem] max-w-[130vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(circle_at_center,var(--clay),transparent_68%)] opacity-[0.22] blur-[90px] dark:opacity-[0.28]"
        aria-hidden="true"
      />
      <div
        className="absolute -left-28 top-[31rem] -z-20 size-[28rem] rounded-full bg-clay/10 blur-[100px] dark:bg-clay/15"
        aria-hidden="true"
      />
      <div
        className="absolute -right-40 top-[25rem] -z-20 size-[34rem] rounded-full bg-clay-deep/10 blur-[110px] dark:bg-clay-deep/15"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[44rem] opacity-[0.28] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--ink)_10%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--ink)_10%,transparent)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_70%_62%_at_50%_20%,black,transparent)]"
        aria-hidden="true"
      />
      <NoiseTexture className="absolute inset-0 -z-10 opacity-[0.08] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />

      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="animate-appear inline-flex items-center gap-2 rounded-full border border-clay/20 bg-paper/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay shadow-[0_8px_30px_-12px_color-mix(in_oklab,var(--clay)_35%,transparent)] backdrop-blur-xl">
            The coordination layer for modern teams
          </div>

          <h1 className="mt-7 animate-appear font-serif text-[clamp(3rem,7.2vw,6.75rem)] font-normal leading-[0.91] tracking-[-0.065em] text-balance motion-reduce:animate-none">
            Every project signal.
            <span className="mt-1 block bg-gradient-to-r from-clay-deep to-clay bg-clip-text pb-[0.08em] text-transparent">
              One clear next move.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl animate-appear text-base leading-relaxed text-ink/68 opacity-0 [animation-delay:120ms] sm:text-lg sm:leading-relaxed motion-reduce:animate-none motion-reduce:opacity-100">
            Huzlr connects project work with live standups, surfaces blockers, and turns scattered
            context into human-reviewed actions your team can trust.
          </p>

          <div className="mt-8 flex w-full animate-appear flex-col justify-center gap-3 opacity-0 [animation-delay:220ms] sm:w-auto sm:flex-row sm:items-center motion-reduce:animate-none motion-reduce:opacity-100">
            <Button
              asChild
              size="lg"
              className="group h-12 rounded-full border-0 bg-clay px-7 text-sm font-medium text-white shadow-[0_16px_40px_-14px_color-mix(in_oklab,var(--clay)_65%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-clay-deep dark:text-white"
            >
              <TrackedLink
                href="/signup"
                eventName="CTA Click"
                eventProperties={{ location: "hero", destination: "/signup", label: "Join the private beta" }}
              >
                Join the private beta
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </TrackedLink>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-hairline bg-paper/60 px-7 text-sm text-ink/75 shadow-[0_8px_30px_-18px_color-mix(in_oklab,var(--ink)_35%,transparent)] backdrop-blur-xl hover:bg-sand hover:text-ink"
            >
              <TrackedLink
                href="#how-it-works"
                eventName="CTA Click"
                eventProperties={{ location: "hero", destination: "#how-it-works", label: "See how it works" }}
              >
                See how it works
              </TrackedLink>
            </Button>
          </div>

          <div className="mt-6 flex animate-appear flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink/55 opacity-0 [animation-delay:320ms] motion-reduce:animate-none motion-reduce:opacity-100">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
              Human-reviewed outputs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-500" aria-hidden="true" />
              No credit card required
            </span>
          </div>
        </div>

        <div className="relative mx-auto mt-14 w-full animate-appear opacity-0 [animation-delay:360ms] sm:mt-16 motion-reduce:animate-none motion-reduce:opacity-100">
          <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-clay/15 blur-2xl sm:-inset-8" aria-hidden="true" />

          <figure className="relative w-full overflow-hidden rounded-[1.5rem] border border-clay/25 bg-paper/60 shadow-[0_45px_100px_-38px_color-mix(in_oklab,var(--clay)_58%,transparent)] sm:rounded-[2rem]">
            <div className="overflow-hidden bg-ink">
              <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[1672/941]">
                <Image
                  src="/aiworkers.png"
                  alt="People and AI workers coordinating around one shared delivery plan"
                  fill
                  priority
                  sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(100vw - 3rem), 1280px"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_58%,rgba(3,12,46,0.54)_100%)]" aria-hidden="true" />

                <div className="absolute left-4 top-4 hidden items-center gap-3 rounded-2xl border border-paper/20 bg-ink/80 px-4 py-3 text-paper shadow-2xl backdrop-blur-xl md:flex lg:left-7 lg:top-7">
                  <span className="relative flex size-9 items-center justify-center rounded-xl bg-emerald-400 text-[#052437]">
                    <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                    <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-ink bg-emerald-300" />
                  </span>
                  <span>
                    <span className="block text-xs text-paper/55">Delivery health</span>
                    <span className="mt-0.5 block text-sm font-semibold">All systems moving</span>
                  </span>
                </div>

                <div className="absolute bottom-4 right-4 hidden w-[15rem] rounded-2xl border border-hairline bg-paper/90 p-4 text-ink shadow-2xl backdrop-blur-xl md:block lg:bottom-7 lg:right-7">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Coordination score</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">+12%</span>
                  </div>
                  <div className="mt-3 flex items-end gap-3">
                    <span className="font-serif text-4xl font-semibold tracking-[-0.06em]">92</span>
                    <div className="mb-1 h-2 flex-1 overflow-hidden rounded-full bg-sand">
                      <div className="h-full w-[92%] rounded-full bg-clay" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </figure>
        </div>

        <div className="relative z-10 mx-auto -mt-px grid w-[calc(100%-1rem)] overflow-hidden rounded-b-2xl border border-t-0 border-hairline bg-paper/72 shadow-[0_20px_60px_-34px_color-mix(in_oklab,var(--ink)_35%,transparent)] backdrop-blur-xl sm:w-[calc(100%-3rem)] sm:grid-cols-2 xl:w-[calc(100%-6rem)] xl:grid-cols-4">
          {workflowSteps.map(({ label, detail, icon: Icon }, index) => (
            <div
              key={label}
              className={`group flex items-center gap-3 px-4 py-4 sm:px-5 ${index > 0 ? "border-t border-ink/8 sm:border-t-0" : ""} ${index % 2 === 1 ? "sm:border-l" : ""} ${index === 2 ? "sm:border-t xl:border-l xl:border-t-0" : ""}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-clay/10 text-clay transition-transform group-hover:scale-105">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink/80">{label}</span>
                <span className="mt-0.5 block text-[11px] text-ink/50">{detail}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
