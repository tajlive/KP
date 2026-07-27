'use client';

import { useEffect, useCallback } from 'react';
import { useProgressStore, type UserProgress } from '@/lib/stores/progressStore';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook for å håndtere brukerens kurs-fremgang
 * 2026-stil: Clean, med auto-fetch og realtime updates
 */
export function useProgress() {
  const { user } = useAuth();
  const store = useProgressStore();

  // Auto-fetch progress når bruker er logget inn
  useEffect(() => {
    if (user?.id) {
      store.fetchAllProgress();
      
      // Setup realtime subscription
      const unsubscribe = store.subscribeToProgress(user.id);
      
      return () => {
        unsubscribe();
      };
    }
    return;
  }, [user?.id]);

  // Hent fremgang for spesifikt kurs
  const getCourseProgress = useCallback((courseId: string) => {
    return store.progress.filter(p => p.courseId === courseId);
  }, [store.progress]);

  // Sjekk om en leksjon er fullført
  const isLessonCompleted = useCallback((lessonId: string) => {
    return store.progress.some(
      p => p.lessonId === lessonId && p.isCompleted
    );
  }, [store.progress]);

  // Hent siste tilgang
  const getLastAccessed = useCallback(() => {
    if (store.progress.length === 0) return null;
    
    return store.progress.sort(
      (a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
    )[0];
  }, [store.progress]);

  // Fortsett der du slapp
  const continueWhereLeftOff = useCallback(() => {
    const lastAccessed = getLastAccessed();
    if (!lastAccessed) return null;
    
    return {
      courseId: lastAccessed.courseId,
      lessonId: lastAccessed.lessonId,
    };
  }, [getLastAccessed]);

  return {
    // State
    progress: store.progress,
    stats: store.stats,
    isLoading: store.isLoading,
    isUpdating: store.isUpdating,
    error: store.error,
    
    // Current course (etter fetchCourseProgress)
    currentCourseProgress: store.currentCourseProgress,
    currentModuleProgress: store.currentModuleProgress,
    currentLessonProgress: store.currentLessonProgress,
    
    // Actions
    fetchAllProgress: store.fetchAllProgress,
    fetchCourseProgress: store.fetchCourseProgress,
    updateProgress: store.updateProgress,
    markLessonComplete: store.markLessonComplete,
    clearError: store.clearError,
    
    // Utilities
    getCourseProgress,
    isLessonCompleted,
    getLastAccessed,
    continueWhereLeftOff,
  };
}

/**
 * Hook for spesifikt kurs-fremgang
 */
export function useCourseProgress(courseId: string) {
  const { user } = useAuth();
  const store = useProgressStore();

  useEffect(() => {
    if (user?.id && courseId) {
      store.fetchCourseProgress(courseId);
    }
  }, [user?.id, courseId]);

  // Beregn modul-fremgang
  const moduleProgress = store.currentModuleProgress;
  
  // Finn neste leksjon
  const getNextLesson = useCallback(() => {
    const incompleteLessons = store.currentLessonProgress
      .filter(l => !l.isCompleted)
      .sort((a, b) => new Date(a.lastAccessedAt).getTime() - new Date(b.lastAccessedAt).getTime());
    
    return incompleteLessons[0] || null;
  }, [store.currentLessonProgress]);

  return {
    progress: store.currentCourseProgress,
    modules: moduleProgress,
    lessons: store.currentLessonProgress,
    isLoading: store.isLoading,
    error: store.error,
    getNextLesson,
    updateProgress: (data: {
      lessonId?: string;
      progressPercent?: number;
      isCompleted?: boolean;
    }) => store.updateProgress({ courseId, ...data }),
    markComplete: (lessonId: string) => 
      store.markLessonComplete(courseId, lessonId),
  };
}

export default useProgress;
