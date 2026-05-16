'use client'
import { AppSidebar } from "@/components/app-sidebar"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useState } from "react"

export default function Page() {
  const mockData = [
    {
      id: "1",
      title: "Integrate Stripe payment gateway",
      description: "Compile competitor landing page designs for inspiration. G.",
      status: "backlog",
      priority: "high",
      progress: 10,
      assignee: { name: "Alex Rivera", avatar: "AR" },
      creator: { name: "Sarah Chen", avatar: "SC" },
      dueDate: "2025-11-15",
      project: "Backend",
      attachments: 2,
      comments: 4,
    },
    {
      id: "2",
      title: "Redesign marketing homepage",
      description: "Compile competitor landing page designs for inspiration. G.",
      status: "backlog",
      priority: "medium",
      progress: 0,
      assignee: { name: "Maya Patel", avatar: "MP" },
      creator: { name: "Jordan Lee", avatar: "JL" },
      dueDate: "2025-11-20",
      project: "Frontend",
      attachments: 1,
      comments: 1,
    },
    {
      id: "3",
      title: "Set up automated backups",
      description: "Compile competitor landing page designs for inspiration. G.",
      status: "backlog",
      priority: "medium",
      progress: 0,
      assignee: { name: "Casey Kim", avatar: "CK" },
      creator: { name: "Alex Rivera", avatar: "AR" },
      dueDate: "2025-11-18",
      project: "Infrastructure",
      attachments: 0,
      comments: 0,
    },
    {
      id: "4",
      title: "Database schema refactoring",
      description: "Compile competitor landing page designs for inspiration. G.",
      status: "backlog",
      priority: "high",
      progress: 0,
      assignee: { name: "Jordan Lee", avatar: "JL" },
      creator: { name: "Maya Patel", avatar: "MP" },
      dueDate: "2025-11-25",
      project: "Backend",
      attachments: 3,
      comments: 8,
    },
    {
      id: "5",
      title: "Dark mode toggle implementation",
      description: "Compile competitor landing page designs for inspiration. G.",
      status: "in-progress",
      priority: "high",
      progress: 40,
      assignee: { name: "Casey Kim", avatar: "CK" },
      creator: { name: "Alex Rivera", avatar: "AR" },
      dueDate: "2025-11-22",
      project: "Frontend",
      attachments: 2,
      comments: 6,
    },
    {
      id: "6",
      title: "Authentication system",
      description: "Compile competitor landing page designs for inspiration. G.",
      status: "in-progress",
      priority: "high",
      progress: 55,
      assignee: { name: "Sarah Chen", avatar: "SC" },
      creator: { name: "Maya Patel", avatar: "MP" },
      dueDate: "2025-11-28",
      project: "Backend",
      attachments: 1,
      comments: 3,
    },
    {
      id: "7",
      title: "Dashboard widgets",
      description: "Compile competitor landing page designs for inspiration. G.",
      status: "in-progress",
      priority: "medium",
      progress: 40,
      assignee: { name: "Jordan Lee", avatar: "JL" },
      creator: { name: "Casey Kim", avatar: "CK" },
      dueDate: "2025-11-24",
      project: "Frontend",
      attachments: 4,
      comments: 2,
    },
    {
      id: "8",
      title: "Set up CI/CD pipeline",
      description: "Compile competitor landing page designs for inspiration. G.",
      status: "done",
      priority: "high",
      progress: 100,
      assignee: { name: "Alex Rivera", avatar: "AR" },
      creator: { name: "Sarah Chen", avatar: "SC" },
      dueDate: "2025-11-01",
      project: "Infrastructure",
      attachments: 2,
      comments: 4,
    },
    {
      id: "9",
      title: "Initial project setup",
      description: "Compile competitor landing page designs for inspiration. G.",
      status: "done",
      priority: "medium",
      progress: 100,
      assignee: { name: "Maya Patel", avatar: "MP" },
      creator: { name: "Jordan Lee", avatar: "JL" },
      dueDate: "2025-10-25",
      project: "Frontend",
      attachments: 0,
      comments: 0,
    }
  ]

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader entityType="task" title="Boards" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 h-full flex-1">
              <KanbanBoard
                data={mockData}
                columns={[]}
                entityType="task"
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}