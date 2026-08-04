import { Building2, Rocket, Layers, User } from "lucide-react"

export interface CustomerSegment {
  category: string
  title: string
  description: string
  icon: typeof Building2
}

export const CUSTOMER_SEGMENTS: CustomerSegment[] = [
  {
    category: "Enterprise",
    title: "Governance & security",
    description:
      "Unified portfolio oversight, security controls, and cross-team dependency tracking. Alignment at scale, without the status meetings.",
    icon: Building2,
  },
  {
    category: "Startups",
    title: "Move fast, see clearly",
    description:
      "Rapid planning and early risk signals keep your team shipping  while huzlr watches the dependencies you don't have time to track.",
    icon: Rocket,
  },
  {
    category: "Agencies",
    title: "Every client, one view",
    description:
      "Switch contexts effortlessly between client workspaces while keeping a unified picture of delivery health across your agency.",
    icon: Layers,
  },
  {
    category: "Solopreneurs",
    title: "Your AI co-founder",
    description:
      "From content calendars to product roadmaps, stay accountable and productive with an AI partner  no PM hire required.",
    icon: User,
  },
]
