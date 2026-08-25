import { ArrowRight } from "lucide-react"
import { TrackedLink } from "@/components/tracked-link"

export function CTA() {
  return (
    <section className="border-t border-hairline py-24 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-medium tracking-[0.18em] uppercase text-clay">
          Build the hybrid organization
        </p>
        <h2 className="mt-4 font-serif text-4xl sm:text-5xl md:text-6xl tracking-tight text-ink text-balance leading-[1.1]">
          Add intelligence without adding <em className="italic text-clay">coordination chaos.</em>
        </h2>
        <p className="mt-6 text-base sm:text-lg leading-relaxed text-ink/60 max-w-xl mx-auto">
          Join the private beta for AI-native product teams and help shape the
          coordination layer your future organization will run on.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <TrackedLink
            href="/signup"
            eventName="CTA Click"
            eventProperties={{ location: "homepage_bottom", destination: "signup", label: "Join the private beta" }}
            className="group rounded-full bg-clay px-8 py-3.5 text-sm font-medium text-white hover:bg-clay-deep transition-colors flex items-center gap-2"
          >
              Join the private beta
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </TrackedLink>
          <p className="text-xs text-ink/50">
            Limited spots during private beta. No credit card required.
          </p>
        </div>
      </div>
    </section>
  )
}
