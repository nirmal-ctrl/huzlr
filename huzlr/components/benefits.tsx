const benefits = [
  { number: "01", title: "Risks surface early", description: "See dependencies and drift while there is still time to act." },
  { number: "02", title: "AI stays aligned", description: "Keep agents inside current priorities and constraints." },
  { number: "03", title: "Handoffs keep moving", description: "Carry ownership across people, agents, and tools." },
  { number: "04", title: "One operating picture", description: "Connect decisions, execution, and outcomes." },
]

export function Benefits() {
  return (
    <section className="bg-[#10151d] px-5 py-24 text-white sm:py-32 md:px-8">
      <div className="mx-auto max-w-[1344px]">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91b4f5]">The management harness</p>
          </div>
          <div className="lg:col-span-8">
            <h2 className="max-w-5xl font-serif text-[clamp(3rem,6vw,5.75rem)] font-medium leading-[0.95] tracking-[-0.075em] text-balance">
              More capacity. Less coordination overhead.
            </h2>
          </div>
        </div>

        <div className="mt-20 grid border-y border-white/15 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative flex min-h-[520px] items-center justify-center overflow-hidden border-b border-white/15 p-8 lg:border-b-0 lg:border-r">
            <svg viewBox="0 0 500 500" className="w-full max-w-[470px]" fill="none" aria-label="Signal, decision, action, and outcome coordination loop">
              <circle cx="250" cy="250" r="184" stroke="white" strokeOpacity=".12" />
              <circle cx="250" cy="250" r="116" stroke="#91B4F5" strokeOpacity=".35" />
              <path d="M250 66A184 184 0 0 1 434 250" stroke="#91B4F5" strokeWidth="2" />
              <path d="M434 250A184 184 0 0 1 250 434" stroke="#91B4F5" strokeOpacity=".65" strokeWidth="2" />
              <path d="M250 434A184 184 0 0 1 66 250" stroke="#91B4F5" strokeOpacity=".4" strokeWidth="2" />
              <path d="M66 250A184 184 0 0 1 250 66" stroke="#91B4F5" strokeOpacity=".2" strokeWidth="2" />
              <circle cx="250" cy="66" r="7" fill="#91B4F5" /><circle cx="434" cy="250" r="7" fill="#91B4F5" /><circle cx="250" cy="434" r="7" fill="#91B4F5" /><circle cx="66" cy="250" r="7" fill="#91B4F5" />
              <text x="250" y="238" fill="white" textAnchor="middle" fontSize="13" opacity=".45" letterSpacing="2">HUZLR</text>
              <text x="250" y="270" fill="white" textAnchor="middle" fontSize="23">Shared context</text>
              <text x="250" y="34" fill="white" textAnchor="middle" fontSize="13" opacity=".65">Signal</text>
              <text x="466" y="255" fill="white" textAnchor="start" fontSize="13" opacity=".65">Decision</text>
              <text x="250" y="474" fill="white" textAnchor="middle" fontSize="13" opacity=".65">Action</text>
              <text x="34" y="255" fill="white" textAnchor="end" fontSize="13" opacity=".65">Outcome</text>
            </svg>
          </div>

          <div className="grid sm:grid-cols-2">
            {benefits.map((benefit, index) => (
              <article
                key={benefit.number}
                className={`flex min-h-[260px] flex-col justify-between border-white/15 p-7 sm:p-8 ${index > 1 ? "border-t" : ""} ${index % 2 === 1 ? "sm:border-l" : ""} ${index === 1 ? "max-sm:border-t" : ""}`}
              >
                <span className="font-mono text-[10px] tracking-[0.14em] text-[#91b4f5]">{benefit.number}</span>
                <div>
                  <h3 className="font-serif text-2xl tracking-[-0.04em] sm:text-3xl">{benefit.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/45">{benefit.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
