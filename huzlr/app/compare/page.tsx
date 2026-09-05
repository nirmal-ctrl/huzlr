import { ArrowRight, Bot, GitCompareArrows, MessagesSquare, ShieldCheck } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { TrackedLink } from "@/components/tracked-link"
import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { absoluteUrl, createMarketingMetadata, serializeJsonLd, siteConfig } from "@/lib/seo"

const description =
  "Compare AI project manager, AI Scrum Master, standup automation, and delivery coordination workflows using explicit, fact-checked evaluation criteria."

export const metadata = createMarketingMetadata({
  title: "Compare AI Project Management Workflows",
  description,
  path: "/compare",
  keywords: [
    "AI project manager alternatives",
    "best AI project management tools",
    "AI Scrum Master alternatives",
    "best AI standup bot",
    "project management automation tools",
  ],
})

const criteria = [
  { icon: MessagesSquare, title: "Collection model", description: "Does the tool ask for async check-ins, join live meetings, read systems of record, or combine several inputs?" },
  { icon: Bot, title: "Action boundary", description: "Does it summarize, propose an action, or change project dataand where does human approval sit?" },
  { icon: ShieldCheck, title: "Evidence and controls", description: "Can a reviewer see the source, permissions, uncertainty, identity, and retained-output policy?" },
]

export default function ComparePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: "Compare AI Project Management Workflows", url: absoluteUrl("/compare"), description },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: "Compare", item: absoluteUrl("/compare") },
        ],
      },
    ],
  }

  return (
    <main className="bg-paper text-ink antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <Navigation />

      <section className="relative overflow-hidden border-b border-hairline px-4 pb-20 pt-36 text-center sm:px-6 md:pb-24 md:pt-44">
        <NoiseTexture className="absolute inset-0 opacity-15 mask-[radial-gradient(520px_circle_at_center,white,transparent)]" />
        <div className="relative mx-auto max-w-5xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Workflow comparisons</p>
          <h1 className="mx-auto mt-6 max-w-4xl font-serif text-5xl font-normal leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Compare AI project management by the <em className="italic text-clay">work it actually does.</em>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">{description}</p>
        </div>
      </section>

      <section className="py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <TrackedLink
              href="/compare/huzlr-vs-standup-bots"
              eventName="CTA Click"
              eventProperties={{ location: "compare_grid", destination: "/compare/huzlr-vs-standup-bots", label: "huzlr vs standup bots" }}
              className="group rounded-3xl border border-hairline bg-ink p-8 text-paper transition-transform hover:-translate-y-0.5 sm:p-10"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-paper/10"><GitCompareArrows size={20} /></span>
              <p className="mt-12 text-xs font-medium uppercase tracking-[0.16em] text-paper/50">Category comparison</p>
              <h2 className="mt-3 max-w-lg font-serif text-4xl">huzlr vs standup bots</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/65 sm:text-base">Compare async update collection with huzlr's current live Google Meet and project-context workflow.</p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-medium">Compare workflows <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
            </TrackedLink>
            <div className="rounded-3xl border border-hairline bg-sand/35 p-8 sm:p-10">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Comparison policy</p>
              <h2 className="mt-4 font-serif text-3xl">No invented scorecards.</h2>
              <p className="mt-4 text-sm leading-relaxed text-ink/60">We compare visible workflow, current availability, data movement, and human-control boundaries. Named-vendor comparisons will only publish after product-by-product factual review.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-hairline bg-sand/35 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl"><p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Evaluation framework</p><h2 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">Three questions before any feature grid.</h2></div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {criteria.map(({ icon: Icon, title, description: criterionDescription }) => (
              <article key={title} className="rounded-3xl border border-hairline bg-paper p-7">
                <span className="flex size-10 items-center justify-center rounded-lg bg-clay/10 text-clay"><Icon size={19} /></span>
                <h3 className="mt-6 font-serif text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">{criterionDescription}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 text-center sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-4xl tracking-tight text-balance sm:text-5xl">Evaluate huzlr against a real delivery workflow.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/60">Private-beta access is the clearest way to compare current controls and outputs with the coordination work your team does today.</p>
          <Button asChild size="lg" className="mt-9 h-11 rounded-full bg-clay px-6 text-sm text-white hover:bg-clay-deep">
            <TrackedLink href="/signup" eventName="CTA Click" eventProperties={{ location: "compare_bottom", destination: "signup", label: "Request access" }}>
              Request access <ArrowRight className="size-4" />
            </TrackedLink>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
