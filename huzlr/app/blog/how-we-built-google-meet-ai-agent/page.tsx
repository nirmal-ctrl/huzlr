import { GuidePage, type GuidePageConfig } from "@/components/marketing/guide-page"
import { createMarketingMetadata } from "@/lib/seo"

const description =
  "A first-hand look at the product constraints behind huzlr's Google Meet AI agent: calendar eligibility, visible identity, join controls, mixed audio, and reviewable outputs."

export const metadata = createMarketingMetadata({
  title: "How We Built a Google Meet AI Agent for Project Work",
  description,
  path: "/blog/how-we-built-google-meet-ai-agent",
  keywords: [
    "AI meeting agent project management",
    "Google Meet project management AI",
    "AI meeting action items",
    "meeting follow up automation",
    "meeting to project management automation",
  ],
})

const config = {
  path: "/blog/how-we-built-google-meet-ai-agent",
  name: "How We Built a Google Meet AI Agent for Project Work",
  eyebrow: "Product build story",
  title: <>How we built a Google Meet AI agent around <em className="italic text-clay">explicit control.</em></>,
  description,
  publishedDate: "2026-08-25",
  readTime: "9 minute read",
  reviewedBy: "the huzlr product team",
  opening: "The difficult part of a meeting agent is not producing a summary. It is deciding when the agent may enter, how everyone knows what it is doing, which outputs can be trusted, and where the automation must stop.",
  sections: [
    {
      title: "Start with meeting eligibility, not a bot",
      paragraphs: [
        "huzlr connects a dedicated Google account and synchronizes invited calendar events into a workspace meeting record. A Google Meet URL is necessary, but it is not sufficient permission for automatic participation.",
        "Workspace settings determine whether auto-join is enabled at all. Teams can limit automatic joining to meetings organized by the bot account, require an explicit Scrum tag in the title, and set join timing and maximum duration.",
      ],
      bullets: [
        "Manual joining remains available for an eligible meeting.",
        "Auto-join is a workspace choice rather than a hidden default.",
        "Calendar authorization can expire, so the product exposes reconnect state instead of failing silently.",
      ],
    },
    {
      title: "Make the agent visible",
      paragraphs: [
        "A meeting agent participates in a sensitive team ritual. huzlr gives it a configurable bot name and introduction so it can identify itself as an AI meeting assistant and explain that the meeting may produce a transcript or notes.",
        "The facilitation prompt is also a workspace setting. This lets a team define the agent's role without confusing a custom instruction with a change in product permissions.",
      ],
    },
    {
      title: "Treat the voice bridge as a state machine",
      paragraphs: [
        "The meeting record moves through explicit states such as queued, starting, authenticating, waiting for admission, joined, and leaving. Those states matter operationally: a user needs to know whether the agent is scheduled, waiting, active, complete, or failed.",
        "Once active, the voice-agent adapter can stream transcript segments into the meeting record. The UI keeps join time, status, errors, and retained outputs visible rather than reducing the entire workflow to a single magic button.",
      ],
    },
    {
      title: "Mixed audio creates a truth boundary",
      paragraphs: [
        "The available meeting audio can be mixed. Without reliable diarization, assigning every sentence to a named participant would create false precision. The current product therefore avoids inferring participant names when the signal cannot support it.",
        "This is a useful general rule for meeting-to-task automation: structured output should become less specific when the source evidence is weak, not more confident because the language model can produce a plausible answer.",
      ],
    },
    {
      title: "Generate proposed outputs, not silent system changes",
      paragraphs: [
        "Depending on workspace settings, huzlr can retain a transcript and generate a summary, decisions, blockers, and proposed action items. Each output has a different trust level. A transcript segment is source material; a summary is a transformation; a blocker or action is an interpretation that may need ownership and project context.",
        "That is why direct meeting-to-Jira write-back is not generally available today. The safer first product is a reviewable delivery record, followed by explicit approval before a system-of-record change.",
      ],
      bullets: [
        "Keep output generation configurable rather than mandatory.",
        "Preserve uncertainty when owners, dates, or participant identity are not established.",
        "Separate proposed action items from approved project commitments.",
        "Expose failure and reconnect states so an operator can recover deliberately.",
      ],
    },
    {
      title: "What we would validate next",
      paragraphs: [
        "The next useful work is not adding more confident copy. It is validating output quality across real standups, measuring correction rates, testing review controls, and determining which Jira fields and write actions teams will trust.",
        "A meeting agent becomes project-management infrastructure only when it connects conversation to execution without erasing consent, evidence, or human judgment.",
      ],
    },
  ],
  related: [
    { href: "/integrations/google-meet", label: "Google Meet integration", description: "See the current meeting workflow and availability boundary." },
    { href: "/ai-scrum-master", label: "AI Scrum Master", description: "Explore identity, eligibility, facilitation, and output controls." },
    { href: "/integrations/jira", label: "Jira connection", description: "Review the implemented OAuth boundary and planned data workflow." },
  ],
  ctaTitle: "Test the meeting agent against your actual operating policy.",
  ctaDescription: "Join the private beta to evaluate eligibility, facilitation, retained outputs, and review boundaries with a real delivery team.",
  ctaLabel: "Request meeting-agent access",
} satisfies GuidePageConfig

export default function GoogleMeetAgentBuildStory() {
  return <GuidePage config={config} />
}
