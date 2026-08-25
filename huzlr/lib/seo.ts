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
