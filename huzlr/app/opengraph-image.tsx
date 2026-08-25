import { ImageResponse } from "next/og"

export const alt = "huzlr — AI delivery coordination for hybrid teams"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f4efe6",
          color: "#29251f",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid rgba(41, 37, 31, 0.14)",
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
            huzlr<span style={{ color: "#a5573f" }}>.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ color: "#a5573f", display: "flex", fontSize: 22, letterSpacing: 4 }}>
              AI DELIVERY COORDINATION
            </div>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 600, lineHeight: 1.05 }}>
              Keep humans, AI workers,
              <br />meetings, and tools aligned.
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
