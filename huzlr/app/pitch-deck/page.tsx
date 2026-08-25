import fs from "node:fs"
import path from "node:path"
import type { Metadata } from "next"

import { PitchDeckViewer } from "@/components/pitch-deck/pitch-deck-viewer"

export const metadata: Metadata = {
    title: "Pitch Deck",
    robots: { index: false, follow: false },
}

const slidesDirectory = path.join(
    process.cwd(),
    "public",
    "images",
    "pitch-deck",
    "slides"
)

function getSlides() {
    if (!fs.existsSync(slidesDirectory)) {
        return []
    }

    return fs
        .readdirSync(slidesDirectory)
        .filter((fileName) => /^slide-\d+\.(png|jpe?g|webp)$/i.test(fileName))
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
        .map((fileName) => `/images/pitch-deck/slides/${fileName}`)
}

export default function PitchDeckPage() {
    return <PitchDeckViewer slides={getSlides()} />
}
