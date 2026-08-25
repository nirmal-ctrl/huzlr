import {
  AlertTriangle,
  Eye,
  ListChecks,
  ShieldCheck,
} from "lucide-react"

import { CommercialPage, type CommercialPageConfig } from "@/components/marketing/commercial-page"
import { createMarketingMetadata } from "@/lib/seo"

const description =
  "Turn explicitly stated blockers and project context into reviewable delivery-risk signals. Join huzlr's design-partner preview for project risk detection."

export const metadata = createMarketingMetadata({
  title: "Project Risk Detection for Delivery Teams",
  description,
  path: "/project-risk-detection",
})

const config = {
  path: "/project-risk-detection",
  name: "Project Risk Detection",
  eyebrow: "Delivery risk signals",
  status: "Design-partner preview",
  title: <>Surface the blocker while the team can still <em className="italic text-clay">change the outcome.</em></>,
  description,
  proofNote: "The current beta can retain blockers stated in meeting outputs and project risk state. Predictive cross-tool detection is not generally available today.",
  previewLabel: "Risk review",
  previewTitle: "Release readiness",
  previewItems: [
    { label: "Signal", text: "Production credential approval is still outstanding." },
    { label: "Possible impact", text: "The migration rehearsal and release decision may move." },
    { label: "Human review", text: "Confirm severity, owner, and response before treating the signal as an active risk." },
  ],
  sectionEyebrow: "Review-first detection",
  sectionTitle: <>Connect evidence to a risk without pretending the model <em className="italic text-clay">knows the future.</em></>,
  sectionDescription: "The intended workflow preserves the source signal, separates inference from fact, and asks a delivery owner to confirm the response.",
  steps: [
    { icon: Eye, title: "Capture the signal", description: "Retain a stated blocker, changed date, unresolved dependency, or explicit at-risk project state." },
    { icon: AlertTriangle, title: "Explain the impact", description: "Connect the signal to the milestone, owner, or delivery decision it may affect without inventing certainty." },
    { icon: ShieldCheck, title: "Confirm the risk", description: "Ask a delivery owner to validate severity, ownership, timing, and whether intervention is actually needed." },
    { icon: ListChecks, title: "Track the response", description: "Keep the approved mitigation and follow-up visible alongside the delivery context that produced it." },
  ],
  availableNow: [
    "Meeting-output extraction for blockers explicitly raised during supported Google Meet workflows.",
    "Project delivery states that can represent at-risk work.",
    "Human review of summaries and proposed action items before they become coordination facts.",
  ],
  notYet: [
    "Predictive delay scoring across Jira, commits, conversations, and calendars.",
    "Autonomous risk severity, ownership, or mitigation decisions.",
    "A generally available portfolio risk dashboard with validated alert quality.",
  ],
  faqs: [
    { question: "Does huzlr predict project delays today?", answer: "No generally available predictive model is claimed. The current beta can retain stated blockers and project state; broader cross-tool detection is a design-partner workflow." },
    { question: "What counts as a risk signal?", answer: "Examples include an explicitly stated blocker, a changed delivery date, an unresolved dependency, or an at-risk project state. A human should still confirm impact and response." },
    { question: "Will huzlr assign a risk owner automatically?", answer: "Not when the source context did not establish one. The intended workflow preserves uncertainty and requests confirmation." },
    { question: "Who should join the preview?", answer: "Delivery and engineering leaders who can provide real risk-review workflows and evaluate whether signals are timely, explainable, and actionable." },
  ],
  related: [
    { href: "/automated-project-status-reporting", label: "Status reporting", description: "Carry confirmed risks into a reviewed stakeholder update." },
    { href: "/ai-scrum-master", label: "AI Scrum Master", description: "Capture the blockers and decisions voiced during live standups." },
    { href: "/product", label: "Product overview", description: "See how risk signals fit into the broader coordination model." },
  ],
  ctaTitle: "Design a risk signal your team will act on—not ignore.",
  ctaDescription: "Join the design-partner preview to validate signals, explanations, review controls, and intervention timing.",
  ctaLabel: "Join the risk preview",
} satisfies CommercialPageConfig

export default function ProjectRiskDetectionPage() {
  return <CommercialPage config={config} />
}
