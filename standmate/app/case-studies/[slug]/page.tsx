import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiCaseStudy } from "@/services/strapiApi";
import { ArrowLeft, CheckCircle2, TrendingUp, HelpCircle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

// High-fidelity fallback details matching our fallback list
const MOCK_DETAILS: Record<string, Partial<StrapiCaseStudy>> = {
  'acme-corp-accelerated-cycles': {
    title: 'How Acme Corp Accelerated Engineering Cycles by 10X',
    clientName: 'Acme Corporation',
    subtitle: 'From 40% sprint slippages to zero-admin automated agile velocity.',
    publishDate: '2026-06-15',
    challenge: `
      <p>Acme Corporation had over 15 distinct product teams, each running its own Scrum processes. Sprint boards were constantly out of sync because developers hated manually dragging cards on Jira, and product managers spent up to 15 hours every week in alignment meetings rather than planning roadmap items.</p>
      <p>This led to a 40% sprint slippage rate and total lack of timeline predictability across critical product releases.</p>
    `,
    solution: `
      <p>Acme implemented Huzlr as their central autonomous PM engine. Huzlr integrated seamlessly with their GitHub repositories and Slack workspaces. Rather than requiring developers to log in to Jira, Huzlr watched PR activities and code merges, translating them directly into sprint updates, and automatically drafting precise releases and milestone completions.</p>
      <p>Additionally, Huzlr's predictive risk index analyzed developer branch activity, flagging critical dependencies and blocker risks 48 hours before they could affect the sprint timeline.</p>
    `,
    results: `
      <p>The results were immediate and transformative:</p>
      <ul>
        <li><strong>10X Acceleration</strong>: The administrative overhead of sprint tracking was cut down to zero.</li>
        <li><strong>0% Stale Tickets</strong>: Project boards are now updated instantaneously based on code activity.</li>
        <li><strong>94% Risk Prediction Accuracy</strong>: Prevented 14 potential delays over the first two months.</li>
      </ul>
    `,
    tags: [
      { id: 1, documentId: 'tag-1', title: 'Enterprise', slug: 'enterprise' },
      { id: 2, documentId: 'tag-2', title: 'Agile Scale', slug: 'agile-scale' },
    ],
  },
  'stark-industries-code-churn': {
    title: 'Reducing Code Churn and Preempting Bottlenecks at Stark Industries',
    clientName: 'Stark Industries',
    subtitle: 'Predicting timeline risks with machine-learning assisted backlog monitoring.',
    publishDate: '2026-06-05',
    challenge: `
      <p>With massive codebases and high deployment velocities, Stark Industries struggled with major code churn and frequent regressions. Complex pull requests sat unreviewed for days, blocking dependencies and creating unpredictable project backlogs.</p>
    `,
    solution: `
      <p>Stark Industries integrated Huzlr's autonomous workflow agent. The agent monitored code complexity in real-time, automatically assigned reviewers based on past code ownership patterns, and dynamically adjusted milestone schedules as developer availability changed. When complex PRs were detected, Huzlr auto-generated simplified breakdowns to speed up code reviews.</p>
    `,
    results: `
      <p>Within one quarter of deploying Huzlr:</p>
      <ul>
        <li><strong>50% Reduction in PR Lead Time</strong>: Average review duration went down from 3 days to less than 4 hours.</li>
        <li><strong>Significant Code Churn Reduction</strong>: Preempted architectural conflicts by flagging branch overlaps early.</li>
        <li><strong>Streamlined Planning</strong>: The engineering leadership now relies entirely on Huzlr's automated timeline forecasts.</li>
      </ul>
    `,
    tags: [
      { id: 3, documentId: 'tag-3', title: 'Risk Forecasting', slug: 'risk' },
      { id: 4, documentId: 'tag-4', title: 'DevOps Intelligence', slug: 'devops' },
    ],
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600; // ISR validation interval (1 hour)

export default async function CaseStudyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let cs: Partial<StrapiCaseStudy> | null = null;
  let isUsingMock = false;

  try {
    cs = await strapiApi.getCaseStudyBySlug(slug);
  } catch (error) {
    console.warn("Strapi get single case failed, falling back to mock details.", error);
  }

  // Fallback to local mock data if not found
  if (!cs && MOCK_DETAILS[slug]) {
    cs = MOCK_DETAILS[slug];
    isUsingMock = true;
  }

  if (!cs) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Navigation />

      <main className="pt-32 pb-24 px-4 max-w-4xl mx-auto w-full space-y-8">
        {/* Back Link */}
        <Link href="/case-studies">
          <Button variant="ghost" size="sm" className="gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to case studies
          </Button>
        </Link>

        {/* Header Metadata */}
        <div className="space-y-4 border-b border-border pb-8">
          <span className="text-sm font-bold uppercase tracking-widest text-primary">
            {cs.clientName}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {cs.title}
          </h1>
          <p className="text-xl text-muted-foreground font-light leading-relaxed">
            {cs.subtitle}
          </p>
        </div>

        {/* Case Study Sections */}
        <div className="space-y-12">
          {/* Challenge */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <HelpCircle className="size-5 text-muted-foreground" />
              The Challenge
            </h3>
            <div 
              className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none"
              dangerouslySetInnerHTML={{ __html: cs.challenge || '' }}
            />
          </section>

          {/* Solution */}
          <section className="space-y-4 p-6 rounded-2xl border border-primary/10 bg-primary/5">
            <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="size-5 text-primary" />
              The Solution
            </h3>
            <div 
              className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none"
              dangerouslySetInnerHTML={{ __html: cs.solution || '' }}
            />
          </section>

          {/* Results */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <TrendingUp className="size-5 text-amber-500" />
              Realized Value & Results
            </h3>
            <div 
              className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none prose-li:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: cs.results || '' }}
            />
          </section>
        </div>
      </main>

      {/* Warning Notice if utilizing local mock fallback */}
      {isUsingMock && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 backdrop-blur-md max-w-sm text-xs space-y-1">
          <p className="font-semibold">Local Fallback Active</p>
          <p className="opacity-90">
            Displaying simulated high-fidelity content because this case study was not found in your active Strapi database.
          </p>
        </div>
      )}

      <Footer />
    </div>
  );
}
