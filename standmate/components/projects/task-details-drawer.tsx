"use client"

import React, { useEffect, useState } from "react"
import { Task } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { useAppSelector } from "@/lib/redux/hooks"
import { PropertyDefinition } from "@/lib/redux/slices/metaSlice"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { 
    ProjectStatusSelector, 
    ProjectPrioritySelector, 
    MemberSelector, 
    LabelSelector 
} from "@/components/properties/factory"

interface TaskDetailsDrawerProps {
    task: Task | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdateTask: (taskId: number, updates: Partial<Task>) => void
}

export function TaskDetailsDrawer({ task, open, onOpenChange, onUpdateTask }: TaskDetailsDrawerProps) {
    const schemaDefinitions = useAppSelector(state => state.meta.propertyDefinitions["task"])
    
    const statusOptions = schemaDefinitions?.find(d => d.key === "status")?.options
    const priorityOptions = schemaDefinitions?.find(d => d.key === "priority")?.options
    
    // Local state for properties
    const [draftProperties, setDraftProperties] = useState<any>({})

    useEffect(() => {
        if (task) {
            setDraftProperties(task.properties || {})
        }
    }, [task])

    if (!task) return null

    const handlePropertyChange = (key: string, value: any) => {
        setDraftProperties((prev: any) => ({ ...prev, [key]: value }))
        onUpdateTask(task.id!, { 
            properties: { ...draftProperties, [key]: value } 
        })
    }

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateTask(task.id!, { title: e.target.value })
    }

    const renderDynamicField = (prop: PropertyDefinition) => {
        const value = draftProperties[prop.key] ?? prop.default
        
        switch (prop.type) {
            case "rich_text":
                return (
                    <div key={prop.key} className="flex flex-col gap-2">
                        <Label>{prop.label}</Label>
                        <div className="border rounded-md min-h-[200px] p-2">
                            <TiptapEditor
                                value={value || ""}
                                onChange={(val) => handlePropertyChange(prop.key, val)}
                                className="prose-sm max-w-none"
                            />
                        </div>
                    </div>
                )
            case "select":
                if (prop.key === "priority") {
                    return (
                        <div key={prop.key} className="flex flex-col gap-2">
                            <Label>{prop.label}</Label>
                            <ProjectPrioritySelector 
                                value={value} 
                                onChange={(val) => handlePropertyChange(prop.key, val)} 
                                options={priorityOptions}
                                className="w-full justify-start h-9"
                            />
                        </div>
                    )
                }
                return null
            case "user":
                return (
                    <div key={prop.key} className="flex flex-col gap-2">
                        <Label>{prop.label}</Label>
                        <MemberSelector 
                            value={value?.toString()} 
                            onChange={(val) => handlePropertyChange(prop.key, val)}
                            className="w-full justify-start h-9"
                        />
                    </div>
                )
            case "multi_select":
                if (prop.key === "labels") {
                    return (
                        <div key={prop.key} className="flex flex-col gap-2">
                            <Label>{prop.label}</Label>
                            <LabelSelector 
                                value={(value || []).map((l: any) => l.toString())} 
                                onChange={(val) => handlePropertyChange(prop.key, Array.isArray(val) ? val : [val])}
                                className="w-full justify-start h-9"
                            />
                        </div>
                    )
                }
                return null
            case "number":
                return (
                    <div key={prop.key} className="flex flex-col gap-2">
                        <Label>{prop.label}</Label>
                        <Input 
                            type="number" 
                            value={value || ""} 
                            onChange={(e) => handlePropertyChange(prop.key, Number(e.target.value))}
                        />
                    </div>
                )
            default:
                return (
                    <div key={prop.key} className="flex flex-col gap-2">
                        <Label>{prop.label}</Label>
                        <Input 
                            value={value || ""} 
                            onChange={(e) => handlePropertyChange(prop.key, e.target.value)}
                        />
                    </div>
                )
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Task Details</SheetTitle>
                </SheetHeader>
                
                <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input 
                            id="title" 
                            defaultValue={task.title} 
                            onBlur={handleTitleChange}
                            className="text-base font-medium"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label>Status</Label>
                        <ProjectStatusSelector 
                            value={task.status ?? undefined} 
                            onChange={(val) => onUpdateTask(task.id!, { status: val })} 
                            options={statusOptions}
                            className="w-full justify-start h-9"
                        />
                    </div>

                    {schemaDefinitions?.map(renderDynamicField)}
                </div>
            </SheetContent>
        </Sheet>
    )
}
