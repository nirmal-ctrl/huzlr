import Link from 'next/link';

import { Logo } from '@/components/logo';

export function Footer() {
  const year = new Date().getFullYear();

  const columns = [
    {
      heading: "Product",
      links: [
        { label: "Product overview", href: "/product" },
        { label: "How it works", href: "/how-it-works" },
        { label: "AI Project Manager", href: "/ai-project-manager" },
        { label: "AI Scrum Master", href: "/ai-scrum-master" },
        { label: "Automated standups", href: "/automated-daily-standups" },
        { label: "Status reporting", href: "/automated-project-status-reporting" },
        { label: "Risk detection", href: "/project-risk-detection" },
      ],
    },
    {
      heading: "Solutions",
      links: [
        { label: "Delivery leaders", href: "/solutions/delivery-leaders" },
        { label: "Agencies", href: "/solutions/agencies" },
      ],
    },
    {
      heading: "Integrations",
      links: [
        { label: "Jira", href: "/integrations/jira" },
        { label: "Google Meet", href: "/integrations/google-meet" },
      ],
    },
    {
      heading: "Resources",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Case Studies", href: "/case-studies" },
        { label: "Status report template", href: "/templates/project-status-report" },
        { label: "Compare", href: "/compare" },
        { label: "FAQ", href: "/#faq" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Pitch Deck", href: "/pitch-deck" },
        { label: "Contact", href: "mailto:hello@huzlr.com" },
      ],
    },
  ];

  return (
    <footer className="bg-paper px-5 pb-8 pt-16 md:px-8 md:pt-24">
      <div className="mx-auto max-w-[1344px]">
        <div className="mb-16 grid grid-cols-2 gap-x-8 gap-y-12 border-t border-hairline pt-10 lg:grid-cols-[2fr_repeat(5,1fr)]">
          {/* Brand */}
          <div className="col-span-2 space-y-5 lg:col-span-1">
            <Logo size="lg" />
            <p className="max-w-[16rem] font-serif text-xl leading-snug tracking-[-0.03em] text-ink/70">
              One clear next move for every modern team.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading} className="space-y-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35">
                {col.heading}
              </h3>
              <ul className="space-y-3 text-sm text-ink/55">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition-colors hover:text-clay">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-hairline pt-7 sm:flex-row">
          <p className="text-xs text-ink/35">© {year} huzlr. All rights reserved.</p>
          <div className="flex items-center gap-2 text-xs text-ink/35"><span className="size-1.5 rounded-full bg-emerald-500" />Currently in private beta.</div>
        </div>
      </div>
    </footer>
  )
}
