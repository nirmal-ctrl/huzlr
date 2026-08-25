import type { Metadata } from "next"

export const siteConfig = {
  name: "huzlr",
  url: "https://www.huzlr.com",
  title: "AI Delivery Coordination for Hybrid Teams",
  description:
    "huzlr is an AI project management and delivery coordination platform that keeps people, AI workers, meetings, and existing tools aligned as work changes.",
} as const

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString()
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

export function createMarketingMetadata({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}): Metadata {
  const socialTitle = `${title} | ${siteConfig.name}`

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      type: "website",
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
  }
}
