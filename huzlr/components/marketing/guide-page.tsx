import type { ReactNode } from "react"
import { ArrowRight, CalendarDays, CheckCircle2, Clock3 } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { TrackedLink } from "@/components/tracked-link"
import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { absoluteUrl, serializeJsonLd, siteConfig } from "@/lib/seo"

export interface GuideSection {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export interface GuidePageConfig {
  path: string
  name: string
  eyebrow: string
  title: ReactNode
  description: string
  publishedDate: string
  readTime: string
  reviewedBy: string
  opening: string
  sections: GuideSection[]
  related: Array<{ href: string; label: string; description: string }>
  ctaTitle: string
  ctaDescription: string
  ctaLabel: string
}

export function GuidePage({ config }: { config: GuidePageConfig }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: config.name,
        description: config.description,
        datePublished: config.publishedDate,
        dateModified: config.publishedDate,
        mainEntityOfPage: absoluteUrl(config.path),
        image: absoluteUrl("/opengraph-image"),
        author: { "@type": "Organization", name: "huzlr product team", url: siteConfig.url },
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
          url: siteConfig.url,
          logo: { "@type": "ImageObject", url: absoluteUrl("/favicon.png") },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
          { "@type": "ListItem", position: 3, name: config.name, item: absoluteUrl(config.path) },
        ],
      },
    ],
  }

  const trackingSlug = config.path.replaceAll("/", "_").replace(/^_/, "")

  return (
    <main className="bg-paper text-ink antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <Navigation />

      <article>
        <header className="relative overflow-hidden border-b border-hairline px-4 pb-20 pt-36 sm:px-6 md:pb-24 md:pt-44">
          <NoiseTexture className="absolute inset-0 opacity-15 mask-[radial-gradient(520px_circle_at_center,white,transparent)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">{config.eyebrow}</p>
            <h1 className="mx-auto mt-6 max-w-4xl font-serif text-5xl font-normal leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {config.title}
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">{config.description}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-ink/45">
              <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-clay" />{formatDate(config.publishedDate)}</span>
              <span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-clay" />{config.readTime}</span>
              <span>Reviewed by {config.reviewedBy}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
          <p className="font-serif text-2xl leading-relaxed text-ink/80 sm:text-3xl">{config.opening}</p>
          <div className="mt-16 space-y-16">
            {config.sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">{section.title}</h2>
                <div className="mt-6 space-y-5 text-base leading-8 text-ink/65">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                {section.bullets ? (
                  <ul className="mt-7 space-y-4 rounded-3xl border border-hairline bg-sand/35 p-6 sm:p-8">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-ink/65 sm:text-base">
                        <CheckCircle2 className="mt-1 size-4 shrink-0 text-clay" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </article>

      <section className="border-y border-hairline bg-sand/35 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Continue exploring</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {config.related.map((item) => (
              <TrackedLink
                key={item.href}
                href={item.href}
                eventName="CTA Click"
                eventProperties={{ location: `${trackingSlug}_related`, destination: item.href, label: item.label }}
                className="group rounded-2xl border border-hairline bg-paper p-5 transition-colors hover:border-clay/35"
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

      <section className="px-6 py-24 text-center sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-4xl tracking-tight text-balance sm:text-5xl">{config.ctaTitle}</h2>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value))
}
