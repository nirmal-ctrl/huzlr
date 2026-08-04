import { CustomerSegmentCard } from "@/components/customer-segment-card"
import { CUSTOMER_SEGMENTS } from "@/constants/customer-segments"

export function IdealCustomers() {
  return (
    <section id="who-its-for" className="border-t border-hairline py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-clay">
            Who it's for
          </p>
          <h2 className="mt-4 font-serif text-4xl sm:text-5xl tracking-tight text-ink text-balance">
            Built for teams of <em className="italic text-clay">every</em> size
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-ink/60">
            Whether you're a solo founder or leading a large enterprise,
            huzlr adapts to your workflow  not the other way around.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2 lg:mx-0 lg:max-w-none xl:grid-cols-4">
          {CUSTOMER_SEGMENTS.map((segment) => (
            <CustomerSegmentCard key={segment.category} {...segment} />
          ))}
        </div>
      </div>
    </section>
  )
}
