import Link from 'next/link';

import { Logo } from '@/components/logo';

export function Footer() {
  const year = new Date().getFullYear();

  const columns = [
    {
      heading: "Product",
      links: [
        { label: "Product overview", href: "/product" },
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
    <footer className="border-t border-hairline py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-7">
          {/* Brand */}
          <div className="col-span-2 space-y-4">
            <Logo size="lg" />
            <p className="text-sm leading-relaxed text-ink/50 max-w-xs">
              The coordination layer for teams working with AI.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading} className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-ink/40">
                {col.heading}
              </h3>
              <ul className="space-y-2.5 text-sm text-ink/60">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-clay transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-hairline pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink/40">© {year} huzlr. All rights reserved.</p>
          <p className="text-xs text-ink/40">Currently in private beta.</p>
        </div>
      </div>
    </footer>
  )
}
