"use client"

import * as React from "react"
import { SlideCover } from "@/components/pitch-deck/slide-cover"
import { SlideProblem } from "@/components/pitch-deck/slide-problem"
import { SlideSolution } from "@/components/pitch-deck/slide-solution"
import { SlideWhyNow } from "@/components/pitch-deck/slide-why-now"
import { SlideMarketSize } from "@/components/pitch-deck/slide-market-size"
import { SlideCompetition } from "@/components/pitch-deck/slide-competition"
import { SlideMarketValidation } from "@/components/pitch-deck/slide-market-validation"
import { SlideBusinessModel } from "@/components/pitch-deck/slide-business-model"
import { SlideGTM } from "@/components/pitch-deck/slide-gtm"
import { SlideTeam } from "@/components/pitch-deck/slide-team"
import { SlideFinancials } from "@/components/pitch-deck/slide-financials"
import { Navigation } from "@/components/navigation"

export default function PitchDeckPage() {
    const [currentIndex, setCurrentIndex] = React.useState(0)
    const isScrolling = React.useRef(false)
    const touchStartY = React.useRef(0)

    const sections = [
        {
            id: "cover",
            content: (
                <SlideCover
                    companyName="huzlr."
                    title={<>Delivery Management is Chaos</>}
                    tagline={<><b className="font-bold">& huzlr</b> brings your chaos to clarity.</>}
                    subheadline="Built for PMs drowning in updates, follow-ups, and late surprises."
                    presenter="Nirmal"
                    learnMoreUrl="#"
                    quote="Your AI co-pilot for delivery management."
                />
            ),
        },
        { id: "problem", content: <SlideProblem /> },
        { id: "solution", content: <SlideSolution /> },
        { id: "why-now", content: <SlideWhyNow /> },
        { id: "market-size", content: <SlideMarketSize /> },
        { id: "competition", content: <SlideCompetition /> },
        { id: "market-validation", content: <SlideMarketValidation /> },
        { id: "business-model", content: <SlideBusinessModel /> },
        { id: "gtm-strategy", content: <SlideGTM /> },
        { id: "team", content: <SlideTeam /> },
        { id: "financials", content: <SlideFinancials /> },
    ]

    const handleNavigate = React.useCallback((direction: "up" | "down") => {
        if (isScrolling.current) return

        if (direction === "down" && currentIndex < sections.length - 1) {
            isScrolling.current = true
            setCurrentIndex((prev) => prev + 1)
        } else if (direction === "up" && currentIndex > 0) {
            isScrolling.current = true
            setCurrentIndex((prev) => prev - 1)
        }

        // Lock scrolling while the transition plays
        setTimeout(() => {
            isScrolling.current = false
        }, 1000) // Slightly longer than transition duration to prevent double triggers
    }, [currentIndex, sections.length])

    const handleWheel = React.useCallback((e: WheelEvent) => {
        // threshold to prevent tiny trackpad movements from triggering instantly
        if (Math.abs(e.deltaY) > 20) {
            handleNavigate(e.deltaY > 0 ? "down" : "up")
        }
    }, [handleNavigate])

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndY = e.changedTouches[0].clientY
        const deltaY = touchStartY.current - touchEndY

        // threshold for swipe distance
        if (Math.abs(deltaY) > 50) {
            handleNavigate(deltaY > 0 ? "down" : "up")
        }
    }

    React.useEffect(() => {
        // We attach passive: false to prevent default browser scrolling if needed
        window.addEventListener("wheel", handleWheel, { passive: false })
        return () => window.removeEventListener("wheel", handleWheel)
    }, [handleWheel])

    return (
        <div 
            className="fixed inset-0 w-full bg-background overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            data-lenis-prevent="true"
        >
            <div className="absolute top-0 w-full z-50">
                <Navigation />
            </div>
            <main 
                className="flex flex-col w-full h-[100dvh]"
                style={{
                    transform: `translateY(-${currentIndex * 100}dvh)`,
                    transition: "transform 0.8s cubic-bezier(0.65, 0, 0.35, 1)",
                }}
            >
                {sections.map((section, index) => (
                    <section 
                        key={section.id} 
                        className={`w-full h-[100dvh] flex-shrink-0 flex flex-col justify-center items-center ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
                    >
                        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
                            {section.content}
                        </div>
                    </section>
                ))}
            </main>
            
            {/* Optional dot indicators */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 hidden md:flex">
                {sections.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            if (!isScrolling.current) {
                                isScrolling.current = true;
                                setCurrentIndex(index);
                                setTimeout(() => { isScrolling.current = false }, 1000);
                            }
                        }}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                            index === currentIndex 
                                ? "bg-primary scale-125" 
                                : "bg-primary/20 hover:bg-primary/50"
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    )
}
