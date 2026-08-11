import { HeroWithMockup } from "@/components/blocks/hero-with-mockup"
import { CoordinationPreview } from "@/components/coordination-preview"

export default function Hero() {
  return (
    <HeroWithMockup
      eyebrow="Private beta · For AI-native product teams"
      title="The coordination layer for"
      accent="teams working with AI."
      description="huzlr keeps humans, AI workers, and existing systems aligned. It detects what changed, coordinates the response, and keeps execution moving without another round of status chasing."
      primaryCta={{
        text: "Join the waitlist",
        href: "/signup",
      }}
      secondaryCta={{
        text: "See how it works",
        href: "#how-it-works",
      }}
      mockupContent={<CoordinationPreview />}
    />
  )
}
