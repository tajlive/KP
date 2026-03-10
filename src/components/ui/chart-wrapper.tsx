'use client'

import { useEffect, useState } from 'react'
import { ResponsiveContainer } from 'recharts'

interface ChartWrapperProps {
  height?: number
  aspect?: number
  minHeight?: number
  children: React.ReactNode
  className?: string
}

/**
 * Sikker wrapper rundt alle Recharts-charts.
 * Hindrer width/height=-1 feil ved:
 * 1. SSR-guard (isMounted)
 * 2. Fast fallback-skeleton mens DOM måles
 * 3. minHeight på container
 */
export function ChartWrapper({
  height = 300,
  aspect,
  minHeight = 250,
  children,
  className = '',
}: ChartWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className={`w-full animate-pulse rounded-lg bg-slate-800 ${className}`}
        style={{ height, minHeight }}
        aria-hidden="true"
      />
    )
  }

  return (
    <div className={`w-full ${className}`} style={{ minHeight }}>
      <ResponsiveContainer
        width="100%"
        {...(aspect ? { aspect } : { height })}
      >
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}

// Re-export for bakoverkompatibilitet
export default ChartWrapper
