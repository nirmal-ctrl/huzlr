"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Plus, Filter, X, ChevronDown, Check, ChevronRight, ListFilter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { TaskList } from "@/components/projects/task-list"
import { CreateTaskModal } from "@/components/projects/create-task-modal"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { ViewOptionsDropdown } from "@/components/views/view-options-dropdown"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { 
    useGetTeamIssuesQuery, 
    useCreateIssueMutation, 
    useUpdateIssueMutation, 
    useDeleteIssueMutation 
} from "@/services/issuesApi"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { fetchProjects } from "@/lib/redux/slices/projectSlice"
import { fetchPropertyDefinitions } from "@/lib/redux/slices/metaSlice"
import { IssueCreate } from "@/lib/types"

export default function TeamIssuesPage() {
    const params = useParams()
    const router = useRouter()
    const teamIdStr = params.teamId as string
    const teamId = parseInt(teamIdStr)

    const dispatch = useAppDispatch()
    const teams = useAppSelector((state) => state.workspace.teams)
    const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)
    const { items: projects } = useAppSelector((state) => state.projects)
    const viewState = useAppSelector((state) => state.view.views['task'])
    const layout = viewState?.layout || 'list'

    const currentTeam = teams.find(t => t.id === teamId)
    const teamProjects = projects.filter(p => p.team_id === teamId)

    const { data: issues, isLoading, error } = useGetTeamIssuesQuery(teamId, {
        skip: isNaN(teamId)
    })

    const [createIssue] = useCreateIssueMutation()
    const [updateIssue] = useUpdateIssueMutation()
    const [deleteIssue] = useDeleteIssueMutation()

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [createModalStatus, setCreateModalStatus] = useState<string>("Planning")
    
    // Quick-View and Filtering States (Linear benchmark)
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'backlog'>('all')
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
    const [hiddenColumns, setHiddenColumns] = useState<string[]>(['planning', 'paused', 'canceled'])
    
    // Nested Searchable Filter Panel States
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [filterSearch, setFilterSearch] = useState("")
    const [activeCategory, setActiveCategory] = useState<'root' | 'status' | 'priority'>('root')
    const filterInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (activeWorkspaceId && teamId) {
            dispatch(fetchProjects({ 
                workspaceId: activeWorkspaceId,
                teamId: teamId
            }))
        }
    }, [dispatch, activeWorkspaceId, teamId])

    useEffect(() => {
        dispatch(fetchPropertyDefinitions('task'))
    }, [dispatch])

    // Global keyboard listener for hotkeys ('C' for create issue, 'F' for filter)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.hasAttribute("contenteditable")
            ) {
                return
            }

            if (e.key === "c" || e.key === "C") {
                e.preventDefault()
                setIsCreateModalOpen(true)
            } else if (e.key === "f" || e.key === "F") {
                e.preventDefault()
                setIsFilterOpen(true)
                setActiveCategory('root')
                setTimeout(() => {
                    filterInputRef.current?.focus()
                }, 100)
            }
        }

        window.addEventListener("keydown", handleGlobalKeyDown)
        return () => {
            window.removeEventListener("keydown", handleGlobalKeyDown)
        }
    }, [])

    const handleCreateIssue = async (issueData: Partial<IssueCreate> & { properties?: any }) => {
        if (!issueData.project_id) return
        try {
            await createIssue({
                projectId: issueData.project_id,
                issue: {
                    title: issueData.title || "",
                    description: issueData.description || "",
                    status: issueData.status || "pending",
                    project_id: issueData.project_id,
                    properties: issueData.properties || {},
                    critical_path_flag: false
                } as IssueCreate
            }).unwrap()
        } catch (err) {
            console.error("Failed to create issue:", err)
        }
    }

    const handleUpdateIssue = async (issueId: number, updates: any) => {
        try {
            await updateIssue({
                issueId,
                updates
            }).unwrap()
        } catch (err) {
            console.error("Failed to update issue:", err)
        }
    }

    const handleDeleteIssue = async (issueId: number) => {
        const t = issues?.find(issue => issue.id === issueId)
        if (!t) return
        try {
            await deleteIssue({
                issueId,
                projectId: t.project_id
            }).unwrap()
        } catch (err) {
            console.error("Failed to delete issue:", err)
        }
    }

    const handleCreateClick = (statusTitle: string) => {
        const matched = ["Backlog", "Planning", "In Progress", "Paused", "Done", "Canceled"].find(
            s => s.toLowerCase() === statusTitle.toLowerCase()
        ) || "Planning"
        setCreateModalStatus(matched)
        setIsCreateModalOpen(true)
    }

    if (isNaN(teamId)) {
        return (
            <div className="flex flex-1 items-center justify-center flex-col gap-4">
                <p>Invalid Team ID</p>
                <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </div>
        )
    }

    const firstProjectId = teamProjects.length > 0 ? teamProjects[0].project_id : undefined

    // Filter Options Lists
    const statusOptions = ["Backlog", "Planning", "In Progress", "Paused", "Done", "Canceled"]
    const priorityOptions = ["Urgent", "High", "Medium", "Low", "None"]

    // Render Filter Dropdown list items based on nested state & search query
    const renderFilterContent = () => {
        const query = filterSearch.toLowerCase().trim()

        if (activeCategory === 'root') {
            const categories = [
                { id: 'status', label: 'Status' },
                { id: 'priority', label: 'Priority' }
            ].filter(c => c.label.toLowerCase().includes(query))

            return (
                <div className="space-y-1">
                    {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                              setActiveCategory(cat.id as any)
                              setFilterSearch("")
                              setTimeout(() => filterInputRef.current?.focus(), 50)
                          }}
                          className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 hover:bg-muted/60 text-foreground font-medium rounded transition-all cursor-pointer"
                        >
                            <span>{cat.label}</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                        </button>
                    ))}
                    {categories.length === 0 && (
                        <div className="text-[11px] text-muted-foreground/60 text-center py-2">No matching dimensions</div>
                    )}
                </div>
            )
        }

        if (activeCategory === 'status') {
            const filteredOptions = statusOptions.filter(opt => opt.toLowerCase().includes(query))
            return (
                <div className="space-y-1">
                    <button
                      onClick={() => {
                          setActiveCategory('root')
                          setFilterSearch("")
                      }}
                      className="w-full text-left text-[10px] font-bold text-primary px-2.5 py-1 hover:bg-muted/40 rounded uppercase tracking-wider mb-1 cursor-pointer"
                    >
                        ← Back to categories
                    </button>
                    {filteredOptions.map(opt => (
                        <button
                          key={opt}
                          onClick={() => {
                              setStatusFilter(opt.toLowerCase())
                              setIsFilterOpen(false)
                              setFilterSearch("")
                          }}
                          className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 hover:bg-muted/60 text-foreground font-medium rounded transition-all cursor-pointer"
                        >
                            <span>{opt}</span>
                            {statusFilter === opt.toLowerCase() && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                    ))}
                </div>
            )
        }

        if (activeCategory === 'priority') {
            const filteredOptions = priorityOptions.filter(opt => opt.toLowerCase().includes(query))
            return (
                <div className="space-y-1">
                    <button
                      onClick={() => {
                          setActiveCategory('root')
                          setFilterSearch("")
                      }}
                      className="w-full text-left text-[10px] font-bold text-primary px-2.5 py-1 hover:bg-muted/40 rounded uppercase tracking-wider mb-1 cursor-pointer"
                    >
                        ← Back to categories
                    </button>
                    {filteredOptions.map(opt => (
                        <button
                          key={opt}
                          onClick={() => {
                              setPriorityFilter(opt.toLowerCase())
                              setIsFilterOpen(false)
                              setFilterSearch("")
                          }}
                          className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 hover:bg-muted/60 text-foreground font-medium rounded transition-all cursor-pointer"
                        >
                            <span>{opt}</span>
                            {priorityFilter === opt.toLowerCase() && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                    ))}
                </div>
            )
        }
    }

    // Apply Tab filtering & Search filtering concurrently
    const filteredIssuesList = (issues || []).filter(t => {
        // 1. Tab Quick View Filtering
        const statusStr = typeof t.status === 'object' && t.status !== null 
            ? (t.status as any).label || (t.status as any).name || JSON.stringify(t.status) 
            : String(t.status)
        const statusLower = statusStr.toLowerCase()

        if (activeTab === 'active') {
            // Active is typically 'planning', 'in progress', 'paused', 'pending'
            if (['done', 'canceled', 'backlog'].includes(statusLower)) return false
        } else if (activeTab === 'backlog') {
            if (statusLower !== 'backlog') return false
        }

        // 2. Filter Dropdown criteria
        if (statusFilter && statusLower !== statusFilter.toLowerCase()) return false

        if (priorityFilter) {
            const p = t.properties?.priority || "None"
            const priorityStr = typeof p === 'object' && p !== null 
                ? (p as any).label || (p as any).name || JSON.stringify(p) 
                : String(p)
            if (priorityStr.toLowerCase() !== priorityFilter.toLowerCase()) return false
        }

        return true
    }).map(t => ({
        ...t,
        properties: t.properties || {}
    }))

    return (
        <>
            <SiteHeader>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-medium">
                        {currentTeam ? currentTeam.name : "Team"}
                    </span>
                    <span className="text-muted-foreground/30">/</span>
                    <span className="text-sm font-semibold text-foreground">Issues</span>
                </div>
                <div className="ml-auto">
                    <Button 
                        size="sm" 
                        className="gap-2 rounded-full font-semibold px-4 cursor-pointer"
                        onClick={() => setIsCreateModalOpen(true)}
                        disabled={teamProjects.length === 0}
                    >
                        <Plus className="h-4 w-4" />
                        Create Issue
                    </Button>
                </div>
            </SiteHeader>

            <div className="flex flex-col gap-4 py-6 px-8 h-[calc(100vh-80px)] overflow-hidden bg-background w-full max-w-full min-w-0">
                {/* Sub Header Action Bar (Linear benchmark design) */}
                {teamProjects.length > 0 && (
                    <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Left View Tabs */}
                            <div className="flex items-center gap-1 border border-border/60 bg-muted/40 p-0.5 rounded-lg shadow-sm">
                                <Button
                                    variant={activeTab === 'all' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('all')}
                                    className="h-6 text-[11px] font-semibold px-2.5 rounded-md cursor-pointer shadow-none"
                                >
                                    All issues
                                </Button>
                                <Button
                                    variant={activeTab === 'active' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('active')}
                                    className="h-6 text-[11px] font-semibold px-2.5 rounded-md cursor-pointer shadow-none"
                                >
                                    Active
                                </Button>
                                <Button
                                    variant={activeTab === 'backlog' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('backlog')}
                                    className="h-6 text-[11px] font-semibold px-2.5 rounded-md cursor-pointer shadow-none"
                                >
                                    Backlog
                                </Button>
                            </div>
                            
                            {/* Active Filter Badges */}
                            {statusFilter && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-semibold shadow-sm">
                                    <span className="capitalize">Status: {statusFilter}</span>
                                    <button onClick={() => setStatusFilter(null)} className="hover:bg-primary/20 rounded-full p-0.5 shrink-0 cursor-pointer">
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </span>
                            )}
                            {priorityFilter && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-semibold shadow-sm">
                                    <span className="capitalize">Priority: {priorityFilter}</span>
                                    <button onClick={() => setPriorityFilter(null)} className="hover:bg-primary/20 rounded-full p-0.5 shrink-0 cursor-pointer">
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </span>
                            )}
                        </div>
                        
                        {/* Display options & Filter controls */}
                        <div className="flex items-center gap-2">
                            <ViewOptionsDropdown 
                                entityType="task" 
                                hiddenColumns={hiddenColumns}
                                setHiddenColumns={setHiddenColumns}
                            />

                            {/* Command Filter Popover Panel - placed right next of Display options */}
                            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="gap-2 h-8">
                                        <ListFilter className="h-4 w-4" />
                                        <span className="hidden lg:inline">Filter</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-60 p-2 space-y-2 bg-popover/95 backdrop-blur-md border border-border/60 rounded-lg shadow-xl" align="end">
                                    <Input
                                      ref={filterInputRef}
                                      value={filterSearch}
                                      placeholder="Add Filter...  (F)"
                                      onChange={(e) => setFilterSearch(e.target.value)}
                                      className="h-8 text-xs bg-background/50 border-border/80 focus:ring-1 focus:ring-primary/20 shadow-none px-2.5"
                                    />
                                    {renderFilterContent()}
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}

                <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
                    {isLoading ? (
                        layout === 'list' ? (
                            <TaskList 
                                tasks={[]}
                                projectId={firstProjectId}
                                isLoading={true}
                                onUpdateTask={handleUpdateIssue}
                                onDeleteTask={handleDeleteIssue}
                            />
                        ) : (
                            <KanbanBoard
                                data={[]}
                                columns={[]}
                                entityType="task"
                                defaultProjectId={firstProjectId}
                                hiddenColumns={hiddenColumns}
                                setHiddenColumns={setHiddenColumns}
                                isLoading={true}
                            />
                        )
                    ) : teamProjects.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center min-h-[300px]">
                            <h3 className="text-base font-medium tracking-tight">No active projects</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mt-1">
                                Create a project in this team first before you can manage issues/tasks here.
                            </p>
                            <Button 
                                className="mt-4 gap-2 rounded-full"
                                onClick={() => router.push('/projects/new')}
                            >
                                <Plus className="h-4 w-4" />
                                Create Project
                            </Button>
                        </div>
                    ) : layout === 'list' ? (
                        <TaskList 
                            tasks={filteredIssuesList}
                            projectId={firstProjectId}
                            isLoading={isLoading}
                            onUpdateTask={handleUpdateIssue}
                            onDeleteTask={handleDeleteIssue}
                        />
                    ) : (
                        <KanbanBoard
                            data={filteredIssuesList}
                            columns={[]}
                            entityType="task"
                            defaultProjectId={firstProjectId}
                            hiddenColumns={hiddenColumns}
                            setHiddenColumns={setHiddenColumns}
                            isLoading={isLoading}
                            onCreateClick={handleCreateClick}
                        />
                    )}
                </div>
            </div>

            {firstProjectId && (
                <CreateTaskModal 
                    open={isCreateModalOpen}
                    onOpenChange={setIsCreateModalOpen}
                    defaultStatus={createModalStatus}
                    defaultProjectId={firstProjectId}
                    onSubmit={handleCreateIssue}
                />
            )}
        </>
    )
}
