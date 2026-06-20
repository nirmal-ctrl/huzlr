import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiBlogPost, getStrapiMediaUrl } from "@/services/strapiApi";
import { Calendar, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600; // ISR cache for 1 hour, loaded instantly from Edge CDN!

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
        // If the user pasted raw HTML strings (like "<p>...</p>") inside their blocks editor,
        // we output it directly. Otherwise, wrap it in p tags.
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

export default async function BlogPostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let post: Partial<StrapiBlogPost> | null = null;

  try {
    post = await strapiApi.getBlogPostBySlug(slug);
  } catch (error) {
    console.error(`Failed to fetch blog post with slug: ${slug}`, error);
  }

  if (!post) {
    notFound();
  }

  const renderedContent = renderStrapiBlocks(post.content);
  const coverUrl = getStrapiMediaUrl(post.coverImage);
  const avatarUrl = getStrapiMediaUrl(post.author?.avatar);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Navigation />

      <main className="pt-32 pb-24 px-4 max-w-4xl mx-auto w-full space-y-8">
        {/* Back Link */}
        <Link href="/blog">
          <Button variant="ghost" size="sm" className="gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to articles
          </Button>
        </Link>

        {/* Article Meta Header */}
        <div className="space-y-4">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span 
                  key={tag.id} 
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary"
                >
                  {tag.title}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {post.title}
          </h1>

          <p className="text-xl text-muted-foreground leading-relaxed font-light">
            {post.description}
          </p>

          <div className="flex items-center gap-6 pt-4 border-b border-border pb-6">
            <div className="flex items-center gap-2.5">
              {avatarUrl ? (
                <div className="size-10 rounded-full overflow-hidden border border-border/50 bg-muted shrink-0 relative flex items-center justify-center">
                  <img 
                    src={avatarUrl} 
                    alt={post.author?.name || 'Author'} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {post.author?.name ? post.author.name.charAt(0) : 'H'}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{post.author?.name || 'Huzlr Editor'}</p>
                <p className="text-xs text-muted-foreground">{post.author?.bio || 'Huzlr Editorial Team'}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              {post.publishDate && (
                <p className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  Published: {new Date(post.publishDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
              <p className="flex items-center gap-1">
                <Clock className="size-3.5" />
                5 min read
              </p>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        {coverUrl && (
          <div className="w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden border border-border/60 bg-muted/10 relative flex items-center justify-center">
            <img 
              src={coverUrl} 
              alt={post.title} 
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Article Content - Semantic Prose styled for Light/Dark Theme matching Linear reference */}
        <article 
          className="prose dark:prose-invert max-w-none prose-neutral prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:p-4 prose-blockquote:rounded-r-xl"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </main>

      <Footer />
    </div>
  );
}
