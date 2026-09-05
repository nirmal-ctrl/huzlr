import { CalendarCheck, FolderKanban, ListChecks, MessagesSquare } from "lucide-react"

import { CommercialPage, type CommercialPageConfig } from "@/components/marketing/commercial-page"
import { createMarketingMetadata } from "@/lib/seo"

const description =
  "See how huzlr's AI project manager works: organize delivery context, connect eligible Google Meet standups, review meeting outputs, and coordinate the next action."

export const metadata = createMarketingMetadata({
  title: "How huzlr's AI Project Manager Works",
  description,
  path: "/how-it-works",
  keywords: [
    "how AI project management works",
    "AI project manager workflow",
    "project management automation workflow",
    "AI project coordination",
    "meeting to project management automation",
  ],
})

const config = {
  path: "/how-it-works",
  name: "How huzlr Works",
  eyebrow: "How huzlr works",
  status: "Private beta",
  title: <>Turn delivery context into a <em className="italic text-clay">reviewable next move.</em></>,
  description,
  proofNote: "The current beta combines huzlr project records with controlled Google Meet workflows. Cross-tool automation, scheduled reporting, and predictive risk detection are not generally available.",
  previewLabel: "Example coordination loop",
  previewTitle: "Payments migration",
  previewItems: [
    { label: "Project context", text: "The migration rehearsal is the next release-critical milestone." },
    { label: "Meeting signal", text: "The standup surfaced an unresolved production-credential blocker." },
    { label: "Human-reviewed action", text: "Confirm the credential owner and rehearsal date before changing delivery status." },
  ],
  sectionEyebrow: "The current workflow",
  sectionTitle: <>Four steps from project context to <em className="italic text-clay">accountable action.</em></>,
  sectionDescription: "huzlr keeps meeting eligibility, generated outputs, evidence, and human review visible instead of presenting full autonomy as an implemented feature.",
  steps: [
    {
      icon: FolderKanban,
      title: "Organize the context",
      description: "Keep projects, issues, milestones, documents, properties, and team context in a huzlr workspace.",
    },
    {
      icon: CalendarCheck,
      title: "Connect eligible meetings",
      description: "Synchronize a dedicated Google Calendar account and choose which Google Meet events the AI participant may join.",
    },
    {
      icon: MessagesSquare,
      title: "Create the delivery record",
      description: "Use an identified meeting participant to facilitate and retain enabled transcripts, summaries, decisions, blockers, and proposed actions.",
    },
    {
      icon: ListChecks,
      title: "Review the next move",
      description: "Confirm relevance, ownership, dates, risk, and wording before generated outputs become delivery facts or external updates.",
    },
  ],
  availableNow: [
    "Projects, issues, milestones, documents, properties, and team context inside huzlr.",
    "Google Calendar synchronization with manual or policy-based Google Meet joining.",
    "Configurable AI participant identity, facilitation instructions, duration, and retained meeting outputs.",
    "Human review of summaries, decisions, blockers, and proposed action items.",
  ],
  notYet: [
    "Continuous reading and autonomous changes across every project, conversation, codebase, and external tool.",
    "Generally available live Jira project import, continuous synchronization, or automatic write-back.",
    "Scheduled stakeholder reporting, predictive delay scoring, or autonomous risk escalation.",
  ],
  faqs: [
    {
      question: "How does huzlr work today?",
      answer: "The current private beta combines huzlr project records with a controlled Google Meet workflow. Teams configure meeting eligibility and retained outputs, then review the resulting summaries, decisions, blockers, and proposed actions.",
    },
    {
      question: "Does huzlr automatically change project work?",
      answer: "Not as a generally available cross-tool workflow. Generated meeting outputs remain reviewable, and Jira import or write-back is still in production validation.",
    },
    {
      question: "Does the AI participant join every meeting?",
      answer: "No. Joining is opt-in and can be limited by organizer, invitation, title tag, timing, and maximum duration.",
    },
    {
      question: "Where does human review happen?",
      answer: "Teams review meeting-generated summaries, decisions, blockers, owners, dates, and proposed actions before treating them as delivery facts or sharing them with stakeholders.",
    },
  ],
  related: [
    { href: "/ai-project-manager", label: "AI Project Manager", description: "See the broader engineering-delivery coordination use case." },
    { href: "/ai-scrum-master", label: "AI Scrum Master", description: "Explore meeting eligibility, facilitation controls, and outputs." },
    { href: "/product", label: "Product overview", description: "Review every current and preview capability in one place." },
  ],
  ctaTitle: "Test the workflow with a real delivery constraint.",
  ctaDescription: "Join the private beta to evaluate the project context, meeting policy, generated outputs, and human-review boundary with your team.",
  ctaLabel: "Request private-beta access",
} satisfies CommercialPageConfig

export default function HowItWorksPage() {
  return <CommercialPage config={config} />
}
