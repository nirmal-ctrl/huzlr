import {
  CheckCircle2,
  Database,
  KeyRound,
  ListChecks,
} from "lucide-react"

import { CommercialPage, type CommercialPageConfig } from "@/components/marketing/commercial-page"
import { createMarketingMetadata } from "@/lib/seo"

const description =
  "Connect Jira to huzlr through Atlassian OAuth and help shape a review-first workflow for bringing Jira delivery context into AI coordination."

export const metadata = createMarketingMetadata({
  title: "Jira Integration for AI Delivery Coordination",
  description,
  path: "/integrations/jira",
})

const config = {
  path: "/integrations/jira",
  name: "Jira Integration",
  eyebrow: "Jira integration",
  status: "Connection beta",
  title: <>Keep Jira as the system of record. Add a layer for <em className="italic text-clay">coordination.</em></>,
  description,
  proofNote: "Atlassian OAuth connection and encrypted credential storage are implemented. Live production project import, continuous sync, and write-back are not generally available yet.",
  previewLabel: "Connected system",
  previewTitle: "Jira Cloud",
  previewItems: [
    { label: "Authorization", text: "A workspace user starts the Atlassian OAuth consent flow." },
    { label: "Connection", text: "huzlr stores encrypted access and refresh credentials and reports connection state." },
    { label: "Next phase", text: "Design partners will validate which projects, fields, and write actions belong in the coordination workflow." },
  ],
  sectionEyebrow: "Integration boundary",
  sectionTitle: <>Connect first. Expand data movement only with <em className="italic text-clay">clear controls.</em></>,
  sectionDescription: "The current implementation establishes the Atlassian connection. The import and write-back experience still needs production validation.",
  steps: [
    { icon: KeyRound, title: "Authorize Atlassian", description: "Start the Jira OAuth flow from an authenticated huzlr workspace and approve the requested access." },
    { icon: CheckCircle2, title: "Confirm connection", description: "huzlr stores encrypted credentials and exposes whether the user's Jira connection is present." },
    { icon: Database, title: "Choose the context", description: "The intended beta lets teams select the Jira projects and fields that should inform delivery coordination." },
    { icon: ListChecks, title: "Review every action", description: "Import and write-back behavior should remain visible and reviewable before it changes the system of record." },
  ],
  availableNow: [
    "An authenticated Atlassian OAuth authorization and callback flow.",
    "Encrypted storage for Jira access and refresh credentials.",
    "Connection status surfaced to the signed-in huzlr user.",
  ],
  notYet: [
    "Generally available live Jira project and issue import—the current project selection experience uses demonstration data.",
    "Continuous bidirectional synchronization between huzlr and Jira.",
    "Automatic Jira issue creation or updates from meeting action items.",
  ],
  faqs: [
    { question: "Can I import live Jira projects today?", answer: "Not as a generally available production workflow. The OAuth connection is implemented, while the current project-selection experience still uses demonstration data." },
    { question: "Does huzlr replace Jira?", answer: "No. The product direction keeps Jira as a system of record and adds coordination around meetings, project context, blockers, and next actions." },
    { question: "Are Jira credentials stored securely?", answer: "The backend encrypts the access and refresh tokens before storing the connection. Production security review and operational controls still remain part of rollout." },
    { question: "Does huzlr write issues automatically?", answer: "No generally available write-back workflow is claimed today. Proposed actions should remain reviewable before they change Jira." },
  ],
  related: [
    { href: "/product", label: "Product overview", description: "See how connected systems fit into huzlr's broader coordination model." },
    { href: "/automated-project-status-reporting", label: "Status reporting", description: "Explore the reviewed reporting workflow that Jira context can eventually support." },
    { href: "/ai-scrum-master", label: "AI Scrum Master", description: "Capture meeting decisions and proposed actions before any system-of-record update." },
  ],
  ctaTitle: "Help define the Jira workflow your delivery team will trust.",
  ctaDescription: "Join the private beta to validate project selection, field mapping, review controls, and the right boundary for write-back.",
  ctaLabel: "Join the Jira connection beta",
} satisfies CommercialPageConfig

export default function JiraIntegrationPage() {
  return <CommercialPage config={config} />
}
