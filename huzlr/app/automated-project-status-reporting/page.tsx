import {
  Database,
  FileCheck2,
  MessageSquareText,
  Send,
} from "lucide-react"

import { CommercialPage, type CommercialPageConfig } from "@/components/marketing/commercial-page"
import { createMarketingMetadata } from "@/lib/seo"

const description =
  "Automate project status updates from project records and standup outputs. Shape huzlr's review-first AI project status report and stakeholder update workflow."

export const metadata = createMarketingMetadata({
  title: "Automate Project Status Updates with AI",
  description,
  path: "/automated-project-status-reporting",
  keywords: [
    "automate project status updates",
    "AI project status report",
    "automated project status updates",
    "project status report automation",
    "stakeholder update automation",
  ],
})

const config = {
  path: "/automated-project-status-reporting",
  name: "Automated Project Status Reporting",
  eyebrow: "AI project status reporting",
  status: "Design-partner preview",
  title: <>Automate project status updates—not another <em className="italic text-clay">status chase.</em></>,
  description,
  proofNote: "Scheduled cross-tool report generation and stakeholder delivery are not generally available today; the current beta provides the meeting and project records that this workflow will use.",
  previewLabel: "Weekly delivery update",
  previewTitle: "Payments migration",
  previewItems: [
    { label: "Progress", text: "Preview deployment is complete and validation is in progress." },
    { label: "Risk", text: "Production credentials remain the release-critical dependency." },
    { label: "Next action", text: "Confirm credentials, run the migration rehearsal, and update the release decision." },
  ],
  sectionEyebrow: "The intended workflow",
  sectionTitle: <>From working context to a <em className="italic text-clay">reviewable update.</em></>,
  sectionDescription: "The design-partner workflow keeps source context and human approval visible instead of publishing an AI-written report without review.",
  steps: [
    { icon: Database, title: "Gather the records", description: "Bring together project records, issue state, and relevant meeting outputs for the reporting period." },
    { icon: MessageSquareText, title: "Explain the change", description: "Identify what moved, what did not, and which stated blocker or decision changed the delivery picture." },
    { icon: FileCheck2, title: "Review the draft", description: "Let a delivery owner confirm scope, owners, dates, risks, and language before the update leaves the team." },
    { icon: Send, title: "Share deliberately", description: "Publish the approved update to the intended stakeholder channel with its source period and owner attached." },
  ],
  availableNow: [
    "Google Meet transcripts, summaries, decisions, blockers, and proposed action items in the Scrum Master beta.",
    "Project and issue records inside huzlr that can provide delivery context.",
    "Human review of meeting outputs before they are treated as delivery facts.",
  ],
  notYet: [
    "A generally available scheduled weekly status-report generator.",
    "Automatic collection from every external delivery tool and communication channel.",
    "Automatic stakeholder delivery without an explicit review step.",
  ],
  faqs: [
    { question: "What is an AI project status report?", answer: "It is a project update assembled from delivery context such as progress, decisions, blockers, and next actions. In huzlr's intended workflow, a delivery owner reviews the draft before stakeholders receive it." },
    { question: "Can huzlr send our weekly report today?", answer: "Not as a generally available, scheduled workflow. The current private beta captures project and meeting context; automated report assembly and delivery are being developed with design partners." },
    { question: "Will the report invent missing owners or dates?", answer: "It should not. The intended workflow preserves unknown values and asks the delivery owner to review the draft before sharing." },
    { question: "Which inputs can be used now?", answer: "The current product stores huzlr project and issue records and can generate enabled meeting outputs from Google Meet standups. Broader live connector coverage remains limited." },
  ],
  related: [
    { href: "/templates/project-status-report", label: "Status report template", description: "Use a practical review-first structure for your next weekly update." },
    { href: "/blog/how-to-automate-project-status-reports", label: "Automation guide", description: "Build the evidence, uncertainty, review, and distribution workflow." },
    { href: "/solutions/delivery-leaders", label: "For delivery leaders", description: "Connect reporting to portfolio visibility and intervention decisions." },
  ],
  ctaTitle: "Help shape a status update your stakeholders can trust.",
  ctaDescription: "Join the private beta and tell us how your team gathers, reviews, and distributes delivery status today.",
  ctaLabel: "Join the design-partner preview",
} satisfies CommercialPageConfig

export default function AutomatedProjectStatusReportingPage() {
  return <CommercialPage config={config} />
}
