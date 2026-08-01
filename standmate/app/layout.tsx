import type React from "react"
import type { Metadata } from "next"
import { Inter, Caveat, Source_Serif_4, Open_Sans } from "next/font/google"
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

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-open-sans",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://huzlr.com"),
  title: "huzlr  Project intelligence that thinks ahead",
  description:
    "huzlr is a thinking layer above your existing tools. It understands dependencies, predicts risk early, and helps teams make better decisions before projects derail. Join the private beta.",
  keywords: [
    "AI project manager",
    "project management software",
    "agile project management",
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
    title: "huzlr  Project intelligence that thinks ahead",
    description:
      "A thinking layer above your existing tools. Predict risks early, surface the signals that matter, and decide before projects derail.",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "huzlr  Project intelligence that thinks ahead",
    description:
      "A thinking layer above your existing tools. Signals, not dashboards.",
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
    "description": "huzlr is a thinking layer above your existing tools. It understands dependencies, predicts risk early, and helps teams make better decisions before projects derail.",
    "featureList": "Risk forecasting, predictive delay warnings, async standups, delivery drift detection, automated project intelligence"
  }

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`font-sans antialiased ${inter.variable} ${sourceSerif.variable} ${caveat.variable} ${openSans.variable}`} suppressHydrationWarning={true}>
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
