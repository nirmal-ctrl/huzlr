import { MetadataRoute } from 'next'
import { strapiApi } from '@/services/strapiApi'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://huzlr.com'

  // Define static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/case-studies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  let blogPosts: MetadataRoute.Sitemap = []
  try {
    const response = await strapiApi.getBlogPosts()
    if (response && response.data) {
      blogPosts = response.data.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt || post.publishDate || Date.now()),
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
        url: `${baseUrl}/case-studies/${study.slug}`,
        lastModified: new Date(study.createdAt || study.publishDate || Date.now()),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    }
  } catch (error) {
    console.error('Failed to generate sitemap for case studies', error)
  }

  return [...staticPages, ...blogPosts, ...caseStudies]
}
