"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconCalendarEvent, IconSettings, IconSparkles } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
  { title: "Meetings", url: "/scrum-master/meetings", icon: IconCalendarEvent },
  { title: "Settings", url: "/scrum-master/settings", icon: IconSettings },
]

export function NavScrumMaster() {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="gap-2">
        <IconSparkles className="size-3.5" />
        Scrum Master
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              data-active={pathname.startsWith(item.url)}
            >
              <Link href={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

