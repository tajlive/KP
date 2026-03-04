'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  BookOpen, 
  CheckCircle2, 
  ChevronRight,
  GraduationCap,
  X
} from 'lucide-react'
import Link from 'next/link'
import { 
  getLessonById, 
  getTrackById, 
  LearningLesson, 
  LearningTrack 
} from '@/lib/learningTracks'
import { useLearningProgress } from '@/lib/useLearningProgress'
import { cn } from '@/lib/utils'

interface LearningBannerProps {
  lessonId?: string
  trackId?: string
  context?: 'simulator' | 'paper-trading' | 'quiz' | 'calculator' | 'general'
  taskDescription?: string
  onCompleteTask?: () => void
  className?: string
}

export function LearningBanner({
  lessonId: propLessonId,
  trackId: propTrackId,
  context,
  taskDescription,
  onCompleteTask,
  className,
}: LearningBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [lesson, setLesson] = useState<LearningLesson | null>(null)
  const [track, setTrack] = useState<LearningTrack | null>(null)
  const t = useTranslations('learning')
  const locale = useLocale()
  
  const { 
    hasCompletedLesson, 
    markLessonComplete,
    currentTrackId,
    getCurrentLesson 
  } = useLearningProgress()

  // Finn lesson/track basert på props eller context
  useEffect(() => {
    if (propLessonId) {
      const foundLesson = getLessonById(propLessonId)
      if (foundLesson) {
        setLesson(foundLesson)
        setTrack(getTrackById(foundLesson.trackId) || null)
        return
      }
    }

    if (propTrackId) {
      const foundTrack = getTrackById(propTrackId)
      if (foundTrack) {
        setTrack(foundTrack)
        const currentLesson = getCurrentLesson(propTrackId)
        if (currentLesson) {
          setLesson(currentLesson)
        }
      }
      return
    }

    // Fallback: finn basert på context
    if (context) {
      const trackToUse = currentTrackId 
        ? getTrackById(currentTrackId) 
        : undefined
      
      if (trackToUse) {
        setTrack(trackToUse)
        const currentLesson = getCurrentLesson(trackToUse.id)
        if (currentLesson && isLessonForContext(currentLesson.type, context)) {
          setLesson(currentLesson)
        }
      }
    }
  }, [propLessonId, propTrackId, context, currentTrackId, getCurrentLesson])

  if (!isVisible || !track) return null

  const isCompleted = lesson ? hasCompletedLesson(lesson.id) : false

  // Hvis oppgaven er fullført, vis enkel "tilbake til universitetet"-banner
  if (isCompleted && lesson) {
    return (
      <Card className={cn('bg-green-50 border-green-200', className)}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-green-800">
              <strong>{lesson.title}</strong> {t('completed')} 🎉
            </span>
          </div>
          <Button asChild size="sm" variant="outline" className="border-green-600 text-green-700">
            <Link href={`/${locale}/kurs`}>
              {t('continueLearning')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-blue-50 border-blue-200', className)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Track info */}
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">
                {t('partOf')}: {track.title}
              </span>
              {lesson && (
                <>
                  <span className="text-blue-400">•</span>
                  <span className="text-sm text-blue-600">
                    {t('lesson')} {lesson.order}
                  </span>
                </>
              )}
            </div>

            {/* Lesson info */}
            {lesson && (
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                <p className="text-sm text-gray-600">{lesson.description}</p>
              </div>
            )}

            {/* Task description */}
            {taskDescription && (
              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700">
                  <strong>{t('task')}:</strong> {taskDescription}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              {lesson && !isCompleted && onCompleteTask && (
                <Button 
                  size="sm" 
                  onClick={() => {
                    markLessonComplete(lesson.id)
                    onCompleteTask()
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {t('markComplete')}
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link href={`/${locale}/kurs?track=${track.id}`}>
                  <BookOpen className="w-4 h-4 mr-1" />
                  {t('seeFullPath')}
                </Link>
              </Button>
            </div>
          </div>

          {/* Close button */}
          <button 
            onClick={() => setIsVisible(false)}
            className="text-blue-400 hover:text-blue-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Card>
  )
}

// Hjelpefunksjon for å sjekke om en lesson passer til en context
function isLessonForContext(lessonType: string, context: string): boolean {
  const mapping: Record<string, string[]> = {
    'simulator': ['simulator', 'chart-analysis'],
    'paper-trading': ['trading', 'risk-management'],
    'quiz': ['theory', 'quiz'],
    'calculator': ['math', 'calculator'],
  }
  
  return mapping[context]?.includes(lessonType) || false
}

// Forenklet variant for verktøysider
interface ToolContextBannerProps {
  toolName: string
  toolContext: 'simulator' | 'paper-trading' | 'quiz' | 'calculator'
  taskDescription?: string
  className?: string
}

export function ToolContextBanner({
  toolName,
  toolContext,
  taskDescription,
  className,
}: ToolContextBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const locale = useLocale()

  if (isDismissed) return null

  const toolDescriptions: Record<string, { title: string; description: string }> = {
    'simulator': {
      title: 'Trading Simulator',
      description: locale === 'no' 
        ? 'Utforsk markedsdata og lær å lese grafer uten risiko.'
        : 'Explore market data and learn to read charts without risk.',
    },
    'paper-trading': {
      title: 'Paper Trading',
      description: locale === 'no'
        ? 'Øv deg på å kjøpe og selge med 1 000 000 kr virtuelle penger.'
        : 'Practice buying and selling with 1,000,000 virtual money.',
    },
    'quiz': {
      title: 'Quiz',
      description: locale === 'no'
        ? 'Test kunnskapen din og få umiddelbar tilbakemelding.'
        : 'Test your knowledge and get immediate feedback.',
    },
    'calculator': {
      title: locale === 'no' ? 'Avkastningskalkulator' : 'Return Calculator',
      description: locale === 'no'
        ? 'Forstå hvordan rente-på-rente fungerer over tid.'
        : 'Understand how compound interest works over time.',
    },
  }

  const info = toolDescriptions[toolContext]

  return (
    <Card className={cn('bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200', className)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">{info.title}</span>
              <span className="text-blue-400">•</span>
              <Link 
                href={`/${locale}/kurs`}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                {locale === 'no' ? 'Del av Universitetet' : 'Part of University'}
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-gray-600 text-sm mb-2">{info.description}</p>
            {taskDescription && (
              <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
                <p className="text-sm text-gray-700">
                  <strong>{locale === 'no' ? 'Dagens oppgave:' : 'Today\'s task:'}</strong> {taskDescription}
                </p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsDismissed(true)}
            className="text-blue-400 hover:text-blue-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Card>
  )
}
