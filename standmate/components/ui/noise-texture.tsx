import * as React from "react"

import { cn } from "@/lib/utils"

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`

function NoiseTexture({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="noise-texture"
      className={cn("pointer-events-none", className)}
      style={{
        backgroundImage: NOISE_SVG,
        ...style,
      }}
      {...props}
    />
  )
}

export { NoiseTexture }
