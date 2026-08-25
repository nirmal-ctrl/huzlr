import {
  CalendarCheck,
  ListChecks,
  Mic2,
  Settings2,
} from "lucide-react"

import { CommercialPage, type CommercialPageConfig } from "@/components/marketing/commercial-page"
import { createMarketingMetadata } from "@/lib/seo"

const description =
  "Run an automated daily standup in Google Meet with an identified AI standup bot, configurable join rules, and reviewable summaries, blockers, and action items."

export const metadata = createMarketingMetadata({
  title: "Automated Daily Standup and AI Standup Bot",
  description,
  path: "/automated-daily-standups",
  keywords: [
    "automated daily standup",
    "AI standup bot",
    "standup automation",
    "automate daily standups",
    "AI standup summary",
  ],
})

const config = {
  path: "/automated-daily-standups",
  name: "Automated Daily Standups",
  eyebrow: "Standup automation",
  status: "Private beta",
  title: <>An automated daily standup without making the team talk to <em className="italic text-clay">another form.</em></>,
  description,
  proofNote: "The current beta focuses on live Google Meet standups. Async Slack or Microsoft Teams questionnaires are not part of the generally available workflow.",
  previewLabel: "Standup record",
  previewTitle: "Platform team · 9:30 AM",
  previewItems: [
    { label: "Completed", text: "The preview environment and smoke-test checklist are ready." },
    { label: "Next", text: "Run the migration rehearsal and prepare the release review." },
    { label: "Blocker", text: "The production credential approval is still outstanding." },
  ],
  sectionEyebrow: "Live standup workflow",
  sectionTitle: <>A repeatable standup with a <em className="italic text-clay">visible operating policy.</em></>,
  sectionDescription: "The workspace controls which meetings qualify, how the agent introduces itself, and which outputs are retained.",
  steps: [
    { icon: CalendarCheck, title: "Sync eligible events", description: "Connect a dedicated Google account so the workspace can identify invited Google Meet events." },
    { icon: Settings2, title: "Choose the policy", description: "Keep auto-join off, enable it selectively, or require an explicit Scrum tag and organizer rule." },
    { icon: Mic2, title: "Facilitate live", description: "The named AI participant introduces itself and follows the workspace instructions for the conversation." },
    { icon: ListChecks, title: "Review the record", description: "Inspect the enabled transcript, summary, blockers, decisions, and proposed action items after the meeting." },
  ],
  availableNow: [
    "Google Calendar synchronization and manual or policy-based Google Meet joining.",
    "A configurable bot name, introduction, facilitation prompt, join timing, and duration limit.",
    "Optional transcripts, summaries, decisions, blockers, and proposed action items.",
  ],
  notYet: [
    "Async standup collection through Slack or Microsoft Teams questionnaires.",
    "Reliable participant-name attribution when mixed audio cannot support diarization.",
    "Automatic Jira write-back for every proposed action item.",
  ],
  faqs: [
    { question: "What does an AI standup bot do?", answer: "huzlr's current AI standup bot joins eligible live Google Meet calls as a visible participant, follows a configured facilitation prompt, and can produce reviewable summaries, blockers, decisions, and proposed actions." },
    { question: "Is this a standup bot or a meeting participant?", answer: "The current beta is a named AI participant in live Google Meet calls. It can facilitate the conversation and create reviewable outputs when those settings are enabled." },
    { question: "Does it join every meeting?", answer: "No. Auto-join is opt-in and can be restricted by organizer, invitation, title tag, join buffer, and maximum duration." },
    { question: "Does the team know it is an AI?", answer: "Yes. The product uses a visible bot identity and an introduction that states it is an AI meeting assistant and may produce transcript or meeting notes." },
  ],
  related: [
    { href: "/ai-scrum-master", label: "AI Scrum Master", description: "See the facilitation controls, safeguards, and meeting outputs in more detail." },
    { href: "/integrations/google-meet", label: "Google Meet integration", description: "Review the calendar, meeting-agent, and output workflow." },
    { href: "/compare/huzlr-vs-standup-bots", label: "Compare standup bots", description: "Choose between live meeting coordination and async collection." },
  ],
  ctaTitle: "Let the standup end with a record the team can use.",
  ctaDescription: "Create a workspace to request access to live Google Meet standup automation in the huzlr private beta.",
  ctaLabel: "Try the private beta",
} satisfies CommercialPageConfig

export default function AutomatedDailyStandupsPage() {
  return <CommercialPage config={config} />
}
