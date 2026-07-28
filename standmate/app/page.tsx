import { Benefits } from "@/components/benefits"
import { CTA } from "@/components/cta"
import { FAQ } from "@/components/faq"
import { Footer } from "@/components/footer"
import Hero from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { IdealCustomers } from "@/components/ideal-customers"
import { Navigation } from "@/components/navigation"
import { Signals } from "@/components/signals"

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Huzlr",
    applicationCategory: "ProjectManagement",
    operatingSystem: "Web",
    description:
      "Project intelligence that predicts risk early, surfaces the signals that matter, and helps teams decide before projects derail.",
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
      <IdealCustomers />
      <HowItWorks />
      <Signals />
      <Benefits />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  )
}
