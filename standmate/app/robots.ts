import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard', 
          '/projects', 
          '/boards', 
          '/brainstorms', 
          '/teams', 
          '/onboarding', 
          '/signup',
          '/atlassian-callback',
          '/integrations'
        ],
      },
      {
        userAgent: [
          'GPTBot', 
          'ChatGPT-User', 
          'ClaudeBot', 
          'Claude-Web', 
          'PerplexityBot', 
          'Google-Extended', 
          'Applebot-Extended', 
          'cohere-ai'
        ],
        allow: [
          '/', 
          '/blog', 
          '/case-studies', 
          '/pricing'
        ],
        disallow: [
          '/dashboard', 
          '/projects', 
          '/boards', 
          '/brainstorms', 
          '/teams', 
          '/onboarding', 
          '/signup',
          '/atlassian-callback',
          '/integrations'
        ],
      }
    ],
    sitemap: 'https://huzlr.com/sitemap.xml',
  }
}
