"use client"

import { useState } from "react"
import { useCreateInviteMutation } from "@/services/invitesApi"
import { useAppSelector } from "@/lib/redux/hooks"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Mail, Shield, User, Loader2 } from "lucide-react"

interface InviteMembersModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function InviteMembersModal({ open, onOpenChange }: InviteMembersModalProps) {
    const { toast } = useToast()
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const [email, setEmail] = useState("")
    const [role, setRole] = useState<"admin" | "user">("user")
    const [createInvite, { isLoading }] = useCreateInviteMutation()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || !activeWorkspaceId) return

        try {
            await createInvite({
                email: email.trim(),
                role,
                workspace_id: activeWorkspaceId,
            }).unwrap()

            toast({
                title: "Invite Sent",
                description: `Successfully invited ${email} to the workspace.`,
            })
            setEmail("")
            onOpenChange(false)
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Failed to invite",
                description: error?.data?.detail || "Something went wrong.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-background border border-border rounded-xl shadow-2xl">
                <div className="p-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                            <Mail className="size-5 text-primary" />
                            Invite members to workspace
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground pt-1">
                            Enter the email address of the person you want to invite and specify their role.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="px-6 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
                                <Input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 h-10 bg-muted/20 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Role
                            </label>
                            <Select
                                value={role}
                                onValueChange={(val: "admin" | "user") => setRole(val)}
                                disabled={isLoading}
                            >
                                <SelectTrigger className="w-full h-10 bg-muted/20 border-border">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user" className="flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <User className="size-3.5 text-muted-foreground" />
                                            <span>Member (Full workspace access)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="admin" className="flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <Shield className="size-3.5 text-primary" />
                                            <span>Admin (Configure workspace & billing)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="h-9"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !email.trim()}
                            className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 shadow-sm"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Inviting...
                                </>
                            ) : (
                                "Send Invite"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
