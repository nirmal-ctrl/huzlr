const inputs = [
  { number: "01", label: "Humans", value: "Direction" },
  { number: "02", label: "AI workers", value: "Execution" },
  { number: "03", label: "Systems", value: "Signals" },
]

const outcomes = [
  { number: "A", label: "Priorities", value: "Aligned" },
  { number: "B", label: "Decisions", value: "Visible" },
  { number: "C", label: "Next move", value: "Clear" },
]

export function HybridOrganization() {
  return (
    <section id="why-huzlr" className="bg-sand px-5 py-24 text-ink sm:py-32 md:px-8">
      <div className="mx-auto max-w-[1344px]">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">The team has changed</p>
          </div>
          <div className="lg:col-span-9">
            <h2 className="max-w-5xl font-serif text-[clamp(3rem,6.3vw,6.25rem)] font-medium leading-[0.94] tracking-[-0.075em] text-balance">
              Organizations are no longer only human.
            </h2>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-ink/55 sm:text-lg">
              One operating context for people, AI workers, and the systems where work happens.
            </p>
          </div>
        </div>

        <div className="mt-16 overflow-hidden rounded-2xl bg-[#10151d] text-white">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Hybrid operating model</p>
            <p className="hidden text-xs text-white/35 sm:block">Inputs → shared context → outcomes</p>
          </div>

          <div className="hidden min-h-[540px] grid-cols-[1fr_0.72fr_1fr] lg:grid">
            <div className="grid grid-rows-3 px-10 py-8 xl:px-14">
              {inputs.map((item, index) => (
                <div key={item.number} className={`relative flex flex-col justify-center ${index > 0 ? "border-t border-white/10" : ""}`}>
                  <span className="font-mono text-[9px] tracking-[0.14em] text-[#91b4f5]">{item.number}</span>
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-white/35">{item.label}</p>
                  <p className="mt-1 font-serif text-3xl tracking-[-0.045em]">{item.value}</p>
                  <span className="absolute right-[-2.5rem] top-1/2 h-px w-10 bg-[#6f9cf2]/45 xl:right-[-3.5rem] xl:w-14" aria-hidden="true" />
                  <span className="absolute right-[-2.7rem] top-1/2 size-1 -translate-y-1/2 rounded-full bg-[#7da8fb] xl:right-[-3.7rem]" aria-hidden="true" />
                </div>
              ))}
            </div>

            <div className="relative m-8 flex flex-col justify-between overflow-hidden bg-[#2d61b8] p-8 xl:p-10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Huzlr</p>
                <span className="size-2 rounded-full bg-white/80" />
              </div>
              <div>
                <p className="font-serif text-[clamp(2.6rem,4vw,4.5rem)] leading-[0.92] tracking-[-0.065em]">
                  Shared<br />context
                </p>
                <p className="mt-6 max-w-[15rem] text-sm leading-relaxed text-white/65">
                  Goals, constraints, ownership, and decisions kept current.
                </p>
              </div>
              <p className="border-t border-white/20 pt-5 text-xs text-white/55">Observe · Understand · Coordinate</p>
            </div>

            <div className="grid grid-rows-3 px-10 py-8 xl:px-14">
              {outcomes.map((item, index) => (
                <div key={item.number} className={`relative flex flex-col justify-center ${index > 0 ? "border-t border-white/10" : ""}`}>
                  <span className="absolute left-[-2.5rem] top-1/2 h-px w-10 bg-[#6f9cf2]/45 xl:left-[-3.5rem] xl:w-14" aria-hidden="true" />
                  <span className="absolute left-[-2.7rem] top-1/2 size-1 -translate-y-1/2 rounded-full bg-[#7da8fb] xl:left-[-3.7rem]" aria-hidden="true" />
                  <span className="font-mono text-[9px] tracking-[0.14em] text-[#91b4f5]">{item.number}</span>
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-white/35">{item.label}</p>
                  <p className="mt-1 font-serif text-3xl tracking-[-0.045em]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:hidden">
            <div className="bg-[#2d61b8] p-7 sm:p-9">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Huzlr</p>
              <p className="mt-8 font-serif text-4xl leading-[0.95] tracking-[-0.055em]">Shared context</p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">Goals, constraints, ownership, and decisions kept current.</p>
            </div>
            <div className="divide-y divide-white/10 px-6 sm:px-8">
              {inputs.map((input, index) => (
                <div key={input.number} className="grid grid-cols-2 gap-6 py-6">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">{input.label}</p>
                    <p className="mt-2 font-serif text-xl">{input.value}</p>
                  </div>
                  <div className="border-l border-white/10 pl-6">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">{outcomes[index].label}</p>
                    <p className="mt-2 font-serif text-xl text-[#a9c4fa]">{outcomes[index].value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
