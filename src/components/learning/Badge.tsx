'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Award, Star, Shield, Target, TrendingUp, BookOpen, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserBadge } from '@/lib/learningTracks';

interface BadgeProps {
  badge: UserBadge;
  size?: 'sm' | 'md' | 'lg';
  showEarnedDate?: boolean;
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  Award,
  Star,
  Shield,
  Target,
  TrendingUp,
  BookOpen,
  Zap,
};

export function Badge({ 
  badge, 
  size = 'md', 
  showEarnedDate = false,
  className 
}: BadgeProps) {
  const Icon = iconMap[badge.icon] || Award;
  
  const sizeClasses = {
    sm: {
      card: 'p-3',
      icon: 'w-8 h-8',
      iconContainer: 'w-10 h-10',
      title: 'text-sm',
      desc: 'text-xs',
    },
    md: {
      card: 'p-4',
      icon: 'w-10 h-10',
      iconContainer: 'w-14 h-14',
      title: 'text-base',
      desc: 'text-sm',
    },
    lg: {
      card: 'p-6',
      icon: 'w-14 h-14',
      iconContainer: 'w-20 h-20',
      title: 'text-xl',
      desc: 'text-base',
    },
  };

  const s = sizeClasses[size];

  // Formater dato
  const earnedDate = new Date(badge.earnedAt).toLocaleDateString('no-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className={cn(
      'border-0 shadow-md bg-gradient-to-br from-yellow-50 to-orange-50',
      className
    )}>
      <CardContent className={cn(s.card, 'flex items-center gap-4')}>
        <div className={cn(
          s.iconContainer,
          'bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full',
          'flex items-center justify-center shadow-lg'
        )}>
          <Icon className={cn(s.icon, 'text-white')} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn(s.title, 'font-bold text-gray-900')}>{badge.label}</h4>
          <p className={cn(s.desc, 'text-gray-600 line-clamp-2')}>{badge.description}</p>
          {showEarnedDate && (
            <p className="text-xs text-gray-400 mt-1">
              Oppnådd {earnedDate}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Komponent for å vise alle opptjente badges
interface BadgeCollectionProps {
  badges: UserBadge[];
  emptyMessage?: string;
  className?: string;
}

export function BadgeCollection({ 
  badges, 
  emptyMessage = 'Du har ingen badges ennå. Fullfør et kurs for å få din første!',
  className 
}: BadgeCollectionProps) {
  if (badges.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      {badges.map((badge) => (
        <Badge key={badge.id} badge={badge} />
      ))}
    </div>
  );
}

// Komponent for å vise "låst" badge (track ikke fullført ennå)
interface LockedBadgeProps {
  label: string;
  description: string;
  className?: string;
}

export function LockedBadge({ label, description, className }: LockedBadgeProps) {
  return (
    <Card className={cn('border-0 shadow-sm bg-gray-50 opacity-60', className)}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center">
          <Award className="w-6 h-6 text-gray-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-500">{label}</h4>
          <p className="text-sm text-gray-400">{description}</p>
          <p className="text-xs text-gray-400 mt-1">🔒 Fullfør kurset for å låse opp</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Progress bar for track
interface TrackProgressProps {
  percentage: number;
  completed: number;
  total: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function TrackProgress({ 
  percentage, 
  completed, 
  total, 
  showLabel = true,
  size = 'md',
  className 
}: TrackProgressProps) {
  const heightClass = size === 'sm' ? 'h-2' : 'h-3';
  
  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{percentage}% fullført</span>
          <span className="text-gray-400">{completed}/{total} leksjoner</span>
        </div>
      )}
      <div className={cn('bg-gray-200 rounded-full overflow-hidden', heightClass)}>
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Komponent for å vise neste leksjoner
interface NextStepsProps {
  lessons: { id: string; title: string; type: string; href: string }[];
  onStart?: (href: string) => void;
  className?: string;
}

export function NextSteps({ lessons, onStart, className }: NextStepsProps) {
  if (lessons.length === 0) {
    return (
      <div className={cn('text-center py-6 bg-green-50 rounded-lg', className)}>
        <Star className="w-10 h-10 text-green-500 mx-auto mb-2" />
        <p className="font-medium text-green-700">Gratulerer! 🎉</p>
        <p className="text-sm text-green-600">Du har fullført alle leksjoner i denne stien.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {lessons.map((lesson, index) => (
        <div
          key={lesson.id}
          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
        >
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
            index === 0 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-500'
          )}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{lesson.title}</p>
            <p className="text-xs text-gray-500">{lesson.type}</p>
          </div>
          {index === 0 && (
            <button
              onClick={() => onStart?.(lesson.href)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
