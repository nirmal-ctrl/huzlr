"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { useDebouncedUpdate } from "@/hooks/use-debounced-update"
import { fetchProjectById } from "@/lib/redux/slices/projectSlice"
import { SpinnerEmpty } from "@/components/spinner-empty"
import { Button } from "@/components/ui/button"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { InlineEditor } from "@/components/editor/inline-editor"
import { EmojiSelector } from "@/components/ui/emoji-selector"
import { useUpdateDocumentMutation, useDeleteDocumentMutation, useGetDocumentQuery } from "@/services/documentsApi"
import { ChevronLeft, Trash2, Calendar } from "lucide-react"

export default function DocumentPage() {
    const params = useParams()
    const router = useRouter()
    const projectId = params.projectId as string
    const documentId = params.documentId as string

    const dispatch = useAppDispatch()
    const { items: projects, loading: isLoadingProject } = useAppSelector((state) => state.projects)

    // Find current project
    const project = projects.find(p => p.project_id?.toString() === projectId)
    const isProjectDraft = Boolean(project?.properties?.is_draft)
    const projectReturnPath = isProjectDraft ? `/projects/new?draft=${projectId}` : `/projects/${projectId}`

    const { data: document, isLoading: isLoadingDocs } = useGetDocumentQuery(parseInt(documentId), {
        skip: !project
    })

    const [updateDocument] = useUpdateDocumentMutation()
    const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation()

    // Local states
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [emoji, setEmoji] = useState("📄")
    const textUpdatesRef = useRef<{ title?: string; content?: string }>({})

    useEffect(() => {
        if (!project) {
            dispatch(fetchProjectById(projectId))
        }
    }, [dispatch, projectId, project])

    // Load document data when fetched
    useEffect(() => {
        if (document) {
            setTitle(document.title)
            setContent(document.content || "")
            setEmoji(document.emoji)
            textUpdatesRef.current = {}
        }
    }, [document])

    // Debounced update handler
    const handleUpdate = React.useCallback(
        async (updates: Partial<any>) => {
            try {
                await updateDocument({
                    documentId: parseInt(documentId),
                    updates: {
                        title: title.trim(),
                        content: content.trim() || undefined,
                        emoji,
                        ...updates,
                    }
                }).unwrap()
            } catch (error) {
                console.error("Failed to autosave document:", error)
            }
        },
        [updateDocument, documentId, title, content, emoji]
    )

    const { triggerUpdate, flush } = useDebouncedUpdate<Partial<any>>(handleUpdate, 800)

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle)
        textUpdatesRef.current.title = newTitle
        triggerUpdate({ title: newTitle })
    }

    const handleContentChange = (newContent: string) => {
        setContent(newContent)
        textUpdatesRef.current.content = newContent
        triggerUpdate({ content: newContent })
    }

    const handleEmojiChange = (newEmoji: string) => {
        setEmoji(newEmoji)
        triggerUpdate({ emoji: newEmoji })
    }

    const handleReturnToProject = () => {
        flush()
        router.push(projectReturnPath)
    }

    const handleDelete = async () => {
        try {
            await deleteDocument({
                documentId: parseInt(documentId),
                projectId: parseInt(projectId)
            }).unwrap()
            router.push(projectReturnPath)
        } catch (error) {
            console.error("Failed to delete document:", error)
        }
    }

    const isLoading = isLoadingProject || isLoadingDocs

    if (isLoading && !document) {
        return (
            <div className="flex flex-1 items-center justify-center h-screen bg-background">
                <SpinnerEmpty />
            </div>
        )
    }

    if (!project || !document) {
        return (
            <div className="flex flex-1 items-center justify-center flex-col gap-4 h-screen bg-background text-foreground">
                <p>Document or Project not found</p>
                <Button onClick={() => router.push(projectReturnPath)}>Back to Project</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <SiteHeader>
                {isProjectDraft && (
                    <span className="hidden text-xs text-muted-foreground sm:inline">Saved to project draft</span>
                )}
                {/* Delete Document Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-7 w-7 rounded-md hover:bg-red-500/10 hover:text-red-500 text-muted-foreground/50 transition-all"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </SiteHeader>

            {/* Document Edit Workspace */}
            <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-12 py-10 space-y-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReturnToProject}
                    className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground"
                >
                    <ChevronLeft className="size-3.5" />
                    {isProjectDraft ? "Back to project draft" : "Back to project"}
                </Button>

                {/* Title & Emoji Selector Header */}
                <div className="flex items-start gap-4">
                    <EmojiSelector 
                        value={emoji} 
                        onChange={handleEmojiChange} 
                        triggerClassName="h-10 w-10 text-2xl rounded-md bg-muted/20 hover:bg-muted/50 border border-border/20" 
                    />
                    <div className="space-y-1 flex-1">
                        <InlineEditor
                            value={title}
                            onChange={(val) => handleTitleChange(val)}
                            placeholder="Untitled document"
                            className="text-3xl font-bold border-none outline-none focus:ring-0 p-0 shadow-none bg-transparent placeholder:text-muted-foreground/30 w-full h-auto"
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground select-none">
                            <Calendar className="w-3 h-3 opacity-60" />
                            <span>Updated {new Date(document.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border/40 w-full" />

                {/* Full-width dynamic rich text Tiptap editor */}
                <div className="min-h-[500px] text-base text-foreground/95">
                    <TiptapEditor
                        value={textUpdatesRef.current.content ?? content}
                        onChange={handleContentChange}
                        placeholder="Draft your project scope, brief, or product requirements document..."
                        className="prose-base text-foreground/90 max-w-none min-h-[500px]"
                    />
                </div>
            </div>
        </div>
    )
}
