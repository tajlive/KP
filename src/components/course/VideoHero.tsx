'use client'

import { motion } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, Sparkles, Shield, TrendingUp, GraduationCap, Wifi, WifiOff } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface VideoSource {
  src: string
  type: string
  media?: string
}

interface VideoHeroProps {
  title?: string
  subtitle?: string
}

// Responsive video sources
const VIDEO_SOURCES: VideoSource[] = [
  // WebM for Chrome/Android (best compression)
  { src: '/videos/course-intro.webm', type: 'video/webm' },
  // Mobile MP4 (720p, smaller file)
  { src: '/videos/course-intro-mobile.mp4', type: 'video/mp4', media: '(max-width: 768px)' },
  // Desktop MP4 (1080p)
  { src: '/videos/course-intro-desktop.mp4', type: 'video/mp4', media: '(min-width: 769px)' },
  // Fallback to original
  { src: '/videos/course-intro.mp4', type: 'video/mp4' },
]

export function VideoHero({ 
  title = "Krypto for Småsparere",
  subtitle = "AI-guidet kurs - Lær i ditt eget tempo"
}: VideoHeroProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionSpeed, setConnectionSpeed] = useState<'fast' | 'slow' | 'offline'>('fast')
  const videoRef = useRef<HTMLVideoElement>(null)

  // Detect connection speed
  useEffect(() => {
    if (!('connection' in navigator)) return
    
    const conn = (navigator as typeof navigator & { connection?: { effectiveType: string; addEventListener: (event: string, handler: () => void) => void; removeEventListener: (event: string, handler: () => void) => void } }).connection;
    const updateConnection = () => {
      if (!conn) return;
      if (conn.effectiveType === '4g') setConnectionSpeed('fast')
      else if (conn.effectiveType === 'offline') setConnectionSpeed('offline')
      else setConnectionSpeed('slow')
    }
    updateConnection()
    conn?.addEventListener('change', updateConnection)
    return () => conn?.removeEventListener('change', updateConnection)
  }, [])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(() => setVideoError(true))
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Placeholder/Coming Soon state
  if (videoError) {
    return <VideoPlaceholder title={title} subtitle={subtitle} />
  }

  return (
    <motion.div 
      className="relative w-full aspect-video rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <motion.div
            className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}

      {/* Video element with multiple sources */}
      <video
        ref={videoRef}
        poster="/videos/course-poster.jpg"
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
        onEnded={() => setIsPlaying(false)}
        onError={() => setVideoError(true)}
        onLoadedData={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
      >
        {VIDEO_SOURCES.map((source, i) => (
          <source 
            key={i} 
            src={source.src} 
            type={source.type}
            media={source.media}
          />
        ))}
        Din nettleser støtter ikke video.
      </video>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-emerald-500/5 pointer-events-none" />

      {/* Connection indicator (mobile) */}
      {connectionSpeed === 'slow' && (
        <div className="absolute top-4 right-4 md:hidden">
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
            <WifiOff className="w-3 h-3" />
            Lav kvalitet
          </span>
        </div>
      )}

      {/* Content - HTML TEXT (not in video) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-1 md:mb-2">
            {title}
          </h1>
          <p className="text-sm md:text-lg text-slate-300">
            {subtitle}
          </p>
        </motion.div>
      </div>

      {/* Play/Pause button */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: showControls || !isPlaying ? 1 : 0, scale: 1 }}
      >
        <Button
          size="lg"
          className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 hover:bg-white/30 hover:scale-105 transition-transform"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 md:w-8 md:h-8 text-white" />
          ) : (
            <Play className="w-6 h-6 md:w-8 md:h-8 text-white ml-0.5" />
          )}
        </Button>
      </motion.div>

      {/* Mute button */}
      <motion.div
        className="absolute bottom-4 right-4 md:bottom-8 md:right-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: showControls ? 1 : 0 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-white/10 backdrop-blur hover:bg-white/20 w-10 h-10 md:w-12 md:h-12"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-white" />
          ) : (
            <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
          )}
        </Button>
      </motion.div>

      {/* Data-saver hint for slow connections */}
      {connectionSpeed === 'slow' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 md:bottom-8 md:left-8"
        >
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
            <Wifi className="w-3 h-3" />
            Data-sparing på
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}

// Placeholder component when video fails to load
function VideoPlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <motion.div 
      className="relative w-full aspect-video rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Animated background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/20 rounded-full blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-48 md:w-64 h-48 md:h-64 bg-emerald-500/20 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      {/* Floating icons */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-4 md:gap-8">
          {[Shield, TrendingUp, GraduationCap, Sparkles].map((Icon, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: [0, -10, 0] }}
              transition={{ 
                delay: i * 0.2,
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center"
            >
              <Icon className="w-5 h-5 md:w-8 md:h-8 text-blue-400" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-slate-950 to-transparent">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-1 md:mb-2">
            {title}
          </h1>
          <p className="text-sm md:text-lg text-slate-300">
            {subtitle}
          </p>
          <p className="text-xs md:text-sm text-slate-500 mt-2">
            🎬 Video kommer snart
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

// Simplified looping background video for other uses
export function VideoBackground({ videoSrc }: { videoSrc: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <video
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        className="absolute w-full h-full object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-slate-950/80" />
    </div>
  )
}
