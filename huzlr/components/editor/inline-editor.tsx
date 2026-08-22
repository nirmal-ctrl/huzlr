"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { Extension } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { useEffect } from "react"

// Prevent Enter key from creating new lines  keeps the field single-line
const PreventNewLine = Extension.create({
    name: "preventNewLine",
    addKeyboardShortcuts() {
        return {
            Enter: () => true, // consume the event, do nothing
        }
    },
})

interface InlineEditorProps {
    value?: string
    onChange?: (value: string) => void
    placeholder?: string
    className?: string
    onEnter?: () => void // optional: trigger submit on Enter
}

export function InlineEditor({
    value = "",
    onChange,
    placeholder = "Type here...",
    className = "",
    onEnter,
}: InlineEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Disable block-level nodes we don't need in an inline field
                heading: false,
                blockquote: false,
                codeBlock: false,
                bulletList: false,
                orderedList: false,
                listItem: false,
                horizontalRule: false,
            }),
            onEnter
                ? Extension.create({
                    name: "submitOnEnter",
                    addKeyboardShortcuts() {
                        return {
                            Enter: () => {
                                onEnter()
                                return true
                            },
                        }
                    },
                })
                : PreventNewLine,
        ],
        content: value,
        editorProps: {
            attributes: {
                class: "focus:outline-none w-full font-[inherit] leading-[inherit] tracking-[inherit]",
            },
        },
        onUpdate: ({ editor }) => {
            // getText() gives plain text; getHTML() wraps in <p> tags
            // We return plain text for title/summary fields
            onChange?.(editor.getText())
        },
        immediatelyRender: false,
    })

    // Sync external value changes into the editor
    useEffect(() => {
        if (editor && !editor.isFocused && value !== editor.getText()) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    return (
        <div className={`relative min-w-0 ${className}`}>
            {/* Placeholder rendered when editor is empty and not focused */}
            {editor && !editor.getText() && !value && (
                <span
                    className="pointer-events-none absolute inset-x-0 top-0 select-none font-[inherit] leading-[inherit] tracking-[inherit] text-muted-foreground/40"
                    aria-hidden="true"
                >
                    {placeholder}
                </span>
            )}
            <EditorContent editor={editor} />
        </div>
    )
}
