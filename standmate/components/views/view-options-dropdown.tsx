"use client"

import * as React from "react"
import { Check, SlidersHorizontal, List, Columns, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { updatePropertyPreference } from "@/lib/redux/slices/metaSlice"
import { setLayout, setGroupBy, togglePropertyVisibility, LayoutType } from "@/lib/redux/slices/viewSlice"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"


interface ViewOptionsDropdownProps {
    entityType: string
    hiddenColumns?: string[]
    setHiddenColumns?: React.Dispatch<React.SetStateAction<string[]>>
}

export function ViewOptionsDropdown({ entityType, hiddenColumns, setHiddenColumns }: ViewOptionsDropdownProps) {
    const dispatch = useAppDispatch()
    const properties = useAppSelector((state) => state.meta.propertyDefinitions[entityType] || [])
    
    // Fallback to defaults if view state is not initialized for this entityType
    const viewState = useAppSelector((state) => state.view.views[entityType])
    const currentLayout = viewState?.layout || 'list'
    const currentGroupBy = viewState?.groupBy || 'status'
    const visibleProperties = viewState?.visibleProperties || []

    const boardColumns = React.useMemo(() => {
        if (currentGroupBy === 'priority') {
            return [
                { id: 'urgent', label: 'Urgent' },
                { id: 'high', label: 'High' },
                { id: 'medium', label: 'Medium' },
                { id: 'low', label: 'Low' },
                { id: 'none', label: 'No Priority' }
            ]
        }
        // Default to status
        return [
            { id: 'backlog', label: 'Backlog' },
            { id: 'planning', label: 'Planning' },
            { id: 'in progress', label: 'In Progress' },
            { id: 'paused', label: 'Paused' },
            { id: 'done', label: 'Done' },
            { id: 'canceled', label: 'Canceled' }
        ]
    }, [currentGroupBy])

    const displayableProperties = React.useMemo(() => {
        return properties.filter(p => p.key !== 'project_title') // Title is always visible
    }, [properties])

    const handleLayoutChange = (layout: LayoutType) => {
        dispatch(setLayout({ entityType, layout }))
    }

    const handleGroupByChange = (value: string) => {
        dispatch(setGroupBy({ entityType, groupBy: value === 'none' ? null : value }))
    }

    const handleToggleProperty = (key: string, currentVisible: boolean) => {
        // Toggle in view slice
        dispatch(togglePropertyVisibility({ entityType, property: key }))
        
        // Also update backend preference via metaSlice to persist (if desired, keeping old logic)
        const newVisible = !currentVisible
        toast.promise(
            dispatch(updatePropertyPreference({ entityType, key, visible: newVisible })).unwrap(),
            {
                loading: `${newVisible ? "Showing" : "Hiding"} property...`,
                success: `${newVisible ? "Shown" : "Hidden"}`,
                error: "Failed to update property visibility",
            }
        )
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-8">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden lg:inline">Display</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
                <Command>
                    <CommandList>
                        <CommandGroup heading="Layout">
                            <div className="flex items-center gap-2 p-2">
                                <Button 
                                    variant={currentLayout === 'list' ? 'secondary' : 'ghost'} 
                                    size="sm" 
                                    className="flex-1 justify-start"
                                    onClick={() => handleLayoutChange('list')}
                                >
                                    <List className="h-4 w-4 mr-2" />
                                    List
                                </Button>
                                <Button 
                                    variant={currentLayout === 'board' ? 'secondary' : 'ghost'} 
                                    size="sm" 
                                    className="flex-1 justify-start"
                                    onClick={() => handleLayoutChange('board')}
                                >
                                    <Columns className="h-4 w-4 mr-2" />
                                    Board
                                </Button>
                            </div>
                        </CommandGroup>
                        <CommandSeparator />
                        
                        <CommandGroup heading="Grouping">
                            <div className="p-2">
                                <Select value={currentGroupBy || 'none'} onValueChange={handleGroupByChange}>
                                    <SelectTrigger className="h-8 w-full text-xs">
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
                        </CommandGroup>
                        <CommandSeparator />

                        {currentLayout === 'board' && setHiddenColumns && hiddenColumns && (
                            <>
                                <CommandGroup heading="Board Columns">
                                    <div className="p-2 space-y-1">
                                        {boardColumns.map((col) => {
                                            const isVisible = !hiddenColumns.includes(col.id)
                                            return (
                                                <div key={col.id} className="flex items-center space-x-2 py-1 px-2 hover:bg-muted/50 rounded-sm">
                                                    <Checkbox
                                                        id={`col-pref-${col.id}`}
                                                        checked={isVisible}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setHiddenColumns(prev => prev.filter(id => id !== col.id))
                                                            } else {
                                                                // Prevent hiding all columns
                                                                const visibleCount = boardColumns.length - hiddenColumns.length
                                                                if (visibleCount > 1) {
                                                                    setHiddenColumns(prev => [...prev, col.id])
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <Label
                                                        htmlFor={`col-pref-${col.id}`}
                                                        className="flex-1 cursor-pointer text-xs font-medium leading-none"
                                                    >
                                                        {col.label}
                                                    </Label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CommandGroup>
                                <CommandSeparator />
                            </>
                        )}

                        <CommandGroup heading="Properties">
                            <CommandInput placeholder="Search properties..." className="h-8" />
                            <CommandEmpty>No property found.</CommandEmpty>
                            <div className="p-2 max-h-[200px] overflow-y-auto">
                                {displayableProperties.map((prop) => {
                                    const isVisible = visibleProperties.includes(prop.key) || prop.visible !== false;
                                    return (
                                        <div key={prop.key} className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted/50 rounded-sm">
                                            <Checkbox
                                                id={`prop-${prop.key}`}
                                                checked={isVisible}
                                                onCheckedChange={() => handleToggleProperty(prop.key, isVisible)}
                                            />
                                            <Label
                                                htmlFor={`prop-${prop.key}`}
                                                className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {prop.label}
                                            </Label>
                                        </div>
                                    )
                                })}
                            </div>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
