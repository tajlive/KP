'use client';

import { GlassCard } from '@/shared/ui/GlassCard';
import { BadgePremium } from '@/shared/ui/BadgePremium';
import { ButtonPremium } from '@/shared/ui/ButtonPremium';
import { Progress } from '@/shared/ui/progress';
import { BookOpen, Clock, CheckCircle2, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export interface CourseProgressCardProps {
  courseId: string;
  title: string;
  slug: string;
  description?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  thumbnailUrl?: string;
  totalLessons: number;
  completedLessons: number;
  overallProgress: number;
  lastAccessedAt?: string | null;
  className?: string;
}

const levelLabels = {
  beginner: 'Nybegynner',
  intermediate: 'Middels',
  advanced: 'Avansert',
};

const levelColors = {
  beginner: 'bg-green-500/10 text-green-400 border-green-500/20',
  intermediate: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  advanced: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export function CourseProgressCard({
  courseId,
  title,
  slug,
  description,
  level = 'beginner',
  thumbnailUrl,
  totalLessons,
  completedLessons,
  overallProgress,
  lastAccessedAt,
  className,
}: CourseProgressCardProps) {
  const isCompleted = overallProgress === 100;
  const hasStarted = overallProgress > 0;
  
  // Format last accessed
  const lastAccessedText = lastAccessedAt 
    ? new Date(lastAccessedAt).toLocaleDateString('no-NO', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <GlassCard 
      variant="elevated" 
      hover="lift" 
      className={className}
    >
      <div className="flex flex-col h-full">
        {/* Header with thumbnail or gradient */}
        <div className="relative h-32 rounded-t-card overflow-hidden mb-4 -mx-6 -mt-6">
          {thumbnailUrl ? (
            <Image 
              src={thumbnailUrl} 
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-kp-brand/20 to-purple-500/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-kp-bg-secondary to-transparent" />
          
          {/* Level badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-1 rounded-badge text-xs font-semibold border ${levelColors[level]}`}>
              {levelLabels[level]}
            </span>
          </div>
          
          {/* Completion badge */}
          {isCompleted && (
            <div className="absolute top-3 right-3">
              <BadgePremium variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                Fullført
              </BadgePremium>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <h3 className="text-lg font-bold text-kp-text-primary mb-2 line-clamp-1">
            {title}
          </h3>
          
          {description && (
            <p className="text-sm text-kp-text-secondary mb-4 line-clamp-2">
              {description}
            </p>
          )}

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-kp-text-tertiary">
                {completedLessons} av {totalLessons} leksjoner
              </span>
              <span className="text-sm font-semibold text-kp-brand">
                {overallProgress}%
              </span>
            </div>
            <Progress 
              value={overallProgress} 
              className="h-2"
            />
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-kp-border flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-kp-text-tertiary">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {totalLessons} leksjoner
              </span>
              {lastAccessedText && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {lastAccessedText}
                </span>
              )}
            </div>
            
            <Link href={`/kurs/${slug}`}>
              <ButtonPremium
                variant={isCompleted ? 'secondary' : 'primary'}
                size="sm"
                icon={isCompleted ? undefined : <Play className="w-4 h-4" />}
                iconPosition="left"
              >
                {isCompleted ? 'Se igjen' : hasStarted ? 'Fortsett' : 'Start'}
              </ButtonPremium>
            </Link>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default CourseProgressCard;
