"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, ListTodo, ChevronRight } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAppSelector } from "@/lib/redux/hooks"

export function NavTeams() {
  const pathname = usePathname()
  const teams = useAppSelector((state) => state.workspace.teams)

  if (!teams || teams.length === 0) return null

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Teams</SidebarGroupLabel>
      <SidebarMenu>
        {teams.map((team) => {
          const isTeamActive = pathname.startsWith(`/teams/${team.id}`)
          return (
            <Collapsible
              key={team.id}
              asChild
              defaultOpen={isTeamActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={team.name}>
                    <Users className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    <span className="font-medium">{team.name}</span>
                    <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === `/teams/${team.id}/issues`}>
                        <Link href={`/teams/${team.id}/issues`}>
                          <ListTodo className="size-3.5" />
                          <span>Issues</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
