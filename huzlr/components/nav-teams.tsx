"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, ListTodo } from "lucide-react"
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
  
  const [isOpen, setIsOpen] = useState(true)
  const [showAll, setShowAll] = useState(false)

  if (!teams || teams.length === 0) return null

  const maxVisible = 5
  const hasMore = teams.length > maxVisible
  const visibleTeams = showAll ? teams : teams.slice(0, maxVisible)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden transition-all duration-200">
      <div className="flex items-center justify-between px-1">
        <SidebarGroupLabel 
          onClick={() => setIsOpen(!isOpen)}
          className="text-[11px] font-bold text-muted-foreground/85 tracking-wider uppercase flex items-center gap-1.5 cursor-pointer hover:text-foreground/90 transition-colors w-full select-none"
        >
          {isOpen ? <ChevronDown className="size-3.5 text-muted-foreground/80" /> : <ChevronRight className="size-3.5 text-muted-foreground/80" />}
          Teams
        </SidebarGroupLabel>
      </div>

      {isOpen && (
        <SidebarMenu className="space-y-0.5 px-1.5 pt-1.5 transition-all">
          {visibleTeams.map((team) => {
            const isTeamActive = pathname.startsWith(`/teams/${team.id}`)
            const initials = team.name.substring(0, 2).toUpperCase()

            return (
              <Collapsible
                key={team.id}
                asChild
                defaultOpen={isTeamActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      tooltip={team.name}
                      className="h-8.5 rounded-lg px-2.5 transition-all duration-200 hover:bg-muted/40 cursor-pointer"
                    >
                      <div className="flex size-5 items-center justify-center rounded-[5px] border border-border/80 bg-background text-[10px] font-bold text-muted-foreground/70 transition-colors group-hover/button:text-foreground group-data-[active=true]/button:border-primary/20 group-data-[active=true]/button:text-primary group-data-[active=true]/button:bg-primary/10">
                        {initials}
                      </div>
                      <span className="text-sm font-semibold tracking-tight truncate flex-1 text-left text-foreground/90 group-hover/button:text-foreground">{team.name}</span>
                      <ChevronRight className="ml-auto size-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-muted-foreground/50" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-5 border-l border-border/50 pl-2 mt-0.5 space-y-0.5">
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton 
                          asChild 
                          isActive={pathname === `/teams/${team.id}/issues`}
                          className="h-7 rounded-md hover:bg-muted/30 focus:bg-muted/30 data-[active=true]:bg-primary/5 data-[active=true]:text-primary cursor-pointer text-xs"
                        >
                          <Link href={`/teams/${team.id}/issues`} className="flex items-center gap-2">
                            <ListTodo className="size-3.5" />
                            <span className="font-medium text-[11px]">Issues</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}

          {hasMore && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setShowAll(!showAll)}
                className="h-7 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg px-2.5 mt-0.5 cursor-pointer flex items-center justify-center gap-1 w-full border border-dashed border-border/60 bg-transparent transition-all"
              >
                {showAll ? "Show Less" : `+ Show ${teams.length - maxVisible} More`}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      )}
    </SidebarGroup>
  )
}
