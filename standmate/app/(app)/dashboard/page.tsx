"use client"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import data from "@/constants/data.json"
import { projectColumns, type ProjectData } from "../projects/columns"
import { useGetMyPendingInvitesQuery, useAcceptInviteMutation } from "@/services/invitesApi"
import { useAppDispatch } from "@/lib/redux/hooks"
import { fetchWorkspaces } from "@/lib/redux/slices/workspaceSlice"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Check, Loader2 } from "lucide-react"

export default function Page() {
    const dispatch = useAppDispatch()
    const { toast } = useToast()
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

    return (
        <>
            <SiteHeader title="Dashboard" />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        
                        {/* Pending Invites Alert Banner */}
                        {pendingInvites && pendingInvites.length > 0 && (
                            <div className="px-4 lg:px-6">
                                {pendingInvites.map((invite) => (
                                    <Card key={invite.id} className="border-primary/25 bg-primary/5 text-foreground shadow-sm mb-4">
                                        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                                    <Sparkles className="size-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold">Workspace Invitation</p>
                                                    <p className="text-xs text-muted-foreground pt-0.5">
                                                        You have been invited to join the <strong>{invite.workspace.name}</strong> workspace.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAccept(invite.id, invite.workspace.name)}
                                                disabled={isAccepting}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-8 px-4 flex items-center gap-1.5 rounded-lg"
                                            >
                                                {isAccepting ? (
                                                    <Loader2 className="size-3.5 animate-spin" />
                                                ) : (
                                                    <Check className="size-3.5" />
                                                )}
                                                Join Workspace
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

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
