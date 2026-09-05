import { MetadataRoute } from 'next'
import { strapiApi } from '@/services/strapiApi'
import { absoluteUrl, siteConfig } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Define static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: absoluteUrl('/blog'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/case-studies'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/ai-scrum-master'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/product'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/how-it-works'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/ai-project-manager'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/automated-project-status-reporting'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/automated-daily-standups'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/project-risk-detection'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/integrations/jira'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/integrations/google-meet'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/solutions/delivery-leaders'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/solutions/agencies'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/templates/project-status-report'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/compare'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/compare/huzlr-vs-standup-bots'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/blog/how-to-automate-project-status-reports'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/blog/how-we-built-google-meet-ai-agent'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]

  const staticUrls = new Set(staticPages.map((page) => page.url))

  let blogPosts: MetadataRoute.Sitemap = []
  try {
    const response = await strapiApi.getBlogPosts()
    if (response && response.data) {
      blogPosts = response.data.map((post) => ({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: new Date(post.updatedAt || post.publishDate),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })).filter((post) => !staticUrls.has(post.url))
    }
  } catch (error) {
    console.error('Failed to generate sitemap for blog posts', error)
  }

  let caseStudies: MetadataRoute.Sitemap = []
  try {
    const response = await strapiApi.getCaseStudies()
    if (response && response.data) {
      caseStudies = response.data.map((study) => ({
        url: absoluteUrl(`/case-studies/${study.slug}`),
        lastModified: new Date(study.updatedAt || study.publishDate),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    }
  } catch (error) {
    console.error('Failed to generate sitemap for case studies', error)
  }

  return [...staticPages, ...blogPosts, ...caseStudies]
}
