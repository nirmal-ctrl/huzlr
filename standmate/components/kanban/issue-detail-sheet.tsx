"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useUpdateTaskMutation } from "@/services/tasksApi"
import { InlineEditor } from "@/components/editor/inline-editor"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { ProjectStatusSelector, ProjectPrioritySelector, MemberSelector } from "@/components/properties/factory"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface IssueDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: any
  teamId?: number
}

export const IssueDetailSheet: React.FC<IssueDetailSheetProps> = ({
  open,
  onOpenChange,
  task,
  teamId
}) => {
  const [updateTask] = useUpdateTaskMutation()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (task) {
      setTitle(task.title || task.properties?.title || "")
      setDescription(task.description || "")
    }
  }, [task])

  const handleUpdateTitle = useCallback(async (newTitle: string) => {
    if (!task || !newTitle.trim()) return
    setTitle(newTitle)
    try {
      await updateTask({
        taskId: task.id,
        updates: { title: newTitle },
        teamId,
        projectId: task.project_id
      }).unwrap()
    } catch (err) {
      console.error("Failed to update title:", err)
    }
  }, [task, teamId, updateTask])

  const handleUpdateDescription = useCallback(async (newDesc: string) => {
    if (!task) return
    setDescription(newDesc)
    try {
      await updateTask({
        taskId: task.id,
        updates: { description: newDesc },
        teamId,
        projectId: task.project_id
      }).unwrap()
    } catch (err) {
      console.error("Failed to update description:", err)
    }
  }, [task, teamId, updateTask])

  const handleUpdateStatus = useCallback(async (status: string) => {
    if (!task) return
    try {
      await updateTask({
        taskId: task.id,
        updates: { status },
        teamId,
        projectId: task.project_id
      }).unwrap()
    } catch (err) {
      console.error("Failed to update status:", err)
    }
  }, [task, teamId, updateTask])

  const handleUpdatePriority = useCallback(async (priority: string) => {
    if (!task) return
    try {
      await updateTask({
        taskId: task.id,
        updates: {
          properties: {
            ...(task.properties || {}),
            priority
          }
        },
        teamId,
        projectId: task.project_id
      }).unwrap()
    } catch (err) {
      console.error("Failed to update priority:", err)
    }
  }, [task, teamId, updateTask])

  const handleUpdateLead = useCallback(async (leadId: string) => {
    if (!task) return
    try {
      await updateTask({
        taskId: task.id,
        updates: {
          properties: {
            ...(task.properties || {}),
            lead_id: leadId
          }
        },
        teamId,
        projectId: task.project_id
      }).unwrap()
    } catch (err) {
      console.error("Failed to update lead:", err)
    }
  }, [task, teamId, updateTask])

  if (!task) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl flex flex-col h-full bg-background/95 backdrop-blur-md border-l border-border/50">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mb-2">
            <span>Issue Detail</span>
            <span>/</span>
            <span>#{task.id}</span>
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground pr-6">
            <InlineEditor
              value={title}
              onChange={handleUpdateTitle}
              placeholder="Issue title"
              className="text-lg font-semibold tracking-tight text-foreground"
            />
          </div>
          <SheetDescription className="hidden" />
        </SheetHeader>

        <Separator className="my-4 border-border/30" />

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 bg-muted/20 rounded-lg p-4 border border-border/30">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Status</Label>
              <ProjectStatusSelector
                value={task.status}
                onChange={handleUpdateStatus}
                className="justify-start px-2 bg-transparent hover:bg-muted/40 border-border/30 h-8 w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Priority</Label>
              <ProjectPrioritySelector
                value={task.properties?.priority || "None"}
                onChange={handleUpdatePriority}
                className="justify-start px-2 bg-transparent hover:bg-muted/40 border-border/30 h-8 w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <Label className="text-xs text-muted-foreground font-medium">Assignee</Label>
              <MemberSelector
                value={task.properties?.lead_id}
                onChange={handleUpdateLead}
                className="justify-start px-2 bg-transparent hover:bg-muted/40 border-border/30 h-8 w-full"
              />
            </div>
          </div>

          {/* Description Section */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground font-semibold">Description</Label>
            <div className="border border-border/50 rounded-lg overflow-hidden bg-background focus-within:ring-1 focus-within:ring-primary/25 focus-within:border-primary/50">
              <TiptapEditor
                value={description}
                onChange={handleUpdateDescription}
                placeholder="Add dynamic and rich descriptions using slash commands..."
                className="p-4 prose-sm max-w-none min-h-[200px]"
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
