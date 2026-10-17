const sources = ["Jira", "Meet", "Docs"]

export function Signals() {
  return (
    <section id="signals" className="bg-sand px-5 py-24 sm:py-32 md:px-8">
      <div className="mx-auto grid max-w-[1344px] items-center gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Coordination over noise</p>
          <h2 className="mt-5 max-w-2xl font-serif text-[clamp(3rem,5.3vw,5.25rem)] font-medium leading-[0.96] tracking-[-0.07em] text-balance">
            Let the right signal find you.
          </h2>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-ink/55 sm:text-lg">
            Huzlr connects what changed to its impact, owner, and next decision—before delivery drifts.
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-2 border-y border-hairline py-5 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/35">Without Huzlr</p>
              <p className="mt-2 text-ink/55">People chase context</p>
            </div>
            <div className="border-l border-hairline pl-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-clay">With Huzlr</p>
              <p className="mt-2 font-medium text-ink/75">Context routes itself</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-hairline bg-paper lg:col-span-7">
          <div className="flex items-center justify-between border-b border-hairline px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35">Signal routing</p>
            <p className="text-xs text-ink/40">Activity → reviewed action</p>
          </div>

          <div className="p-6 sm:p-9">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
              <div className="space-y-3">
                {sources.map((source, index) => (
                  <div key={source} className="flex items-center gap-3 border border-hairline bg-sand/45 p-3.5">
                    <span className="font-mono text-[9px] text-ink/30">0{index + 1}</span>
                    <span className="text-sm font-medium text-ink/65">{source}</span>
                  </div>
                ))}
              </div>

              <svg className="h-44 w-16 text-clay sm:w-24" viewBox="0 0 96 176" fill="none" aria-hidden="true">
                <path d="M0 28H22C46 28 42 88 70 88H96M0 88H96M0 148H22C46 148 42 88 70 88" stroke="currentColor" strokeOpacity=".5" />
                <circle cx="48" cy="88" r="3" fill="currentColor" />
              </svg>

              <div className="border border-clay/30 bg-[#eaf1ff] p-5 text-[#17305a] dark:bg-[#172b4e] dark:text-white sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-clay dark:text-[#9dbdff]">Huzlr context</p>
                <p className="mt-8 font-serif text-2xl leading-tight tracking-[-0.04em]">What changed, who owns it, what happens next.</p>
              </div>
            </div>

            <div className="mx-auto h-12 w-px bg-clay/40" aria-hidden="true" />

            <div className="grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-3">
              {["Impact understood", "Owner identified", "Action reviewed"].map((item, index) => (
                <div key={item} className="bg-paper p-4 text-center">
                  <span className="font-mono text-[9px] text-clay">0{index + 1}</span>
                  <p className="mt-2 text-xs font-medium text-ink/65">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
