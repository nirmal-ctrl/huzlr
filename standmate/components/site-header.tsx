import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeSwitcher } from "@/components/theme-switcher"

import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler"
import { ViewOptionsDropdown } from "@/components/views/view-options-dropdown"

interface SiteHeaderProps {
  title?: string
  children?: React.ReactNode
  entityType?: string
}

export function SiteHeader({ title, children, entityType }: SiteHeaderProps) {
  return (
    <header className="flex flex-col border-b bg-background">
      <div className="flex h-14 items-center px-4 gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4"
        />
        <DynamicBreadcrumb />
        <div className="ml-auto flex items-center gap-2">
          {children}
          {entityType && <ViewOptionsDropdown entityType={entityType} />}
          <AnimatedThemeToggler className="h-8 w-8 rounded-full border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground p-1.5 flex items-center justify-center" />
        </div>
      </div>
      
    </header>
  )
}
