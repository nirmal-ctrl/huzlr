"use client"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import data from "@/constants/data.json"
import { projectColumns, type ProjectData } from "../projects/columns"
import { useGetMyPendingInvitesQuery, useAcceptInviteMutation } from "@/services/invitesApi"
import { useAppDispatch } from "@/lib/redux/hooks"
import { fetchWorkspaces } from "@/lib/redux/slices/workspaceSlice"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Check, Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

export default function Page() {
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const searchParams = useSearchParams()
    const inviteIdParam = searchParams.get("invite_id")
    const autoAcceptTriggeredRef = useRef<string | null>(null)

    const { data: pendingInvites, refetch: refetchInvites } = useGetMyPendingInvitesQuery()
    const [acceptInvite, { isLoading: isAccepting }] = useAcceptInviteMutation()

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
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                        <SectionCards />
                        <div className="px-4 lg:px-6">
                            <ChartAreaInteractive />
                        </div>
                        <DataTable<ProjectData>
                            data={data.map((item: any) => ({ id: item.id, project_id: item.project_id, ...item.properties })) as ProjectData[]}
                            columns={projectColumns}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}
