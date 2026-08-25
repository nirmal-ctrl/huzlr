import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const privateRoutes = [
    '/api/',
    '/auth/',
    '/dashboard',
    '/projects',
    '/issues',
    '/boards',
    '/brainstorms',
    '/teams',
    '/scrum-master',
    '/onboarding',
    '/signup',
    '/atlassian-callback',
    '/integrations/jira/callback',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: privateRoutes,
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
          '/ai-scrum-master'
        ],
        disallow: privateRoutes,
      }
    ],
    sitemap: 'https://www.huzlr.com/sitemap.xml',
  }
}
