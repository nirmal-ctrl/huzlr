"use client"

import * as React from "react"
import { Check, SlidersHorizontal, List, Columns, User, Calendar, AlertCircle, CircleDot, Tag, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { updatePropertyPreference } from "@/lib/redux/slices/metaSlice"
import { setLayout, setGroupBy, togglePropertyVisibility, LayoutType } from "@/lib/redux/slices/viewSlice"
import { toast } from "sonner"

interface ViewOptionsDropdownProps {
    entityType: string
    hiddenColumns?: string[]
    setHiddenColumns?: React.Dispatch<React.SetStateAction<string[]>>
}

export function ViewOptionsDropdown({ entityType, hiddenColumns, setHiddenColumns }: ViewOptionsDropdownProps) {
    const dispatch = useAppDispatch()
    const properties = useAppSelector((state) => state.meta.propertyDefinitions[entityType] || [])
    
    const viewState = useAppSelector((state) => state.view.views[entityType])
    const currentLayout = viewState?.layout || 'list'
    const currentGroupBy = viewState?.groupBy || 'status'
    const visibleProperties = viewState?.visibleProperties || []

    const displayableProperties = React.useMemo(() => {
        // Exclude project title as it's always displayed on cards/rows
        return properties.filter(p => p.key !== 'project_title')
    }, [properties])

    const availableColumns = React.useMemo(() => {
        if (currentLayout !== 'board') return []
        if (currentGroupBy === 'status') {
            return [
                { id: 'backlog', label: 'Backlog' },
                { id: 'planning', label: 'Planning' },
                { id: 'in progress', label: 'In Progress' },
                { id: 'paused', label: 'Paused' },
                { id: 'done', label: 'Done' },
                { id: 'canceled', label: 'Canceled' }
            ]
        }
        if (currentGroupBy === 'priority') {
            return [
                { id: 'urgent', label: 'Urgent' },
                { id: 'high', label: 'High' },
                { id: 'medium', label: 'Medium' },
                { id: 'low', label: 'Low' },
                { id: 'none', label: 'None' }
            ]
        }
        return []
    }, [currentLayout, currentGroupBy])

    const handleToggleColumn = (colId: string) => {
        if (!setHiddenColumns || !hiddenColumns) return
        if (hiddenColumns.includes(colId)) {
            setHiddenColumns(hiddenColumns.filter(id => id !== colId))
        } else {
            setHiddenColumns([...hiddenColumns, colId])
        }
    }

    const handleLayoutChange = (layout: LayoutType) => {
        dispatch(setLayout({ entityType, layout }))
    }

    const handleGroupByChange = (value: string) => {
        dispatch(setGroupBy({ entityType, groupBy: value === 'none' ? null : value }))
    }

    const handleToggleProperty = (key: string, currentVisible: boolean) => {
        // Only rely on metaSlice preference to avoid contradictory local state in viewSlice
        const newVisible = !currentVisible
        toast.promise(
            dispatch(updatePropertyPreference({ entityType, key, visible: newVisible })).unwrap(),
            {
                loading: `${newVisible ? "Showing" : "Hiding"} property...`,
                success: `${newVisible ? "Updated property visibility" : "Updated property visibility"}`,
                error: "Failed to update property visibility",
            }
        )
    }

    // Helper to render property specific icons for the premium view list
    const getPropertyIcon = (key: string) => {
        switch (key) {
            case "assignee":
            case "lead_id":
                return <User className="h-3.5 w-3.5 text-muted-foreground/80" />
            case "due_date":
            case "target_date":
            case "start_date":
                return <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
            case "priority":
                return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/80" />
            case "status":
                return <CircleDot className="h-3.5 w-3.5 text-muted-foreground/80" />
            default:
                return <Tag className="h-3.5 w-3.5 text-muted-foreground/80" />
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-8 text-xs font-semibold hover:bg-muted/50 rounded-lg">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Display</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-80 p-4 max-h-[calc(100vh-140px)] overflow-y-auto border border-border/60 bg-popover/95 backdrop-blur-md rounded-xl shadow-2xl overscroll-contain flex flex-col gap-4" 
                align="end"
            >
                {/* 1. Layout View selector */}
                <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-muted-foreground">View</span>
                    <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/40">
                        <Button 
                            variant={currentLayout === 'list' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-7 text-xs font-semibold px-3 rounded-md cursor-pointer shadow-none"
                            onClick={() => handleLayoutChange('list')}
                        >
                            <List className="h-3.5 w-3.5 mr-1.5" />
                            List
                        </Button>
                        <Button 
                            variant={currentLayout === 'board' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="h-7 text-xs font-semibold px-3 rounded-md cursor-pointer shadow-none"
                            onClick={() => handleLayoutChange('board')}
                        >
                            <Columns className="h-3.5 w-3.5 mr-1.5" />
                            Board
                        </Button>
                    </div>
                </div>

                {/* 2. Group by Selector */}
                <div className="flex items-center justify-between gap-4 border-t border-border/30 pt-3">
                    <span className="text-xs font-semibold text-muted-foreground">Group by</span>
                    <Select value={currentGroupBy || 'none'} onValueChange={handleGroupByChange}>
                        <SelectTrigger className="h-7 text-xs font-semibold border-border/60 bg-background/50 hover:bg-muted/40 shadow-none w-32 px-2 justify-between">
                            <SelectValue placeholder="Group by..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="priority">Priority</SelectItem>
                            <SelectItem value="assignee">Assignee</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Visible Columns toggle section (Kanban Board layout only) */}
                {currentLayout === 'board' && availableColumns.length > 0 && setHiddenColumns && hiddenColumns && (
                    <div className="space-y-2 border-t border-border/30 pt-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Visible Columns</span>
                        <div className="space-y-1">
                            {availableColumns.map((col) => {
                                const isVisible = !hiddenColumns.includes(col.id);
                                return (
                                    <div key={col.id} className="flex items-center justify-between py-1.5 hover:bg-muted/20 px-2 rounded-lg transition-colors">
                                        <div className="flex items-center gap-2">
                                            <Columns className="h-3.5 w-3.5 text-muted-foreground/80" />
                                            <span className="text-xs font-semibold text-foreground/95 select-none">{col.label}</span>
                                        </div>
                                        <Switch
                                            checked={isVisible}
                                            onCheckedChange={() => handleToggleColumn(col.id)}
                                            className="scale-75 origin-right cursor-pointer"
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 3. Properties Segment with custom Switch Toggles (matches Linear screenshot perfectly) */}
                <div className="space-y-2 border-t border-border/30 pt-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Properties</span>
                    <div className="space-y-1">
                        {displayableProperties.map((prop) => {
                            const isVisible = prop.visible !== false;
                            return (
                                <div key={prop.key} className="flex items-center justify-between py-1.5 hover:bg-muted/20 px-2 rounded-lg transition-colors">
                                    <div className="flex items-center gap-2">
                                        {getPropertyIcon(prop.key)}
                                        <Label
                                            htmlFor={`prop-${prop.key}`}
                                            className="cursor-pointer text-xs font-semibold text-foreground/95 select-none"
                                        >
                                            {prop.label}
                                        </Label>
                                    </div>
                                    <Switch
                                        id={`prop-${prop.key}`}
                                        checked={isVisible}
                                        onCheckedChange={() => handleToggleProperty(prop.key, isVisible)}
                                        className="scale-75 origin-right cursor-pointer"
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
