import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiCaseStudy, getStrapiMediaUrl } from "@/services/strapiApi";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 3600; // ISR cache for 1 hour, loaded instantly from Edge CDN!

export default async function CaseStudiesIndexPage() {
  let cases: StrapiCaseStudy[] = [];
  let errorMsg: string | null = null;

  try {
    const response = await strapiApi.getCaseStudies();
    cases = response.data || [];
  } catch (error: any) {
    console.error("Failed to fetch case studies from Strapi:", error);
    errorMsg = error?.message || "Could not retrieve case studies. Please check your Strapi configuration.";
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
      <section className="pb-24 px-4 max-w-7xl mx-auto w-full">
        {errorMsg ? (
          <div className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive text-center max-w-xl mx-auto space-y-2">
            <p className="font-semibold text-lg">Strapi API Connection Error</p>
            <p className="text-sm opacity-90">{errorMsg}</p>
            <p className="text-xs text-muted-foreground pt-2">
              Ensure your Strapi server is running, the <code>NEXT_PUBLIC_STRAPI_URL</code> is configured, and public permissions are enabled for Case Studies.
            </p>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-border rounded-3xl max-w-xl mx-auto space-y-4">
            <p className="text-muted-foreground font-medium">No case studies found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Ready to write? Log into your Strapi admin panel and publish your first customer story to see it show up here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {cases.map((cs) => {
              const heroUrl = getStrapiMediaUrl(cs.heroImage);
              return (
                <article 
                  key={cs.id} 
                  className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:border-border/80"
                >
                  <div className="space-y-4 w-full">
                    {/* Hero Image */}
                    {heroUrl && (
                      <div className="w-full h-48 rounded-xl overflow-hidden border border-border/50 bg-muted mb-2 relative">
                        <img 
                          src={heroUrl} 
                          alt={cs.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {cs.clientName}
                      </span>
                      {cs.publishDate && (
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(cs.publishDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
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
                  {cs.tags && cs.tags.length > 0 && (
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
                  )}
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
              );
            })}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
