'use client'

import Image from 'next/image'
import { useState } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  className?: string
  sizes?: string
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  placeholder = 'empty',
  blurDataURL,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  // Handle error state
  if (error) {
    return (
      <div 
        className={`bg-slate-800 flex items-center justify-center ${className}`}
        style={!fill ? { width, height } : undefined}
      >
        <span className="text-slate-500 text-sm">Bilde ikke tilgjengelig</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={!fill ? { width, height } : undefined}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse rounded-lg" />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setError(true)
        }}
      />
    </div>
  )
}

// Logo component with predefined sizes
export function Logo({ 
  size = 'md', 
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string 
}) {
  const dimensions = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 96, height: 96 },
    xl: { width: 192, height: 192 },
  }

  const { width, height } = dimensions[size]

  return (
    <OptimizedImage
      src="/icons/icon.svg"
      alt="Klarpakke Logo"
      width={width}
      height={height}
      priority
      className={className}
    />
  )
}
