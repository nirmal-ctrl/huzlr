import React, { cache } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { BlogContent } from "@/components/blog-content";
import { strapiApi, StrapiBlogPost, getStrapiMediaUrl } from "@/services/strapiApi";
import { Calendar, ArrowLeft, ArrowRight, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import type { Metadata } from 'next';
import { estimateBlogReadingTime } from '@/lib/blog-content';
import { absoluteUrl, serializeJsonLd } from '@/lib/seo';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const getBlogPost = cache((slug: string) => strapiApi.getBlogPostBySlug(slug));

export async function generateStaticParams() {
  try {
    const response = await strapiApi.getBlogPosts();

    return (response.data ?? []).map(({ slug }) => ({ slug }));
  } catch (error) {
    console.error('Failed to generate static blog post routes', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getBlogPost(slug);
    if (!post) return {};
    
    const coverUrl = getStrapiMediaUrl(post.coverImage);
    const postUrl = absoluteUrl(`/blog/${slug}`);

    return {
      title: { absolute: `${post.title} | huzlr Blog` },
      description: post.description,
      alternates: { canonical: postUrl },
      openGraph: {
        title: post.title,
        description: post.description,
        url: postUrl,
        type: 'article',
        publishedTime: post.publishDate,
        modifiedTime: post.updatedAt,
        images: coverUrl ? [coverUrl] : [],
        authors: post.author?.name ? [post.author.name] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.description,
        images: coverUrl ? [coverUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: 'huzlr Blog Post',
    };
  }
}

// Blog content is public and shared by every visitor. Pre-render known CMS slugs
// and keep on-demand slugs in the ISR cache instead of querying Strapi for every
// crawler request.
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = 3600;

export default async function BlogPostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let post: Partial<StrapiBlogPost> | null = null;

  try {
    post = await getBlogPost(slug);
  } catch (error) {
    console.error(`Failed to fetch blog post with slug: ${slug}`, error);
  }

  if (!post) {
    notFound();
  }

  const coverUrl = getStrapiMediaUrl(post.coverImage);
  const avatarUrl = getStrapiMediaUrl(post.author?.avatar);

  const readTime = estimateBlogReadingTime(
    post.description,
    post.contentMarkdown,
    post.content ?? null,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.description,
    "image": coverUrl ? [coverUrl] : [],
    "datePublished": post.publishDate,
    "dateModified": post.updatedAt || post.publishDate,
    "author": {
      "@type": "Person",
      "name": post.author?.name || "huzlr Editor",
      "jobTitle": post.author?.bio || "huzlr Editorial Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "huzlr",
      "logo": {
        "@type": "ImageObject",
        "url": absoluteUrl('/favicon.png')
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": absoluteUrl(`/blog/${slug}`)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {/* Decorative background grid and gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/3 blur-[120px] rounded-full pointer-events-none" />

      <Navigation />

      <main className="pt-36 pb-24 px-4 max-w-4xl mx-auto w-full relative z-10 space-y-10">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="gap-2 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors rounded-full px-4">
              <ArrowLeft className="size-4" />
              All articles
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/10 flex items-center gap-1">
              <Sparkles className="size-3" />
              Latest insights
            </span>
          </div>
        </div>

        {/* Article Meta Header */}
        <div className="space-y-6">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span 
                  key={tag.id} 
                  className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border/50"
                >
                  {tag.title}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground to-foreground/85">
            {post.title}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-normal border-l-2 border-primary/20 pl-4">
            {post.description}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-b border-border/40 pb-6">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <div className="size-11 rounded-full overflow-hidden border border-border bg-muted shrink-0 relative flex items-center justify-center">
                  <Image
                    src={avatarUrl}
                    alt={post.author?.name || 'Author'}
                    fill
                    sizes="44px"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="size-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {post.author?.name ? post.author.name.charAt(0) : 'H'}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-foreground">{post.author?.name || 'huzlr Editor'}</p>
                <p className="text-xs text-muted-foreground">{post.author?.bio || 'huzlr Editorial Team'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/20 border border-border/40 px-4 py-2 rounded-full">
              {post.publishDate && (
                <p className="flex items-center gap-1.5 font-medium">
                  <Calendar className="size-3.5 text-primary" />
                  {new Date(post.publishDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
              <span className="text-border">•</span>
              <p className="flex items-center gap-1.5 font-medium">
                <Clock className="size-3.5 text-primary" />
                {readTime} min read
              </p>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        {coverUrl && (
          <div className="w-full aspect-[1.91/1] rounded-3xl overflow-hidden border border-border bg-muted/10 relative flex items-center justify-center shadow-lg">
            <Image
              src={coverUrl}
              alt={post.title || 'Article cover'}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article Content - Semantic Prose styled for Light/Dark Theme matching Linear reference */}
        <article 
          className="prose dark:prose-invert max-w-none prose-neutral 
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground 
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:font-extrabold
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:font-bold
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-base prose-p:mb-6
            prose-li:text-muted-foreground prose-li:leading-relaxed
            prose-a:text-primary prose-a:font-medium prose-a:underline prose-a:underline-offset-4
            prose-code:before:content-none prose-code:after:content-none prose-pre:overflow-x-auto
            prose-img:rounded-2xl prose-table:block prose-table:overflow-x-auto
            prose-blockquote:border-l-primary/60 prose-blockquote:bg-muted/20 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:italic prose-blockquote:text-foreground/90 prose-blockquote:not-italic"
        >
          <BlogContent
            contentMarkdown={post.contentMarkdown}
            content={post.content ?? null}
          />
        </article>

        {/* Bottom Author Bio / CTA */}
        <div className="mt-16 p-8 rounded-3xl border border-border/60 bg-muted/5 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <div className="size-14 rounded-full overflow-hidden border border-border bg-muted shrink-0 relative flex items-center justify-center">
                <Image
                  src={avatarUrl}
                  alt={post.author?.name || 'Author'}
                  fill
                  sizes="56px"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="size-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                {post.author?.name ? post.author.name.charAt(0) : 'H'}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">WRITTEN BY</p>
              <h4 className="text-base font-bold text-foreground">{post.author?.name || 'huzlr Editorial Team'}</h4>
              <p className="text-xs text-muted-foreground max-w-md">{post.author?.bio || 'Writing about autonomous project operations, agent frameworks, and AI workflows.'}</p>
            </div>
          </div>
          <div className="shrink-0">
            <Link href="/blog">
              <Button variant="outline" size="sm" className="rounded-full px-5 font-semibold text-xs gap-1.5">
                More Articles
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
