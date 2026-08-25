import { ArrowRight, CheckCircle2, Info } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { TrackedLink } from "@/components/tracked-link"
import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { absoluteUrl, createMarketingMetadata, serializeJsonLd, siteConfig } from "@/lib/seo"

const description =
  "Compare huzlr with a typical standup bot across async check-ins, live meeting facilitation, project context, blocker handling, Jira boundaries, and human review."

export const metadata = createMarketingMetadata({
  title: "huzlr vs Standup Bots: Workflow Comparison",
  description,
  path: "/compare/huzlr-vs-standup-bots",
  keywords: [
    "AI standup bot alternatives",
    "best AI standup bot",
    "AI Scrum Master vs standup bot",
    "standup automation software",
    "AI Scrum Master alternatives",
  ],
})

const rows = [
  { criterion: "Primary collection model", standupBot: "Usually asks recurring questions in chat and compiles responses.", huzlr: "Currently joins eligible live Google Meet standups as a visible AI participant." },
  { criterion: "Current output", standupBot: "Typically a check-in digest or summary; exact output varies by vendor.", huzlr: "Optional transcript, summary, decisions, blockers, and proposed action items." },
  { criterion: "Project context", standupBot: "Often centered on the recurring check-in and connected chat context.", huzlr: "Combines the meeting record with huzlr projects, issues, milestones, documents, and team context." },
  { criterion: "Async standups", standupBot: "A common category strength, especially through Slack or Microsoft Teams.", huzlr: "Not generally available. The current beta focuses on live Google Meet workflows." },
  { criterion: "Jira boundary", standupBot: "Varies by vendor; verify field access and write behavior directly.", huzlr: "Atlassian OAuth is implemented; live import, continuous sync, and write-back are not generally available." },
  { criterion: "Human review", standupBot: "Varies by product and integration settings.", huzlr: "Meeting-generated outputs and proposed actions remain visible for review before system-of-record changes." },
]

const faqs = [
  { question: "Is huzlr an async standup bot?", answer: "Not today. huzlr's current private beta is centered on a visible AI participant in eligible live Google Meet standups." },
  { question: "When is a typical standup bot a better fit?", answer: "Choose an async standup bot when the main requirement is recurring chat-based check-ins across time zones and live facilitation is unnecessary." },
  { question: "When is huzlr a better fit?", answer: "Evaluate huzlr when the team wants a controlled live meeting workflow connected to project records, reviewable blockers, decisions, and proposed next actions." },
  { question: "Does huzlr automatically update Jira?", answer: "No generally available write-back is claimed. Jira OAuth is implemented, while live import and updates remain in validation." },
]

export default function HuzlrVsStandupBotsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: "huzlr vs Standup Bots", url: absoluteUrl("/compare/huzlr-vs-standup-bots"), description },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: "Compare", item: absoluteUrl("/compare") },
          { "@type": "ListItem", position: 3, name: "huzlr vs standup bots", item: absoluteUrl("/compare/huzlr-vs-standup-bots") },
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
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">AI Scrum Master comparison</p>
          <h1 className="mx-auto mt-6 max-w-4xl font-serif text-5xl font-normal leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            huzlr vs standup bots: live coordination or <em className="italic text-clay">async collection?</em>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">{description}</p>
          <div className="mx-auto mt-7 flex max-w-2xl items-start justify-center gap-2 text-left text-xs leading-relaxed text-ink/45">
            <Info className="mt-0.5 size-4 shrink-0 text-clay" />
            This compares workflow categories, not every vendor. Standup-bot features vary, so confirm current capabilities with the product being evaluated.
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="overflow-hidden rounded-3xl border border-hairline">
            <div className="hidden grid-cols-[0.7fr_1fr_1fr] bg-ink px-6 py-5 text-sm font-semibold text-paper md:grid">
              <span>Evaluation criterion</span><span>Typical standup bot</span><span>huzlr today</span>
            </div>
            <div className="divide-y divide-hairline">
              {rows.map((row) => (
                <article key={row.criterion} className="grid gap-5 p-6 md:grid-cols-[0.7fr_1fr_1fr] md:gap-8">
                  <h2 className="font-serif text-xl">{row.criterion}</h2>
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/35 md:hidden">Typical standup bot</p><p className="mt-1 text-sm leading-relaxed text-ink/60">{row.standupBot}</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-clay md:hidden">huzlr today</p><p className="mt-1 flex gap-2 text-sm leading-relaxed text-ink/70"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-clay" />{row.huzlr}</p></div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-hairline bg-sand/35 py-24 sm:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center"><p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Decision questions</p><h2 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">Choose the collection model first.</h2></div>
          <div className="mt-12 divide-y divide-hairline border-y border-hairline">
            {faqs.map((faq) => <article key={faq.question} className="grid gap-3 py-7 md:grid-cols-[0.75fr_1.25fr] md:gap-10"><h3 className="font-serif text-xl">{faq.question}</h3><p className="text-sm leading-relaxed text-ink/60 sm:text-base">{faq.answer}</p></article>)}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 text-center sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-4xl tracking-tight text-balance sm:text-5xl">See whether live meeting coordination fits your team.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/60">Try the private beta with an actual standup policy and compare the outputs with your current update workflow.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-11 rounded-full bg-clay px-6 text-sm text-white hover:bg-clay-deep"><TrackedLink href="/signup" eventName="CTA Click" eventProperties={{ location: "compare_standup_bottom", destination: "signup", label: "Request access" }}>Request access <ArrowRight className="size-4" /></TrackedLink></Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full border-hairline bg-transparent px-6 text-sm"><TrackedLink href="/automated-daily-standups" eventName="CTA Click" eventProperties={{ location: "compare_standup_bottom", destination: "/automated-daily-standups", label: "See automated standups" }}>See automated standups</TrackedLink></Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
