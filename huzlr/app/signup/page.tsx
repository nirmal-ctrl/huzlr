import type { Metadata } from "next"
import { Bot, BrainCircuit, Network } from "lucide-react"

import { Logo } from "@/components/logo"
import { SignupForm } from "@/components/signup-form"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { NoiseTexture } from "@/components/ui/noise-texture"

export const metadata: Metadata = {
  title: "Join the Private Beta",
  description: "Create a huzlr workspace and request access to the private beta.",
  robots: { index: false, follow: false },
}

const capabilities = [
  {
    icon: Network,
    title: "One operating picture",
    description:
      "Projects, meetings, documents, conversations, and decisions stay connected as work changes.",
  },
  {
    icon: Bot,
    title: "AI workers in the workflow",
    description:
      "Deploy AI teammates into delivery, planning, and meetings with the context and guardrails to act safely.",
  },
  {
    icon: BrainCircuit,
    title: "Coordination that learns",
    description:
      "Huzlr detects change, understands the impact, coordinates the next move, and improves from execution.",
  },
]

const roadmap = [
  ["Now", "Coordinate product delivery"],
  ["Next", "Deploy specialized AI workers"],
  ["Future", "Run the hybrid organization"],
]

export default function SignupPage() {
  return (
    <main className="min-h-svh bg-paper text-ink antialiased">
      <div className="grid min-h-svh lg:grid-cols-[minmax(0,1.2fr)_minmax(25rem,0.8fr)]">
        <section className="relative flex min-h-[44rem] flex-col overflow-hidden border-b border-hairline bg-sand/45 px-6 py-6 sm:px-10 sm:py-8 lg:min-h-svh lg:border-b-0 lg:border-r xl:px-16">
          <NoiseTexture className="absolute inset-0 opacity-[0.06] dark:opacity-[0.035]" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-clay/15 blur-3xl dark:bg-clay/10"
          />

          <div className="relative z-10">
            <Logo size="lg" />
          </div>

          <div className="relative z-10 my-auto max-w-3xl py-16 lg:py-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-clay">
              The coordination layer for hybrid teams
            </p>
            <h1 className="mt-5 max-w-2xl font-serif text-4xl font-normal leading-[1.06] tracking-tight text-balance sm:text-5xl xl:text-6xl">
              Build a company where humans and{" "}
              <em className="font-serif italic text-clay">AI workers</em> execute as one.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
              Huzlr is the management harness for the next generation of organizationskeeping
              people, agents, and the systems they use aligned around the same goals and reality.
            </p>

            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline md:grid-cols-3">
              {capabilities.map(({ icon: Icon, title, description }) => (
                <article key={title} className="bg-paper/90 p-5 backdrop-blur-sm xl:p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay/10 text-clay">
                    <Icon size={17} />
                  </div>
                  <h2 className="mt-5 font-serif text-xl text-ink">{title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-ink/55 xl:text-sm">
                    {description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-hairline pt-6">
              {roadmap.map(([stage, goal], index) => (
                <div key={stage} className="flex items-center gap-2.5">
                  {index > 0 && <span className="hidden h-px w-5 bg-hairline sm:block" />}
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-clay">
                    {stage}
                  </span>
                  <span className="text-xs text-ink/55">{goal}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-[11px] text-ink/40">
            Private beta · Built for AI-native product teams
          </p>
        </section>

        <section className="relative flex min-h-[38rem] items-center justify-center bg-paper px-5 py-20 sm:px-10 lg:min-h-svh lg:px-12">
          <AnimatedThemeToggler className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-paper p-2 text-ink/60 shadow-sm transition-colors hover:bg-sand hover:text-ink sm:right-8 sm:top-8" />

          <div className="w-full max-w-sm">
            <SignupForm />
            <p className="mt-5 text-center text-[11px] leading-relaxed text-ink/40">
              Secure Google authentication · No credit card required
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
