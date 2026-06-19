import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiBlogPost } from "@/services/strapiApi";
import { Calendar, User, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

// High-fidelity fallback mock posts if Strapi is not connected/setup yet
const MOCK_BLOG_POSTS: StrapiBlogPost[] = [
  {
    id: 1,
    documentId: 'mock-1',
    title: 'How Autonomous AI is Redefining Scrum and Agile Operations',
    slug: 'autonomous-ai-scrum-agile',
    description: 'Explore the shift from manual ticketing to real-time, context-aware AI agents optimizing engineering cycles.',
    content: 'Mock content',
    publishDate: '2026-06-18',
    createdAt: '2026-06-18',
    updatedAt: '2026-06-18',
    coverImage: null,
    author: {
      id: 1,
      documentId: 'auth-1',
      name: 'Nirmal Kumar',
      bio: 'Co-founder & AI Lead',
      avatar: null,
    },
    tags: [
      { id: 1, documentId: 'tag-1', title: 'Agile', slug: 'agile' },
      { id: 2, documentId: 'tag-2', title: 'Artificial Intelligence', slug: 'ai' },
    ],
  },
  {
    id: 2,
    documentId: 'mock-2',
    title: 'Predicting Risk Before the Sprint Fails',
    slug: 'predicting-risk-sprint-failure',
    description: 'How to leverage statistical intelligence to preempt engineering bottlenecks, resource constraints, and delay factors.',
    content: 'Mock content',
    publishDate: '2026-06-10',
    createdAt: '2026-06-10',
    updatedAt: '2026-06-10',
    coverImage: null,
    author: {
      id: 2,
      documentId: 'auth-2',
      name: 'Manohar PKG',
      bio: 'Co-founder & Product Architect',
      avatar: null,
    },
    tags: [
      { id: 3, documentId: 'tag-3', title: 'Risk Management', slug: 'risk' },
      { id: 4, documentId: 'tag-4', title: 'Analytics', slug: 'analytics' },
    ],
  },
];

export const revalidate = 3600; // ISR validation interval (1 hour)

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

export default async function BlogIndexPage() {
  let posts: StrapiBlogPost[] = [];
  let isUsingMock = false;

  try {
    const response = await strapiApi.getBlogPosts();
    posts = response.data;
  } catch (error) {
    console.warn("Strapi fetch failed, falling back to high-fidelity mock blog content.", error);
    posts = MOCK_BLOG_POSTS;
    isUsingMock = true;
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
      <section className="pb-24 px-4 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {posts.map((post) => (
          <article 
            key={post.id} 
            className="group relative flex flex-col justify-between p-6 rounded-2xl border border-border bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:border-border/80"
          >
            <div className="space-y-4">
              {/* Tags */}
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
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(post.publishDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
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
      </section>

      {/* Warning Notice if utilizing local mock fallback */}
      {isUsingMock && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 backdrop-blur-md max-w-sm text-xs space-y-1">
          <p className="font-semibold">Local Live Fallback Active</p>
          <p className="opacity-90">
            The frontend fell back to high-fidelity mock data because a running Strapi instance at <code>{STRAPI_URL}</code> was not detected. Once your sibling CMS is running, mock data will turn off automatically!
          </p>
        </div>
      )}

      <Footer />
    </div>
  );
}
