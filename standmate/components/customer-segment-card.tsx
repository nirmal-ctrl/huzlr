import type { CustomerSegment } from "@/constants/customer-segments"

export function CustomerSegmentCard({
  category,
  title,
  description,
  icon: Icon,
}: CustomerSegment) {
  return (
    <div className="group relative flex h-full flex-col rounded-2xl border border-hairline bg-sand/40 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-clay/30 hover:bg-sand/70">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-clay/10 text-clay transition-colors duration-300 group-hover:bg-clay group-hover:text-white">
          <Icon size={18} strokeWidth={2} />
        </div>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/40 transition-colors duration-300 group-hover:text-clay">
          {category}
        </span>
      </div>

      <h3 className="mt-6 font-serif text-2xl tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink/60">{description}</p>
    </div>
  )
}
