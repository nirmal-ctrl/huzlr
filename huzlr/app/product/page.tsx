import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarCheck,
  CheckCircle2,
  FileChartColumn,
  Network,
  PanelsTopLeft,
} from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { TrackedLink } from "@/components/tracked-link"
import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { absoluteUrl, createMarketingMetadata, serializeJsonLd, siteConfig } from "@/lib/seo"

const description =
  "Explore huzlr's AI delivery coordination capabilities for projects, Google Meet standups, meeting outputs, Jira connection, status reporting, and risk signals."

export const metadata = createMarketingMetadata({
  title: "AI Delivery Coordination Product",
  description,
  path: "/product",
})

const capabilities = [
  {
    href: "/ai-scrum-master",
    icon: Bot,
    title: "AI Scrum Master",
    status: "Private beta",
    description: "A named AI participant for controlled Google Meet facilitation and reviewable meeting outputs.",
  },
  {
    href: "/automated-daily-standups",
    icon: CalendarCheck,
    title: "Automated daily standups",
    status: "Private beta",
    description: "Calendar-aware live standups with explicit join rules, transcripts, blockers, and proposed actions.",
  },
  {
    href: "/integrations/jira",
    icon: Network,
    title: "Jira connection",
    status: "Connection beta",
    description: "Atlassian OAuth and encrypted connection storage, with production import and write-back still in validation.",
  },
  {
    href: "/automated-project-status-reporting",
    icon: FileChartColumn,
    title: "Project status reporting",
    status: "Design-partner preview",
    description: "A review-first path from delivery context to a stakeholder update; scheduling and delivery are not generally available.",
  },
  {
    href: "/project-risk-detection",
    icon: AlertTriangle,
    title: "Project risk detection",
    status: "Design-partner preview",
    description: "Turn stated blockers into explainable risk signals; predictive cross-tool detection is not generally available.",
  },
]

const foundations = [
  {
    title: "Projects and issues",
    description: "Keep delivery work, properties, milestones, documents, and team context in one workspace.",
  },
  {
    title: "Meetings and outputs",
    description: "Connect eligible Google Meet events to transcripts, summaries, decisions, blockers, and proposed actions.",
  },
  {
    title: "Explicit controls",
    description: "Configure agent identity, prompts, join policies, duration, retained outputs, and human review boundaries.",
  },
]

export default function ProductPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "huzlr product",
        url: absoluteUrl("/product"),
        description,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
      },
      {
        "@type": "ItemList",
        itemListElement: capabilities.map((capability, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: capability.title,
          url: absoluteUrl(capability.href),
        })),
      },
    ],
  }

  return (
    <main className="bg-paper text-ink antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <Navigation />

      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 md:pb-28 md:pt-44">
        <NoiseTexture className="absolute inset-0 opacity-15 mask-[radial-gradient(500px_circle_at_center,white,transparent)]" />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">huzlr product</p>
          <h1 className="mx-auto mt-6 max-w-4xl font-serif text-5xl font-normal leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            One coordination layer for the work between <em className="italic text-clay">meetings and delivery.</em>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">{description}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-11 rounded-full bg-clay px-6 text-sm text-white hover:bg-clay-deep">
              <TrackedLink
                href="/signup"
                eventName="CTA Click"
                eventProperties={{ location: "product_hero", destination: "signup", label: "Join the private beta" }}
              >
                Join the private beta
                <ArrowRight className="size-4" />
              </TrackedLink>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-11 rounded-full px-6 text-sm text-ink/70 hover:bg-sand hover:text-ink">
              <TrackedLink
                href="#capabilities"
                eventName="CTA Click"
                eventProperties={{ location: "product_hero", destination: "capabilities", label: "Explore capabilities" }}
              >
                Explore capabilities
              </TrackedLink>
            </Button>
          </div>
        </div>
      </section>

      <section id="capabilities" className="scroll-mt-28 border-t border-hairline py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Capability map</p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">Start with what works today. Shape what comes next.</h2>
            <p className="mt-5 text-base leading-relaxed text-ink/60">
              Each page distinguishes implemented private-beta behavior from workflows still being validated with design partners.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {capabilities.map(({ href, icon: Icon, title, status, description: capabilityDescription }, index) => (
              <TrackedLink
                key={href}
                href={href}
                eventName="CTA Click"
                eventProperties={{ location: "product_capability_grid", destination: href, label: title }}
                className={`group rounded-3xl border border-hairline p-7 transition-colors hover:border-clay/35 hover:bg-sand/40 ${index === 0 ? "md:col-span-2 md:grid md:grid-cols-[1fr_1.2fr] md:items-center md:gap-12" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-clay/10 text-clay"><Icon size={19} /></span>
                    <span className="rounded-full border border-clay/20 bg-clay/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-clay">{status}</span>
                  </div>
                  <h3 className="mt-6 font-serif text-3xl">{title}</h3>
                </div>
                <div>
                  <p className="mt-3 text-sm leading-relaxed text-ink/60 md:text-base">{capabilityDescription}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-clay">
                    Explore capability <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline bg-sand/35 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <span className="flex size-10 items-center justify-center rounded-lg bg-clay/10 text-clay"><PanelsTopLeft size={19} /></span>
              <h2 className="mt-6 font-serif text-4xl tracking-tight sm:text-5xl">The current product foundation.</h2>
              <p className="mt-5 text-base leading-relaxed text-ink/60">
                huzlr already provides the workspace, meeting control plane, and reviewable outputs needed to test coordination workflows without claiming full autonomy.
              </p>
            </div>
            <div className="divide-y divide-hairline border-y border-hairline">
              {foundations.map((foundation) => (
                <article key={foundation.title} className="grid gap-3 py-7 sm:grid-cols-[0.7fr_1.3fr] sm:gap-10">
                  <h3 className="font-serif text-2xl">{foundation.title}</h3>
                  <p className="text-sm leading-relaxed text-ink/60 sm:text-base">{foundation.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-hairline px-6 py-24 text-center sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Private beta</p>
          <h2 className="mt-4 font-serif text-4xl tracking-tight text-balance sm:text-5xl">Build the coordination layer with real delivery constraints.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/60">
            Start with the implemented meeting and project workflows, then help validate the reporting, integration, and risk capabilities your team actually needs.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-11 rounded-full bg-clay px-6 text-sm text-white hover:bg-clay-deep">
              <TrackedLink
                href="/signup"
                eventName="CTA Click"
                eventProperties={{ location: "product_bottom", destination: "signup", label: "Request access" }}
              >
                Request access
                <ArrowRight className="size-4" />
              </TrackedLink>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full border-hairline bg-transparent px-6 text-sm">
              <TrackedLink
                href="/ai-scrum-master"
                eventName="CTA Click"
                eventProperties={{ location: "product_bottom", destination: "ai-scrum-master", label: "See AI Scrum Master" }}
              >
                See AI Scrum Master
              </TrackedLink>
            </Button>
          </div>
          <div className="mx-auto mt-8 flex max-w-xl items-start justify-center gap-2 text-left text-xs leading-relaxed text-ink/45">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-clay" />
            Every capability page states what is implemented, what is still a preview, and where human review remains required.
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
