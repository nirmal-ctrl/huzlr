import {
  ArrowRight,
  CalendarCheck,
  Check,
  CircleAlert,
  FileCheck2,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { TrackedLink } from "@/components/tracked-link"

const stages = [
  { short: "Connect", full: "Connect the work" },
  { short: "Capture", full: "Capture the signal" },
  { short: "Review", full: "Review the next move" },
]

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-hairline bg-paper px-3 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8 lg:pt-32">
      <div
        className="pointer-events-none absolute -right-48 -top-48 -z-10 size-[42rem] rounded-full bg-clay/20 blur-[110px] dark:bg-clay/15"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-56 -left-52 -z-10 size-[42rem] rounded-full bg-clay-deep/20 blur-[120px] dark:bg-clay-deep/15"
        aria-hidden="true"
      />
      <NoiseTexture className="pointer-events-none absolute inset-0 -z-10 opacity-[0.09]" />

      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b1527] text-white shadow-[0_40px_110px_-45px_rgba(20,54,108,0.65)] sm:rounded-[2rem]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_50%_-40%,rgba(78,130,225,0.23),transparent_70%)]"
          aria-hidden="true"
        />
        <div className="relative px-4 pb-5 pt-14 sm:px-8 sm:pb-8 sm:pt-16 lg:px-12 lg:pb-9 lg:pt-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <p className="animate-appear text-[10px] font-semibold uppercase tracking-[0.23em] text-[#9abaff] motion-reduce:animate-none">
              The coordination layer for modern teams
            </p>

            <h1 className="mt-5 animate-appear font-serif text-[clamp(2.7rem,5vw,4.5rem)] font-medium leading-[0.99] tracking-[-0.07em] text-balance motion-reduce:animate-none">
              Every project signal.
              <span className="mt-1 block">
                One clear <em className="font-normal italic text-[#9abaff]">next move.</em>
              </span>
            </h1>

            <p className="mt-5 max-w-[38rem] animate-appear text-sm leading-relaxed text-white/65 opacity-0 [animation-delay:100ms] sm:text-base motion-reduce:animate-none motion-reduce:opacity-100">
              Huzlr connects project work with live standups, surfaces blockers, and turns scattered
              context into human-reviewed actions your team can trust.
            </p>

            <div className="mt-7 flex w-full animate-appear flex-col justify-center gap-3 opacity-0 [animation-delay:180ms] sm:w-auto sm:flex-row motion-reduce:animate-none motion-reduce:opacity-100">
              <Button
                asChild
                size="lg"
                className="group h-11 rounded-full border-0 bg-clay px-6 text-sm font-medium text-white shadow-[0_12px_30px_-12px_rgba(79,131,230,0.7)] transition-all hover:-translate-y-0.5 hover:bg-clay-deep dark:text-white"
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
                className="h-11 rounded-full border-white/20 bg-white/5 px-6 text-sm text-white/85 hover:border-white/40 hover:bg-white/10 hover:text-white"
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
          </div>

          <ol className="mx-auto mb-5 mt-10 flex max-w-2xl items-center justify-center gap-x-1 text-[11px] text-white/60 sm:mb-6 sm:gap-x-4 sm:text-xs">
            {stages.map((stage, index) => (
              <li key={stage.full} className="flex items-center gap-2 sm:gap-4">
                <span className={index === 0 ? "rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-white" : "px-2 py-1.5"}>
                  <span className="sm:hidden">{stage.short}</span>
                  <span className="hidden sm:inline">{stage.full}</span>
                </span>
                {index < stages.length - 1 && <span className="text-white/25" aria-hidden="true">/</span>}
              </li>
            ))}
          </ol>

          <div className="grid gap-3 lg:grid-cols-6 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-4">
            <article className="group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-2xl border border-[#84aefd]/20 bg-[#112b51] p-6 sm:p-8 lg:col-span-2 lg:row-span-2 lg:min-h-[396px]">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_12%,rgba(99,155,255,0.75),transparent_42%),linear-gradient(155deg,#1c4a8a_4%,#152e57_48%,#0d1a30_100%)] transition-transform duration-700 group-hover:scale-105"
                aria-hidden="true"
              />
              <div className="pointer-events-none absolute -right-14 -top-20 size-72 rounded-full border border-white/20 sm:size-96" aria-hidden="true" />
              <div className="pointer-events-none absolute -right-2 -top-10 size-56 rounded-full border border-white/20 sm:size-72" aria-hidden="true" />
              <div className="pointer-events-none absolute right-9 top-12 size-32 rounded-full border border-white/20 sm:size-44" aria-hidden="true" />
              <span className="absolute left-6 top-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 sm:left-8 sm:top-8">
                A shared view of delivery
              </span>
              <div className="relative">
                <span className="mb-5 flex size-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-[#b8ceff] backdrop-blur-sm">
                  <Check className="size-5" strokeWidth={2.4} aria-hidden="true" />
                </span>
                <h2 className="font-serif text-[clamp(1.75rem,2.7vw,2.35rem)] leading-[1.1] tracking-[-0.045em] text-white">
                  Know what needs attention next.
                </h2>
                <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-white/75">
                  One place for project context, delivery signals, and the decisions that move work forward.
                </p>
              </div>
            </article>

            <article className="flex min-h-[190px] flex-col rounded-2xl border border-white/[0.07] bg-white/[0.055] p-6 transition-colors hover:bg-white/[0.075] sm:p-7 lg:col-span-2">
              <CalendarCheck className="size-7 text-[#a9c5ff]" strokeWidth={1.6} aria-hidden="true" />
              <div className="mt-auto pt-7">
                <h2 className="font-serif text-xl tracking-[-0.035em] text-white sm:text-2xl">Standups, captured</h2>
                <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/60">
                  Bring meeting decisions, blockers, and action items into the project record.
                </p>
              </div>
            </article>

            <article className="flex min-h-[190px] flex-col rounded-2xl border border-white/[0.07] bg-white/[0.055] p-6 transition-colors hover:bg-white/[0.075] sm:p-7 lg:col-span-2">
              <CircleAlert className="size-7 text-[#a9c5ff]" strokeWidth={1.6} aria-hidden="true" />
              <div className="mt-auto pt-7">
                <h2 className="font-serif text-xl tracking-[-0.035em] text-white sm:text-2xl">Blockers, surfaced</h2>
                <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/60">
                  See the risks hiding across conversations and project work before they drift.
                </p>
              </div>
            </article>

            <article className="relative flex min-h-[190px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.055] p-6 transition-colors hover:bg-white/[0.075] sm:p-7 lg:col-span-4">
              <div className="pointer-events-none absolute -right-10 top-1/2 hidden h-px w-[45%] -rotate-12 bg-gradient-to-r from-[#729ef2]/50 to-transparent lg:block" aria-hidden="true" />
              <FileCheck2 className="relative size-7 text-[#a9c5ff]" strokeWidth={1.6} aria-hidden="true" />
              <div className="relative mt-auto pt-7">
                <h2 className="font-serif text-xl tracking-[-0.035em] text-white sm:text-2xl">Actions, ready for review</h2>
                <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-white/60">
                  Turn scattered context into proposed next steps, with people confirming what becomes a delivery fact.
                </p>
              </div>
            </article>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-white/60 sm:mt-8">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-[#9abaff]" aria-hidden="true" />
              Human-reviewed outputs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-[#9abaff]" aria-hidden="true" />
              No credit card required
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
