"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import EmojiPicker, { Theme } from "emoji-picker-react"
import * as Icons from "lucide-react"

interface EmojiSelectorProps {
    value: string;
    onChange: (emoji: string) => void;
    className?: string;
    triggerClassName?: string;
}

// Comprehensive curated modern Lucide icons matching Linear's design system
const LUCIDE_ICONS = [
    "FileText", "Target", "Shield", "Zap", "Flame", "Lightbulb", 
    "Key", "Briefcase", "Laptop", "Database", "BarChart3", "Wrench", 
    "Lock", "Pin", "Sparkles", "Compass", "Globe", "MessageSquare", 
    "Code2", "GitBranch", "Layers", "Cpu", "Award", "Users",
    "Settings", "Activity", "BookOpen", "Bookmark", "Calendar", "Camera", 
    "CheckCircle2", "Clipboard", "Clock", "Cloud", "Coins", "CreditCard", 
    "Eye", "Folder", "Gift", "Heart", "Home", "Inbox", "Info", 
    "Link2", "ListTodo", "MapPin", "Music", "Package", "Phone", 
    "PieChart", "Play", "Search", "Send", "Share2", "ShoppingBag", 
    "ShoppingCart", "Smile", "Star", "Tag", "Terminal", "ThumbsUp", 
    "Trash2", "TrendingUp", "Trophy", "User", "Video", "Volume2", 
    "Wifi", "XCircle", "AlertCircle", "HelpCircle"
]

export function DynamicIcon({ name, className }: { name: string; className?: string }) {
    const IconComponent = (Icons as any)[name];
    if (!IconComponent) return <Icons.FileText className={className} />;
    return <IconComponent className={className} />;
}

// Universal icon renderer (handles emojis and "lucide:IconName")
export function DocIcon({ value, className }: { value: string; className?: string }) {
    if (value && value.startsWith("lucide:")) {
        const iconName = value.split(":")[1];
        return <DynamicIcon name={iconName} className={className} />;
    }
    return <span className={className}>{value || "📄"}</span>;
}

export function EmojiSelector({ value, onChange, className, triggerClassName }: EmojiSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState<"emoji" | "icon">("emoji")
    const [iconSearch, setIconSearch] = React.useState("")
    const [isDark, setIsDark] = React.useState(false)

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            setIsDark(document.documentElement.classList.contains("dark"))
        }
    }, [open])

    // Filter Lucide icons based on search query
    const filteredIcons = React.useMemo(() => {
        return LUCIDE_ICONS.filter((iconName) => 
            iconName.toLowerCase().includes(iconSearch.toLowerCase())
        );
    }, [iconSearch])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 w-8 p-0 flex items-center justify-center rounded-md bg-muted/20 hover:bg-muted/50 border border-border/20 hover:border-border/50 transition-all shrink-0",
                        triggerClassName
                    )}
                >
                    <div className="flex items-center justify-center text-sm">
                        <DocIcon value={value} className="w-4 h-4 text-foreground/80" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className={cn("p-0 w-[320px] bg-background border shadow-2xl rounded-lg overflow-hidden flex flex-col", className)} 
                side="bottom" 
                align="start"
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
            >
                {/* Custom Tab Switcher */}
                <div className="flex items-center border-b border-border/40 p-1 bg-muted/20 gap-1 w-full shrink-0 select-none">
                    <button
                        type="button"
                        onClick={() => setActiveTab("emoji")}
                        className={cn(
                            "flex-1 py-1 text-[11px] font-medium rounded-md transition-all select-none",
                            activeTab === "emoji" 
                                ? "bg-background text-foreground shadow-sm font-semibold" 
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Emojis
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("icon")}
                        className={cn(
                            "flex-1 py-1 text-[11px] font-medium rounded-md transition-all select-none",
                            activeTab === "icon" 
                                ? "bg-background text-foreground shadow-sm font-semibold" 
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Icons
                    </button>
                </div>

                {/* Tab Contents */}
                <div className="flex flex-col w-full">
                    {activeTab === "emoji" ? (
                        <EmojiPicker
                            onEmojiClick={(emojiData) => {
                                onChange(emojiData.emoji)
                                setOpen(false)
                            }}
                            autoFocusSearch={false}
                            theme={isDark ? Theme.DARK : Theme.LIGHT}
                            width="100%"
                            height={380}
                            skinTonesDisabled
                            previewConfig={{ showPreview: false }}
                            style={{ background: "transparent", border: "none" } as any}
                        />
                    ) : (
                        <div className="p-4 w-full max-h-[380px] overflow-y-auto space-y-3 flex flex-col no-scrollbar">
                            {/* Search Bar for Icons */}
                            <Input
                                type="text"
                                placeholder="Search icons..."
                                value={iconSearch}
                                onChange={(e) => setIconSearch(e.target.value)}
                                className="h-7 text-xs px-2 shadow-none focus-visible:ring-1 border-border/40 bg-muted/10"
                                autoFocus
                            />

                            <div className="space-y-1.5 flex-1">
                                <span className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider select-none">
                                    Curated System Icons
                                </span>
                                {filteredIcons.length > 0 ? (
                                    <div className="grid grid-cols-5 gap-2 pr-1">
                                        {filteredIcons.map((iconName) => {
                                            const isSelected = value === `lucide:${iconName}`;
                                            return (
                                                <button
                                                    key={iconName}
                                                    type="button"
                                                    onClick={() => {
                                                        onChange(`lucide:${iconName}`)
                                                        setOpen(false)
                                                    }}
                                                    className={cn(
                                                        "w-9 h-9 flex items-center justify-center rounded-md transition-all border border-transparent shrink-0",
                                                        isSelected 
                                                            ? "bg-primary/10 text-primary border-primary/20 scale-105 font-bold" 
                                                            : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/50"
                                                    )}
                                                    title={iconName}
                                                >
                                                    <DynamicIcon name={iconName} className="w-4 h-4" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground/60 italic select-none py-2 text-center">
                                        No icons found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
