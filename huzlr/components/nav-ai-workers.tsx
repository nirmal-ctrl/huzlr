"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot } from "lucide-react"

import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

export function NavAIWorkers() {
  const pathname = usePathname()
  return <SidebarGroup><SidebarGroupLabel>Automation</SidebarGroupLabel><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip="AI Workers" data-active={pathname.startsWith("/ai-workers")}><Link href="/ai-workers"><Bot /><span>AI Workers</span></Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroup>
}
