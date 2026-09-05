import { ArrowRight, CheckCircle2, ClipboardCheck, FileText, ShieldAlert } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { TrackedLink } from "@/components/tracked-link"
import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { absoluteUrl, createMarketingMetadata, serializeJsonLd, siteConfig } from "@/lib/seo"

const description =
  "Use a practical project status report template for software delivery teams, with progress, risk, decisions, ownership, next actions, and stakeholder review prompts."

export const metadata = createMarketingMetadata({
  title: "Project Status Report Template for Software Teams",
  description,
  path: "/templates/project-status-report",
  keywords: [
    "project status report template",
    "weekly project status report template",
    "stakeholder update template",
    "software project status report",
    "AI project status report",
  ],
})

const reportSections = [
  {
    title: "1. Reporting context",
    prompt: "Project · Reporting period · Delivery owner · Last reviewed",
    example: "Payments migration · 18–24 Aug 2026 · Delivery owner: A. Singh · Reviewed 24 Aug",
  },
  {
    title: "2. Overall status",
    prompt: "On track / Needs attention / At risk  followed by one evidence-based sentence",
    example: "Needs attention  preview validation is progressing, but production credential approval is blocking the migration rehearsal.",
  },
  {
    title: "3. Progress this period",
    prompt: "Only completed work or material changes; link each item to a source where possible",
    example: "Preview deployment completed. Smoke-test checklist approved. Validation is in progress.",
  },
  {
    title: "4. Risks and blockers",
    prompt: "Signal · Possible impact · Owner · Mitigation · Next review",
    example: "Production credentials are outstanding. The rehearsal may move. Owner needs confirmation before the release review.",
  },
  {
    title: "5. Decisions",
    prompt: "Decision · Decision owner · Date · Consequence",
    example: "Run the migration rehearsal before release approval. Decision recorded during the platform standup.",
  },
  {
    title: "6. Next actions",
    prompt: "Action · Owner · Due date · Dependency",
    example: "Confirm credential owner and approval date. Do not guess an owner or deadline when the source did not establish one.",
  },
  {
    title: "7. Stakeholder ask",
    prompt: "One explicit decision, approval, or piece of information needed from the reader",
    example: "Confirm whether the release review should move if credentials are not approved by the rehearsal cutoff.",
  },
]

const reviewChecks = [
  "Every progress statement falls inside the reporting period.",
  "Every risk distinguishes a source signal from a possible impact.",
  "Unknown owners and dates are marked for confirmation rather than invented.",
  "Client, personnel, security, and commercial language has an accountable reviewer.",
  "The final update names the reporting owner and the next stakeholder decision.",
]

export default function ProjectStatusReportTemplatePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        name: "Project Status Report Template for Software Teams",
        description,
        url: absoluteUrl("/templates/project-status-report"),
        creator: { "@id": `${siteConfig.url}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: "Templates", item: absoluteUrl("/templates/project-status-report") },
          { "@type": "ListItem", position: 3, name: "Project status report", item: absoluteUrl("/templates/project-status-report") },
        ],
      },
    ],
  }

  return (
    <main className="bg-paper text-ink antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <Navigation />

      <section className="relative overflow-hidden border-b border-hairline px-4 pb-20 pt-36 sm:px-6 md:pb-24 md:pt-44">
        <NoiseTexture className="absolute inset-0 opacity-15 mask-[radial-gradient(520px_circle_at_center,white,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Free delivery template</p>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl font-normal leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              A project status report template built for <em className="italic text-clay">decisions.</em>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">{description}</p>
            <Button asChild size="lg" className="mt-9 h-11 rounded-full bg-clay px-6 text-sm text-white hover:bg-clay-deep">
              <TrackedLink
                href="#template"
                eventName="CTA Click"
                eventProperties={{ location: "status_template_hero", destination: "template", label: "Use the template" }}
              >
                Use the template
                <ArrowRight className="size-4" />
              </TrackedLink>
            </Button>
          </div>
          <div className="rounded-3xl border border-hairline bg-white/55 p-3 shadow-[0_28px_80px_-40px_rgba(41,37,31,0.45)] dark:bg-white/[0.03]">
            <div className="rounded-2xl border border-hairline bg-paper p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-clay/10 text-clay"><FileText size={19} /></span>
                <div><p className="text-xs uppercase tracking-[0.14em] text-ink/40">Weekly status</p><p className="font-serif text-2xl">Payments migration</p></div>
              </div>
              <div className="mt-6 space-y-4 border-t border-hairline pt-6 text-sm leading-relaxed text-ink/65">
                <p><strong className="text-ink">Status:</strong> Needs attention</p>
                <p><strong className="text-ink">Progress:</strong> Preview validation underway.</p>
                <p><strong className="text-ink">Risk:</strong> Production credentials remain outstanding.</p>
                <p><strong className="text-ink">Ask:</strong> Confirm the approval owner and date.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="template" className="scroll-mt-28 py-24 sm:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Copy this structure</p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">The weekly project status report.</h2>
            <p className="mt-5 text-base leading-relaxed text-ink/60">Copy the seven sections into your document or work tool. Replace every example with evidence from the current reporting period.</p>
          </div>
          <div className="mt-12 divide-y divide-hairline border-y border-hairline">
            {reportSections.map((section) => (
              <article key={section.title} className="grid gap-4 py-8 md:grid-cols-[0.7fr_1.3fr] md:gap-12">
                <h3 className="font-serif text-2xl">{section.title}</h3>
                <div>
                  <p className="text-sm font-medium leading-relaxed text-ink/70">{section.prompt}</p>
                  <p className="mt-3 rounded-xl bg-sand/45 p-4 text-sm leading-relaxed text-ink/55"><span className="font-semibold text-clay">Example:</span> {section.example}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-hairline bg-sand/35 py-24 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <span className="flex size-10 items-center justify-center rounded-lg bg-clay/10 text-clay"><ClipboardCheck size={19} /></span>
            <h2 className="mt-6 font-serif text-4xl tracking-tight sm:text-5xl">Review before sending.</h2>
            <p className="mt-5 text-base leading-relaxed text-ink/60">This checklist matters whether a person or an AI reporting agent drafts the update.</p>
          </div>
          <ul className="space-y-4 rounded-3xl border border-hairline bg-paper p-7 sm:p-9">
            {reviewChecks.map((check) => (
              <li key={check} className="flex gap-3 text-sm leading-relaxed text-ink/65 sm:text-base">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-clay" />{check}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-4 md:grid-cols-3">
            <RelatedCard href="/blog/how-to-automate-project-status-reports" title="How to automate reporting" description="Build the evidence and review workflow behind the template." />
            <RelatedCard href="/automated-project-status-reporting" title="Status automation preview" description="See how huzlr plans to assemble a reviewable project update." />
            <RelatedCard href="/project-risk-detection" title="Risk detection" description="Separate blocker evidence from predictions and confirmed risks." />
          </div>
        </div>
      </section>

      <section className="border-t border-hairline px-6 py-24 text-center sm:py-28">
        <div className="mx-auto max-w-3xl">
          <ShieldAlert className="mx-auto size-6 text-clay" />
          <h2 className="mt-5 font-serif text-4xl tracking-tight text-balance sm:text-5xl">Use the template today. Help automate it responsibly.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/60">Join the design-partner preview to test a review-first status workflow with your real project evidence.</p>
          <Button asChild size="lg" className="mt-9 h-11 rounded-full bg-clay px-6 text-sm text-white hover:bg-clay-deep">
            <TrackedLink href="/signup" eventName="CTA Click" eventProperties={{ location: "status_template_bottom", destination: "signup", label: "Join the reporting preview" }}>
              Join the reporting preview <ArrowRight className="size-4" />
            </TrackedLink>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function RelatedCard({ href, title, description: cardDescription }: { href: string; title: string; description: string }) {
  return (
    <TrackedLink
      href={href}
      eventName="CTA Click"
      eventProperties={{ location: "status_template_related", destination: href, label: title }}
      className="group rounded-2xl border border-hairline p-5 transition-colors hover:border-clay/35 hover:bg-sand/35"
    >
      <div className="flex items-center justify-between gap-4"><h3 className="font-serif text-xl">{title}</h3><ArrowRight className="size-4 text-clay transition-transform group-hover:translate-x-0.5" /></div>
      <p className="mt-2 text-sm leading-relaxed text-ink/55">{cardDescription}</p>
    </TrackedLink>
  )
}
