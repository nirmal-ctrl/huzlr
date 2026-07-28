import { CustomerSegmentCard } from "@/components/customer-segment-card"

export function IdealCustomers() {
  const segments = [
    {
      imageSrc: "/segment-enterprise.png",
      category: "Enterprise",
      title: "Governance & security",
      description:
        "Unified portfolio oversight, security controls, and cross-team dependency tracking. Alignment at scale, without the status meetings.",
    },
    {
      imageSrc: "/segment-startups.png",
      category: "Startups",
      title: "Move fast, see clearly",
      description:
        "Rapid planning and early risk signals keep your team shipping — while Huzlr watches the dependencies you don't have time to track.",
    },
    {
      imageSrc: "/segment-agencies.png",
      category: "Agencies",
      title: "Every client, one view",
      description:
        "Switch contexts effortlessly between client workspaces while keeping a unified picture of delivery health across your agency.",
    },
    {
      imageSrc: "/segment-solopreneurs.png",
      category: "Solopreneurs",
      title: "Your AI co-founder",
      description:
        "From content calendars to product roadmaps, stay accountable and productive with an AI partner — no PM hire required.",
    },
  ]

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
            Huzlr adapts to your workflow — not the other way around.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-5 lg:mx-0 lg:max-w-none lg:grid-cols-2 xl:grid-cols-4">
          {segments.map((segment) => (
            <CustomerSegmentCard key={segment.category} {...segment} />
          ))}
        </div>
      </div>
    </section>
  )
}
