"use client"

import Link from "next/link"
import { track } from "@vercel/analytics"

type AnalyticsValue = string | number | boolean | null | undefined

interface TrackedLinkProps extends React.ComponentProps<typeof Link> {
  eventName: string
  eventProperties?: Record<string, AnalyticsValue>
}

export function TrackedLink({
  eventName,
  eventProperties,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        track(eventName, eventProperties)
        onClick?.(event)
      }}
    />
  )
}
