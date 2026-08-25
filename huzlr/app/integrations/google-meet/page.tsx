import { CalendarClock, FileText, ListChecks, Mic2 } from "lucide-react"

import { CommercialPage, type CommercialPageConfig } from "@/components/marketing/commercial-page"
import { createMarketingMetadata } from "@/lib/seo"

const description =
  "Use Google Meet project management AI to facilitate eligible standups and turn meeting context into reviewable summaries, blockers, decisions, and proposed actions."

export const metadata = createMarketingMetadata({
  title: "Google Meet Project Management AI Integration",
  description,
  path: "/integrations/google-meet",
  keywords: [
    "Google Meet project management AI",
    "AI meeting agent project management",
    "Google Meet action items automation",
    "meeting to Jira automation",
    "meeting action item automation",
  ],
})

const config = {
  path: "/integrations/google-meet",
  name: "Google Meet Project Management AI",
  eyebrow: "Google Meet integration",
  status: "Private beta",
  title: <>Move from a Google Meet conversation to <em className="italic text-clay">reviewable delivery context.</em></>,
  description,
  proofNote: "Calendar sync, controlled meeting joining, and optional meeting outputs are implemented. Direct meeting-to-Jira or meeting-to-Linear write-back is not generally available.",
  previewLabel: "Meeting-to-project workflow",
  previewTitle: "Platform standup",
  previewItems: [
    { label: "Decision", text: "Run the migration rehearsal before the release-readiness review." },
    { label: "Blocker", text: "Production credential approval is still outstanding." },
    { label: "Proposed action", text: "Confirm the credential owner and rehearsal date for human review." },
  ],
  sectionEyebrow: "Google Meet workflow",
  sectionTitle: <>Let the meeting produce more than a <em className="italic text-clay">transcript.</em></>,
  sectionDescription: "huzlr connects an explicit meeting policy to structured, reviewable project outputs so a conversation can inform delivery without silently changing the system of record.",
  steps: [
    { icon: CalendarClock, title: "Find eligible meetings", description: "Synchronize a dedicated Google Calendar account and apply organizer, invitation, title, timing, and duration rules." },
    { icon: Mic2, title: "Join visibly", description: "Use a named AI participant with a configured introduction and facilitation prompt for eligible Google Meet calls." },
    { icon: FileText, title: "Create the record", description: "Retain any enabled transcript, summary, decisions, blockers, and proposed action items after the meeting." },
    { icon: ListChecks, title: "Review the follow-up", description: "Confirm project relevance, ownership, dates, and wording before acting on meeting-generated outputs." },
  ],
  availableNow: [
    "Google Calendar synchronization for invited Google Meet events.",
    "Manual joining or configurable auto-join rules with explicit timing and duration controls.",
    "Optional transcripts, summaries, decisions, blockers, and proposed action items.",
  ],
  notYet: [
    "Automatic Jira or Linear issue changes from meeting action items.",
    "Reliable participant-name attribution when the available audio cannot support diarization.",
    "A general-purpose meeting bot for every meeting platform and meeting type.",
  ],
  faqs: [
    { question: "How does Google Meet project management AI work?", answer: "huzlr joins eligible calls as a visible AI participant, follows workspace instructions, and can create structured meeting outputs for human review after the call." },
    { question: "Can it turn meeting notes into Jira tasks?", answer: "Not automatically today. It can propose action items from supported meetings, but Jira write-back is not generally available and should remain reviewable." },
    { question: "Does the agent join every Google Meet?", answer: "No. Joining is opt-in and can be limited using organizer, invitation, title-tag, join-buffer, and maximum-duration rules." },
    { question: "Is it only for standups?", answer: "The current private-beta workflow is centered on delivery and Scrum meetings where structured decisions, blockers, and actions are useful." },
  ],
  related: [
    { href: "/ai-scrum-master", label: "AI Scrum Master", description: "See facilitation settings, safeguards, and outputs in detail." },
    { href: "/automated-daily-standups", label: "Automated standups", description: "Explore the live Google Meet standup workflow." },
    { href: "/integrations/jira", label: "Jira AI project manager", description: "Review the current Atlassian connection boundary." },
  ],
  ctaTitle: "Turn meeting follow-up into a visible, reviewable workflow.",
  ctaDescription: "Join the private beta to test Google Meet delivery coordination with your team's actual meeting policy.",
  ctaLabel: "Try the Google Meet beta",
} satisfies CommercialPageConfig

export default function GoogleMeetIntegrationPage() {
  return <CommercialPage config={config} />
}
