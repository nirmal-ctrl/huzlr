import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiBlogPost, getStrapiMediaUrl } from "@/services/strapiApi";
import { Calendar, ArrowLeft, ArrowRight, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "AI Project Management Resources",
  description:
    "Practical guides and engineering stories about AI project management, delivery coordination, automated standups, and meeting-to-action workflows.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "AI Project Management Resources | huzlr",
    description:
      "Practical guides and engineering stories for teams coordinating delivery with AI.",
    url: "/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Project Management Resources | huzlr",
    description:
      "Practical guides and engineering stories for teams coordinating delivery with AI.",
  },
};

export const revalidate = 3600; // ISR cache for 1 hour, loaded instantly from Edge CDN!

const BLOG_PAGE_SIZE = 6;

interface BlogIndexPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

const huzlrGuides = [
  {
    href: "/blog/how-to-automate-project-status-reports",
    eyebrow: "Project status automation",
    title: "How to automate project status reports without losing trust",
    description: "A review-first workflow for evidence, uncertainty, ownership, approval, and stakeholder distribution.",
    readTime: "8 min",
  },
  {
    href: "/blog/how-we-built-google-meet-ai-agent",
    eyebrow: "Product build story",
    title: "How we built a Google Meet AI agent around explicit control",
    description: "First-hand implementation lessons about calendar eligibility, identity, mixed audio, state, and output boundaries.",
    readTime: "9 min",
  },
]

export default async function BlogIndexPage({ searchParams }: BlogIndexPageProps) {
  const { page: pageParam } = await searchParams;
  const requestedPage = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const parsedPage = Number.parseInt(requestedPage || '1', 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  let posts: StrapiBlogPost[] = [];
  let errorMsg: string | null = null;
  let pageCount = 1;

  try {
    const response = await strapiApi.getBlogPosts(page, BLOG_PAGE_SIZE);
    posts = response.data || [];
    pageCount = response.meta.pagination?.pageCount || 1;
  } catch (error: any) {
    console.error("Failed to fetch blog posts from Strapi:", error);
    errorMsg = error?.message || "Could not retrieve blog posts. Please check your Strapi configuration.";
  }

  // Separate featured post from others
  const featuredPost = posts[0];
  const featuredCoverUrl = getStrapiMediaUrl(featuredPost?.coverImage);
  const featuredAuthorAvatarUrl = getStrapiMediaUrl(featuredPost?.author?.avatar);
  const remainingPosts = posts.slice(1);

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
            <BookOpen className="size-3.5 text-primary animate-pulse" />
            <span className="text-muted-foreground">Resources & Engineering Blog</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground to-foreground/60 leading-tight py-2">
            Insights on Autonomous <br className="hidden md:inline" /> Project Intelligence
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
            Articles, guides, and strategic discussions from the frontlines of AI-driven project management, risk forecasting, and agile engineering.
          </p>
        </div>
      </section>

      {/* Blog List Section */}
      <section className="pb-28 px-4 max-w-7xl mx-auto w-full relative z-10">
        <div className="mb-16 grid gap-5 md:grid-cols-2">
          {huzlrGuides.map((guide) => (
            <Link key={guide.href} href={guide.href} className="group rounded-3xl border border-border/60 bg-muted/5 p-7 transition-all hover:border-primary/25 hover:bg-primary/[0.03] sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{guide.eyebrow}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" />{guide.readTime}</span>
              </div>
              <h2 className="mt-6 max-w-xl text-2xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-3xl">{guide.title}</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{guide.description}</p>
              <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary">Read guide <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
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
            <p className="text-muted-foreground font-medium">No additional publications found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Ready to write? Log into your Strapi admin panel and publish your first article to see it show up here!
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Featured Post (Editorial 2-Column layout) */}
            {featuredPost && (
              <div className="group relative rounded-3xl border border-border/60 bg-muted/5 p-1 transition-all duration-300 hover:border-border/100 hover:bg-muted/10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-8 items-center">
                  {/* Featured Image */}
                  <div className="lg:col-span-7 aspect-[1.91/1] w-full rounded-2xl overflow-hidden border border-border/40 bg-muted/20 relative flex items-center justify-center">
                    {featuredCoverUrl ? (
                      <Image
                        src={featuredCoverUrl}
                        alt={featuredPost.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className="w-full h-full object-cover group-hover:scale-[1.015] transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center text-muted-foreground text-sm font-medium">
                        No cover image
                      </div>
                    )}
                  </div>

                  {/* Featured Details */}
                  <div className="lg:col-span-5 flex flex-col justify-between h-full py-2 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs uppercase tracking-widest font-semibold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/10">
                          Featured Post
                        </span>
                        {featuredPost.tags && featuredPost.tags.length > 0 && (
                          <span className="text-xs text-muted-foreground font-medium">
                            • {featuredPost.tags[0].title}
                          </span>
                        )}
                      </div>

                      <Link href={`/blog/${featuredPost.slug}`} className="block">
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200 leading-tight cursor-pointer">
                          {featuredPost.title}
                        </h2>
                      </Link>

                      <p className="text-muted-foreground text-base leading-relaxed font-normal line-clamp-3">
                        {featuredPost.description}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {featuredAuthorAvatarUrl ? (
                          <div className="size-10 rounded-full overflow-hidden border border-border/50 bg-muted shrink-0 relative flex items-center justify-center">
                            <Image
                              src={featuredAuthorAvatarUrl}
                              alt={featuredPost.author?.name || 'Author'}
                              fill
                              sizes="40px"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {featuredPost.author?.name ? featuredPost.author.name.charAt(0) : 'H'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {featuredPost.author?.name || 'huzlr Editor'}
                          </p>
                          {featuredPost.publishDate && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(featuredPost.publishDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      <Link href={`/blog/${featuredPost.slug}`}>
                        <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 gap-1.5 text-xs font-semibold rounded-full px-4">
                          Read article
                          <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remaining Posts Grid */}
            {remainingPosts.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold tracking-tight text-foreground uppercase tracking-widest text-xs">Latest Publications</h3>
                  <div className="h-[1px] bg-border/40 flex-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {remainingPosts.map((post) => {
                    const coverUrl = getStrapiMediaUrl(post.coverImage);
                    const authorAvatarUrl = getStrapiMediaUrl(post.author?.avatar);
                    return (
                      <article 
                        key={post.id} 
                        className="group flex flex-col justify-between rounded-2xl border border-border/50 bg-muted/5 hover:bg-muted/10 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-border/80 h-full overflow-hidden"
                      >
                        <div className="space-y-4">
                          {/* Card Cover Image */}
                          <div className="w-full aspect-[1.91/1] overflow-hidden border-b border-border/40 bg-muted/20 relative flex items-center justify-center">
                            {coverUrl ? (
                              <Image
                                src={coverUrl}
                                alt={post.title}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center text-muted-foreground text-xs">
                                No cover image
                              </div>
                            )}
                          </div>

                          <div className="px-6 pt-2 space-y-3">
                            {/* Tags */}
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {post.tags.slice(0, 2).map((tag) => (
                                  <span 
                                    key={tag.id} 
                                    className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-secondary border border-border/50 text-secondary-foreground"
                                  >
                                    {tag.title}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Title & Description */}
                            <div className="space-y-2">
                              <Link href={`/blog/${post.slug}`} className="block">
                                <h4 className="text-lg md:text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors cursor-pointer leading-snug line-clamp-2">
                                  {post.title}
                                </h4>
                              </Link>
                              <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">
                                {post.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="px-6 pb-6 pt-4 mt-6 border-t border-border/40 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {authorAvatarUrl ? (
                              <div className="size-8 rounded-full overflow-hidden border border-border/50 bg-muted shrink-0 relative flex items-center justify-center">
                                <Image
                                  src={authorAvatarUrl}
                                  alt={post.author?.name || 'Author'}
                                  fill
                                  sizes="32px"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                {post.author?.name ? post.author.name.charAt(0) : 'H'}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                {post.author?.name || 'huzlr Editor'}
                              </p>
                              {post.publishDate && (
                                <p className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <Calendar className="size-2.5" />
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
                            <Button variant="ghost" size="sm" className="group-hover:translate-x-0.5 transition-all text-xs font-semibold h-8 rounded-full px-2 hover:bg-transparent hover:text-primary">
                              Read
                              <ArrowRight className="size-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {pageCount > 1 && (
              <nav aria-label="Blog pagination" className="flex items-center justify-center gap-4 border-t border-border/40 pt-8">
                {page > 1 ? (
                  <Link href={`/blog?page=${page - 1}`}>
                    <Button variant="outline" size="sm" className="gap-2 rounded-full">
                      <ArrowLeft className="size-4" />
                      Previous
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled className="gap-2 rounded-full">
                    <ArrowLeft className="size-4" />
                    Previous
                  </Button>
                )}
                <span className="text-sm text-muted-foreground" aria-current="page">
                  Page {page} of {pageCount}
                </span>
                {page < pageCount ? (
                  <Link href={`/blog?page=${page + 1}`}>
                    <Button variant="outline" size="sm" className="gap-2 rounded-full">
                      Next
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled className="gap-2 rounded-full">
                    Next
                    <ArrowRight className="size-4" />
                  </Button>
                )}
              </nav>
            )}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
