import type React from "react"
import type { Metadata } from "next"
import { Inter, Manrope, Source_Serif_4 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import { ThemeProvider } from "@/components/theme-provider"
import { ReduxProvider } from "@/lib/redux/provider"
import { Toaster } from "@/components/ui/sonner"
import { SmoothScroll } from "@/components/smooth-scroll"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
})

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
})

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://huzlr.com"),
  title: "huzlr | The coordination layer for teams working with AI",
  description:
    "huzlr keeps humans, AI workers, and existing systems aligned. Detect change, coordinate the response, and keep execution moving.",
  keywords: [
    "AI coordination layer",
    "hybrid organization management",
    "AI workforce coordination",
    "risk forecasting",
    "team collaboration",
    "project planning AI",
    "AI scrum master",
    "resource optimization",
    "project tracking AI",
    "automated project updates",
    "project analytics AI",
    "software development management",
    "AI-driven project insights",
    "project delivery acceleration",
    "intelligent project scheduling",
    "project performance monitoring",
    "AI project coordinator",
    "project risk management AI",
    "team productivity AI",
    "project milestone tracking",
    "AI-powered project dashboards",
  ],
  openGraph: {
    title: "huzlr | The coordination layer for teams working with AI",
    description:
      "Keep humans, AI workers, and existing systems aligned as work changes.",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "huzlr | The coordination layer for teams working with AI",
    description:
      "Keep humans, AI workers, and existing systems aligned as work changes.",
    images: ["/twitter-image.png"],
  },
  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "huzlr",
    "operatingSystem": "All",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "huzlr is a coordination layer that keeps humans, AI workers, and existing systems aligned as work changes.",
    "featureList": "Hybrid workforce coordination, delivery intelligence, dependency detection, AI worker orchestration, proactive risk signals"
  }

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`font-sans antialiased ${inter.variable} ${manrope.variable} ${sourceSerif.variable}`} suppressHydrationWarning={true}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ReduxProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SmoothScroll />
            {children}
            <Toaster />
          </ThemeProvider>
        </ReduxProvider>
        <Analytics />
      </body>
    </html>
  )
}
