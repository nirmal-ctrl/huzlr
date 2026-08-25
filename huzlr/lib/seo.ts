import type { Metadata } from "next"

export const siteConfig = {
  name: "huzlr",
  url: "https://www.huzlr.com",
  title: "AI Project Manager for Engineering Teams",
  description:
    "huzlr is an AI project manager for engineering teams that coordinates projects, Google Meet standups, blockers, status updates, and reviewable next actions.",
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
  keywords,
}: {
  title: string
  description: string
  path: string
  keywords?: string[]
}): Metadata {
  const socialTitle = `${title} | ${siteConfig.name}`

  return {
    title,
    description,
    keywords,
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
