"use client"

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Plus } from "lucide-react"
import { useAppSelector } from "@/lib/redux/hooks"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { useUpdateIssueMutation as useUpdateTaskMutation, useCreateIssueMutation as useCreateTaskMutation } from "@/services/issuesApi"
import { ProjectStatusSelector, ProjectPrioritySelector, MemberSelector } from "@/components/properties/factory"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IssueDetailSheet } from "./issue-detail-sheet"
import { Skeleton } from "@/components/ui/skeleton"

export interface KanbanBoardProps {
  data: any[]
  columns: any[]
  entityType: string
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string) => void
  defaultProjectId?: number
  hiddenColumns?: string[]
  setHiddenColumns?: React.Dispatch<React.SetStateAction<string[]>>
  isLoading?: boolean
  onCreateClick?: (status: string) => void
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  data,
  columns,
  entityType,
  onItemMove,
  defaultProjectId,
  hiddenColumns,
  setHiddenColumns,
  isLoading,
  onCreateClick
}) => {
  const [mounted, setMounted] = useState(false)
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null)
  const [activeAddColumnId, setActiveAddColumnId] = useState<string | null>(null)
  const [inlineTitle, setInlineTitle] = useState("")
  const [selectedDetailTask, setSelectedDetailTask] = useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  
  const [localHiddenColumns, setLocalHiddenColumns] = useState<string[]>([])
  const activeHiddenColumns = hiddenColumns ?? localHiddenColumns
  const activeSetHiddenColumns = setHiddenColumns ?? setLocalHiddenColumns

  const params = useParams()
  const router = useRouter()
  const teamId = params.teamId ? parseInt(params.teamId as string) : undefined
  const projects = useAppSelector((state) => state.projects.items)
  const itemProjectId = data[0]?.project_id || defaultProjectId
  const project = projects.find(p => p.project_id === itemProjectId)
  const resolvedTeamId = teamId || project?.team_id

  const [updateTask] = useUpdateTaskMutation()
  const [createTask] = useCreateTaskMutation()

  const viewState = useAppSelector((state) => state.view.views[entityType])
  const groupBy = viewState?.groupBy || 'status'
  
  const schemaDefinitions = useAppSelector((state) => state.meta.propertyDefinitions[entityType]) || []
  const groupDef = schemaDefinitions?.find(def => def.key === groupBy)

  const visibleProperties = useMemo(() => {
    return schemaDefinitions
      .filter(def => def.visible !== false)
      .map(def => def.key)
  }, [schemaDefinitions])

  // Ensure client-only rendering for drag and drop to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Group data by the current groupBy field
  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {}

    // Initialize columns based on schema definitions or standard fallbacks
    if (groupDef?.options && Array.isArray(groupDef.options)) {
      groupDef.options.forEach(opt => {
        const label = typeof opt === 'string' ? opt : (opt as any).label || (opt as any).name || (opt as any).value;
        if (label) {
          groups[label.toLowerCase()] = []
        }
      })
    } else if (groupBy === 'status') {
      groups['backlog'] = []
      groups['planning'] = []
      groups['in progress'] = []
      groups['paused'] = []
      groups['done'] = []
      groups['canceled'] = []
    } else if (groupBy === 'priority') {
      groups['urgent'] = []
      groups['high'] = []
      groups['medium'] = []
      groups['low'] = []
      groups['none'] = []
    }

    // Populate data
    data.forEach(item => {
      let groupValue = 'uncategorized'

      if (item[groupBy]) {
        groupValue = item[groupBy]
      } else if (item.properties && item.properties[groupBy]) {
        groupValue = item.properties[groupBy]
      }

      if (typeof groupValue === 'object' && groupValue !== null) {
         groupValue = (groupValue as any).label || (groupValue as any).name || JSON.stringify(groupValue)
      }

      const lookupKey = String(groupValue).toLowerCase()
      if (!groups[lookupKey]) {
        groups[lookupKey] = []
      }
      groups[lookupKey].push(item)
    })

    return Object.entries(groups).map(([title, items]) => ({
      id: title,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      items
    }))
  }, [data, groupBy, groupDef])

  // Handle Drag and Drop
  const onDragEnd = useCallback(async (result: any) => {
    const { destination, source, draggableId } = result
    if (!destination) return

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const taskId = parseInt(draggableId)
    if (isNaN(taskId)) return

    const task = data.find(t => t.id === taskId)
    if (!task) return

    const updates: any = {}
    
    // Dynamically format column values to match exactly case sensitivies/structures expected by API
    let destinationVal = destination.droppableId
    if (groupBy === 'status') {
      // Find original option matching lowercase
      const matched = ['Backlog', 'Planning', 'In Progress', 'Paused', 'Done', 'Canceled'].find(
        s => s.toLowerCase() === destinationVal.toLowerCase()
      )
      updates.status = matched || destinationVal
    } else if (groupBy === 'priority') {
      const matched = ['Urgent', 'High', 'Medium', 'Low', 'None'].find(
        p => p.toLowerCase() === destinationVal.toLowerCase()
      )
      updates.properties = {
        ...(task.properties || {}),
        priority: matched || destinationVal
      }
    } else {
      updates.properties = {
        ...(task.properties || {}),
        [groupBy]: destinationVal
      }
    }

    if (onItemMove) {
      onItemMove(draggableId, source.droppableId, destination.droppableId)
    }

    try {
      await updateTask({
        issueId: taskId,
        updates,
        teamId: teamId || undefined,
        projectId: task.project_id
      }).unwrap()
    } catch (err) {
      console.error("Failed to move item optimistically:", err)
    }
  }, [data, groupBy, teamId, updateTask, onItemMove])

  // Focus a card by its ID
  const focusCard = useCallback((cardId: string) => {
    setFocusedCardId(cardId)
    const element = document.getElementById(`card-${cardId}`)
    if (element) {
      element.focus()
    }
  }, [])

  // Handle Keyboard Navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.hasAttribute("contenteditable")
    ) {
      return
    }

    // Find the flat structure of all cards
    const flatCards = groupedData.flatMap(col => col.items)
    if (flatCards.length === 0) return

    // If no card is focused, focus the first one on Arrow press
    if (!focusedCardId) {
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        focusCard(String(flatCards[0].id))
      }
      return
    }

    // Find current position
    let colIdx = -1
    let itemIdx = -1
    for (let c = 0; c < groupedData.length; c++) {
      const idx = groupedData[c].items.findIndex(item => String(item.id) === String(focusedCardId))
      if (idx !== -1) {
        colIdx = c
        itemIdx = idx
        break
      }
    }

    if (colIdx === -1 || itemIdx === -1) return

    const currentCol = groupedData[colIdx]

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        if (itemIdx < currentCol.items.length - 1) {
          focusCard(String(currentCol.items[itemIdx + 1].id))
        }
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        if (itemIdx > 0) {
          focusCard(String(currentCol.items[itemIdx - 1].id))
        }
        break
      }
      case 'ArrowRight': {
        e.preventDefault()
        if (colIdx < groupedData.length - 1) {
          const nextCol = groupedData[colIdx + 1]
          if (nextCol.items.length > 0) {
            const targetIdx = Math.min(itemIdx, nextCol.items.length - 1)
            focusCard(String(nextCol.items[targetIdx].id))
          }
        }
        break
      }
      case 'ArrowLeft': {
        e.preventDefault()
        if (colIdx > 0) {
          const prevCol = groupedData[colIdx - 1]
          if (prevCol.items.length > 0) {
            const targetIdx = Math.min(itemIdx, prevCol.items.length - 1)
            focusCard(String(prevCol.items[targetIdx].id))
          }
        }
        break
      }
      default:
        break
    }
  }, [groupedData, focusedCardId, focusCard])

  // Attach global keyboard listener for board focus navigation
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  if (!mounted) return null

  if (isLoading) {
    return (
      <div className="w-full h-full bg-background flex flex-col animate-pulse">
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 h-full">
            <div className="flex gap-3 h-full w-full items-start overflow-hidden justify-between">
              {[1, 2, 3].map((colId) => (
                <div key={colId} className="flex flex-col flex-1 min-w-[150px] max-w-[270px]">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-6 rounded-full" />
                    </div>
                  </div>
                  <div className="flex-1 bg-muted/20 rounded-lg p-3 border border-border/30 space-y-2 min-h-[400px]">
                    {[1, 2].map((cardId) => (
                      <div key={cardId} className="bg-card p-3 rounded-lg border border-border/40 space-y-3">
                        <Skeleton className="h-4 w-5/6" />
                        <div className="flex gap-1.5">
                          <Skeleton className="h-5 w-12 rounded-full" />
                          <Skeleton className="h-5 w-12 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const visibleColumns = groupedData.filter(col => !activeHiddenColumns.includes(col.id))

  return (
    <div className="w-full h-full min-h-0 bg-background flex flex-col">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col w-full max-w-full">
          <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-hidden flex flex-col w-full max-w-full">
            <div className="p-4 flex-1 min-h-0 min-w-0 flex flex-col w-full max-w-full">
              {/* Flexible spacing with gap, columns next to each other, scrollable horizontally if overflowing */}
              <div className="flex gap-3 flex-1 min-h-0 items-stretch justify-start w-full max-w-full">
                {visibleColumns.map((column) => (
                  <div key={column.id} className="flex flex-col w-72 shrink-0 h-full min-h-0">
                    {/* Column Header */}
                    <div className="mb-3 flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-foreground text-sm">{column.title}</h2>
                        <Badge variant="secondary" className="text-xs font-medium">
                          {column.items.length}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                          onClick={() => {
                            if (onCreateClick) {
                              onCreateClick(column.title)
                            }
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground cursor-pointer">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => activeSetHiddenColumns(prev => [...prev, column.id])}
                              className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              Hide column
                            </DropdownMenuItem>
                            {activeHiddenColumns.length > 0 && (
                              <DropdownMenuItem
                                onClick={() => activeSetHiddenColumns([])}
                                className="text-xs cursor-pointer"
                              >
                                Show all columns
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Droppable Column Container to prevent CLS, fixed height column scrolling */}
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          data-lenis-prevent
                          className={`flex-1 bg-muted/20 rounded-lg p-3 border overflow-y-auto space-y-2 min-h-0 transition-colors duration-200 ${
                            snapshot.isDraggingOver ? "bg-muted/40 border-primary/30" : "border-border/30"
                          }`}
                        >
                          {column.items.map((item, index) => (
                            <DraggableCard
                              key={String(item.id)}
                              item={item}
                              index={index}
                              visibleProperties={visibleProperties}
                              isFocused={focusedCardId === String(item.id)}
                              onFocus={() => setFocusedCardId(String(item.id))}
                              onOpenDetail={(taskItem) => {
                                const cardProject = projects.find(p => p.project_id === taskItem.project_id)
                                const cardTeamId = teamId || cardProject?.team_id
                                if (cardTeamId) {
                                  router.push(`/teams/${cardTeamId}/issues/${taskItem.id}`)
                                } else {
                                  console.error("Could not resolve team ID for issue:", taskItem)
                                }
                              }}
                              teamId={teamId || projects.find(p => p.project_id === item.project_id)?.team_id}
                            />
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* Fast Creation replaced with clean unified creation modal trigger */}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (onCreateClick) {
                          onCreateClick(column.title)
                        }
                      }}
                      className="mt-3 w-full gap-2 text-xs h-8 text-muted-foreground hover:text-foreground justify-start px-2 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DragDropContext>

      <IssueDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        task={selectedDetailTask}
        teamId={teamId}
      />
    </div>
  )
}

// Separate component for Card to optimize re-renders with React.memo
interface DraggableCardProps {
  item: any
  index: number
  visibleProperties: string[]
  isFocused: boolean
  onFocus: () => void
  onOpenDetail: (item: any) => void
  teamId?: number
}

const DraggableCard: React.FC<DraggableCardProps> = React.memo(({
  item,
  index,
  visibleProperties,
  isFocused,
  onFocus,
  onOpenDetail,
  teamId
}) => {
  const [updateTask] = useUpdateTaskMutation()
  const cardRef = useRef<HTMLDivElement>(null)

  const handleUpdateStatus = useCallback((status: string) => {
    updateTask({
      issueId: item.id,
      updates: { status },
      teamId,
      projectId: item.project_id
    })
  }, [item.id, item.project_id, teamId, updateTask])

  const handleUpdatePriority = useCallback((priority: string) => {
    updateTask({
      issueId: item.id,
      updates: {
        properties: {
          ...(item.properties || {}),
          priority
        }
      },
      teamId,
      projectId: item.project_id
    })
  }, [item.id, item.properties, item.project_id, teamId, updateTask])

  const handleUpdateAssignee = useCallback((assigneeId: string) => {
    updateTask({
      issueId: item.id,
      updates: {
        properties: {
          ...(item.properties || {}),
          assignee: assigneeId
        }
      },
      teamId,
      projectId: item.project_id
    })
  }, [item.id, item.properties, item.project_id, teamId, updateTask])

  // Custom keydown handler for single keypress hotkeys when focused
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.hasAttribute("contenteditable")
    ) {
      return
    }

    if (e.key === 's' || e.key === 'S') {
      e.preventDefault()
      const trigger = cardRef.current?.querySelector('[data-status-trigger]') as HTMLElement
      trigger?.click()
    } else if (e.key === 'a' || e.key === 'A' || e.key === 'e' || e.key === 'E') {
      e.preventDefault()
      const trigger = cardRef.current?.querySelector('[data-assignee-trigger]') as HTMLElement
      trigger?.click()
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault()
      const trigger = cardRef.current?.querySelector('[data-priority-trigger]') as HTMLElement
      trigger?.click()
    }
  }, [])

  return (
    <Draggable draggableId={String(item.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          id={`card-${item.id}`}
          tabIndex={0}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          className="outline-none"
        >
          <Card
            ref={cardRef}
            className={`group cursor-pointer bg-card p-3 rounded-lg border transition-all duration-200 space-y-3 ${
              snapshot.isDragging
                ? "scale-[1.02] shadow-xl border-primary/40 bg-card/90 cursor-grabbing"
                : isFocused
                ? "border-primary/50 ring-1 ring-primary/25 bg-accent/20"
                : "border-border/40 hover:border-primary/20 hover:shadow-md"
            }`}
          >
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => onOpenDetail(item)}
                className="font-medium text-sm text-foreground leading-snug line-clamp-2 text-left hover:underline cursor-pointer focus:outline-none"
              >
                {item.title || item.properties?.project_title || item.properties?.title || 'Untitled'}
              </button>

              {/* Lightweight Micro-dropdown Selectors for instant updates */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {visibleProperties.includes("status") && (
                  <div data-status-trigger>
                    <ProjectStatusSelector
                      value={item.status}
                      onChange={handleUpdateStatus}
                      className="h-6 px-1.5 text-[11px]"
                    />
                  </div>
                )}
                {visibleProperties.includes("priority") && (
                  <div data-priority-trigger>
                    <ProjectPrioritySelector
                      value={item.properties?.priority || "None"}
                      onChange={handleUpdatePriority}
                      className="h-6 px-1.5 text-[11px]"
                    />
                  </div>
                )}
                {visibleProperties.includes("assignee") && (
                  <div data-assignee-trigger>
                    <MemberSelector
                      value={item.properties?.assignee}
                      onChange={handleUpdateAssignee}
                      placeholder="Assignee"
                      className="h-6 px-1.5 text-[11px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {visibleProperties.includes("description") && item.description && (
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {item.description.replace(/<[^>]*>?/gm, '')}
              </div>
            )}

            {/* Render visible properties dynamically */}
            {visibleProperties.length > 0 && (
              <div className="flex flex-col gap-1 pt-2 border-t border-border/20 mt-3">
                {visibleProperties.filter(p => p !== 'project_title' && p !== 'title' && p !== 'status' && p !== 'priority' && p !== 'assignee' && p !== 'description').map(propKey => {
                   const val = item[propKey] ?? item.properties?.[propKey]
                   if (val === undefined || val === null || val === '') return null;

                   let displayVal = val;
                   if (typeof val === 'object') {
                     displayVal = val.label || val.name || JSON.stringify(val)
                   }

                   return (
                     <div key={propKey} className="flex justify-between items-center text-xs">
                       <span className="text-muted-foreground">{propKey.replace(/_/g, ' ')}</span>
                       <span className="font-medium max-w-[120px] truncate">{displayVal}</span>
                     </div>
                   )
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </Draggable>
  )
})

DraggableCard.displayName = "DraggableCard"
