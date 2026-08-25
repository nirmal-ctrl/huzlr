import type { Metadata } from "next"

import { Benefits } from "@/components/benefits"
import { CTA } from "@/components/cta"
import { FAQ } from "@/components/faq"
import { Footer } from "@/components/footer"
import Hero from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { HybridOrganization } from "@/components/hybrid-organization"
import { Navigation } from "@/components/navigation"
import { Signals } from "@/components/signals"
import { absoluteUrl, serializeJsonLd, siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.title} | ${siteConfig.name}` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${siteConfig.title} | ${siteConfig.name}`,
    description: siteConfig.description,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.title} | ${siteConfig.name}`,
    description: siteConfig.description,
  },
}

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: absoluteUrl("/favicon.png"),
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        url: siteConfig.url,
        publisher: { "@id": `${siteConfig.url}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: siteConfig.name,
        url: siteConfig.url,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: siteConfig.description,
      },
    ],
  }

  return (
    <main className="bg-paper text-ink antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <Navigation />
      <Hero />
      <HybridOrganization />
      <HowItWorks />
      <Signals />
      <Benefits />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  )
}
