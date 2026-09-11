"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconFolder, IconListCheck } from "@tabler/icons-react"
import { Network } from "lucide-react"

import { useAppSelector } from "@/lib/redux/hooks"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavProjects() {
  const pathname = usePathname()
  const activeTeamId = useAppSelector((state) => state.workspace.activeTeamId)
  const issuesUrl = activeTeamId ? `/teams/${activeTeamId}/issues` : "/issues"
  const isIssuesRoute = pathname === "/issues" || /^\/teams\/[^/]+\/issues(?:\/|$)/.test(pathname)
  const isContextGraphRoute = pathname === "/context-graphs" || /^\/projects\/[^/]+\/context(?:\/|$)/.test(pathname)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Projects"
            data-active={!isContextGraphRoute && (pathname === "/projects" || pathname.startsWith("/projects/"))}
          >
            <Link href="/projects">
              <IconFolder />
              <span>Projects</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Context Graphs"
            data-active={isContextGraphRoute}
          >
            <Link href="/context-graphs">
              <Network />
              <span>Context Graphs</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Issues"
            data-active={isIssuesRoute}
          >
            <Link href={issuesUrl}>
              <IconListCheck />
              <span>Issues</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
