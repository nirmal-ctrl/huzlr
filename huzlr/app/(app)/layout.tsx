import type { Metadata } from "next"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { FounderAgentWidget } from "@/components/founder-agent"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      style={
        {
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        {children}
        <FounderAgentWidget />
      </SidebarInset>
    </SidebarProvider>
  )
}
