"use client"

import * as React from "react"
import Image from "next/image"
import { CheckCircle2, ChevronRight, Cable, Plus, FileSpreadsheet, Lock } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { jiraRequest } from "@/lib/jira-api"
import { fetchCurrentUser } from "@/lib/redux/slices/authSlice"

// Official brand assets are bundled locally; preserve their original colors.
const JiraIcon = ({ className }: { className?: string }) => (
    <Image src="/integrations/jira.svg" alt="Jira" width={48} height={48} className={className} />
)

const LinearIcon = ({ className }: { className?: string }) => (
    <>
        <Image src="/integrations/linear-dark.svg" alt="Linear" width={20} height={20} className={cn(className, "dark:hidden")} />
        <Image src="/integrations/linear-light.svg" alt="Linear" width={20} height={20} className={cn(className, "hidden dark:block")} />
    </>
)

// Asana requires the symbol and wordmark together, so use the complete lockup.
const AsanaIcon = ({ className }: { className?: string }) => (
    <Image src="/integrations/asana.svg" alt="Asana" width={112} height={22} className={cn(className, "h-auto w-24")} />
)

interface IntegrationsSheetProps {
    onImportClick?: (integration: string) => void
}

export function ConnectedIntegrationsSheet({ onImportClick }: IntegrationsSheetProps) {
    const user = useAppSelector((state) => state.auth.user)
    const dispatch = useAppDispatch()
    const [open, setOpen] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [connecting, setConnecting] = React.useState(false)

    // Check connection status
    const isJiraConnected = user?.integrations?.jira?.connected || false

    const allIntegrations = [
        {
            id: "jira",
            name: "Jira",
            description: "Issues, epics, sprints",
            icon: JiraIcon,
            color: "",
            bgColor: "bg-transparent",
            connected: isJiraConnected,
        },
        {
            id: "linear",
            name: "Linear",
            description: "Issues, projects, cycles",
            icon: LinearIcon,
            color: "",
            bgColor: "bg-muted",
            connected: false, // Future support
        },
        {
            id: "asana",
            name: "Asana",
            description: "Tasks, projects, portfolios",
            icon: AsanaIcon,
            color: "",
            bgColor: "bg-white",
            connected: false, // Future support
        },
        {
            id: "csv",
            name: "CSV Import",
            description: "Upload spreadsheet",
            icon: FileSpreadsheet,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
            connected: false, // Handled differently
        },
    ]

    const connectedIntegrations = allIntegrations.filter(i => i.connected)
    const availableIntegrations = allIntegrations.filter(i => !i.connected)

    const handleConnect = async (integrationId: string) => {
        if (integrationId === "jira") {
            setError(null)
            setConnecting(true)
            try {
                const data = await jiraRequest<{ authorization_url: string }>("/authorize")
                if (data.authorization_url) {
                    window.location.href = data.authorization_url
                }
            } catch (error) {
                setError(error instanceof Error ? error.message : "Could not connect Jira")
            } finally {
                setConnecting(false)
            }
        } else {
            console.log("Connect", integrationId)
        }
    }

    const disconnectJira = async () => {
        setConnecting(true); setError(null)
        try {
            await jiraRequest("/connection", { method: "DELETE" })
            await dispatch(fetchCurrentUser(true)).unwrap()
        } catch (error) { setError(error instanceof Error ? error.message : "Unable to disconnect Jira") }
        finally { setConnecting(false) }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-full border-dashed">
                    <Plus className="h-4 w-4" />
                    Bring Existing Work
                </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Integrations</SheetTitle>
                    <SheetDescription>
                        Manage your active integrations and connect new tools.
                    </SheetDescription>
                </SheetHeader>
                {error && <p role="alert" className="px-4 text-sm text-destructive">{error}</p>}

                <div className="space-y-2">
                    {/* Connected Section */}
                    {connectedIntegrations.length > 0 && (
                        <div className="space-y-3 p-4">
                            <h3 className="text-sm font-medium text-muted-foreground px-1">Connected</h3>
                            <div className="space-y-3">
                                {connectedIntegrations.map((integration) => (
                                    <div
                                        key={integration.id}
                                        className="flex flex-col gap-3 rounded-xl border p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("shrink-0 rounded-lg p-2", integration.bgColor)}>
                                                    <integration.icon className={cn("h-5 w-5", integration.color)} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium">{integration.name}</h4>
                                                    <div className="mt-1 flex items-center gap-1.5">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                        <span className="text-xs text-muted-foreground">Connected</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full gap-2 rounded-full"
                                            variant="secondary"
                                            onClick={() => {
                                                onImportClick?.(integration.id)
                                            }}
                                        >
                                            Import Projects
                                            <ChevronRight className="h-4 w-4 opacity-50" />
                                        </Button>
                                        {integration.id === "jira" && <Button variant="ghost" size="sm" disabled={connecting} onClick={disconnectJira}>Disconnect Jira account and its imports</Button>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Available Section */}
                    <div className="space-y-3 p-4">
                        <h3 className="text-sm font-medium text-muted-foreground px-1">Available</h3>
                        <div className="space-y-3">
                            {availableIntegrations.map((integration) => {
                                const isComingSoon = integration.id !== "jira" && integration.id !== "csv"

                                return (
                                    <div
                                        key={integration.id}
                                        className={cn(
                                            "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
                                            isComingSoon ? "bg-muted/50" : "hover:bg-muted/30"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("shrink-0 rounded-lg p-2", integration.bgColor)}>
                                                    <integration.icon className={cn("h-5 w-5", integration.color)} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium">{integration.name}</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {integration.description}
                                                    </p>
                                                </div>
                                            </div>
                                            {isComingSoon && (
                                                <div className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border">
                                                    Soon
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            className="w-full gap-2 rounded-full"
                                            variant={isComingSoon ? "ghost" : "outline"}
                                            disabled={isComingSoon || connecting}
                                            onClick={() => handleConnect(integration.id)}
                                        >
                                            {isComingSoon ? (
                                                <>
                                                    <Lock className="h-3 w-3" />
                                                    Unavailable
                                                </>
                                            ) : (
                                                <>
                                                    <Cable className="h-4 w-4" />
                                                    Connect
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
