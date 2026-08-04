"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { useCreateDocumentMutation } from "@/services/documentsApi"
import { EmojiSelector } from "@/components/ui/emoji-selector"
import { Plus, Check, FileText, Sparkles, Maximize2, Minimize2, Trash2 } from "lucide-react"
import { useEffect } from "react"

interface CreateDocumentModalProps {
    projectId: number;
}

export function CreateDocumentModal({ projectId }: CreateDocumentModalProps) {
    const [open, setOpen] = useState(false)
    const [createDocument, { isLoading }] = useCreateDocumentMutation()
    const [isSuccess, setIsSuccess] = useState(false)
    const [isMaximized, setIsMaximized] = useState(false)
    const [hasDraft, setHasDraft] = useState(false)
    
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [selectedEmoji, setSelectedEmoji] = useState("📄")

    // Load draft on open
    useEffect(() => {
        if (open) {
            const saved = localStorage.getItem(`huzlr:project_draft:${projectId}`)
            if (saved) {
                try {
                    const parsed = JSON.parse(saved)
                    setTitle(parsed.title || "")
                    setContent(parsed.content || "")
                    setSelectedEmoji(parsed.emoji || "📄")
                    setHasDraft(true)
                } catch (e) {
                    console.error("Failed to parse draft:", e)
                }
            }
        }
    }, [open, projectId])

    // Save draft automatically on input changes
    useEffect(() => {
        if (open && (title.trim() || content.trim() || selectedEmoji !== "📄")) {
            localStorage.setItem(
                `huzlr:project_draft:${projectId}`,
                JSON.stringify({ title, content, emoji: selectedEmoji })
            )
            setHasDraft(true)
        }
    }, [title, content, selectedEmoji, projectId, open])

    const discardDraft = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        localStorage.removeItem(`huzlr:project_draft:${projectId}`)
        resetForm()
        setHasDraft(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        try {
            await createDocument({
                projectId,
                document: {
                    project_id: projectId,
                    title: title.trim(),
                    content: content.trim() || undefined,
                    emoji: selectedEmoji,
                }
            }).unwrap()
            
            setIsSuccess(true)
            localStorage.removeItem(`huzlr:project_draft:${projectId}`)
            setHasDraft(false)
            setTimeout(() => {
                setOpen(false)
                resetForm()
                setIsSuccess(false)
                setIsMaximized(false)
            }, 1000)
        } catch (error) {
            console.error("Failed to create document:", error)
        }
    }

    const resetForm = () => {
        setTitle("")
        setContent("")
        setSelectedEmoji("📄")
    }

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen)
            if (!newOpen) {
                // If closing, we keep the draft saved in localstorage, but we reset form for the next open
                resetForm()
            }
        }}>
            <DialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-md hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground border border-transparent hover:border-border/40 transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className={`p-5 gap-0 border bg-background shadow-2xl transition-all duration-300 ${
                isMaximized 
                    ? "sm:max-w-none left-0 sm:left-[var(--sidebar-width)] w-full sm:w-[calc(100vw-var(--sidebar-width))] h-screen max-h-none rounded-none border-0" 
                    : "sm:max-w-[500px] rounded-lg"
            }`}>
                <form onSubmit={handleSubmit} className="space-y-4 h-full flex flex-col justify-between">
                    <div className="space-y-4 flex-1">
                        {/* Header Context Bar */}
                        <div className="flex items-center justify-between select-none">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <FileText className="w-3.5 h-3.5 opacity-60" />
                                <span>Project Documents</span>
                                <span>/</span>
                                <span className="text-foreground font-medium">New document</span>
                                {hasDraft && (
                                    <Badge variant="secondary" className="ml-2 py-0 h-4 text-[9px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
                                        Draft Autosaved
                                        <button 
                                            type="button" 
                                            onClick={discardDraft}
                                            className="hover:text-amber-700 transition-colors ml-0.5"
                                            title="Discard draft"
                                        >
                                            <Trash2 className="w-2.5 h-3" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                            
                            {/* Maximize Toggle Button */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMaximized(!isMaximized)}
                                className="h-6 w-6 text-muted-foreground/60 hover:text-foreground"
                            >
                                {isMaximized ? (
                                    <Minimize2 className="w-3.5 h-3.5" />
                                ) : (
                                    <Maximize2 className="w-3.5 h-3.5" />
                                )}
                            </Button>
                        </div>

                    {/* Title Input (Borderless, large) & Emoji Selector */}
                    <div className="flex items-center gap-3">
                        <EmojiSelector value={selectedEmoji} onChange={setSelectedEmoji} />
                        
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-lg font-semibold border-0 focus-visible:ring-0 p-0 shadow-none bg-transparent placeholder:text-muted-foreground/40 h-auto flex-1"
                            placeholder="Document title"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Rich text Content Tiptap (Borderless, compact) */}
                    <div className={`text-sm text-foreground/95 ${
                        isMaximized ? "flex-1 overflow-y-auto min-h-[400px]" : "min-h-[150px]"
                    }`}>
                        <TiptapEditor
                            value={content}
                            onChange={(val) => setContent(val)}
                            placeholder="Draft your project scope, brief, or product requirements document..."
                            className="prose-sm text-foreground/90 max-w-none"
                        />
                    </div>
                    </div>

                    <div className="space-y-4 shrink-0">
                        <div className="h-px bg-border/40 w-full" />

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setOpen(false)}
                                className="h-7 px-3 text-xs font-medium rounded-full"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isLoading || isSuccess || !title.trim()}
                                className={`h-7 px-4 text-xs font-medium rounded-full transition-all duration-300 ${
                                    isSuccess 
                                        ? "bg-emerald-600 hover:bg-emerald-600 text-white gap-1.5" 
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                }`}
                            >
                                {isLoading ? (
                                    "Creating..."
                                ) : isSuccess ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-white" />
                                        Created!
                                    </>
                                ) : (
                                    "Create"
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
