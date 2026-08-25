import type React from "react"
import type { Metadata } from "next"
import { Inter, Manrope, Source_Serif_4 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"

import { ThemeProvider } from "@/components/theme-provider"
import { ReduxProvider } from "@/lib/redux/provider"
import { Toaster } from "@/components/ui/sonner"
import { SmoothScroll } from "@/components/smooth-scroll"
import { siteConfig } from "@/lib/seo"

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
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.title} | ${siteConfig.name}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
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
  openGraph: { type: "website", siteName: siteConfig.name },
  twitter: {
    card: "summary_large_image",
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
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`font-sans antialiased ${inter.variable} ${manrope.variable} ${sourceSerif.variable}`} suppressHydrationWarning={true}>
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
