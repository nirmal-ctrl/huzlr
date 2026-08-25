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
  ]

  let blogPosts: MetadataRoute.Sitemap = []
  try {
    const response = await strapiApi.getBlogPosts()
    if (response && response.data) {
      blogPosts = response.data.map((post) => ({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: new Date(post.updatedAt || post.publishDate),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
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
