import { ImageResponse } from "next/og"

export const alt = "huzlr  AI project manager for engineering teams"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f7f9fc",
          color: "#172033",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid rgba(23, 32, 51, 0.14)",
            borderRadius: "32px",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: "56px 64px",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", fontSize: 42, fontWeight: 700 }}>
            huzlr<span style={{ color: "#0874df" }}>.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ color: "#0874df", display: "flex", fontSize: 22, letterSpacing: 4 }}>
              AI PROJECT MANAGER FOR ENGINEERING TEAMS
            </div>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 600, lineHeight: 1.05 }}>
              Know what humans and AI
              <br />should do next.
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
