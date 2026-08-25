import type { LucideIcon } from "lucide-react"
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { TrackedLink } from "@/components/tracked-link"
import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { absoluteUrl, serializeJsonLd, siteConfig } from "@/lib/seo"

export interface CommercialStep {
  icon: LucideIcon
  title: string
  description: string
}

export interface CommercialFaq {
  question: string
  answer: string
}

export interface CommercialLink {
  href: string
  label: string
  description: string
}

export interface CommercialPageConfig {
  path: string
  name: string
  eyebrow: string
  status: string
  title: React.ReactNode
  description: string
  proofNote: string
  previewLabel: string
  previewTitle: string
  previewItems: Array<{ label: string; text: string }>
  sectionEyebrow: string
  sectionTitle: React.ReactNode
  sectionDescription: string
  steps: CommercialStep[]
  availableNow: string[]
  notYet: string[]
  faqs: CommercialFaq[]
  related: CommercialLink[]
  ctaTitle: string
  ctaDescription: string
  ctaLabel: string
}

export function CommercialPage({ config }: { config: CommercialPageConfig }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: config.name,
        url: absoluteUrl(config.path),
        description: config.description,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteConfig.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: config.name,
            item: absoluteUrl(config.path),
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: config.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  }

  const trackingSlug = config.path.replaceAll("/", "_").replace(/^_/, "")

  return (
    <main className="bg-paper text-ink antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <Navigation />

      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 md:pb-28 md:pt-44">
        <NoiseTexture className="absolute inset-0 opacity-15 mask-[radial-gradient(480px_circle_at_center,white,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">{config.eyebrow}</p>
              <span className="rounded-full border border-clay/20 bg-clay/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-clay">
                {config.status}
              </span>
            </div>
            <h1 className="mt-6 max-w-3xl font-serif text-5xl font-normal leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {config.title}
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">{config.description}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-11 rounded-full bg-clay px-6 text-sm text-white hover:bg-clay-deep">
                <TrackedLink
                  href="/signup"
                  eventName="CTA Click"
                  eventProperties={{ location: `${trackingSlug}_hero`, destination: "signup", label: config.ctaLabel }}
                >
                  {config.ctaLabel}
                  <ArrowRight className="size-4" />
                </TrackedLink>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-11 rounded-full px-6 text-sm text-ink/70 hover:bg-sand hover:text-ink">
                <TrackedLink
                  href="#workflow"
                  eventName="CTA Click"
                  eventProperties={{ location: `${trackingSlug}_hero`, destination: "workflow", label: "See the workflow" }}
                >
                  See the workflow
                </TrackedLink>
              </Button>
            </div>
            <p className="mt-5 max-w-xl text-xs leading-relaxed text-ink/45">{config.proofNote}</p>
          </div>

          <div className="rounded-3xl border border-hairline bg-white/55 p-3 shadow-[0_28px_80px_-40px_rgba(41,37,31,0.45)] dark:bg-white/[0.03]">
            <div className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-hairline pb-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-clay">{config.previewLabel}</p>
                  <p className="mt-1 font-serif text-2xl">{config.previewTitle}</p>
                </div>
                <span className="rounded-full bg-clay/10 px-3 py-1 text-xs font-medium text-clay">Preview</span>
              </div>
              <div className="mt-6 space-y-5">
                {config.previewItems.map((item) => (
                  <div key={item.label} className="grid grid-cols-[28px_1fr] gap-3">
                    <span className="mt-1 flex size-7 items-center justify-center rounded-full bg-clay/10 text-clay">
                      <CheckCircle2 size={13} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/40">{item.label}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink/70">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 border-t border-hairline pt-4 text-xs leading-relaxed text-ink/45">
                Illustrative workflow. Availability is stated explicitly below.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-28 border-t border-hairline py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">{config.sectionEyebrow}</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{config.sectionTitle}</h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">{config.sectionDescription}</p>
          </div>
          <div className="mt-14 grid border-y border-hairline sm:grid-cols-2 lg:grid-cols-4">
            {config.steps.map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                className={`py-8 sm:px-6 lg:px-7 ${index > 0 ? "border-t border-hairline sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t lg:border-l lg:border-t-0" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-md bg-clay/10 text-clay"><Icon size={17} /></span>
                  <span className="font-serif text-sm text-ink/30">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-6 font-serif text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/55">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline bg-sand/35 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Product truth</p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">What is available—and what is not yet.</h2>
            <p className="mt-5 text-base leading-relaxed text-ink/60">
              Private-beta pages should make the current boundary clear enough for a buyer to evaluate without guessing.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <TruthPanel title="Available now" items={config.availableNow} available />
            <TruthPanel title="Not generally available yet" items={config.notYet} />
          </div>
        </div>
      </section>

      <section className="border-t border-hairline py-24 sm:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Evaluation questions</p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">What teams ask first.</h2>
          </div>
          <div className="mt-12 divide-y divide-hairline border-y border-hairline">
            {config.faqs.map((faq) => (
              <article key={faq.question} className="grid gap-3 py-7 md:grid-cols-[0.75fr_1.25fr] md:gap-10">
                <h3 className="font-serif text-xl">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-ink/60 sm:text-base">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Explore the system</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {config.related.map((item) => (
              <TrackedLink
                key={item.href}
                href={item.href}
                eventName="CTA Click"
                eventProperties={{ location: `${trackingSlug}_related`, destination: item.href, label: item.label }}
                className="group rounded-2xl border border-hairline p-5 transition-colors hover:border-clay/35 hover:bg-sand/45"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-serif text-xl">{item.label}</h3>
                  <ArrowRight className="size-4 text-clay transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink/55">{item.description}</p>
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline px-6 py-24 text-center sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">{config.status}</p>
          <h2 className="mt-4 font-serif text-4xl tracking-tight text-balance sm:text-5xl">{config.ctaTitle}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/60">{config.ctaDescription}</p>
          <Button asChild size="lg" className="mt-9 h-11 rounded-full bg-clay px-6 text-sm text-white hover:bg-clay-deep">
            <TrackedLink
              href="/signup"
              eventName="CTA Click"
              eventProperties={{ location: `${trackingSlug}_bottom`, destination: "signup", label: config.ctaLabel }}
            >
              {config.ctaLabel}
              <ArrowRight className="size-4" />
            </TrackedLink>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function TruthPanel({ title, items, available = false }: { title: string; items: string[]; available?: boolean }) {
  const Icon = available ? CheckCircle2 : AlertTriangle

  return (
    <div className="rounded-3xl border border-hairline bg-paper p-7 sm:p-9">
      <div className="flex items-center gap-3">
        <Icon className="size-5 text-clay" />
        <h3 className="font-serif text-2xl">{title}</h3>
      </div>
      <ul className="mt-7 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink/65">
            <Icon className="mt-0.5 size-4 shrink-0 text-clay" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
