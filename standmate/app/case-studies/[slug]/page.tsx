import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiCaseStudy, getStrapiMediaUrl } from "@/services/strapiApi";
import { ArrowLeft, ArrowRight, CheckCircle2, TrendingUp, HelpCircle, Sparkles, Building2, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const cs = await strapiApi.getCaseStudyBySlug(slug);
    if (!cs) return {};
    
    const heroUrl = getStrapiMediaUrl(cs.heroImage);
    const csUrl = `https://huzlr.com/case-studies/${slug}`;

    return {
      title: `${cs.clientName} Case Study: ${cs.title} | Huzlr`,
      description: cs.subtitle,
      openGraph: {
        title: cs.title,
        description: cs.subtitle,
        url: csUrl,
        type: 'article',
        publishedTime: cs.publishDate,
        images: heroUrl ? [heroUrl] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: cs.title,
        description: cs.subtitle,
        images: heroUrl ? [heroUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Huzlr Case Study',
    };
  }
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": cs.title,
    "description": cs.subtitle,
    "image": heroUrl ? [heroUrl] : [],
    "datePublished": cs.publishDate,
    "dateModified": cs.createdAt || cs.publishDate,
    "author": {
      "@type": "Organization",
      "name": "Huzlr Marketing Team",
      "url": "https://huzlr.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Huzlr",
      "logo": {
        "@type": "ImageObject",
        "url": "https://huzlr.com/favicon.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://huzlr.com/case-studies/${slug}`
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Decorative background grid and gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/3 blur-[120px] rounded-full pointer-events-none" />

      <Navigation />

      <main className="pt-36 pb-24 px-4 max-w-6xl mx-auto w-full relative z-10 space-y-12">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link href="/case-studies">
            <Button variant="ghost" size="sm" className="gap-2 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors rounded-full px-4">
              <ArrowLeft className="size-4" />
              All case studies
            </Button>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold">
            <Sparkles className="size-3.5" />
            Featured Success Story
          </div>
        </div>

        {/* Header Metadata */}
        <div className="space-y-4 max-w-4xl">
          <span className="text-sm font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/10 rounded-full px-3.5 py-1">
            {cs.clientName}
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground to-foreground/80 pt-2">
            {cs.title}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
            {cs.subtitle}
          </p>
        </div>

        {/* Hero Banner Image */}
        {heroUrl && (
          <div className="w-full aspect-[1.91/1] rounded-3xl overflow-hidden border border-border bg-muted/10 relative flex items-center justify-center shadow-lg">
            <img 
              src={heroUrl} 
              alt={cs.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Case Study Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pt-4">
          {/* Quick Stats Sidebar */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
            <div className="rounded-2xl border border-border/60 bg-muted/5 p-6 space-y-6 backdrop-blur-sm">
              <h4 className="text-xs font-black tracking-wider uppercase text-foreground/80 border-b border-border/40 pb-3">Project Highlights</h4>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <Building2 className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Client Orgs</p>
                    <p className="text-sm font-semibold text-foreground">{cs.clientName || "Partner Team"}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <Zap className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Key Outcomes</p>
                    <p className="text-sm font-semibold text-foreground">10x Speed, 0 Lag</p>
                  </div>
                </div>

                {cs.publishDate && (
                  <div className="flex gap-3 items-start">
                    <Calendar className="size-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Published</p>
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(cs.publishDate).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {cs.tags && cs.tags.length > 0 && (
                <div className="pt-4 border-t border-border/40">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2.5">Scope & Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cs.tags.map((tag) => (
                      <span 
                        key={tag.id} 
                        className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-secondary border border-border/40 text-secondary-foreground"
                      >
                        {tag.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Core Case Study Sections */}
          <div className="lg:col-span-8 space-y-12">
            {/* Challenge */}
            {renderedChallenge && (
              <section className="space-y-4 scroll-mt-24">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40 text-foreground/85 text-xs font-semibold">
                  <HelpCircle className="size-4 text-muted-foreground" />
                  <span>The Challenge</span>
                </div>
                <div 
                  className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-base max-w-none prose-headings:font-bold prose-headings:text-foreground"
                  dangerouslySetInnerHTML={{ __html: renderedChallenge }}
                />
              </section>
            )}

            {/* Solution */}
            {renderedSolution && (
              <section className="space-y-4 p-8 rounded-3xl border border-primary/15 bg-gradient-to-b from-primary/5 via-primary/[0.02] to-transparent scroll-mt-24">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>The Solution</span>
                </div>
                <div 
                  className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-base max-w-none prose-headings:font-bold prose-headings:text-foreground"
                  dangerouslySetInnerHTML={{ __html: renderedSolution }}
                />
              </section>
            )}

            {/* Results */}
            {renderedResults && (
              <section className="space-y-4 scroll-mt-24">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500 text-xs font-semibold">
                  <TrendingUp className="size-4 text-amber-500" />
                  <span>Realized Value & Results</span>
                </div>
                <div 
                  className="prose dark:prose-invert prose-neutral prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-base max-w-none prose-headings:font-bold prose-headings:text-foreground prose-li:text-muted-foreground prose-li:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderedResults }}
                />
              </section>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
