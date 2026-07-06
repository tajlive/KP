import { Card } from '@/shared/ui/card';
import { StatCard } from '@/shared/ui/StatCard';
import { SectionHeading } from '@/shared/ui/SectionHeading';
import { Badge } from '@/shared/ui/badge';
import { 
  BookOpen, 
  CheckCircle2, 
  Trophy, 
  Flame,
  TrendingUp,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverallProgressStatsProps {
  totalCourses: number;
  completedLessons: number;
  totalLessons: number;
  currentStreak?: number;
  longestStreak?: number;
  weeklyGoal?: number;
  weeklyProgress?: number;
  className?: string;
}

export function OverallProgressStats({
  totalCourses,
  completedLessons,
  totalLessons,
  currentStreak = 0,
  longestStreak = 0,
  weeklyGoal = 5,
  weeklyProgress = 0,
  className,
}: OverallProgressStatsProps) {
  const overallProgress = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  const stats = [
    {
      label: 'Kurs pågår',
      value: totalCourses,
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      label: 'Fullførte leksjoner',
      value: completedLessons,
      change: `${totalLessons} totalt`,
      changeType: 'neutral' as const,
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      label: 'Daglig streak',
      value: currentStreak,
      change: `Rekord: ${longestStreak}`,
      changeType: currentStreak >= longestStreak ? ('positive' as const) : ('neutral' as const),
      icon: <Flame className="w-5 h-5" />,
    },
    {
      label: 'Total fremgang',
      value: `${overallProgress}%`,
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionHeading
          title="Din læringsreise"
          subtitle="Spor fremgangen din gjennom kursene"
          size="sm"
          align="left"
        />
        
        {currentStreak > 0 && (
          <Badge
            variant="warning"
            icon={<Flame className="w-3.5 h-3.5" />}
          >
            {currentStreak} dagers streak!
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            icon={stat.icon}
            animate
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Weekly Goal */}
      <Card variant="glass" glassVariant="subtle" padding="md">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-kp-brand-subtle text-kp-brand">
            <Clock className="w-6 h-6" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-kp-text-primary">
                Ukens mål
              </h4>
              <span className="text-sm text-kp-text-secondary">
                {weeklyProgress} / {weeklyGoal} leksjoner
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-kp-surface-highlight rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-kp-brand to-kp-brand-light rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min((weeklyProgress / weeklyGoal) * 100, 100)}%` 
                }}
              />
            </div>
            
            <p className="text-xs text-kp-text-tertiary mt-2">
              {weeklyProgress >= weeklyGoal 
                ? '🎉 Gratulerer! Du har nådd ukens mål!'
                : `${weeklyGoal - weeklyProgress} leksjoner igjen for å nå målet`}
            </p>
          </div>
        </div>
      </Card>

      {/* Achievement teaser */}
      {overallProgress >= 50 && (
        <Card variant="glass" glassVariant="glow" padding="md" className="text-center">
          <Trophy className="w-8 h-8 text-kp-warning mx-auto mb-2" />
          <h4 className="font-semibold text-kp-text-primary mb-1">
            {overallProgress >= 100 ? 'Kurs-mester!' : 'Halvveis der!'}
          </h4>
          <p className="text-sm text-kp-text-secondary">
            {overallProgress >= 100 
              ? 'Du har fullført alle dine kurs. Imponerende!'
              : 'Du er halvveis gjennom læringsreisen din. Fortsett så!'}
          </p>
        </Card>
      )}
    </div>
  );
}

export default OverallProgressStats;
