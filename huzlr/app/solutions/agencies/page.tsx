import { BriefcaseBusiness, FileChartColumn, FolderKanban, Users } from "lucide-react"

import { CommercialPage, type CommercialPageConfig } from "@/components/marketing/commercial-page"
import { createMarketingMetadata } from "@/lib/seo"

const description =
  "AI project management for agencies that need separate client delivery context, fewer status chases, reviewable client updates, and clearer blockers across projects."

export const metadata = createMarketingMetadata({
  title: "AI Project Manager for Agencies",
  description,
  path: "/solutions/agencies",
  keywords: [
    "AI project manager for agencies",
    "AI project management for agencies",
    "project management automation for agencies",
    "client status report automation",
    "agency delivery management",
  ],
})

const config = {
  path: "/solutions/agencies",
  name: "AI Project Manager for Agencies",
  eyebrow: "For agencies",
  status: "Design-partner preview",
  title: <>Coordinate client delivery without turning every Friday into a <em className="italic text-clay">status chase.</em></>,
  description,
  proofNote: "Separate project records and live meeting outputs are available in the current product. Automated client reports, account-level portfolios, and client-facing delivery portals are not generally available.",
  previewLabel: "Client delivery review",
  previewTitle: "Commerce rebuild",
  previewItems: [
    { label: "Progress", text: "Checkout validation is underway in the preview environment." },
    { label: "Client dependency", text: "Production payment credentials remain outstanding." },
    { label: "Next update", text: "Confirm the owner and impact before including the blocker in the client report." },
  ],
  sectionEyebrow: "Agency coordination loop",
  sectionTitle: <>Keep each client context separate and every update <em className="italic text-clay">reviewable.</em></>,
  sectionDescription: "The intended workflow connects project records and delivery conversations to the client update, while keeping sensitive language and commitments under agency control.",
  steps: [
    { icon: BriefcaseBusiness, title: "Separate client work", description: "Create distinct project contexts for delivery records, milestones, issues, documents, and team ownership." },
    { icon: Users, title: "Capture the conversation", description: "Use supported Google Meet workflows to retain enabled decisions, blockers, summaries, and proposed actions." },
    { icon: FolderKanban, title: "Connect the evidence", description: "Relate progress and blockers to the client project instead of rebuilding context from memory." },
    { icon: FileChartColumn, title: "Review the update", description: "Confirm commitments, client language, dates, owners, and risks before the report leaves the agency." },
  ],
  availableNow: [
    "Multiple project records with issues, milestones, documents, and team context.",
    "Controlled Google Meet participation and reviewable meeting outputs when enabled.",
    "Human review boundaries around summaries, blockers, and proposed actions.",
  ],
  notYet: [
    "A generally available automated client status-report scheduler.",
    "A dedicated client portal with account-specific permissions and branding.",
    "Autonomous cross-client prioritization, staffing, or commitment decisions.",
  ],
  faqs: [
    { question: "How does AI project management help agencies?", answer: "It can reduce the manual coordination involved in gathering project context, summarizing delivery conversations, identifying explicit blockers, and preparing a client update for review." },
    { question: "Can huzlr send client reports automatically?", answer: "Not today as a generally available workflow. Scheduled report assembly and delivery remain in design-partner validation." },
    { question: "Can client projects stay separate?", answer: "The current product supports separate project records. A dedicated client portal and a complete agency account-permission model are not claimed yet." },
    { question: "Will AI make client commitments?", answer: "No. Scope, dates, commercial commitments, escalation, and client-facing language should remain under human agency control." },
  ],
  related: [
    { href: "/automated-project-status-reporting", label: "Client status automation", description: "Explore the review-first reporting workflow being validated." },
    { href: "/templates/project-status-report", label: "Project status template", description: "Start with a clear, reusable client-update structure." },
    { href: "/ai-project-manager", label: "AI project manager", description: "See the broader coordination loop for engineering teams." },
  ],
  ctaTitle: "Test huzlr against a real client-delivery week.",
  ctaDescription: "Join the design-partner preview and help shape an agency workflow that protects context, trust, and human commitments.",
  ctaLabel: "Request an agency walkthrough",
} satisfies CommercialPageConfig

export default function AgenciesPage() {
  return <CommercialPage config={config} />
}
