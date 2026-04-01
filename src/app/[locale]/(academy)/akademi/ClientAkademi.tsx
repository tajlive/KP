'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2,
  PlayCircle,
  HelpCircle,
  TrendingUp,
  Target,
  Calculator,
  ChevronRight,
  Award,
  GraduationCap,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  LEARNING_TRACKS, 
  getLevelLabel, 
  getLessonTypeLabel,
  LearningLesson,
  TrackLevel,
  LessonType 
} from '@/lib/learningTracks';
import { useLearningProgress } from '@/lib/useLearningProgress';
import { TrackProgress } from '@/features/learning/Badge';
import { cn } from '@/lib/utils';

type FilterLevel = TrackLevel | 'all';
type FilterType = LessonType | 'all';

const levelColors: Record<TrackLevel, { bg: string; text: string; badge: string }> = {
  beginner: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  intermediate: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  advanced: { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
}

const typeIcons: Record<LessonType, React.ElementType> = {
  article: BookOpen,
  video: PlayCircle,
  quiz: HelpCircle,
  simulator: TrendingUp,
  'paper-trading': Target,
  tool: Calculator,
  calculator: Calculator,
}

export default function ClientAkademi() {
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  const { 
    completedLessonIds: _completedLessonIds, 
    hasCompletedLesson,
    getTrackProgress 
  } = useLearningProgress();

  // Filtrer leksjoner
  const filteredLessons = useMemo(() => {
    let lessons: (LearningLesson & { trackTitle: string; trackColor: string })[] = [];
    
    LEARNING_TRACKS.forEach(track => {
      track.lessons.forEach(lesson => {
        lessons.push({
          ...lesson,
          trackTitle: track.title,
          trackColor: track.color,
        });
      });
    });

    // Filtrer på søk
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      lessons = lessons.filter(l => 
        l.title.toLowerCase().includes(query) ||
        l.description.toLowerCase().includes(query) ||
        l.trackTitle.toLowerCase().includes(query)
      );
    }

    // Filtrer på nivå
    if (filterLevel !== 'all') {
      lessons = lessons.filter(l => l.level === filterLevel);
    }

    // Filtrer på type
    if (filterType !== 'all') {
      lessons = lessons.filter(l => l.type === filterType);
    }

    // Filtrer på track hvis valgt
    if (selectedTrack) {
      lessons = lessons.filter(l => l.trackId === selectedTrack);
    }

    // Sorter: Nybegynner først, så track-rekkefølge
    lessons.sort((a, b) => {
      const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      if (levelOrder[a.level] !== levelOrder[b.level]) {
        return levelOrder[a.level] - levelOrder[b.level];
      }
      return a.order - b.order;
    });

    return lessons;
  }, [searchQuery, filterLevel, filterType, selectedTrack]);

  // Hent track detaljer hvis valgt
  const selectedTrackDetails = selectedTrack 
    ? LEARNING_TRACKS.find(t => t.id === selectedTrack)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button asChild variant="ghost" size="sm" className="pl-0">
                <Link href={`/${locale}/dashboard`}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Tilbake til dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              Universitetet
            </h1>
            <p className="text-gray-600 mt-1">
              Utforsk alle våre kurs, quizer og verktøy
            </p>
          </div>
          
          {/* Statistikk */}
          <div className="flex gap-4">
            <div className="text-center px-4 py-2 bg-white rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-blue-600">{LEARNING_TRACKS.length}</p>
              <p className="text-xs text-gray-500">Kurs</p>
            </div>
            <div className="text-center px-4 py-2 bg-white rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-green-600">
                {LEARNING_TRACKS.reduce((sum, t) => sum + t.lessons.length, 0)}
              </p>
              <p className="text-xs text-gray-500">Leksjoner</p>
            </div>
          </div>
        </div>

        {/* Track overview (kun hvis ingen track er valgt) */}
        {!selectedTrack && (
          <div className="grid md:grid-cols-3 gap-4">
            {LEARNING_TRACKS.map((track) => {
              const progress = getTrackProgress(track.id);
              const isCompleted = progress.percentage === 100;
              
              return (
                <Card 
                  key={track.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    isCompleted && 'border-green-300 bg-green-50/30'
                  )}
                  onClick={() => setSelectedTrack(track.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 ${track.color} rounded-lg flex items-center justify-center`}>
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <Badge className={levelColors[track.level].badge}>
                        {getLevelLabel(track.level)}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{track.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {track.shortDescription}
                    </p>
                    <TrackProgress 
                      percentage={progress.percentage}
                      completed={progress.completed}
                      total={progress.total}
                      size="sm"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Track detaljer header (hvis valgt) */}
        {selectedTrackDetails && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedTrack(null)}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Vis alle kurs
                </Button>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold">{selectedTrackDetails.title}</h2>
                    <Badge className={levelColors[selectedTrackDetails.level].badge}>
                      {getLevelLabel(selectedTrackDetails.level)}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm">{selectedTrackDetails.shortDescription}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">{selectedTrackDetails.estimatedTotalHours} timer</p>
                  <p className="text-xs text-gray-400">{selectedTrackDetails.lessons.length} leksjoner</p>
                </div>
                <div className={`w-12 h-12 ${selectedTrackDetails.color} rounded-xl flex items-center justify-center`}>
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter og søk */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Søk */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Søk etter kurs, quizer, verktøy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Nivå-filter */}
            <div className="flex gap-2 flex-wrap">
              <Badge 
                variant={filterLevel === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilterLevel('all')}
              >
                Alle nivåer
              </Badge>
              <Badge 
                variant={filterLevel === 'beginner' ? 'default' : 'outline'}
                className={cn('cursor-pointer', filterLevel === 'beginner' && 'bg-green-600')}
                onClick={() => setFilterLevel('beginner')}
              >
                Nybegynner
              </Badge>
              <Badge 
                variant={filterLevel === 'intermediate' ? 'default' : 'outline'}
                className={cn('cursor-pointer', filterLevel === 'intermediate' && 'bg-blue-600')}
                onClick={() => setFilterLevel('intermediate')}
              >
                Viderekommen
              </Badge>
              <Badge 
                variant={filterLevel === 'advanced' ? 'default' : 'outline'}
                className={cn('cursor-pointer', filterLevel === 'advanced' && 'bg-emerald-600')}
                onClick={() => setFilterLevel('advanced')}
              >
                Erfaren
              </Badge>
            </div>
          </div>

          {/* Type-filter */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm text-gray-500 flex items-center">
              <Filter className="w-4 h-4 mr-1" />
              Type:
            </span>
            {(['all', 'article', 'quiz', 'simulator', 'paper-trading', 'calculator'] as FilterType[]).map((type) => (
              <Badge 
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setFilterType(type)}
              >
                {type === 'all' ? 'Alt' : getLessonTypeLabel(type)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Leksjonsliste */}
        <div className="space-y-3">
          {filteredLessons.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Ingen leksjoner funnet</p>
              <p className="text-sm text-gray-400">Prøv å endre søket eller filtrene</p>
            </div>
          ) : (
            filteredLessons.map((lesson, index) => {
              const isCompleted = hasCompletedLesson(lesson.id);
              const Icon = typeIcons[lesson.type];
              const levelStyle = levelColors[lesson.level];

              return (
                <Card 
                  key={lesson.id}
                  className={cn(
                    'border-0 shadow-sm hover:shadow-md transition-all',
                    isCompleted && 'bg-green-50/50'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Nummer eller check */}
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-500'
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span className="font-semibold">{index + 1}</span>
                        )}
                      </div>

                      {/* Ikon */}
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        levelStyle.bg
                      )}>
                        <Icon className={cn('w-5 h-5', levelStyle.text)} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn(
                            'font-semibold',
                            isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                          )}>
                            {lesson.title}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {getLessonTypeLabel(lesson.type)}
                          </Badge>
                          {!selectedTrack && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                              {lesson.trackTitle}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                          {lesson.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.estimatedMinutes} min
                          </span>
                          <Badge className={levelStyle.badge}>
                            {getLevelLabel(lesson.level)}
                          </Badge>
                        </div>
                      </div>

                      {/* CTA */}
                      <Button asChild size="sm" variant={isCompleted ? 'outline' : 'default'}>
                        <Link href={lesson.href}>
                          {isCompleted ? 'Gjenta' : 'Start'}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Hva du lærer (hvis track er valgt) */}
        {selectedTrackDetails && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="font-bold text-gray-900">Hva du vil lære</h3>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {selectedTrackDetails.whatYouLearn.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-bold text-gray-900">Passer for deg som</h3>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {selectedTrackDetails.idealFor.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600">
                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs text-blue-600">✓</span>
                      </div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
