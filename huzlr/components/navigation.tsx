"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronDown,
  FileChartColumn,
  FileText,
  FolderKanban,
  GitCompareArrows,
  Layers3,
  ShieldAlert,
  UsersRound,
} from "lucide-react"

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { Logo } from "@/components/logo"
import { TrackedLink } from "@/components/tracked-link"
import { cn } from "@/lib/utils"

interface MenuLink {
  label: string
  href: string
  description: string
  icon: LucideIcon
  status?: string
}

const productLinks: MenuLink[] = [
  {
    label: "AI Project Manager",
    href: "/ai-project-manager",
    description: "Coordinate engineering work across projects, meetings, blockers, and next actions.",
    icon: Bot,
    status: "Private beta",
  },
  {
    label: "AI Scrum Master",
    href: "/ai-scrum-master",
    description: "Facilitate Google Meet standups and create reviewable outputs.",
    icon: Bot,
    status: "Private beta",
  },
  {
    label: "Automated standups",
    href: "/automated-daily-standups",
    description: "Run live standups with explicit calendar and join policies.",
    icon: CalendarCheck,
    status: "Private beta",
  },
  {
    label: "Status reporting",
    href: "/automated-project-status-reporting",
    description: "Turn delivery context into a reviewed stakeholder update.",
    icon: FileChartColumn,
    status: "Preview",
  },
  {
    label: "Risk detection",
    href: "/project-risk-detection",
    description: "Turn stated blockers into explainable, reviewable risk signals.",
    icon: ShieldAlert,
    status: "Preview",
  },
]

const solutionLinks: MenuLink[] = [
  {
    label: "Delivery leaders",
    href: "/solutions/delivery-leaders",
    description: "Reduce status chasing and review delivery signals across projects.",
    icon: UsersRound,
    status: "Preview",
  },
  {
    label: "Agencies",
    href: "/solutions/agencies",
    description: "Keep client delivery context and reporting workflows reviewable.",
    icon: BriefcaseBusiness,
    status: "Preview",
  },
]

const integrationLinks: MenuLink[] = [
  {
    label: "Jira",
    href: "/integrations/jira",
    description: "Connect through Atlassian OAuth and shape the production data workflow.",
    icon: FolderKanban,
    status: "Connection beta",
  },
  {
    label: "Google Meet workflow",
    href: "/integrations/google-meet",
    description: "See the implemented calendar, meeting-agent, and output controls.",
    icon: CalendarCheck,
    status: "Private beta",
  },
]

const resourceLinks: MenuLink[] = [
  {
    label: "Blog",
    href: "/blog",
    description: "Engineering stories and practical delivery coordination guides.",
    icon: BookOpen,
  },
  {
    label: "Case studies",
    href: "/case-studies",
    description: "Proof and implementation stories from teams using huzlr.",
    icon: Layers3,
  },
  {
    label: "Status report template",
    href: "/templates/project-status-report",
    description: "Copy a review-first weekly project update structure.",
    icon: FileText,
  },
  {
    label: "Compare workflows",
    href: "/compare",
    description: "Evaluate AI project management by collection model and action boundary.",
    icon: GitCompareArrows,
  },
]

export function Navigation() {
  return (
    <div className="relative flex w-full items-center justify-center">
      <Navbar className="top-2" />
    </div>
  )
}

function Navbar({ className }: { className?: string }) {
  return (
    <div className={cn("fixed inset-x-0 top-6 z-50 mx-auto max-w-5xl px-4", className)}>
      <nav className="relative flex items-center justify-between gap-4 rounded-full border border-hairline bg-paper/90 py-2.5 pl-6 pr-3 shadow-sm shadow-ink/5 backdrop-blur-xl">
        <Logo />

        <NavigationMenu className="hidden max-w-none flex-none lg:flex" delayDuration={80} skipDelayDuration={250}>
          <NavigationMenuList className="gap-0.5">
            <NavigationMenuItem>
              <NavigationMenuTrigger className="h-9 rounded-full bg-transparent px-3 text-[13px] text-ink/70 hover:bg-sand hover:text-ink data-[state=open]:bg-sand data-[state=open]:text-ink">
                Product
              </NavigationMenuTrigger>
              <NavigationMenuContent className="p-3 md:w-[880px]">
                <div className="grid gap-3 md:grid-cols-[0.68fr_1.32fr]">
                  <NavigationMenuLink asChild className="p-0">
                    <Link
                      href="/product"
                      className="group flex h-full flex-col justify-between rounded-xl bg-ink p-6 text-paper outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-clay"
                    >
                      <div>
                        <span className="flex size-10 items-center justify-center rounded-lg bg-paper/10 text-paper"><Layers3 size={18} /></span>
                        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper/55">Product overview</p>
                        <p className="mt-2 font-serif text-3xl leading-tight">The coordination layer for hybrid delivery.</p>
                      </div>
                      <span className="mt-8 text-sm font-medium text-paper/70 transition-colors group-hover:text-paper">Explore the product →</span>
                    </Link>
                  </NavigationMenuLink>
                  <div>
                    <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/55">Product workflows</p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {productLinks.map((item) => <MegaMenuLink key={item.href} item={item} />)}
                    </div>
                    <p className="mx-4 mt-2 border-t border-hairline px-0 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/55">For teams</p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {solutionLinks.map((item) => <MegaMenuLink key={item.href} item={item} />)}
                    </div>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger className="h-9 rounded-full bg-transparent px-3 text-[13px] text-ink/70 hover:bg-sand hover:text-ink data-[state=open]:bg-sand data-[state=open]:text-ink">
                Integrations
              </NavigationMenuTrigger>
              <NavigationMenuContent className="p-3 md:w-[560px]">
                <div className="grid gap-2 sm:grid-cols-2">
                  {integrationLinks.map((item) => <MegaMenuLink key={item.label} item={item} />)}
                </div>
                <p className="mx-2 mt-2 border-t border-hairline pt-3 text-xs leading-relaxed text-ink/65">
                  Live connector coverage is intentionally limited during private beta. Each page states the current boundary.
                </p>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger className="h-9 rounded-full bg-transparent px-3 text-[13px] text-ink/70 hover:bg-sand hover:text-ink data-[state=open]:bg-sand data-[state=open]:text-ink">
                Resources
              </NavigationMenuTrigger>
              <NavigationMenuContent className="p-3 md:w-[640px]">
                <div className="grid gap-2 sm:grid-cols-2">
                  {resourceLinks.map((item) => <MegaMenuLink key={item.href} item={item} />)}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild className="rounded-full bg-transparent px-3 py-2 text-[13px] font-medium text-ink/70 hover:bg-sand hover:text-ink">
                <Link href="/how-it-works">How it works</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-1 rounded-full px-3 text-xs font-medium text-ink/70 hover:bg-sand hover:text-ink">
                  Menu
                  <ChevronDown className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mt-2 max-h-[75vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto p-2">
                <DropdownMenuLabel className="px-2 text-[10px] uppercase tracking-[0.14em] text-ink/60">Product</DropdownMenuLabel>
                <MobileMenuItem label="Product overview" href="/product" />
                {productLinks.map((item) => <MobileMenuItem key={item.href} label={item.label} href={item.href} />)}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 text-[10px] uppercase tracking-[0.14em] text-ink/60">Solutions</DropdownMenuLabel>
                {solutionLinks.map((item) => <MobileMenuItem key={item.href} label={item.label} href={item.href} />)}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 text-[10px] uppercase tracking-[0.14em] text-ink/60">Integrations</DropdownMenuLabel>
                <MobileMenuItem label="Jira" href="/integrations/jira" />
                <MobileMenuItem label="Google Meet" href="/integrations/google-meet" />
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 text-[10px] uppercase tracking-[0.14em] text-ink/60">Resources</DropdownMenuLabel>
                <MobileMenuItem label="Blog" href="/blog" />
                <MobileMenuItem label="Case studies" href="/case-studies" />
                <MobileMenuItem label="Status report template" href="/templates/project-status-report" />
                <MobileMenuItem label="Compare workflows" href="/compare" />
                <MobileMenuItem label="How it works" href="/how-it-works" />
                <MobileMenuItem label="Why huzlr" href="/#why-huzlr" />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AnimatedThemeToggler className="flex size-9 items-center justify-center rounded-full p-2 text-ink/70 transition-colors hover:bg-sand hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay" />

          <Button asChild className="hidden h-9 cursor-pointer rounded-full bg-clay px-4 text-[13px] font-medium text-white transition-colors hover:bg-clay-deep sm:inline-flex dark:text-paper">
            <TrackedLink
              href="/signup"
              eventName="CTA Click"
              eventProperties={{ location: "navigation", destination: "signup", label: "Join the private beta" }}
            >
              Join the private beta
            </TrackedLink>
          </Button>
        </div>
      </nav>
    </div>
  )
}

function MegaMenuLink({ item }: { item: MenuLink }) {
  const Icon = item.icon

  return (
    <NavigationMenuLink asChild className="p-0">
      <Link href={item.href} className="group rounded-xl p-4 outline-none transition-colors hover:bg-sand/70 focus-visible:bg-sand/70 focus-visible:ring-2 focus-visible:ring-clay/40">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-clay/10 text-clay"><Icon size={17} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">{item.label}</span>
              {item.status && <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-clay">{item.status}</span>}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink/65">{item.description}</p>
          </div>
        </div>
      </Link>
    </NavigationMenuLink>
  )
}

function MobileMenuItem({ label, href }: { label: string; href: string }) {
  return (
    <DropdownMenuItem asChild>
      <Link href={href} className="w-full cursor-pointer rounded-md px-2 py-2 font-medium">{label}</Link>
    </DropdownMenuItem>
  )
}
