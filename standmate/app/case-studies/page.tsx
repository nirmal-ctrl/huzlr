import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiCaseStudy, getStrapiMediaUrl } from "@/services/strapiApi";
import { ArrowRight, ShieldCheck, Zap, TrendingUp, Cpu } from "lucide-react";
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
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden">
      {/* Decorative background grid and gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <Navigation />

      {/* Hero Header */}
      <section className="pt-36 pb-12 px-4 max-w-7xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/40 backdrop-blur-sm text-foreground/80 text-xs font-medium transition-all duration-300 hover:border-primary/20 hover:bg-primary/5">
            <ShieldCheck className="size-3.5 text-primary animate-pulse" />
            <span className="text-muted-foreground">Customer Success & Case Studies</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground to-foreground/60 leading-tight py-2">
            Real Stories. <br className="hidden md:inline" /> Autonomous Engineering.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
            Explore how modern engineering orgs and fast-scaling startups utilize huzlr’s autonomous project intelligence to ship clean, reliable code with zero administrative lag.
          </p>
        </div>
      </section>

      {/* Case Studies List Section */}
      <section className="pb-28 px-4 max-w-7xl mx-auto w-full relative z-10">
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
                  className="group relative flex flex-col justify-between p-6 rounded-3xl border border-border/50 bg-muted/5 hover:bg-muted/10 hover:border-border/80 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] h-full overflow-hidden"
                >
                  <div className="space-y-5 w-full">
                    {/* Hero Image / Card Banner */}
                    <div className="w-full aspect-[1.91/1] rounded-2xl overflow-hidden border border-border/40 bg-muted/20 relative flex items-center justify-center">
                      {heroUrl ? (
                        <img 
                          src={heroUrl} 
                          alt={cs.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center text-muted-foreground text-xs font-medium">
                          Client Story
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-primary">
                        {cs.clientName}
                      </span>
                      {cs.publishDate && (
                        <span className="text-[11px] text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border/40 font-medium">
                          {new Date(cs.publishDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>

                    {/* Title & Subtitle */}
                    <div className="space-y-2">
                      <Link href={`/case-studies/${cs.slug}`} className="block">
                        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors cursor-pointer leading-tight line-clamp-2">
                          {cs.title}
                        </h2>
                      </Link>
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                        {cs.subtitle}
                      </p>
                    </div>

                    {/* Tags */}
                    {cs.tags && cs.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {cs.tags.map((tag) => (
                          <span 
                            key={tag.id} 
                            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary border border-border/40 text-secondary-foreground"
                          >
                            {tag.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Highlight Bar & Button */}
                  <div className="mt-8 pt-4 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-foreground/90 font-semibold bg-primary/10 border border-primary/10 rounded-full px-3 py-1">
                      <Zap className="size-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                      10X Faster Delivery
                    </div>

                    <Link href={`/case-studies/${cs.slug}`}>
                      <Button variant="ghost" size="sm" className="group-hover:translate-x-0.5 transition-all cursor-pointer gap-1.5 text-xs font-semibold rounded-full h-8 px-3 hover:bg-transparent hover:text-primary">
                        Read study
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
