import { Eye, FileChartColumn, ListChecks, ShieldAlert } from "lucide-react"

import { CommercialPage, type CommercialPageConfig } from "@/components/marketing/commercial-page"
import { createMarketingMetadata } from "@/lib/seo"

const description =
  "AI delivery management for delivery leaders who need clearer project visibility, less status chasing, reviewable stakeholder updates, and earlier blocker signals."

export const metadata = createMarketingMetadata({
  title: "AI Delivery Management for Delivery Leaders",
  description,
  path: "/solutions/delivery-leaders",
  keywords: [
    "AI delivery manager",
    "delivery intelligence platform",
    "project visibility software",
    "automated stakeholder updates",
    "delivery risk detection",
  ],
})

const config = {
  path: "/solutions/delivery-leaders",
  name: "AI Delivery Management for Delivery Leaders",
  eyebrow: "For delivery leaders",
  status: "Design-partner preview",
  title: <>See the delivery signal without chasing every <em className="italic text-clay">individual update.</em></>,
  description,
  proofNote: "Project records and meeting outputs are implemented. Automated portfolio reporting, cross-tool delivery intelligence, and predictive risk alerts remain design-partner workflows.",
  previewLabel: "Leadership review",
  previewTitle: "Release portfolio",
  previewItems: [
    { label: "Movement", text: "The preview deployment completed and validation is underway." },
    { label: "Intervention", text: "Production credential approval is blocking the migration rehearsal." },
    { label: "Decision", text: "Confirm whether the release review needs to move after the rehearsal date is known." },
  ],
  sectionEyebrow: "Leadership operating loop",
  sectionTitle: <>Move from status collection to <em className="italic text-clay">delivery intervention.</em></>,
  sectionDescription: "The intended workflow gives delivery leaders an evidence-linked view of movement, risk, and ownership while preserving human judgment around commitments and escalation.",
  steps: [
    { icon: Eye, title: "Gather visibility", description: "Bring project state and relevant meeting outputs into one reviewable delivery context." },
    { icon: FileChartColumn, title: "Explain movement", description: "Distinguish progress, unchanged work, decisions, and missing information for the reporting period." },
    { icon: ShieldAlert, title: "Surface intervention", description: "Carry explicit blockers and at-risk states forward without presenting prediction as fact." },
    { icon: ListChecks, title: "Review the response", description: "Confirm the owner, next action, stakeholder message, and escalation boundary before acting." },
  ],
  availableNow: [
    "Projects, issues, milestones, properties, documents, and team context inside huzlr.",
    "Reviewable Google Meet outputs including blockers, decisions, and proposed actions when enabled.",
    "Project delivery states that can represent active and at-risk work.",
  ],
  notYet: [
    "A generally available cross-tool portfolio dashboard or delivery intelligence platform.",
    "Scheduled stakeholder reporting and automatic multi-channel distribution.",
    "Predictive delay scoring or autonomous escalation across the portfolio.",
  ],
  faqs: [
    { question: "How can huzlr reduce status chasing?", answer: "The current foundation retains project and meeting context in a reviewable workspace. The design-partner reporting workflow aims to assemble that evidence into an update rather than asking every contributor to restate it." },
    { question: "Is this a delivery intelligence platform today?", answer: "Not as a generally available cross-tool product. huzlr has the project and meeting foundation; broader reporting, portfolio visibility, and risk signals are being validated." },
    { question: "Can leaders see multiple projects?", answer: "huzlr supports project workspaces and project records. A dedicated executive portfolio experience is not yet claimed as generally available." },
    { question: "Does huzlr escalate risks automatically?", answer: "No. Explicit blockers and at-risk state can be retained, but severity, ownership, communication, and escalation require human confirmation." },
  ],
  related: [
    { href: "/automated-project-status-reporting", label: "Automated status reporting", description: "Shape a review-first stakeholder update workflow." },
    { href: "/project-risk-detection", label: "AI project risk detection", description: "See how explicit blocker signals become reviewable risks." },
    { href: "/templates/project-status-report", label: "Status report template", description: "Use the practical reporting structure before automating it." },
  ],
  ctaTitle: "Build delivery visibility around the decisions you actually make.",
  ctaDescription: "Join the design-partner preview and test the workflow against a real portfolio review.",
  ctaLabel: "Book a delivery walkthrough",
} satisfies CommercialPageConfig

export default function DeliveryLeadersPage() {
  return <CommercialPage config={config} />
}
