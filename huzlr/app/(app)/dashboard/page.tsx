"use client"

import { SiteHeader } from "@/components/site-header"
import { OmniChat } from "@/components/omni-chat"
import { useGetMyPendingInvitesQuery, useAcceptInviteMutation } from "@/services/invitesApi"
import { useAppDispatch } from "@/lib/redux/hooks"
import { fetchWorkspaces } from "@/lib/redux/slices/workspaceSlice"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, Suspense } from "react"

function DashboardPageContent() {
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const searchParams = useSearchParams()
    const inviteIdParam = searchParams.get("invite_id")
    const autoAcceptTriggeredRef = useRef<string | null>(null)

    const { data: pendingInvites, refetch: refetchInvites } = useGetMyPendingInvitesQuery()
    const [acceptInvite] = useAcceptInviteMutation()

    const handleAccept = async (inviteId: number, workspaceName: string) => {
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
        }
    }

    // Auto-accept invite if query param is present
    useEffect(() => {
        if (inviteIdParam && pendingInvites && pendingInvites.length > 0) {
            const inviteIdNum = parseInt(inviteIdParam)
            const matchedInvite = pendingInvites.find(inv => inv.id === inviteIdNum)
            
            if (matchedInvite && autoAcceptTriggeredRef.current !== inviteIdParam) {
                // Mark as triggered so we don't double submit due to react double render
                autoAcceptTriggeredRef.current = inviteIdParam

                // Clear the query parameter from URL so it doesn't run again
                const url = new URL(window.location.href)
                url.searchParams.delete("invite_id")
                window.history.replaceState({}, '', url.pathname)

                // Accept the invite automatically
                handleAccept(matchedInvite.id, matchedInvite.workspace.name)
            }
        }
    }, [inviteIdParam, pendingInvites])

    return (
        <>
            <SiteHeader />
            <div className="flex min-h-0 flex-1 flex-col">
                <OmniChat />
            </div>
        </>
    )
}

export default function Page() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm font-medium">Loading dashboard...</p>
                </div>
            </div>
        }>
            <DashboardPageContent />
        </Suspense>
    )
}
