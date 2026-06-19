import React from 'react';
import Link from 'next/link';
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { strapiApi, StrapiBlogPost } from "@/services/strapiApi";
import { Calendar, ArrowLeft, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

// High-fidelity mock details matching our fallback list
const MOCK_DETAILS: Record<string, Partial<StrapiBlogPost>> = {
  'autonomous-ai-scrum-agile': {
    title: 'How Autonomous AI is Redefining Scrum and Agile Operations',
    description: 'Explore the shift from manual ticketing to real-time, context-aware AI agents optimizing engineering cycles.',
    publishDate: '2026-06-18',
    content: `
      <p>Agile has served engineering teams incredibly well for over two decades. However, the operational reality of managing tickets, updating sprint boards, and chasing developers for updates has introduced significant friction and overhead.</p>
      
      <h3>The Friction of Manual Project Management</h3>
      <p>In traditional sprint environments, project managers spend up to 40% of their time on purely administrative tasks: creating tickets, setting priorities, conducting standalone updates, and manually compiling metrics reports. This creates stale sprint boards, inconsistent prioritization, and lag in identifying delayed deliverables.</p>

      <blockquote>
        "The best-performing teams don't work harder—they have shorter feedback loops. AI makes feedback loops immediate."
      </blockquote>

      <h3>How Autonomous AI Solves This</h3>
      <p>With an AI agent directly connected to the codebase (via GitHub) and communication streams (via Slack/telephony), updates occur organically. AI engines analyze committed lines of code, cross-reference them with user stories, and automatically update sprint boards in real time. If a potential blocker is detected, the AI agent flags it instantly, predicting risks and prevent failures before the standup ever occurs.</p>

      <h3>The Shift to Continuous Planning</h3>
      <p>Moving forward, sprints won't just be planned in rigid two-week blocks. Planning becomes a continuous, fluid conversation between team leads and intelligence agents that optimize team resources dynamically. Sprints plan themselves, and developers focus on what they do best: writing clean, innovative code.</p>
    `,
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
  'predicting-risk-sprint-failure': {
    title: 'Predicting Risk Before the Sprint Fails',
    description: 'How to leverage statistical intelligence to preempt engineering bottlenecks, resource constraints, and delay factors.',
    publishDate: '2026-06-10',
    content: `
      <p>Every engineering team has experienced it: the end of a sprint arrives, and half the committed stories get carried over. Sprint failure is rarely due to a lack of effort; more often, it's caused by silent, creeping bottlenecks that build up unaddressed.</p>

      <h3>Early Indicators of Sprint Risks</h3>
      <p>AI-driven project intelligence can detect patterns that are completely invisible to the human eye. By analyzing historical task completion rates, complexity distributions, code churn, and PR approval speeds, a machine learning model can predict with up to 94% accuracy whether a sprint milestone will be met.</p>

      <h3>The Preemptive Strategy</h3>
      <p>When an AI project manager predicts that a high-priority task has a high probability of slipping, it doesn't just display a warning. It acts:</p>
      <ul>
        <li>Recommends shifting resources from non-critical items.</li>
        <li>Highlights complex PRs that have been sitting unreviewed for over 12 hours.</li>
        <li>Provides developers with automated summaries of blockers to speed up troubleshooting.</li>
      </ul>

      <p>By transitioning from reactive sprint reviews to proactive real-time monitoring, engineering cycles become highly predictable and efficient.</p>
    `,
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
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600; // ISR validation interval (1 hour)

export default async function BlogPostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let post: Partial<StrapiBlogPost> | null = null;
  let isUsingMock = false;

  try {
    post = await strapiApi.getBlogPostBySlug(slug);
  } catch (error) {
    console.warn("Strapi get single post failed, falling back to mock details.", error);
  }

  // If not found in Strapi, check our local high-fidelity fallback list
  if (!post && MOCK_DETAILS[slug]) {
    post = MOCK_DETAILS[slug];
    isUsingMock = true;
  }

  if (!post) {
    notFound();
  }

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
          <div className="flex flex-wrap gap-2">
            {post.tags?.map((tag) => (
              <span 
                key={tag.id} 
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {tag.title}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {post.title}
          </h1>

          <p className="text-xl text-muted-foreground leading-relaxed font-light">
            {post.description}
          </p>

          <div className="flex items-center gap-6 pt-4 border-b border-border pb-6">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {post.author?.name ? post.author.name.charAt(0) : 'H'}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{post.author?.name}</p>
                <p className="text-xs text-muted-foreground">{post.author?.bio || 'Huzlr Editorial Team'}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                Published: {post.publishDate ? new Date(post.publishDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'June 19, 2026'}
              </p>
              <p className="flex items-center gap-1">
                <Clock className="size-3.5" />
                5 min read
              </p>
            </div>
          </div>
        </div>

        {/* Article Content - Semantic Prose styled for Light/Dark Theme matching Linear reference */}
        <article 
          className="prose dark:prose-invert max-w-none prose-neutral prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:p-4 prose-blockquote:rounded-r-xl"
          dangerouslySetInnerHTML={{ __html: post.content || '' }}
        />
      </main>

      {/* Warning Notice if utilizing local mock fallback */}
      {isUsingMock && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 backdrop-blur-md max-w-sm text-xs space-y-1">
          <p className="font-semibold">Local Fallback Active</p>
          <p className="opacity-90">
            Displaying simulated high-fidelity content because this post was not found in your active Strapi database.
          </p>
        </div>
      )}

      <Footer />
    </div>
  );
}
