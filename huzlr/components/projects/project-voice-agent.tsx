"use client"

import * as React from "react"
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useLocalParticipant,
    useTrackVolume,
    useVoiceAssistant,
    useRoomContext,
} from "@livekit/components-react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Mic, PhoneOff, Sparkles } from "lucide-react"
import { RoomEvent } from "livekit-client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ProjectVoiceAgent() {
    const [token, setToken] = React.useState<string | null>(null)
    const [serverUrl, setServerUrl] = React.useState<string | null>(null)
    const [isConnecting, setIsConnecting] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const disconnect = React.useCallback(() => {
        setToken(null)
        setServerUrl(null)
        setIsConnecting(false)
    }, [])

    const startSession = async () => {
        if (token || isConnecting) return

        setError(null)
        setIsConnecting(true)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1"
            const localToken = localStorage.getItem("token")
            const headers: Record<string, string> = {}

            if (localToken) {
                headers.Authorization = `Bearer ${localToken}`
            }

            const response = await fetch(`${apiUrl}/livekit/token?room_name=brainstorm-room`, {
                headers,
            })

            if (!response.ok) {
                throw new Error("Could not start the voice agent")
            }

            const data = await response.json()
            setToken(data.token)
            setServerUrl(data.server_url)
        } catch (sessionError) {
            console.error("Failed to connect to the project voice agent:", sessionError)
            setError("Voice agent unavailable")
        } finally {
            setIsConnecting(false)
        }
    }

    const showVisualizer = isConnecting || Boolean(token && serverUrl)

    return (
        <>
            <div className="flex items-center gap-2">
                {error && <span className="hidden text-xs text-destructive sm:inline">{error}</span>}
                <Button
                    type="button"
                    size="sm"
                    variant={showVisualizer ? "secondary" : "default"}
                    className="rounded-full"
                    onClick={showVisualizer ? disconnect : startSession}
                >
                    {isConnecting ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : showVisualizer ? (
                        <PhoneOff className="size-4" />
                    ) : (
                        <Mic className="size-4" />
                    )}
                    {showVisualizer ? "End conversation" : "Talk your project"}
                </Button>
            </div>

            <AnimatePresence>
                {showVisualizer && (
                    <motion.div
                        initial={{ opacity: 0, y: 18, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"
                    >
                        {token && serverUrl ? (
                            <LiveKitRoom
                                token={token}
                                serverUrl={serverUrl}
                                connect
                                audio
                                video={false}
                                onDisconnected={disconnect}
                                className="w-full"
                            >
                                <RoomAudioRenderer />
                                <ProjectVoiceVisualizer onDisconnect={disconnect} />
                            </LiveKitRoom>
                        ) : (
                            <VisualizerShell label="Connecting to your project agent…" connecting />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

function ProjectVoiceVisualizer({ onDisconnect }: { onDisconnect: () => void }) {
    const room = useRoomContext()
    const { state, audioTrack } = useVoiceAssistant()
    const { microphoneTrack } = useLocalParticipant()
    const agentVolume = useTrackVolume(audioTrack)
    const userVolume = useTrackVolume(microphoneTrack?.track as never)

    React.useEffect(() => {
        const handleDataReceived = (payload: Uint8Array) => {
            try {
                const data = JSON.parse(new TextDecoder().decode(payload))
                if (data.type === "update_project") {
                    window.dispatchEvent(new CustomEvent("agent-update-project", { detail: data }))
                }
            } catch (eventError) {
                console.error("Failed to parse project agent data:", eventError)
            }
        }

        room.on(RoomEvent.DataReceived, handleDataReceived)
        return () => {
            room.off(RoomEvent.DataReceived, handleDataReceived)
        }
    }, [room])

    const volume = Math.max(agentVolume, userVolume)
    const label = state === "speaking"
        ? "Agent is speaking"
        : state === "listening"
            ? "Listening to you"
            : state === "connecting" || state === "initializing"
                ? "Connecting to your project agent…"
                : "Project agent is ready"

    return (
        <VisualizerShell
            label={label}
            volume={volume}
            speaking={state === "speaking"}
            onDisconnect={onDisconnect}
        />
    )
}

interface VisualizerShellProps {
    label: string
    volume?: number
    connecting?: boolean
    speaking?: boolean
    onDisconnect?: () => void
}

function VisualizerShell({
    label,
    volume = 0,
    connecting = false,
    speaking = false,
    onDisconnect,
}: VisualizerShellProps) {
    const bars = [0.45, 0.8, 1, 0.72, 0.5]

    return (
        <div
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-2xl backdrop-blur-xl"
            role="status"
            aria-live="polite"
        >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {connecting ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{label}</p>
                <div className="mt-1.5 flex h-4 items-center gap-1" aria-hidden="true">
                    {bars.map((weight, index) => {
                        const activity = Math.max(volume * 9 * weight, connecting ? 0.15 : 0.08)
                        return (
                            <motion.span
                                key={index}
                                animate={{ scaleY: Math.min(1, activity) }}
                                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                                className={cn(
                                    "h-full w-1 origin-center rounded-full bg-primary/45",
                                    speaking && "bg-primary",
                                )}
                            />
                        )
                    })}
                </div>
            </div>

            {onDisconnect && (
                <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={onDisconnect}
                    aria-label="End voice conversation"
                >
                    <PhoneOff className="size-4" />
                </Button>
            )}
        </div>
    )
}
