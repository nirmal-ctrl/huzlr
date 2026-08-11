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
