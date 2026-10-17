import { ArrowRight } from "lucide-react"

import { TrackedLink } from "@/components/tracked-link"

export function CTA() {
  return (
    <section className="bg-paper px-5 py-8 md:px-8 md:py-12">
      <div className="mx-auto grid min-h-[520px] max-w-[1344px] overflow-hidden rounded-2xl bg-[#2d61b8] text-white lg:grid-cols-12">
        <div className="flex flex-col justify-between border-b border-white/20 p-7 sm:p-10 lg:col-span-4 lg:border-b-0 lg:border-r lg:p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Private beta</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">For product and engineering teams building the way work happens next.</p>
          </div>
          <p className="mt-24 text-sm text-white/60">Limited spots · No credit card required</p>
        </div>

        <div className="flex flex-col justify-between p-7 sm:p-10 lg:col-span-8 lg:p-12">
          <h2 className="max-w-4xl font-serif text-[clamp(3.25rem,6.4vw,6.5rem)] font-medium leading-[0.93] tracking-[-0.08em] text-balance">
            Put your delivery context to work.
          </h2>

          <div className="mt-20 flex flex-col justify-between gap-8 border-t border-white/25 pt-7 sm:flex-row sm:items-end">
            <p className="max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              Help shape the coordination layer your future organization will run on.
            </p>
            <TrackedLink
              href="/signup"
              eventName="CTA Click"
              eventProperties={{ location: "homepage_bottom", destination: "signup", label: "Join the private beta" }}
              className="group inline-flex shrink-0 items-center gap-2 self-start bg-white px-5 py-3 text-sm font-semibold text-[#244f99] transition-colors hover:bg-[#eaf1ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2d61b8]"
            >
              Join the private beta
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </TrackedLink>
          </div>
        </div>
      </div>
    </section>
  )
}
