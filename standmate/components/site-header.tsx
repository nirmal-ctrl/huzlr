"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler"
import { ViewOptionsDropdown } from "@/components/views/view-options-dropdown"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { useGetMyPendingInvitesQuery, useAcceptInviteMutation } from "@/services/invitesApi"
import { useAppDispatch } from "@/lib/redux/hooks"
import { fetchWorkspaces } from "@/lib/redux/slices/workspaceSlice"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, Check, Loader2, Sparkles, Mail } from "lucide-react"

interface SiteHeaderProps {
  title?: string
  children?: React.ReactNode
  entityType?: string
}

import { useState } from "react"

export function SiteHeader({ title, children, entityType }: SiteHeaderProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const { data: pendingInvites, refetch: refetchInvites } = useGetMyPendingInvitesQuery()
  const [acceptInvite] = useAcceptInviteMutation()
  const [acceptingInviteId, setAcceptingInviteId] = useState<number | null>(null)

  const handleAccept = async (inviteId: number, workspaceName: string) => {
    setAcceptingInviteId(inviteId)
    try {
      await acceptInvite({ invite_id: inviteId }).unwrap()
      toast({
        title: "Joined Workspace",
        description: `You are now a member of ${workspaceName}.`,
      })
      // Refetch invitations and active workspaces
      await refetchInvites()
      await dispatch(fetchWorkspaces())
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to join",
        description: error?.data?.detail || "Something went wrong.",
      })
    } finally {
      setAcceptingInviteId(null)
    }
  }

  const invitesCount = pendingInvites?.length || 0

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
          
          {/* Notifications Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 rounded-full border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-center cursor-pointer"
              >
                <Bell className="size-4 text-muted-foreground" />
                {invitesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                    {invitesCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 overflow-hidden bg-popover border border-border rounded-xl shadow-2xl">
              <div className="p-4 border-b border-border/60 bg-muted/20">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Bell className="size-4 text-primary" />
                  Notifications
                </h3>
                <p className="text-xs text-muted-foreground pt-0.5">
                  You have {invitesCount} pending workspace invitation{invitesCount === 1 ? "" : "s"}.
                </p>
              </div>

              <div className="max-h-[300px] overflow-y-auto divide-y divide-border/60">
                {invitesCount === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Mail className="size-6 text-muted-foreground/40" />
                    <p className="text-xs font-medium">All caught up!</p>
                    <p className="text-[11px] text-muted-foreground/60">No pending workspace invitations.</p>
                  </div>
                ) : (
                  pendingInvites?.map((invite) => (
                    <div key={invite.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                      <div className="flex gap-2">
                        <div className="bg-primary/10 p-1.5 h-fit rounded-lg text-primary shrink-0 mt-0.5">
                          <Sparkles className="size-3.5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-foreground leading-tight">
                            Workspace Invitation
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            You've been invited to join the <strong>{invite.workspace.name}</strong> workspace.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(invite.id, invite.workspace.name)}
                          disabled={acceptingInviteId !== null}
                          className="h-7 text-xs font-semibold px-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center gap-1"
                        >
                          {acceptingInviteId === invite.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" />
                          )}
                          Join Workspace
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <AnimatedThemeToggler className="h-8 w-8 rounded-full border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground p-1.5 flex items-center justify-center" />
        </div>
      </div>
      
    </header>
  )
}
