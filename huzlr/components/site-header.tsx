"use client"

import { useState } from "react"
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
  const hasPageActions = Boolean(children || entityType)

  return (
    <header className="flex flex-col border-b bg-background">
      <div className="flex min-h-14 min-w-0 flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 sm:h-14 sm:flex-nowrap sm:px-4 sm:py-0 lg:px-6">
        <SidebarTrigger className="order-1 -ml-1 shrink-0" />
        <Separator orientation="vertical" className="order-1 mx-1 h-4 shrink-0 sm:mx-2" />

        <div className="order-1 min-w-0 flex-1 overflow-hidden">
          <DynamicBreadcrumb />
        </div>

        <div className="order-2 flex shrink-0 items-center gap-1.5 sm:order-4 sm:gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Bell className="size-4 text-muted-foreground" />
                {invitesCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                    {invitesCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-border bg-popover p-0 shadow-2xl">
              <div className="border-b border-border/60 bg-muted/20 p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Bell className="size-4 text-primary" />
                  Notifications
                </h3>
                <p className="pt-0.5 text-xs text-muted-foreground">
                  You have {invitesCount} pending workspace invitation{invitesCount === 1 ? "" : "s"}.
                </p>
              </div>

              <div className="max-h-[300px] divide-y divide-border/60 overflow-y-auto">
                {invitesCount === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                    <Mail className="size-6 text-muted-foreground/40" />
                    <p className="text-xs font-medium">All caught up!</p>
                    <p className="text-[11px] text-muted-foreground/60">No pending workspace invitations.</p>
                  </div>
                ) : (
                  pendingInvites?.map((invite) => (
                    <div key={invite.id} className="space-y-3 p-4 transition-colors hover:bg-muted/10">
                      <div className="flex gap-2">
                        <div className="mt-0.5 h-fit shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary">
                          <Sparkles className="size-3.5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold leading-tight text-foreground">
                            Workspace Invitation
                          </p>
                          <p className="text-[11px] leading-normal text-muted-foreground">
                            You've been invited to join the <strong>{invite.workspace.name}</strong> workspace.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(invite.id, invite.workspace.name)}
                          disabled={acceptingInviteId !== null}
                          className="flex h-7 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
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

          <AnimatedThemeToggler className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background p-1.5 shadow-sm hover:bg-accent hover:text-accent-foreground" />
        </div>

        {hasPageActions && (
          <div className="order-3 flex min-w-0 basis-full items-center justify-between gap-2 border-t border-border/50 pt-2 sm:order-3 sm:ml-auto sm:basis-auto sm:border-0 sm:pt-0">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto sm:flex-none sm:overflow-visible">
              {children}
            </div>
            {entityType && (
              <div className="shrink-0">
                <ViewOptionsDropdown entityType={entityType} />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
