"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, AudioLines, X, User2, MicOff, Sparkles, PanelRight, PanelRightClose } from "lucide-react"
import { Orb } from "@/components/orb"
import { Button } from "@/components/ui/button"
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useVoiceAssistant,
    useLocalParticipant,
    useTrackVolume,
    useTrackTranscription,
    useRoomContext,
} from "@livekit/components-react"
import { RoomEvent } from "livekit-client"
import { cn } from "@/lib/utils"

export function FounderAgentWidget() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [isDocked, setIsDocked] = React.useState(false)
    const [token, setToken] = React.useState<string | null>(null)
    const [serverUrl, setServerUrl] = React.useState<string | null>(null)
    const [isConnecting, setIsConnecting] = React.useState<boolean>(false)
    const router = useRouter()

    const handleStartSession = async () => {
        if (token) {
            setToken(null)
            setServerUrl(null)
            return
        }

        setIsConnecting(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1"
            const headers: Record<string, string> = {}
            const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null
            if (localToken) {
                headers["Authorization"] = `Bearer ${localToken}`
            }

            const response = await fetch(`${apiUrl}/livekit/token?room_name=founder-room`, {
                headers
            })
            if (!response.ok) throw new Error("Failed to fetch session token")

            const data = await response.json()
            setToken(data.token)
            setServerUrl(data.server_url)
        } catch (error) {
            console.error("Failed to connect to LiveKit voice assistant:", error)
        } finally {
            setIsConnecting(false)
        }
    }

    const handleClose = () => {
        setToken(null)
        setServerUrl(null)
        setIsOpen(false)
    }

    const toggleDock = () => {
        setIsDocked(!isDocked)
    }

    return (
        <div className={cn(
            isDocked && isOpen ? "fixed top-0 right-0 h-screen w-96 z-40 bg-card pointer-events-auto border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" : "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none"
        )}>
            {/* Elegant Voice Agent Panel (Docked Pane vs. Floating Card) */}
            {isOpen && (
                <div className={cn(
                    isDocked 
                        ? "h-full w-full p-5 flex flex-col gap-4 pointer-events-auto" 
                        : "w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl p-5 flex flex-col gap-4 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200"
                )}>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2">
                            <div className="relative flex h-2.5 w-2.5">
                                <span className={cn(
                                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                    token ? "bg-emerald-400" : "bg-sky-400"
                                )}></span>
                                <span className={cn(
                                    "relative inline-flex rounded-full h-2.5 w-2.5",
                                    token ? "bg-emerald-500" : "bg-sky-500"
                                )}></span>
                            </div>
                            <span className="font-semibold text-sm text-foreground">Talk with Nirmal</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-full hover:bg-muted text-muted-foreground" 
                                onClick={toggleDock}
                                title={isDocked ? "Undock to widget" : "Dock to side pane"}
                            >
                                {isDocked ? (
                                    <PanelRightClose className="h-4 w-4" />
                                ) : (
                                    <PanelRight className="h-4 w-4" />
                                )}
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground" 
                                onClick={handleClose}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Content (Active Connection vs. Idle Setup) */}
                    {token && serverUrl ? (
                        <LiveKitRoom
                            token={token}
                            serverUrl={serverUrl}
                            connect={true}
                            audio={true}
                            video={false}
                            className="flex flex-col items-center gap-4 flex-1 justify-center"
                        >
                            <RoomAudioRenderer />
                            <FounderLiveKitContent onDisconnect={handleStartSession} router={router} />
                        </LiveKitRoom>
                    ) : (
                        <div className="flex flex-col items-center py-4 text-center gap-4 flex-1 justify-center">
                            {/* Sound/Vis Orb in Idle state */}
                            <Orb status="idle" agentVolume={0} userVolume={0} className="w-28 h-28" variant="founder" />
                            <div className="flex flex-col gap-1 px-3">
                                <h4 className="text-sm font-semibold text-foreground">Founder Chat</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Talk directly with Nirmal, the Founder of Huzlr. Ask questions or let him navigate you around the application live.
                                </p>
                            </div>
                            <Button
                                className={cn(
                                    "rounded-full shadow-md gap-2 w-full max-w-[200px] text-primary-foreground font-medium text-xs py-4 transition-all duration-200 border-0",
                                    "bg-primary hover:bg-primary/90"
                                )}
                                onClick={handleStartSession}
                                disabled={isConnecting}
                            >
                                {isConnecting ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <AudioLines className="h-3.5 w-3.5" />
                                        Start Voice Chat
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Clean, Modern & Professional "Ask Nirmal" Pill Toggle Button */}
            {(!isOpen || !isDocked) && (
                <div className="pointer-events-auto">
                    <Button
                        onClick={() => setIsOpen(!isOpen)}
                        className={cn(
                            "h-12 px-5 rounded-full shadow-lg border border-border flex items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 text-foreground font-medium text-xs tracking-wide",
                            token ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                        )}
                    >
                        <div className="relative flex h-2.5 w-2.5">
                            <span className={cn(
                                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                token ? "bg-emerald-400" : "bg-primary-foreground/40"
                            )}></span>
                            <span className={cn(
                                "relative inline-flex rounded-full h-2.5 w-2.5",
                                token ? "bg-emerald-500" : "bg-primary"
                            )}></span>
                        </div>
                        <span>Ask Nirmal</span>
                        {token ? (
                            <Sparkles className="h-4 w-4 text-emerald-300 animate-pulse" />
                        ) : (
                            <AudioLines className="h-4 w-4 text-primary" />
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
}

interface FounderLiveKitContentProps {
    onDisconnect: () => void
    router: ReturnType<typeof useRouter>
}

function FounderLiveKitContent({ onDisconnect, router }: FounderLiveKitContentProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const { state, agentTranscriptions, audioTrack } = useVoiceAssistant()
    const { localParticipant, microphoneTrack } = useLocalParticipant()

    const agentVolume = useTrackVolume(audioTrack)
    const userVolume = useTrackVolume(microphoneTrack?.track as any)

    const room = useRoomContext()

    // Listening for navigation commands from Nirmal (Founder Agent)
    React.useEffect(() => {
        const handleDataReceived = (payload: Uint8Array) => {
            const text = new TextDecoder().decode(payload)
            try {
                const data = JSON.parse(text)
                if (data.type === "navigate" && data.path) {
                    router.push(data.path)
                }
            } catch (e) {
                console.error("Failed to parse navigation payload:", e)
            }
        }

        room.on(RoomEvent.DataReceived, handleDataReceived)
        return () => {
            room.off(RoomEvent.DataReceived, handleDataReceived)
        }
    }, [room, router])

    const userTrackRef = React.useMemo(() => {
        if (!microphoneTrack) return undefined
        return {
            participant: localParticipant,
            publication: microphoneTrack,
            source: "microphone" as any
        }
    }, [localParticipant, microphoneTrack])

    const { segments: userTranscriptions } = useTrackTranscription(userTrackRef)

    const status = (state === "connecting" || state === "initializing")
        ? "connecting"
        : state === "disconnected"
        ? "idle"
        : "connected"

    const latestTranscript = agentTranscriptions?.[agentTranscriptions.length - 1]
    const latestUserTranscript = userTranscriptions?.[userTranscriptions.length - 1]

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth"
            })
        }
    }, [latestTranscript, latestUserTranscript])

    return (
        <div className="flex flex-col items-center gap-4 w-full justify-center flex-1">
            {/* Visual sound orb */}
            <Orb status={status} agentVolume={agentVolume} userVolume={userVolume} className="w-28 h-28" variant="founder" />

            {/* Captions / Live Transcription */}
            <div className="w-full bg-muted/60 rounded-xl p-3 h-32 overflow-y-auto border border-border text-xs flex flex-col gap-1.5 animate-in fade-in duration-200" ref={scrollRef}>
                {!(latestTranscript || latestUserTranscript) && (
                    <div className="text-muted-foreground/60 italic text-center my-auto">
                        Nirmal is ready. Start speaking...
                    </div>
                )}
                {latestUserTranscript && (
                    <p className="text-foreground/85 font-medium">
                        <span className="text-sky-500 font-bold mr-1">You:</span>
                        {latestUserTranscript.text}
                    </p>
                )}
                {latestTranscript && (
                    <p className="text-foreground leading-relaxed">
                        <span className="text-purple-500 font-bold mr-1">Nirmal:</span>
                        {latestTranscript.text}
                    </p>
                )}
            </div>

            {/* Status indicator / Controls */}
            <div className="flex items-center justify-between w-full border-t border-border pt-3">
                <span className="text-xs font-semibold text-muted-foreground">
                    {state === "speaking" ? "Nirmal speaking..." : state === "listening" ? "Listening..." : "Connected"}
                </span>
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDisconnect}
                    className="rounded-full px-4 h-8 text-xs font-medium gap-1.5 shadow-md border-0 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400"
                >
                    <MicOff className="h-3 w-3" />
                    End Call
                </Button>
            </div>
        </div>
    )
}
