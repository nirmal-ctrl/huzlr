import { Benefits } from "@/components/benefits"
import { CTA } from "@/components/cta"
import { FAQ } from "@/components/faq"
import { Footer } from "@/components/footer"
import Hero from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { HybridOrganization } from "@/components/hybrid-organization"
import { Navigation } from "@/components/navigation"
import { Signals } from "@/components/signals"

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "huzlr",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "A coordination layer that keeps humans, AI workers, and existing systems aligned as work changes.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  }

  return (
    <main className="bg-paper text-ink antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
