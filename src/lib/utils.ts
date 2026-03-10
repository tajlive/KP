import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a date to relative time (e.g., "2 hours ago", "just now")
export function formatDistanceToNow(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'akkurat nå'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutt${diffInMinutes !== 1 ? 'er' : ''} siden`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} time${diffInHours !== 1 ? 'r' : ''} siden`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays} dag${diffInDays !== 1 ? 'er' : ''} siden`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} måned${diffInMonths !== 1 ? 'er' : ''} siden`
  }

  const diffInYears = Math.floor(diffInMonths / 12)
  return `${diffInYears} år siden`
}

/**
 * Re-export createClient from singleton for backwards compatibility.
 * @deprecated Import from '@/lib/supabase/client' directly instead.
 */
export { createClient } from '@/lib/supabase/client'
