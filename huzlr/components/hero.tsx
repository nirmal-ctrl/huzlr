import Image from "next/image"
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  Check,
  CircleAlert,
  FileCheck2,
  FolderKanban,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { TrackedLink } from "@/components/tracked-link"

const coordinationAreas = [
  { label: "Project work", icon: FolderKanban },
  { label: "Meet standups", icon: CalendarCheck },
  { label: "Blockers", icon: CircleAlert },
  { label: "Next actions", icon: FileCheck2 },
]

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-hairline px-4 pb-10 pt-28 text-ink sm:px-6 sm:pb-14 sm:pt-32 lg:min-h-[860px] lg:px-8 lg:pb-8 lg:pt-36">
      <NoiseTexture className="absolute inset-0 -z-20 opacity-15 mask-[radial-gradient(720px_circle_at_78%_32%,white,transparent)]" />
      <div className="absolute inset-x-0 top-0 -z-20 h-[78%] bg-[radial-gradient(circle_at_78%_26%,color-mix(in_oklab,var(--clay)_14%,transparent),transparent_40%)]" />
      <div className="absolute -right-32 top-28 -z-10 size-[520px] rounded-full border border-clay/10" />
      <div className="absolute -right-12 top-48 -z-10 size-[340px] rounded-full border border-clay/10" />

      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-10 xl:gap-16">
        <div className="relative z-10 max-w-2xl lg:py-10">
          <div className="animate-appear inline-flex items-center gap-2 rounded-full border border-clay/20 bg-clay/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-clay opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-clay" />
            </span>
            Private beta for AI-native teams
          </div>

          <h1 className="mt-7 animate-appear font-serif text-[clamp(3.35rem,5.5vw,5.75rem)] font-normal leading-[0.98] tracking-[-0.055em] text-balance">
            Keep humans and AI moving as <em className="italic text-clay">one team.</em>
          </h1>

          <p className="mt-7 max-w-xl animate-appear text-base leading-relaxed text-ink/60 opacity-0 [animation-delay:120ms] sm:text-lg">
            huzlr coordinates project work, live standups, blockers, status updates, and reviewable next actions—so your team always knows what should happen next.
          </p>

          <div className="mt-8 flex animate-appear flex-col gap-3 opacity-0 [animation-delay:220ms] sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-clay px-7 text-sm font-medium text-white shadow-[0_12px_30px_-12px_color-mix(in_oklab,var(--clay)_70%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-clay-deep"
            >
              <TrackedLink
                href="/signup"
                eventName="CTA Click"
                eventProperties={{ location: "hero", destination: "/signup", label: "Join the waitlist" }}
              >
                Join the waitlist
                <ArrowRight className="size-4" />
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
                eventProperties={{ location: "hero", destination: "#how-it-works", label: "See how it works" }}
              >
                See how it works
              </TrackedLink>
            </Button>
          </div>

          <div className="mt-7 flex animate-appear items-center gap-3 text-xs text-ink/50 opacity-0 [animation-delay:320ms]">
            <span className="flex size-6 items-center justify-center rounded-full bg-clay/10 text-clay">
              <Check className="size-3.5" strokeWidth={2.5} />
            </span>
            Human-reviewed actions. Your team stays in control.
          </div>
        </div>

        <div className="relative min-h-[480px] animate-appear opacity-0 [animation-delay:300ms] sm:min-h-[590px] lg:min-h-[650px]">
          <div className="absolute inset-3 overflow-hidden rounded-[2rem] border border-white/10 bg-[#071f7c] shadow-[0_36px_90px_-34px_rgba(22,53,156,0.65)] sm:inset-6 lg:-right-24 lg:left-0">
            <Image
              src="/aiworkrs.png"
              alt="People and AI workers coordinating projects across connected tools"
              fill
              priority
              sizes="(max-width: 1024px) 94vw, 65vw"
              className="object-cover object-right lg:origin-right lg:scale-[1.3]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061654]/75 via-transparent to-[#09258c]/10" />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#06144f] to-transparent" />
          </div>

          <div className="absolute left-0 top-0 flex items-center gap-2 rounded-full border border-hairline bg-paper/95 px-4 py-2.5 text-xs font-medium text-ink shadow-lg shadow-ink/10 backdrop-blur-xl sm:left-2 sm:top-8">
            <Sparkles className="size-4 text-clay" />
            Coordination, continuously updated
          </div>

          <div className="absolute bottom-0 left-0 w-[min(310px,76%)] rounded-2xl border border-hairline bg-paper/95 p-4 shadow-2xl shadow-ink/15 backdrop-blur-xl sm:bottom-8 sm:left-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-clay">Ready for review</p>
                <p className="mt-1.5 font-serif text-xl leading-tight text-ink">Today&apos;s standup summary</p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-clay/10 text-clay">
                <Bot className="size-4" />
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3 text-xs text-ink/50">
              <span>5 updates · 2 next actions</span>
              <span className="font-medium text-clay">Review →</span>
            </div>
          </div>

          <div className="absolute right-0 top-20 hidden w-60 rounded-2xl border border-white/15 bg-[#071d70]/85 p-4 text-white shadow-2xl shadow-blue-950/30 backdrop-blur-xl sm:block lg:-right-5 lg:top-16">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-200">
              <CircleAlert className="size-3.5" />
              Blocker surfaced
            </div>
            <p className="mt-2 text-sm font-medium leading-snug">API handoff needs an owner before Thursday.</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-3/4 rounded-full bg-blue-300" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-[1440px] overflow-hidden rounded-2xl border border-hairline bg-paper/55 backdrop-blur-sm sm:grid-cols-2 lg:mt-8 lg:grid-cols-[1.25fr_repeat(4,1fr)]">
        <div className="flex items-center px-5 py-4 sm:col-span-2 lg:col-span-1 lg:px-6">
          <p className="max-w-[210px] font-serif text-lg leading-snug text-ink/75">
            One operating picture for all the work in motion.
          </p>
        </div>
        {coordinationAreas.map(({ label, icon: Icon }, index) => (
          <div
            key={label}
            className={`flex items-center gap-3 border-t border-hairline px-5 py-4 lg:border-l lg:border-t-0 ${index % 2 === 1 ? "sm:border-l" : ""}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-clay/10 text-clay">
              <Icon className="size-4" />
            </span>
            <span className="text-xs font-medium text-ink/65">{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
