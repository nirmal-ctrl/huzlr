import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function FAQ() {
  const faqs = [
    {
      question: "What is huzlr, exactly?",
      answer:
        "huzlr is a coordination layer for teams working with AI. It connects activity across projects, conversations, meetings, documents, people, and AI workers, then coordinates the next step as work changes.",
    },
    {
      question: "How does huzlr connect to my existing tools?",
      answer:
        "huzlr integrates with Jira today, with Slack and GitHub connectors on the near-term roadmap. It builds shared context across the tools where your team already plans, communicates, and ships.",
    },
    {
      question: "Is my project data secure?",
      answer:
        "Yes. Data is encrypted in transit and at rest, access is scoped per workspace, and we never train shared models on your private project data. We're building toward SOC 2 compliance as part of our private beta.",
    },
    {
      question: "How does huzlr work with AI workers?",
      answer:
        "huzlr gives AI workers the current goals, constraints, dependencies, and ownership context needed to execute safely. It can delegate bounded work, monitor outcomes, and bring consequential decisions back to a human.",
    },
    {
      question: "What does huzlr do during the private beta?",
      answer:
        "Private-beta teams start with product delivery: connected project context, async coordination, dependency and risk signals, and proactive follow-through. Their feedback shapes how Huzlr expands into broader hybrid-workforce coordination.",
    },
    {
      question: "Do I need technical expertise to use huzlr?",
      answer:
        "No. huzlr is designed for founders, product leaders, and engineering teams. It works above your existing tools and brings decisions into the flow of work instead of requiring another management system to maintain.",
    },
  ]

  return (
    <section id="faq" className="bg-sand px-5 py-24 sm:py-32 md:px-8">
      <div className="mx-auto grid max-w-[1344px] gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Questions, answered</p>
          <h2 className="mt-5 max-w-lg font-serif text-[clamp(3rem,5vw,4.75rem)] font-medium leading-[0.98] tracking-[-0.065em] text-balance">
            What teams ask before they get started.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink/60">
            Have a question about your workflow, data, or private-beta access?{" "}
            <a href="mailto:hello@huzlr.com" className="font-medium text-clay underline decoration-clay/25 underline-offset-4 transition-colors hover:text-clay-deep">
              Talk to us
            </a>
            .
          </p>
        </div>

        <div className="border-t border-black/15 dark:border-white/15">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border-black/15 py-1 dark:border-white/15">
                <AccordionTrigger className="py-7 text-left font-serif text-xl font-medium tracking-[-0.035em] text-ink transition-colors hover:text-clay hover:no-underline sm:text-2xl">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="max-w-2xl pb-6 text-sm leading-relaxed text-ink/60 sm:text-base">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
