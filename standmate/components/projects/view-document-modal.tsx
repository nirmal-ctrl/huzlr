"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { useUpdateDocumentMutation, useDeleteDocumentMutation, ProjectDocumentResponse } from "@/services/documentsApi"
import { EmojiSelector } from "@/components/ui/emoji-selector"
import { Check, Trash2, FileText, Calendar, Edit3, X } from "lucide-react"

interface ViewDocumentModalProps {
    document: ProjectDocumentResponse;
    trigger: React.ReactNode;
}

export function ViewDocumentModal({ document, trigger }: ViewDocumentModalProps) {
    const [open, setOpen] = useState(false)
    const [updateDocument, { isLoading: isUpdating }] = useUpdateDocumentMutation()
    const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation()
    const [isSuccess, setIsSuccess] = useState(false)

    const [title, setTitle] = useState(document.title)
    const [content, setContent] = useState(document.content || "")
    const [emoji, setEmoji] = useState(document.emoji)

    useEffect(() => {
        setTitle(document.title)
        setContent(document.content || "")
        setEmoji(document.emoji)
    }, [document])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        try {
            await updateDocument({
                documentId: document.document_id,
                updates: {
                    title: title.trim(),
                    content: content.trim() || undefined,
                    emoji,
                }
            }).unwrap()
            
            setIsSuccess(true)
            setTimeout(() => {
                setIsSuccess(false)
                setOpen(false)
            }, 800)
        } catch (error) {
            console.error("Failed to update document:", error)
        }
    }

    const handleDelete = async () => {
        try {
            await deleteDocument({
                documentId: document.document_id,
                projectId: document.project_id
            }).unwrap()
            setOpen(false)
        } catch (error) {
            console.error("Failed to delete document:", error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] p-6 gap-0 border bg-background shadow-2xl rounded-lg">
                <form onSubmit={handleUpdate} className="space-y-6">
                    {/* Header bar */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
                            <FileText className="w-3.5 h-3.5 opacity-60" />
                            <span>Document</span>
                            <span>/</span>
                            <span className="text-foreground font-medium">{emoji} {title || "Untitled"}</span>
                        </div>
                        
                        {/* Delete Button */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="h-7 w-7 rounded-md hover:bg-red-500/10 hover:text-red-500 text-muted-foreground/50 transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Big Editable Title & Emoji Selector */}
                    <div className="flex items-start gap-4">
                        <EmojiSelector 
                            value={emoji} 
                            onChange={setEmoji} 
                            triggerClassName="h-10 w-10 text-xl rounded-md bg-muted/20 hover:bg-muted/50 border border-border/20" 
                        />
                        <div className="space-y-1 flex-1">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Untitled document"
                                className="text-2xl font-semibold border-none outline-none focus:ring-0 p-0 shadow-none bg-transparent placeholder:text-muted-foreground/40 w-full h-auto"
                                required
                            />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground select-none">
                                <Calendar className="w-3 h-3 opacity-60" />
                                <span>Updated {new Date(document.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border/40 w-full" />

                    {/* Rich text Content Tiptap Editor */}
                    <div className="min-h-[250px] text-sm text-foreground/95">
                        <TiptapEditor
                            value={content}
                            onChange={(val) => setContent(val)}
                            placeholder="Add body text here..."
                            className="prose-sm text-foreground/90 max-w-none"
                        />
                    </div>

                    <div className="h-px bg-border/40 w-full" />

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-2">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setOpen(false)}
                            className="h-7 px-3 text-xs font-medium rounded-full"
                        >
                            Close
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isUpdating || isSuccess || !title.trim() || (title === document.title && content === document.content && emoji === document.emoji)}
                            className={`h-7 px-4 text-xs font-medium rounded-full transition-all duration-300 ${
                                isSuccess 
                                    ? "bg-emerald-600 hover:bg-emerald-600 text-white gap-1.5" 
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                        >
                            {isUpdating ? (
                                "Saving..."
                            ) : isSuccess ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-white" />
                                    Saved!
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
