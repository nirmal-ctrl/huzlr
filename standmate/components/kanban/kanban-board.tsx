"use client"

import type React from "react"
import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Plus } from "lucide-react"
import { useAppSelector } from "@/lib/redux/hooks"

export interface KanbanBoardProps {
  data: any[]
  columns: any[] // We pass table columns here, though we might not fully use them yet, good for property definition
  entityType: string
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string) => void
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  data,
  columns,
  entityType,
  onItemMove
}) => {
  const viewState = useAppSelector((state) => state.view.views[entityType])
  const groupBy = viewState?.groupBy || 'status' // Default grouping
  const visibleProperties = viewState?.visibleProperties || []

  // Group data by the current groupBy field
  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {}
    
    // Determine the groups based on data
    data.forEach(item => {
      // Find the value. If it's nested in properties (like standmate backend often does)
      let groupValue = 'Uncategorized'
      
      if (item[groupBy]) {
        groupValue = item[groupBy]
      } else if (item.properties && item.properties[groupBy]) {
        groupValue = item.properties[groupBy]
      }
      
      // Stringify if it's an object (e.g. status object)
      if (typeof groupValue === 'object' && groupValue !== null) {
         groupValue = (groupValue as any).label || (groupValue as any).name || JSON.stringify(groupValue)
      }

      if (!groups[groupValue]) {
        groups[groupValue] = []
      }
      groups[groupValue].push(item)
    })

    return Object.entries(groups).map(([title, items]) => ({
      id: title,
      title,
      items
    }))
  }, [data, groupBy])


  return (
    <div className="w-full h-full bg-background flex flex-col">
      {/* Board Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="p-4 h-full">
            <div className="flex gap-4 h-full min-w-max items-start">
              {groupedData.map((column) => (
                <div key={column.id} className="flex flex-col w-80 flex-shrink-0 max-h-full">
                  {/* Column Header */}
                  <div className="mb-3 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-foreground text-sm">{column.title}</h2>
                      <Badge variant="secondary" className="text-xs font-medium">
                        {column.items.length}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Items Container */}
                  <div className="flex-1 bg-muted/20 rounded-lg p-3 border border-border/30 overflow-y-auto space-y-2">
                    {column.items.map((item) => (
                      <Card
                        key={item.id || item.project_id || item.task_id || Math.random().toString()}
                        className="group cursor-grab active:cursor-grabbing bg-card p-3 rounded-lg border border-border/40 hover:border-primary/20 transition-all duration-200 space-y-3"
                      >
                        <h4 className="font-medium text-sm text-foreground leading-snug">
                          {item.title || item.properties?.project_title || item.properties?.title || 'Untitled'}
                        </h4>
                        
                        {/* Render visible properties dynamically */}
                        {visibleProperties.length > 0 && (
                          <div className="flex flex-col gap-1 pt-2 border-t border-border/20">
                            {visibleProperties.filter(p => p !== 'project_title' && p !== 'title').map(propKey => {
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
                    ))}
                  </div>
                  
                  {/* Add Item Button */}
                  <Button
                    variant="ghost"
                    className="mt-3 w-full gap-2 text-xs h-8 text-muted-foreground hover:text-foreground"
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
    </div>
  )
}
