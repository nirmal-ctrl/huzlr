import { cn } from "@/lib/utils"

const projectAccents = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
]

export function ProjectIdentity({
    projectId,
    projectName,
    className,
}: {
    projectId: number
    projectName?: string | null
    className?: string
}) {
    const accent = projectAccents[Math.abs(projectId) % projectAccents.length]

    return (
        <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
            <span className={cn("size-2 shrink-0 rounded-[3px]", accent)} aria-hidden="true" />
            <span className="truncate">{projectName?.trim() || `Project #${projectId}`}</span>
        </span>
    )
}
