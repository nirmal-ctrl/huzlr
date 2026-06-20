import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiBlogPost } from "@/services/strapiApi";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 3600; // ISR cache for 1 hour, loaded instantly from Edge CDN!

export default async function BlogIndexPage() {
  let posts: StrapiBlogPost[] = [];
  let errorMsg: string | null = null;

  try {
    const response = await strapiApi.getBlogPosts();
    posts = response.data || [];
  } catch (error: any) {
    console.error("Failed to fetch blog posts from Strapi:", error);
    errorMsg = error?.message || "Could not retrieve blog posts. Please check your Strapi configuration.";
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Navigation />

      {/* Hero Header */}
      <section className="pt-32 pb-16 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold">
            <BookOpen className="size-3.5" />
            Huzlr Resources & Engineering Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            Insights on Autonomous Project Intelligence
          </h1>
          <p className="text-lg text-muted-foreground">
            Articles, guides, and strategic discussions from the frontlines of AI-driven project management, risk forecasting, and agile engineering.
          </p>
        </div>
      </section>

      {/* Blog List Section */}
      <section className="pb-24 px-4 max-w-7xl mx-auto w-full">
        {errorMsg ? (
          <div className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive text-center max-w-xl mx-auto space-y-2">
            <p className="font-semibold text-lg">Strapi API Connection Error</p>
            <p className="text-sm opacity-90">{errorMsg}</p>
            <p className="text-xs text-muted-foreground pt-2">
              Ensure your Strapi server is running, the <code>NEXT_PUBLIC_STRAPI_URL</code> is configured, and public permissions are enabled for Blogs.
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-border rounded-3xl max-w-xl mx-auto space-y-4">
            <p className="text-muted-foreground font-medium">No blog posts found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Ready to write? Log into your Strapi admin panel and publish your first article to see it show up here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.map((post) => (
              <article 
                key={post.id} 
                className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:border-border/80"
              >
                <div className="space-y-4">
                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span 
                          key={tag.id} 
                          className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {tag.title}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <Link href={`/blog/${post.slug}`}>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-card-foreground group-hover:text-primary transition-colors cursor-pointer leading-snug">
                        {post.title}
                      </h2>
                    </Link>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {post.description}
                    </p>
                  </div>
                </div>

                {/* Meta & Footer */}
                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {post.author?.name ? post.author.name.charAt(0) : 'H'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {post.author?.name || 'Huzlr Editor'}
                      </p>
                      {post.publishDate && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(post.publishDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  <Link href={`/blog/${post.slug}`}>
                    <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform cursor-pointer gap-1.5 text-xs font-semibold">
                      Read article
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
