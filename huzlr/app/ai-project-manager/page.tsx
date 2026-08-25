import { Bot, FolderKanban, ListChecks, MessagesSquare } from "lucide-react"

import { CommercialPage, type CommercialPageConfig } from "@/components/marketing/commercial-page"
import { createMarketingMetadata } from "@/lib/seo"

const description =
  "Meet huzlr, an AI project manager for engineering teams that coordinates project context, live standups, blockers, decisions, and reviewable next actions."

export const metadata = createMarketingMetadata({
  title: "AI Project Manager for Engineering Teams",
  description,
  path: "/ai-project-manager",
  keywords: [
    "AI project manager",
    "AI project manager for engineering teams",
    "AI project manager for software teams",
    "AI project coordinator",
    "AI project management agent",
  ],
})

const config = {
  path: "/ai-project-manager",
  name: "AI Project Manager for Engineering Teams",
  eyebrow: "AI project manager",
  status: "Private beta",
  title: <>An AI project manager that does the <em className="italic text-clay">coordination work.</em></>,
  description,
  proofNote: "huzlr currently combines project work with a controlled Google Meet agent. Autonomous cross-tool planning, Jira write-back, and predictive delivery decisions are not generally available.",
  previewLabel: "Delivery coordination",
  previewTitle: "Payments migration",
  previewItems: [
    { label: "Meeting context", text: "The standup surfaced an unresolved production-credential blocker." },
    { label: "Project context", text: "The migration rehearsal remains the next release-critical milestone." },
    { label: "Reviewable action", text: "Confirm the credential owner and rehearsal date before updating delivery status." },
  ],
  sectionEyebrow: "How the coordination loop works",
  sectionTitle: <>Turn project context into a <em className="italic text-clay">clear next move.</em></>,
  sectionDescription: "The current product keeps evidence, AI-generated outputs, and human approval visible instead of pretending an AI PM agent can safely run every project by itself.",
  steps: [
    { icon: FolderKanban, title: "Hold the project context", description: "Organize projects, issues, milestones, documents, properties, and team context inside one workspace." },
    { icon: MessagesSquare, title: "Listen to delivery work", description: "Join eligible Google Meet standups as an identified participant and retain the enabled meeting outputs." },
    { icon: Bot, title: "Propose coordination", description: "Connect stated blockers, decisions, and proposed actions to the project context that gives them meaning." },
    { icon: ListChecks, title: "Keep humans in control", description: "Review owners, dates, risks, and proposed updates before they become delivery facts or system-of-record changes." },
  ],
  availableNow: [
    "Project, issue, milestone, document, and team records in a huzlr workspace.",
    "A configurable AI Scrum Master for eligible live Google Meet workflows.",
    "Reviewable transcripts, summaries, decisions, blockers, and proposed action items when enabled.",
  ],
  notYet: [
    "An autonomous AI project manager that plans and changes work without human review.",
    "Generally available live Jira import, continuous synchronization, or automatic write-back.",
    "Predictive portfolio forecasting across meetings, code, calendars, and external work tools.",
  ],
  faqs: [
    { question: "What is an AI project manager?", answer: "An AI project manager uses project context to assist with coordination tasks such as gathering updates, identifying blockers, summarizing decisions, and proposing follow-ups. In huzlr, consequential outputs remain reviewable." },
    { question: "Is huzlr built for engineering teams?", answer: "Yes. The current workflow is designed around software-delivery projects, issues, live standups, blockers, milestones, and the tools engineering teams already use." },
    { question: "Does it replace a human project manager?", answer: "No. huzlr is designed to reduce coordination overhead and status chasing while leaving prioritization, judgment, commitments, and sensitive communication with people." },
    { question: "Can it update Jira automatically?", answer: "Not as a generally available workflow. Jira OAuth is implemented, but live project import and write-back remain in production validation." },
  ],
  related: [
    { href: "/product", label: "AI project management software", description: "Explore the complete product and current capability boundaries." },
    { href: "/ai-scrum-master", label: "AI Scrum Master", description: "See the live meeting controls and reviewable Scrum outputs." },
    { href: "/automated-project-status-reporting", label: "Status automation", description: "Shape a review-first workflow for project and stakeholder updates." },
  ],
  ctaTitle: "Stop chasing project updates. Start with a controlled coordination loop.",
  ctaDescription: "Join the private beta to test huzlr with real engineering-delivery constraints and explicit human review.",
  ctaLabel: "Request private-beta access",
} satisfies CommercialPageConfig

export default function AiProjectManagerPage() {
  return <CommercialPage config={config} />
}
