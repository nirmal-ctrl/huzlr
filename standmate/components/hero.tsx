import { HeroWithMockup } from "@/components/blocks/hero-with-mockup"

export default function Hero() {
  return (
    <HeroWithMockup
      eyebrow="Private beta"
      title="Project intelligence that"
      accent="thinks ahead."
      description="huzlr is a thinking layer above your existing tools. It understands dependencies, predicts risk early, and helps your team decide before projects derail."
      primaryCta={{
        text: "Join the waitlist",
        href: "/signup",
      }}
      secondaryCta={{
        text: "See how it works",
        href: "#how-it-works",
      }}
      mockupImage={{
        alt: "huzlr Project Intelligence Dashboard",
        width: 1248,
        height: 765,
        src: "/hero.png",
      }}
    />
  )
}
