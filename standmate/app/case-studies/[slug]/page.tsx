import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiCaseStudy } from "@/services/strapiApi";
import { ArrowLeft, CheckCircle2, TrendingUp, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0; // Dynamic fetching or set to 3600 for ISR with webhook revalidation

export default async function CaseStudyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let cs: Partial<StrapiCaseStudy> | null = null;

  try {
    cs = await strapiApi.getCaseStudyBySlug(slug);
  } catch (error) {
    console.error(`Failed to fetch case study with slug: ${slug}`, error);
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
          {cs.challenge && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <HelpCircle className="size-5 text-muted-foreground" />
                The Challenge
              </h3>
              <div 
                className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none"
                dangerouslySetInnerHTML={{ __html: cs.challenge }}
              />
            </section>
          )}

          {/* Solution */}
          {cs.solution && (
            <section className="space-y-4 p-6 rounded-2xl border border-primary/10 bg-primary/5">
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <CheckCircle2 className="size-5 text-primary" />
                The Solution
              </h3>
              <div 
                className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none"
                dangerouslySetInnerHTML={{ __html: cs.solution }}
              />
            </section>
          )}

          {/* Results */}
          {cs.results && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <TrendingUp className="size-5 text-amber-500" />
                Realized Value & Results
              </h3>
              <div 
                className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none prose-li:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: cs.results }}
              />
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
