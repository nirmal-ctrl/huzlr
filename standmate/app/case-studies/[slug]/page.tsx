import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiCaseStudy, getStrapiMediaUrl } from "@/services/strapiApi";
import { ArrowLeft, ArrowRight, CheckCircle2, TrendingUp, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0; // Dynamic fetching or set to 3600 for ISR with webhook revalidation

function renderStrapiBlocks(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content.map((block: any) => {
    const textContent = (block.children || [])
      .map((child: any) => child.text || '')
      .join('');

    switch (block.type) {
      case 'heading':
        const level = block.level || 2;
        return `<h${level}>${textContent}</h${level}>`;
      case 'paragraph':
        if (textContent.trim().startsWith('<') && textContent.trim().endsWith('>')) {
          return textContent;
        }
        return `<p>${textContent}</p>`;
      case 'quote':
        return `<blockquote>${textContent}</blockquote>`;
      case 'list':
        const tag = block.format === 'ordered' ? 'ol' : 'ul';
        const items = (block.children || [])
          .map((item: any) => `<li>${item.children?.map((c: any) => c.text).join('') || ''}</li>`)
          .join('');
        return `<${tag}>${items}</${tag}>`;
      default:
        return textContent;
    }
  }).join('\n');
}

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

  const renderedChallenge = renderStrapiBlocks(cs.challenge);
  const renderedSolution = renderStrapiBlocks(cs.solution);
  const renderedResults = renderStrapiBlocks(cs.results);
  const heroUrl = getStrapiMediaUrl(cs.heroImage);

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

        {/* Hero Image */}
        {heroUrl && (
          <div className="w-full h-[350px] md:h-[450px] rounded-2xl overflow-hidden border border-border bg-muted relative">
            <img 
              src={heroUrl} 
              alt={cs.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Case Study Sections */}
        <div className="space-y-12">
          {/* Challenge */}
          {renderedChallenge && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <HelpCircle className="size-5 text-muted-foreground" />
                The Challenge
              </h3>
              <div 
                className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none"
                dangerouslySetInnerHTML={{ __html: renderedChallenge }}
              />
            </section>
          )}

          {/* Solution */}
          {renderedSolution && (
            <section className="space-y-4 p-6 rounded-2xl border border-primary/10 bg-primary/5">
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <CheckCircle2 className="size-5 text-primary" />
                The Solution
              </h3>
              <div 
                className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none"
                dangerouslySetInnerHTML={{ __html: renderedSolution }}
              />
            </section>
          )}

          {/* Results */}
          {renderedResults && (
            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <TrendingUp className="size-5 text-amber-500" />
                Realized Value & Results
              </h3>
              <div 
                className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none prose-li:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: renderedResults }}
              />
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
