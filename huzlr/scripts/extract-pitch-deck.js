const { execFileSync } = require("node:child_process")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

const projectRoot = path.resolve(__dirname, "..")
const sourcePath = path.join(projectRoot, "public", "huzlr.pptx")
const outputDirectory = path.join(
    projectRoot,
    "public",
    "images",
    "pitch-deck",
    "slides"
)

function readRelationships(filePath) {
    const xml = fs.readFileSync(filePath, "utf8")
    const relationships = new Map()

    for (const match of xml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
        const attributes = Object.fromEntries(
            Array.from(match[1].matchAll(/(\w+)="([^"]*)"/g), (attribute) => [
                attribute[1],
                attribute[2],
            ])
        )
        relationships.set(attributes.Id, attributes)
    }

    return relationships
}

function extractSlides() {
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`PowerPoint not found: ${sourcePath}`)
    }

    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "huzlr-pitch-deck-"))

    try {
        execFileSync("unzip", ["-q", sourcePath, "-d", temporaryDirectory])

        const presentationPath = path.join(temporaryDirectory, "ppt", "presentation.xml")
        const presentationXml = fs.readFileSync(presentationPath, "utf8")
        const presentationRelationships = readRelationships(
            path.join(temporaryDirectory, "ppt", "_rels", "presentation.xml.rels")
        )
        const slideRelationshipIds = Array.from(
            presentationXml.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"[^>]*\/?\s*>/g),
            (match) => match[1]
        )

        if (slideRelationshipIds.length === 0) {
            throw new Error("The PowerPoint does not contain any slides.")
        }

        const slideImages = slideRelationshipIds.map((relationshipId, index) => {
            const slideRelationship = presentationRelationships.get(relationshipId)
            if (!slideRelationship?.Target) {
                throw new Error(`Could not resolve slide ${index + 1}.`)
            }

            const slidePath = path.resolve(
                temporaryDirectory,
                "ppt",
                slideRelationship.Target
            )
            const slideRelationships = readRelationships(
                path.join(
                    path.dirname(slidePath),
                    "_rels",
                    `${path.basename(slidePath)}.rels`
                )
            )
            const imageRelationships = Array.from(slideRelationships.values()).filter(
                (relationship) => relationship.Type?.endsWith("/image")
            )

            if (imageRelationships.length !== 1) {
                throw new Error(
                    `Slide ${index + 1} must contain exactly one flattened slide image; found ${imageRelationships.length}.`
                )
            }

            return path.resolve(path.dirname(slidePath), imageRelationships[0].Target)
        })

        fs.rmSync(outputDirectory, { recursive: true, force: true })
        fs.mkdirSync(outputDirectory, { recursive: true })

        slideImages.forEach((imagePath, index) => {
            const extension = path.extname(imagePath).toLowerCase()
            const outputName = `slide-${String(index + 1).padStart(2, "0")}${extension}`
            fs.copyFileSync(imagePath, path.join(outputDirectory, outputName))
        })

        console.log(`Extracted ${slideImages.length} slides from public/huzlr.pptx.`)
    } finally {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true })
    }
}

extractSlides()
