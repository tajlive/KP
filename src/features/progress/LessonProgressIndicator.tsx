import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonProgressIndicatorProps {
  isCompleted: boolean;
  isCurrent?: boolean;
  progressPercent?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function LessonProgressIndicator({
  isCompleted,
  isCurrent = false,
  progressPercent = 0,
  size = 'md',
  showLabel = false,
  className,
}: LessonProgressIndicatorProps) {
  // Determine state
  const isInProgress = !isCompleted && progressPercent > 0;
  
  // Icons based on state
  const Icon = isCompleted 
    ? CheckCircle2 
    : isCurrent 
      ? PlayCircle 
      : Circle;

  // Colors based on state
  const stateClasses = isCompleted
    ? 'text-kp-success'
    : isCurrent
      ? 'text-kp-brand animate-pulse-soft'
      : isInProgress
        ? 'text-kp-brand/50'
        : 'text-kp-text-muted';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon className={cn(sizeClasses[size], stateClasses)} />
      
      {showLabel && (
        <span className={cn(
          'text-sm font-medium',
          isCompleted ? 'text-kp-success' : 
          isCurrent ? 'text-kp-brand' : 
          'text-kp-text-tertiary'
        )}>
          {isCompleted ? 'Fullført' : 
           isCurrent ? 'Pågår' : 
           isInProgress ? `${progressPercent}%` :
           'Ikke startet'}
        </span>
      )}
    </div>
  );
}

// Linear progress variant for lesson lists
interface LessonProgressLineProps {
  lessons: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    isCurrent?: boolean;
    duration?: string;
  }>;
  className?: string;
}

export function LessonProgressLine({ lessons, className }: LessonProgressLineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {lessons.map((lesson, index) => (
        <div 
          key={lesson.id}
          className="flex items-center gap-4 relative"
        >
          {/* Connector line */}
          {index < lessons.length - 1 && (
            <div className="absolute left-3 top-8 bottom-0 w-px bg-kp-border" />
          )}
          
          {/* Status indicator */}
          <LessonProgressIndicator
            isCompleted={lesson.isCompleted}
            isCurrent={lesson.isCurrent}
            size="md"
          />
          
          {/* Lesson info */}
          <div className="flex-1 py-3 border-b border-kp-border/50">
            <p className={cn(
              'text-sm font-medium',
              lesson.isCompleted || lesson.isCurrent 
                ? 'text-kp-text-primary' 
                : 'text-kp-text-tertiary'
            )}>
              {lesson.title}
            </p>
            {lesson.duration && (
              <p className="text-xs text-kp-text-muted mt-0.5">
                {lesson.duration}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default LessonProgressIndicator;
