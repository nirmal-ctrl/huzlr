import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { ArrowRight } from "lucide-react"

interface HeroWithMockupProps {
  eyebrow?: string
  title: string
  accent?: string
  description: string
  primaryCta?: {
    text: string
    href: string
  }
  secondaryCta?: {
    text: string
    href: string
    icon?: React.ReactNode
  }
  mockupImage?: {
    src: string
    alt: string
    width: number
    height: number
  }
  className?: string
}

export function HeroWithMockup({
  eyebrow,
  title,
  accent,
  description,
  primaryCta = {
    text: "Join the waitlist",
    href: "/signup",
  },
  secondaryCta,
  mockupImage,
  className,
}: HeroWithMockupProps) {
  return (
    <section
      className={cn(
        "relative text-ink",
        "pt-36 pb-20 px-4 md:pt-44 md:pb-28",
        "overflow-hidden",
        className,
      )}
    >
      <NoiseTexture
        className={cn(
          "absolute inset-0 opacity-15",
          "mask-[radial-gradient(420px_circle_at_center,white,transparent)]"
        )}
      />
      <div className="relative mx-auto max-w-[1200px] flex flex-col items-center gap-10 text-center">
        {/* Eyebrow */}
        {eyebrow && (
          <p className="animate-appear text-xs font-medium tracking-[0.18em] uppercase text-clay">
            {eyebrow}
          </p>
        )}

        {/* Heading */}
        <h1
          className={cn(
            "inline-block animate-appear font-serif font-normal",
            "text-5xl tracking-tight text-balance sm:text-6xl md:text-7xl",
            "leading-[1.05]",
          )}
        >
          {title}
          {accent && (
            <>
              {" "}
              <em className="font-serif italic text-clay">{accent}</em>
            </>
          )}
        </h1>

        {/* Description */}
        <p
          className={cn(
            "max-w-[560px] animate-appear opacity-0 [animation-delay:150ms]",
            "text-base sm:text-lg leading-relaxed",
            "text-ink/60",
          )}
        >
          {description}
        </p>

        {/* CTAs */}
        <div
          className="relative z-10 flex flex-wrap justify-center items-center gap-4
          animate-appear opacity-0 [animation-delay:300ms]"
        >
          <Button
            asChild
            size="lg"
            className="rounded-full bg-clay text-white hover:bg-clay-deep transition-colors h-11 px-6 text-sm font-medium"
          >
            <a href={primaryCta.href}>
              {primaryCta.text}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </a>
          </Button>

          {secondaryCta && (
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-full text-ink/70 hover:text-ink hover:bg-sand h-11 px-6 text-sm font-medium"
            >
              <a href={secondaryCta.href}>
                {secondaryCta.icon}
                {secondaryCta.text}
              </a>
            </Button>
          )}
        </div>

        {/* Mockup */}
        {mockupImage && (
          <div className="relative w-full max-w-5xl pt-10 animate-appear opacity-0 [animation-delay:600ms]">
            <div className="rounded-2xl border border-hairline bg-white/60 dark:bg-white/[0.03] p-2 shadow-[0_24px_60px_-24px_rgba(41,37,31,0.25)]">
              <img
                {...mockupImage}
                className="w-full h-auto rounded-xl border border-hairline/60"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
