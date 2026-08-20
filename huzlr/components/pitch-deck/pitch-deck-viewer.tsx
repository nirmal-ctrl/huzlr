"use client"

import * as React from "react"
import Image from "next/image"
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Maximize2,
    Minimize2,
} from "lucide-react"

interface PitchDeckViewerProps {
    slides: string[]
}

export function PitchDeckViewer({ slides }: PitchDeckViewerProps) {
    const [currentIndex, setCurrentIndex] = React.useState(0)
    const [isFullscreen, setIsFullscreen] = React.useState(false)
    const wheelLocked = React.useRef(false)
    const touchStartX = React.useRef<number | null>(null)

    const goTo = React.useCallback(
        (index: number) => {
            if (slides.length === 0) return
            setCurrentIndex(Math.min(Math.max(index, 0), slides.length - 1))
        },
        [slides.length]
    )

    const goPrevious = React.useCallback(() => {
        setCurrentIndex((index) => Math.max(index - 1, 0))
    }, [])

    const goNext = React.useCallback(() => {
        setCurrentIndex((index) => Math.min(index + 1, slides.length - 1))
    }, [slides.length])

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
                event.preventDefault()
                goNext()
            }

            if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
                event.preventDefault()
                goPrevious()
            }

            if (event.key === "Home") goTo(0)
            if (event.key === "End") goTo(slides.length - 1)
        }

        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement))
        }

        window.addEventListener("keydown", handleKeyDown)
        document.addEventListener("fullscreenchange", handleFullscreenChange)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("fullscreenchange", handleFullscreenChange)
        }
    }, [goNext, goPrevious, goTo, slides.length])

    const handleWheel = (event: React.WheelEvent) => {
        if (wheelLocked.current || Math.abs(event.deltaY) < 20) return

        wheelLocked.current = true
        if (event.deltaY > 0) goNext()
        else goPrevious()

        window.setTimeout(() => {
            wheelLocked.current = false
        }, 450)
    }

    const toggleFullscreen = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen()
        } else {
            await document.documentElement.requestFullscreen()
        }
    }

    if (slides.length === 0) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
                <div>
                    <h1 className="text-2xl font-semibold">Pitch deck slides are unavailable</h1>
                    <p className="mt-3 text-sm text-slate-400">
                        Run <code className="rounded bg-white/10 px-2 py-1">pnpm pitch-deck:extract</code> to extract the slides from the PowerPoint.
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main
            className="fixed inset-0 z-[100] overflow-hidden bg-[#05070d] text-white"
            onWheel={handleWheel}
            onTouchStart={(event) => {
                touchStartX.current = event.touches[0]?.clientX ?? null
            }}
            onTouchEnd={(event) => {
                if (touchStartX.current === null) return
                const distance = touchStartX.current - (event.changedTouches[0]?.clientX ?? touchStartX.current)
                touchStartX.current = null

                if (Math.abs(distance) < 50) return
                if (distance > 0) goNext()
                else goPrevious()
            }}
        >
            <div className="absolute inset-0 flex items-center justify-center p-3 pb-20 sm:p-8 sm:pb-24">
                <Image
                    key={slides[currentIndex]}
                    src={slides[currentIndex]}
                    alt={`Huzlr pitch deck, slide ${currentIndex + 1} of ${slides.length}`}
                    width={1672}
                    height={941}
                    priority={currentIndex === 0}
                    className="max-h-full max-w-full select-none object-contain shadow-2xl shadow-black/50"
                    draggable={false}
                />
            </div>

            <button
                type="button"
                onClick={goPrevious}
                disabled={currentIndex === 0}
                className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/45 p-3 text-white backdrop-blur transition hover:bg-black/70 disabled:pointer-events-none disabled:opacity-20 sm:block"
                aria-label="Previous slide"
            >
                <ChevronLeft className="size-6" />
            </button>

            <button
                type="button"
                onClick={goNext}
                disabled={currentIndex === slides.length - 1}
                className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/45 p-3 text-white backdrop-blur transition hover:bg-black/70 disabled:pointer-events-none disabled:opacity-20 sm:block"
                aria-label="Next slide"
            >
                <ChevronRight className="size-6" />
            </button>

            <div className="absolute inset-x-0 bottom-4 flex justify-center px-4 sm:bottom-6">
                <div className="flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-2 shadow-xl backdrop-blur-md">
                    <button
                        type="button"
                        onClick={goPrevious}
                        disabled={currentIndex === 0}
                        className="rounded-full p-2 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30 sm:hidden"
                        aria-label="Previous slide"
                    >
                        <ChevronLeft className="size-5" />
                    </button>

                    <div className="flex items-center gap-1.5 px-1" aria-label="Choose a slide">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => goTo(index)}
                                className={`h-2 rounded-full transition-all ${
                                    index === currentIndex
                                        ? "w-6 bg-white"
                                        : "w-2 bg-white/35 hover:bg-white/65"
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                                aria-current={index === currentIndex ? "page" : undefined}
                            />
                        ))}
                    </div>

                    <span className="min-w-12 text-center text-xs tabular-nums text-white/70">
                        {currentIndex + 1} / {slides.length}
                    </span>

                    <div className="h-5 w-px bg-white/15" />

                    <a
                        href="/huzlr.pptx"
                        download
                        className="rounded-full p-2 transition hover:bg-white/10"
                        aria-label="Download PowerPoint"
                        title="Download PowerPoint"
                    >
                        <Download className="size-4" />
                    </a>

                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="rounded-full p-2 transition hover:bg-white/10"
                        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                    </button>

                    <button
                        type="button"
                        onClick={goNext}
                        disabled={currentIndex === slides.length - 1}
                        className="rounded-full p-2 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30 sm:hidden"
                        aria-label="Next slide"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                </div>
            </div>
        </main>
    )
}
