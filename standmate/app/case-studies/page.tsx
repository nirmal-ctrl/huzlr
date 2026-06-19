import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiCaseStudy } from "@/services/strapiApi";
import { Calendar, User, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// High-fidelity fallback mock case studies if Strapi is not connected yet
const MOCK_CASE_STUDIES: StrapiCaseStudy[] = [
  {
    id: 1,
    documentId: 'case-mock-1',
    title: 'How Acme Corp Accelerated Engineering Cycles by 10X',
    slug: 'acme-corp-accelerated-cycles',
    clientName: 'Acme Corporation',
    subtitle: 'From 40% sprint slippages to zero-admin automated agile velocity.',
    challenge: 'Challenge content',
    solution: 'Solution content',
    results: 'Results content',
    publishDate: '2026-06-15',
    createdAt: '2026-06-15',
    heroImage: null,
    tags: [
      { id: 1, documentId: 'tag-1', title: 'Enterprise', slug: 'enterprise' },
      { id: 2, documentId: 'tag-2', title: 'Agile Scale', slug: 'agile-scale' },
    ],
  },
  {
    id: 2,
    documentId: 'case-mock-2',
    title: 'Reducing Code Churn and Preempting Bottlenecks at Stark Industries',
    slug: 'stark-industries-code-churn',
    clientName: 'Stark Industries',
    subtitle: 'Predicting timeline risks with machine-learning assisted backlog monitoring.',
    challenge: 'Challenge content',
    solution: 'Solution content',
    results: 'Results content',
    publishDate: '2026-06-05',
    createdAt: '2026-06-05',
    heroImage: null,
    tags: [
      { id: 3, documentId: 'tag-3', title: 'Risk Forecasting', slug: 'risk' },
      { id: 4, documentId: 'tag-4', title: 'DevOps Intelligence', slug: 'devops' },
    ],
  },
];

export const revalidate = 3600; // ISR validation interval (1 hour)

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

export default async function CaseStudiesIndexPage() {
  let cases: StrapiCaseStudy[] = [];
  let isUsingMock = false;

  try {
    const response = await strapiApi.getCaseStudies();
    cases = response.data;
  } catch (error) {
    console.warn("Strapi fetch failed, falling back to high-fidelity mock case studies.", error);
    cases = MOCK_CASE_STUDIES;
    isUsingMock = true;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Navigation />

      {/* Hero Header */}
      <section className="pt-32 pb-16 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold">
            <ShieldCheck className="size-3.5" />
            Huzlr Customer Success & Case Studies
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            Real Stories, Autonomous Engineering Success
          </h1>
          <p className="text-lg text-muted-foreground">
            Explore how modern engineering orgs and fast-scaling startups utilize Huzlr’s autonomous project intelligence to ship clean, reliable code with zero administrative lag.
          </p>
        </div>
      </section>

      {/* Case Studies List Section */}
      <section className="pb-24 px-4 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {cases.map((cs) => (
          <article 
            key={cs.id} 
            className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:border-border/80"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  {cs.clientName}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(cs.publishDate).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-2">
                <Link href={`/case-studies/${cs.slug}`}>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-card-foreground group-hover:text-primary transition-colors cursor-pointer leading-snug">
                    {cs.title}
                  </h2>
                </Link>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {cs.subtitle}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                {cs.tags.map((tag) => (
                  <span 
                    key={tag.id} 
                    className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                  >
                    {tag.title}
                  </span>
                ))}
              </div>
            </div>

            {/* Read Button */}
            <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                <Zap className="size-4 text-amber-500 fill-amber-500 animate-pulse" />
                10X Faster Delivery
              </div>

              <Link href={`/case-studies/${cs.slug}`}>
                <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform cursor-pointer gap-1.5 text-xs font-semibold">
                  Read full study
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </article>
        ))}
      </section>

      {/* Warning Notice if utilizing local mock fallback */}
      {isUsingMock && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 backdrop-blur-md max-w-sm text-xs space-y-1">
          <p className="font-semibold">Local Fallback Active</p>
          <p className="opacity-90">
            The frontend fell back to simulated case studies because Strapi is not yet active at <code>{STRAPI_URL}</code>.
          </p>
        </div>
      )}

      <Footer />
    </div>
  );
}
