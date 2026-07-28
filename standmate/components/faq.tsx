import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function FAQ() {
  const faqs = [
    {
      question: "What is Huzlr, exactly?",
      answer:
        "Huzlr is a project intelligence layer that sits above your existing tools. It reads the activity across your projects, understands dependencies and intent, and surfaces the few signals that deserve a decision — instead of another dashboard to check.",
    },
    {
      question: "How does Huzlr connect to my existing tools?",
      answer:
        "Huzlr integrates with Jira out of the box today, with Slack and GitHub connectors on the near-term roadmap. Integrations are read-focused and secure — Huzlr observes your workflow without disrupting it.",
    },
    {
      question: "Is my project data secure?",
      answer:
        "Yes. Data is encrypted in transit and at rest, access is scoped per workspace, and we never train shared models on your private project data. We're building toward SOC 2 compliance as part of our private beta.",
    },
    {
      question: "Can Huzlr adapt to my team's workflow?",
      answer:
        "Yes. Huzlr works with Agile, Scrum, Kanban, or hybrid setups. It learns your team's rhythms over time — how you plan, estimate, and deliver — and tunes its signals to match how your team actually works.",
    },
    {
      question: "What does Huzlr do during the private beta?",
      answer:
        "Beta teams get the full intelligence layer: async standups, risk signals, delivery drift detection, and the unified project view. Your feedback directly shapes what we build next, and beta pricing will be honored at launch.",
    },
    {
      question: "Do I need technical expertise to use Huzlr?",
      answer:
        "No. Huzlr is designed for project leads, founders, and individual contributors alike. If your team can run a standup, it can use Huzlr — the AI handles the analysis in the background.",
    },
  ]

  return (
    <section id="faq" className="border-t border-hairline py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-clay">
            Questions
          </p>
          <h2 className="mt-4 font-serif text-4xl sm:text-5xl tracking-tight text-ink text-balance">
            Frequently asked <em className="italic text-clay">questions</em>
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-ink/60">
            Can't find what you're looking for?{" "}
            <a href="mailto:hello@huzlr.com" className="font-medium text-clay hover:text-clay-deep transition-colors">
              Write to us
            </a>
            .
          </p>
        </div>
        <div className="mx-auto mt-14 max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border-hairline">
                <AccordionTrigger className="text-left text-[15px] font-medium text-ink hover:text-clay hover:no-underline transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-ink/60">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
