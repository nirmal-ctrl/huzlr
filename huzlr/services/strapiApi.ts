export interface StrapiImageFormat {
  url: string;
  width: number;
  height: number;
  size: number;
}

export interface StrapiImage {
  id: number;
  documentId: string;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number;
  height: number;
  formats: {
    thumbnail?: StrapiImageFormat;
    small?: StrapiImageFormat;
    medium?: StrapiImageFormat;
    large?: StrapiImageFormat;
  } | null;
  url: string;
}

export interface StrapiAuthor {
  id: number;
  documentId: string;
  name: string;
  bio: string | null;
  avatar: StrapiImage | null;
}

export interface StrapiTag {
  id: number;
  documentId: string;
  title: string;
  slug: string;
}

export interface StrapiBlogPost {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description: string;
  content: string; // Dynamic zone or markdown rich text depending on Strapi config
  publishDate: string;
  createdAt: string;
  updatedAt: string;
  coverImage: StrapiImage | null;
  author: StrapiAuthor | null;
  tags: StrapiTag[];
}

export interface StrapiCaseStudy {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  clientName: string;
  subtitle: string;
  challenge: string;
  solution: string;
  results: string;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
  heroImage: StrapiImage | null;
  tags: StrapiTag[];
}

interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';

async function fetchStrapi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${STRAPI_URL}/api${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    next: {
      tags: ['strapi'],
      revalidate: 3600, // Cache for 1 hour, or revalidate instantly via our on-demand webhook!
      ...options.next,
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch Strapi path: ${path}`, response.statusText);
    throw new Error(`Failed to fetch data from Strapi: ${response.statusText}`);
  }

  return response.json();
}

export function getStrapiMediaUrl(image: StrapiImage | null | undefined): string | null {
  if (!image || !image.url) return null;
  if (image.url.startsWith('http://') || image.url.startsWith('https://')) {
    return image.url;
  }
  return `${STRAPI_URL}${image.url}`;
}

export const strapiApi = {
  /**
   * Get all blog posts
   */
  async getBlogPosts(): Promise<StrapiResponse<StrapiBlogPost[]>> {
    return fetchStrapi<StrapiResponse<StrapiBlogPost[]>>(
      '/blogs?populate[coverImage]=true&populate[author][populate][avatar]=true&populate[tags]=true&sort[0]=publishDate:desc'
    );
  },

  /**
   * Get single blog post by slug
   */
  async getBlogPostBySlug(slug: string): Promise<StrapiBlogPost | null> {
    const response = await fetchStrapi<StrapiResponse<StrapiBlogPost[]>>(
      `/blogs?filters[slug][$eq]=${slug}&populate[coverImage]=true&populate[author][populate][avatar]=true&populate[tags]=true`
    );
    return response.data && response.data.length > 0 ? response.data[0] : null;
  },

  /**
   * Get all case studies
   */
  async getCaseStudies(): Promise<StrapiResponse<StrapiCaseStudy[]>> {
    return fetchStrapi<StrapiResponse<StrapiCaseStudy[]>>(
      '/case-studies?populate[heroImage]=true&populate[tags]=true&sort[0]=publishDate:desc'
    );
  },

  /**
   * Get single case study by slug
   */
  async getCaseStudyBySlug(slug: string): Promise<StrapiCaseStudy | null> {
    const response = await fetchStrapi<StrapiResponse<StrapiCaseStudy[]>>(
      `/case-studies?filters[slug][$eq]=${slug}&populate[heroImage]=true&populate[tags]=true`
    );
    return response.data && response.data.length > 0 ? response.data[0] : null;
  },
};
