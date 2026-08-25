import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  FileText,
  ListChecks,
  Mic2,
  Settings2,
  ShieldCheck,
} from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { TrackedLink } from "@/components/tracked-link"
import { Button } from "@/components/ui/button"
import { NoiseTexture } from "@/components/ui/noise-texture"
import { absoluteUrl, createMarketingMetadata, serializeJsonLd, siteConfig } from "@/lib/seo"

const description =
  "Run focused Google Meet standups with an AI Scrum Master that follows workspace join rules and produces transcripts, summaries, blockers, decisions, and proposed action items."

export const metadata = createMarketingMetadata({
  title: "AI Scrum Master for Google Meet Standups",
  description,
  path: "/ai-scrum-master",
  keywords: ["AI Scrum Master", "AI Scrum Master software", "AI Scrum Master tool", "Scrum Master automation", "AI Scrum Master for engineering teams"],
})

const workflow = [
  {
    number: "01",
    icon: CalendarDays,
    title: "Connect the meeting calendar",
    description:
      "Use a dedicated Google account and sync the workspace calendar so huzlr can identify eligible Google Meet events.",
  },
  {
    number: "02",
    icon: Settings2,
    title: "Set an explicit join policy",
    description:
      "Choose manual or automatic joining, limit which meetings qualify, and set a maximum meeting duration.",
  },
  {
    number: "03",
    icon: Mic2,
    title: "Run the standup",
    description:
      "The named AI participant joins the call, introduces itself, listens, and facilitates using your workspace instructions.",
  },
  {
    number: "04",
    icon: ListChecks,
    title: "Review the output",
    description:
      "Keep the transcript when enabled, then review the summary, decisions, blockers, and proposed action items.",
  },
]

const controls = [
  "Auto-join is opt-in and can be restricted to explicitly tagged meetings.",
  "The agent joins under a visible bot identity and announces that it is an AI meeting assistant.",
  "Transcript, summary, and action-item outputs can be enabled by workspace.",
  "Meeting duration and join timing are bounded by workspace settings.",
]

const limitations = [
  "Participant names are not inferred when the mixed meeting audio cannot support reliable diarization.",
  "Owners, due dates, decisions, and blockers should not be invented when the meeting did not establish them.",
  "Outputs are proposed coordination artifacts for human review—not automatic proof that work is complete.",
]

const faqs = [
  {
    question: "Does huzlr replace the human Scrum Master?",
    answer:
      "No. It handles repeatable meeting coordination and drafts the record of the conversation. Teams still own judgment, facilitation choices, and delivery decisions.",
  },
  {
    question: "Can the AI Scrum Master join every Google Meet automatically?",
    answer:
      "Only if a workspace administrator enables auto-join. Teams can require an explicit Scrum tag, limit eligible organizers, and configure timing and duration controls.",
  },
  {
    question: "What does huzlr create after a standup?",
    answer:
      "Depending on workspace settings, huzlr can retain the transcript and generate a concise summary with decisions, blockers, and proposed action items.",
  },
  {
    question: "Is the AI Scrum Master generally available?",
    answer:
      "It is currently offered through the huzlr private beta. Availability and onboarding depend on the meeting environment and workspace setup.",
  },
]

export default function AiScrumMasterPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "huzlr AI Scrum Master",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: absoluteUrl("/ai-scrum-master"),
        description,
        featureList: [
          "Google Calendar meeting synchronization",
          "Configurable Google Meet join policies",
          "AI-assisted standup facilitation",
          "Meeting transcripts and summaries",
          "Decisions, blockers, and proposed action items",
        ],
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
          url: siteConfig.url,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteConfig.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "AI Scrum Master",
            item: absoluteUrl("/ai-scrum-master"),
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  }

  return (
    <main className="bg-paper text-ink antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <Navigation />

      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 md:pb-28 md:pt-44">
        <NoiseTexture className="absolute inset-0 opacity-15 mask-[radial-gradient(480px_circle_at_center,white,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">
              AI Scrum Master · Private beta
            </p>
            <h1 className="mt-6 max-w-3xl font-serif text-5xl font-normal leading-[1.04] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Run the standup. Leave with <em className="italic text-clay">accountable action.</em>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
              huzlr joins eligible Google Meet standups as an identified AI participant, facilitates with your team&apos;s instructions, and turns the conversation into a reviewable delivery record.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-11 rounded-full bg-clay px-6 text-sm text-white hover:bg-clay-deep">
                <TrackedLink
                  href="/signup"
                  eventName="CTA Click"
                  eventProperties={{ location: "ai_scrum_master_hero", destination: "signup", label: "Join the private beta" }}
                >
                  Join the private beta
                  <ArrowRight className="size-4" />
                </TrackedLink>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-11 rounded-full px-6 text-sm text-ink/70 hover:bg-sand hover:text-ink">
                <TrackedLink
                  href="#workflow"
                  eventName="CTA Click"
                  eventProperties={{ location: "ai_scrum_master_hero", destination: "workflow", label: "See the workflow" }}
                >
                  See the workflow
                </TrackedLink>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-hairline bg-white/55 p-3 shadow-[0_28px_80px_-40px_rgba(41,37,31,0.45)] dark:bg-white/[0.03]">
            <div className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-hairline pb-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-clay">Standup output</p>
                  <p className="mt-1 font-serif text-2xl">Tuesday delivery sync</p>
                </div>
                <span className="rounded-full bg-clay/10 px-3 py-1 text-xs font-medium text-clay">Completed</span>
              </div>
              <div className="mt-6 space-y-5">
                <OutputRow icon={FileText} label="Summary" text="The preview environment is ready. Release validation moves to today." />
                <OutputRow icon={AlertTriangle} label="Blocker" text="Production API credentials are still awaiting approval." />
                <OutputRow icon={CheckCircle2} label="Action" text="Maya will confirm credentials before the release review." />
              </div>
              <p className="mt-6 border-t border-hairline pt-4 text-xs leading-relaxed text-ink/45">
                Illustrative output. huzlr preserves unknown owners or dates instead of filling gaps with guesses.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-28 border-t border-hairline py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">How it works today</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              A controlled path from calendar event to <em className="italic text-clay">delivery record.</em>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/60 sm:text-lg">
              The workflow is designed around explicit workspace policies, visible participation, and outputs your team can inspect.
            </p>
          </div>
          <div className="mt-14 grid border-y border-hairline sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map(({ number, icon: Icon, title, description: stepDescription }, index) => (
              <article
                key={number}
                className={`py-8 sm:px-6 lg:px-7 ${index > 0 ? "border-t border-hairline sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t lg:border-l lg:border-t-0" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-md bg-clay/10 text-clay"><Icon size={17} /></span>
                  <span className="font-serif text-sm text-ink/30">{number}</span>
                </div>
                <h3 className="mt-6 font-serif text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/55">{stepDescription}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline bg-sand/35 py-24 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-clay/10 text-clay"><ShieldCheck size={19} /></div>
            <h2 className="mt-6 font-serif text-4xl tracking-tight sm:text-5xl">Controls before automation.</h2>
            <p className="mt-5 text-base leading-relaxed text-ink/60">
              A meeting agent participates in a sensitive team ritual. huzlr makes the join policy, identity, and retained outputs visible workspace choices.
            </p>
            <ul className="mt-8 space-y-4">
              {controls.map((control) => <CheckItem key={control}>{control}</CheckItem>)}
            </ul>
          </div>
          <div className="rounded-3xl border border-hairline bg-paper p-7 sm:p-9">
            <div className="flex items-center gap-3">
              <Bot className="size-5 text-clay" />
              <h3 className="font-serif text-2xl">Clear limits build trust</h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink/55">
              huzlr is designed to state uncertainty instead of making the meeting record look more complete than the conversation was.
            </p>
            <ul className="mt-7 space-y-5">
              {limitations.map((limitation) => (
                <li key={limitation} className="flex gap-3 text-sm leading-relaxed text-ink/65">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-clay" />
                  {limitation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-hairline py-24 sm:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Questions before joining</p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">What teams ask first.</h2>
          </div>
          <div className="mt-12 divide-y divide-hairline border-y border-hairline">
            {faqs.map((faq) => (
              <article key={faq.question} className="grid gap-3 py-7 md:grid-cols-[0.75fr_1.25fr] md:gap-10">
                <h3 className="font-serif text-xl">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-ink/60 sm:text-base">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline px-6 py-24 text-center sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-clay">Private beta</p>
          <h2 className="mt-4 font-serif text-4xl tracking-tight text-balance sm:text-5xl">
            Make the standup produce movement, not another round of status chasing.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/60">
            Create a workspace to request access, or read the huzlr engineering blog for more on meeting-to-action systems.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-11 rounded-full bg-clay px-6 text-sm text-white hover:bg-clay-deep">
              <TrackedLink
                href="/signup"
                eventName="CTA Click"
                eventProperties={{ location: "ai_scrum_master_bottom", destination: "signup", label: "Request private beta access" }}
              >
                Request private beta access
                <ArrowRight className="size-4" />
              </TrackedLink>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full border-hairline bg-transparent px-6 text-sm">
              <TrackedLink
                href="/blog"
                eventName="CTA Click"
                eventProperties={{ location: "ai_scrum_master_bottom", destination: "blog", label: "Read the engineering blog" }}
              >
                Read the engineering blog
              </TrackedLink>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function OutputRow({ icon: Icon, label, text }: { icon: typeof FileText; label: string; text: string }) {
  return (
    <div className="grid grid-cols-[32px_1fr] gap-3">
      <span className="flex size-8 items-center justify-center rounded-md bg-sand text-clay"><Icon size={15} /></span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/40">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink/70">{text}</p>
      </div>
    </div>
  )
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed text-ink/65 sm:text-base">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-clay" />
      {children}
    </li>
  )
}
