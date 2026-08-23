import { HeroWithMockup } from "@/components/blocks/hero-with-mockup"

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
      mockupImage={{
        alt: "Humans and AI workers coordinating through connected systems",
        width: 1672,
        height: 941,
        src: "/aiworkrs.png",
      }}
    />
  )
}
