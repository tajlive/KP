'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LEARNING_TRACKS,
  LearningTrack,
  LearningLesson,
  calculateTrackProgress,
  isTrackCompleted,
  getNextLessons,
  getTrackById,
  getFirstIncompleteLesson,
  UserBadge,
} from './learningTracks';

// Nøkkel for localStorage
const STORAGE_KEY = 'klarpakke-learning-progress';
const BADGES_KEY = 'klarpakke-badges';

interface StoredProgress {
  completedLessonIds: string[];
  lastAccessedAt: string;
  currentTrackId?: string;
}

interface LearningProgressState {
  // Data
  completedLessonIds: string[];
  earnedBadges: UserBadge[];
  currentTrackId: string | null;
  
  // Actions
  markLessonComplete: (lessonId: string) => void;
  markLessonIncomplete: (lessonId: string) => void;
  setCurrentTrack: (trackId: string | null) => void;
  resetProgress: () => void;
  
  // Computed
  getTrackProgress: (trackId: string) => { percentage: number; completed: number; total: number };
  hasCompletedTrack: (trackId: string) => boolean;
  hasCompletedLesson: (lessonId: string) => boolean;
  getNextLessons: (trackId: string, count?: number) => LearningLesson[];
  getCurrentLesson: (trackId: string) => LearningLesson | undefined;
  getRecommendedTrack: () => LearningTrack;
  getContinueLearningUrl: () => string | null;
  
  // Loading state
  isLoaded: boolean;
}

export function useLearningProgress(): LearningProgressState {
  const [isLoaded, setIsLoaded] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);

  // Last fra localStorage ved mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredProgress = JSON.parse(stored);
        setCompletedLessonIds(data.completedLessonIds || []);
        setCurrentTrackId(data.currentTrackId || null);
      }
      
      const storedBadges = localStorage.getItem(BADGES_KEY);
      if (storedBadges) {
        setEarnedBadges(JSON.parse(storedBadges));
      }
    } catch (error) {
      console.error('Kunne ikke laste læringsprogresjon:', error);
    }
    setIsLoaded(true);
  }, []);

  // Lagre til localStorage når data endres
  useEffect(() => {
    if (!isLoaded) return;
    
    try {
      const data: StoredProgress = {
        completedLessonIds,
        lastAccessedAt: new Date().toISOString(),
        currentTrackId: currentTrackId || undefined,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Kunne ikke lagre læringsprogresjon:', error);
    }
  }, [completedLessonIds, currentTrackId, isLoaded]);

  // Lagre badges
  useEffect(() => {
    if (!isLoaded) return;
    
    try {
      localStorage.setItem(BADGES_KEY, JSON.stringify(earnedBadges));
    } catch (error) {
      console.error('Kunne ikke lagre badges:', error);
    }
  }, [earnedBadges, isLoaded]);

  // Sjekk og tildel badges når progress endres
  useEffect(() => {
    if (!isLoaded) return;
    
    LEARNING_TRACKS.forEach(track => {
      const isCompleted = isTrackCompleted(track.id, completedLessonIds);
      const alreadyHasBadge = earnedBadges.some(b => b.trackId === track.id);
      
      if (isCompleted && !alreadyHasBadge) {
        const newBadge: UserBadge = {
          id: track.badgeId,
          trackId: track.id,
          label: track.badgeLabel,
          description: track.badgeDescription,
          earnedAt: new Date().toISOString(),
          icon: 'Award',
        };
        setEarnedBadges(prev => [...prev, newBadge]);
        
        // Send toast/notification about new badge (implemented in future version)
        console.info(`🎉 Nytt badge oppnådd: ${track.badgeLabel}`);
      }
    });
  }, [completedLessonIds, earnedBadges, isLoaded]);

  const markLessonComplete = useCallback((lessonId: string) => {
    setCompletedLessonIds(prev => {
      if (prev.includes(lessonId)) return prev;
      return [...prev, lessonId];
    });
  }, []);

  const markLessonIncomplete = useCallback((lessonId: string) => {
    setCompletedLessonIds(prev => prev.filter(id => id !== lessonId));
  }, []);

  const setCurrentTrack = useCallback((trackId: string | null) => {
    setCurrentTrackId(trackId);
  }, []);

  const resetProgress = useCallback(() => {
    setCompletedLessonIds([]);
    setEarnedBadges([]);
    setCurrentTrackId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BADGES_KEY);
  }, []);

  const getTrackProgress = useCallback((trackId: string) => {
    return calculateTrackProgress(trackId, completedLessonIds);
  }, [completedLessonIds]);

  const hasCompletedTrackCallback = useCallback((trackId: string) => {
    return isTrackCompleted(trackId, completedLessonIds);
  }, [completedLessonIds]);

  const hasCompletedLessonCallback = useCallback((lessonId: string) => {
    return completedLessonIds.includes(lessonId);
  }, [completedLessonIds]);

  const getNextLessonsCallback = useCallback((trackId: string, count: number = 3) => {
    return getNextLessons(trackId, completedLessonIds, count);
  }, [completedLessonIds]);

  const getCurrentLessonCallback = useCallback((trackId: string) => {
    return getFirstIncompleteLesson(trackId, completedLessonIds);
  }, [completedLessonIds]);

  const getRecommendedTrack = useCallback((): LearningTrack => {
    // Finn første track som ikke er fullført
    for (const track of LEARNING_TRACKS) {
      if (!isTrackCompleted(track.id, completedLessonIds)) {
        return track;
      }
    }
    // Hvis alle er fullført, returner siste
    return LEARNING_TRACKS[LEARNING_TRACKS.length - 1];
  }, [completedLessonIds]);

  const getContinueLearningUrl = useCallback((): string | null => {
    // Prioritet: 1) Nåværende track, 2) Anbefalt track
    const trackToContinue = currentTrackId 
      ? getTrackById(currentTrackId) 
      : getRecommendedTrack();
    
    if (!trackToContinue) return null;
    
    const nextLesson = getFirstIncompleteLesson(trackToContinue.id, completedLessonIds);
    
    if (nextLesson) {
      return nextLesson.href;
    }
    
    // Hvis track er fullført, gå til neste track
    const currentIndex = LEARNING_TRACKS.findIndex(t => t.id === trackToContinue.id);
    const nextTrack = LEARNING_TRACKS[currentIndex + 1];
    
    if (nextTrack) {
      const firstLesson = nextTrack.lessons[0];
      if (firstLesson) return firstLesson.href;
    }
    
    return '/kurs';
  }, [currentTrackId, completedLessonIds, getRecommendedTrack]);

  return {
    completedLessonIds,
    earnedBadges,
    currentTrackId,
    markLessonComplete,
    markLessonIncomplete,
    setCurrentTrack,
    resetProgress,
    getTrackProgress,
    hasCompletedTrack: hasCompletedTrackCallback,
    hasCompletedLesson: hasCompletedLessonCallback,
    getNextLessons: getNextLessonsCallback,
    getCurrentLesson: getCurrentLessonCallback,
    getRecommendedTrack,
    getContinueLearningUrl,
    isLoaded,
  };
}

// Hjelpefunksjon for å beregne total progresjon på tvers av alle tracks
export function calculateTotalProgress(completedLessonIds: string[]): number {
  let totalLessons = 0;
  let totalCompleted = 0;
  
  LEARNING_TRACKS.forEach(track => {
    totalLessons += track.lessons.length;
    totalCompleted += track.lessons.filter(l => completedLessonIds.includes(l.id)).length;
  });
  
  return totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
}

// Hjelpefunksjon for å få statistikk
export function getLearningStats(completedLessonIds: string[]) {
  const completedTracks = LEARNING_TRACKS.filter(t => 
    isTrackCompleted(t.id, completedLessonIds)
  );
  
  const totalTimeSpent = LEARNING_TRACKS.reduce((total, track) => {
    const completedInTrack = track.lessons.filter(l => completedLessonIds.includes(l.id));
    return total + completedInTrack.reduce((sum, l) => sum + l.estimatedMinutes, 0);
  }, 0);
  
  return {
    completedTracksCount: completedTracks.length,
    totalTracksCount: LEARNING_TRACKS.length,
    completedLessonsCount: completedLessonIds.length,
    totalLessonsCount: LEARNING_TRACKS.reduce((sum, t) => sum + t.lessons.length, 0),
    totalTimeSpentMinutes: totalTimeSpent,
    estimatedTotalHours: LEARNING_TRACKS.reduce((sum, t) => sum + t.estimatedTotalHours, 0),
  };
}
