import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="border-t border-hairline py-24 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-medium tracking-[0.18em] uppercase text-clay">
          Private beta
        </p>
        <h2 className="mt-4 font-serif text-4xl sm:text-5xl md:text-6xl tracking-tight text-ink text-balance leading-[1.1]">
          Your projects, <em className="italic text-clay">thought through.</em>
        </h2>
        <p className="mt-6 text-base sm:text-lg leading-relaxed text-ink/60 max-w-xl mx-auto">
          Join the waitlist and be among the first teams whose projects are
          watched over by intelligence — not just tracked by tools.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <Link href="/signup">
            <button className="group rounded-full bg-clay px-8 py-3.5 text-sm font-medium text-white hover:bg-clay-deep transition-colors flex items-center gap-2">
              Join the waitlist
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
          <p className="text-xs text-ink/50">
            Limited spots during private beta. No credit card required.
          </p>
        </div>
      </div>
    </section>
  )
}
