"use client"

import * as React from "react"
import { Loader2, Plus, Paperclip, ChevronDown, AudioLines, ArrowUp, FullscreenIcon } from "lucide-react"
import { Orb } from "@/components/orb"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { LiveKitRoom, RoomAudioRenderer, useVoiceAssistant, useLocalParticipant, useTrackVolume, useTrackTranscription, useRoomContext } from "@livekit/components-react"
import { RoomEvent } from "livekit-client"

interface BrainstormInterfaceProps {
    onNewProjectClick?: () => void
}

export function BrainstormInterface({ onNewProjectClick }: BrainstormInterfaceProps) {
    const [inputValue, setInputValue] = React.useState("")
    const [token, setToken] = React.useState<string | null>(null)
    const [serverUrl, setServerUrl] = React.useState<string | null>(null)
    const [isConnecting, setIsConnecting] = React.useState<boolean>(false)

    const handleStartSession = async () => {
        if (token) {
            // Disconnect if already connected
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
            
            const response = await fetch(`${apiUrl}/livekit/token?room_name=brainstorm-room`, {
                headers
            })
            if (!response.ok) throw new Error("Failed to fetch session token")
            
            const data = await response.json()
            console.log("Received LiveKit token and server URL:", data)
            setToken(data.token)
            setServerUrl(data.server_url)
        } catch (error) {
            console.error("Failed to connect to LiveKit voice assistant:", error)
        } finally {
            setIsConnecting(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] relative bg-background font-sans">
            {token && serverUrl ? (
                <LiveKitRoom
                    token={token}
                    serverUrl={serverUrl}
                    connect={true}
                    audio={true}
                    video={false}
                    className="flex-1 flex flex-col items-center justify-center relative bg-background"
                >
                    <RoomAudioRenderer />
                    <LiveKitAgentContent
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        onDisconnect={handleStartSession}
                        onNewProjectClick={onNewProjectClick}
                    />
                </LiveKitRoom>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center relative bg-background">
                    {/* Idle State Center Visual */}
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                        <div className="relative flex items-center justify-center">
                            <Orb status="idle" agentVolume={0} userVolume={0} />
                        </div>
                        <div className="px-6 py-2 rounded-full bg-background border shadow-sm text-sm font-medium text-muted-foreground mt-4">
                            Voice connection offline
                        </div>
                        {onNewProjectClick && (
                            <Button onClick={onNewProjectClick} className="mt-2 rounded-full shadow-md gap-2" size="sm">
                                <Plus className="w-4 h-4" />
                                New Project
                            </Button>
                        )}
                    </div>

                    {/* Bottom Action Area (Offline) */}
                    <div className="absolute bottom-10 w-full max-w-3xl px-4">
                        <div className="relative rounded-[32px] p-[2px] bg-gradient-to-r from-sky-300 via-indigo-300 to-purple-300 shadow-[0_0_15px_rgba(167,139,250,0.3)] hover:shadow-[0_0_20px_rgba(167,139,250,0.5)] transition-all duration-300">
                            <div className="relative bg-card rounded-[29px] p-4 flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground pl-2">
                                    Click the microphone to start real-time brainstorming
                                </span>
                                <Button
                                    size="icon"
                                    className="rounded-full h-12 w-12 bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={handleStartSession}
                                    disabled={isConnecting}
                                >
                                    {isConnecting ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <AudioLines className="h-6 w-6" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Child component that connects to LiveKit Room stateful hooks
interface LiveKitAgentContentProps {
    inputValue: string
    setInputValue: (val: string) => void
    onDisconnect: () => void
    onNewProjectClick?: () => void
}

function LiveKitAgentContent({ inputValue, setInputValue, onDisconnect, onNewProjectClick }: LiveKitAgentContentProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const { state, agentTranscriptions, audioTrack } = useVoiceAssistant()
    const { localParticipant, microphoneTrack } = useLocalParticipant()

    const agentVolume = useTrackVolume(audioTrack)
    const userVolume = useTrackVolume(microphoneTrack?.track as any)

    const room = useRoomContext()

    React.useEffect(() => {
        const handleDataReceived = (payload: Uint8Array, participant?: any) => {
            const text = new TextDecoder().decode(payload)
            try {
                const data = JSON.parse(text)
                if (data.type === "update_project") {
                    if (onNewProjectClick) {
                        onNewProjectClick()
                    }
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("agent-update-project", { detail: data }))
                    }, 100)
                }
            } catch (e) {
                console.error("Failed to parse agent data:", e)
            }
        }
        
        room.on(RoomEvent.DataReceived, handleDataReceived)
        return () => {
            room.off(RoomEvent.DataReceived, handleDataReceived)
        }
    }, [room, onNewProjectClick])

    const userTrackRef = React.useMemo(() => {
        if (!microphoneTrack) return undefined
        return {
            participant: localParticipant,
            publication: microphoneTrack,
            source: "microphone" as any
        }
    }, [localParticipant, microphoneTrack])

    const { segments: userTranscriptions } = useTrackTranscription(userTrackRef)

    // Determine current voice activity status
    const status = (state === "connecting" || state === "initializing")
        ? "connecting"
        : state === "disconnected"
        ? "idle"
        : "connected"

    // Retrieve active text from LiveKit voice assistant state
    const latestTranscript = agentTranscriptions?.[agentTranscriptions.length - 1]
    const latestUserTranscript = userTranscriptions?.[userTranscriptions.length - 1]

    // Auto-scroll transcript container to the bottom when new text arrives
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth"
            })
        }
    }, [latestTranscript, latestUserTranscript])

    return (
        <div className="flex-1 w-full flex flex-col items-center justify-center relative bg-background">
            {/* Active Connected Visual / Status */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-center">
                    <Orb status={status} agentVolume={agentVolume} userVolume={userVolume} />
                </div>

                {/* Real-time Transcription Display */}
                {(latestTranscript || latestUserTranscript) && (
                    <div 
                        ref={scrollRef} 
                        className="h-[10rem] w-[25rem] overflow-scroll mt-4 no-scrollbar"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                        <style>{`
                            .no-scrollbar::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        <div className="bg-transparent rounded-2xl p-4 w-full text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {latestUserTranscript && (
                                <p className="text-sm text-foreground/80 font-medium leading-relaxed mb-2">
                                    <span className="italic font-bold mr-1 text-sky-500">You:</span>
                                    {latestUserTranscript.text}
                                </p>
                            )}
                            {latestTranscript && (
                                <p className="text-sm text-foreground font-medium leading-relaxed">
                                    <span className="italic font-bold mr-1 text-purple-500">Agent:</span>
                                    {latestTranscript.text}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="px-6 py-2 rounded-full bg-background border shadow-sm text-sm font-medium text-muted-foreground mt-4">
                    {state === "speaking" ? "Speaking..." : state === "listening" ? "Listening..." : "Connected"}
                </div>
                {onNewProjectClick && (
                    <Button onClick={onNewProjectClick} className="mt-2 rounded-full shadow-md gap-2" size="sm">
                        <Plus className="w-4 h-4" />
                        New Project
                    </Button>
                )}
            </div>

            {/* Bottom Input Area */}
            <div className="absolute bottom-10 w-full max-w-3xl px-4">
                <div className="relative rounded-[32px] p-[2px] bg-gradient-to-r from-sky-300 via-indigo-300 to-purple-300 shadow-[0_0_15px_rgba(167,139,250,0.3)] hover:shadow-[0_0_20px_rgba(167,139,250,0.5)] transition-all duration-300">
                    <div className="relative bg-card rounded-[29px] p-2 flex flex-col">
                        <div className="px-2 pt-2 pb-0">
                            <Textarea
                                placeholder="Brainstorming is active. Speak out loud or type here..."
                                className="min-h-[50px] border-0 focus-visible:ring-0 resize-none shadow-none p-2 text-base bg-transparent dark:bg-transparent placeholder:text-muted-foreground/60 w-full"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:bg-muted/50">
                                    <Plus className="h-5 w-5" />
                                </Button>
                                <Button variant="outline" className="rounded-full h-10 px-4 text-muted-foreground border-border/40 hover:bg-muted/50 font-normal gap-2">
                                    <Paperclip className="h-4 w-4" />
                                    Attach
                                </Button>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Toggle Disconnect */}
                                <Button
                                    size="icon"
                                    className="rounded-full h-12 w-12 bg-red-100 text-red-600 hover:bg-red-200 ring-2 ring-red-100 ring-offset-2"
                                    onClick={onDisconnect}
                                >
                                    <AudioLines className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
