/**
 * Progress Store - Zustand-based state management for course progress
 * 2026-stil: Clean, typed, with realtime subscription
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api-client';

// Types
export interface LessonProgress {
  lessonId: string;
  progressPercent: number;
  isCompleted: boolean;
  completedAt: string | null;
  lastAccessedAt: string;
}

export interface ModuleProgress {
  moduleId: string;
  title: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
}

export interface CourseProgress {
  overall: number;
  completedLessons: number;
  totalLessons: number;
  startedAt: string | null;
  lastAccessedAt: string | null;
}

export interface UserProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string | null;
  progressPercent: number;
  isCompleted: boolean;
  startedAt: string;
  completedAt: string | null;
  lastAccessedAt: string;
}

export interface ProgressStats {
  totalCourses: number;
  completedLessons: number;
  totalProgress: number;
  recentlyAccessed: UserProgress[];
}

interface ProgressState {
  // Data
  progress: UserProgress[];
  currentCourseProgress: CourseProgress | null;
  currentModuleProgress: ModuleProgress[];
  currentLessonProgress: LessonProgress[];
  stats: ProgressStats | null;
  
  // UI State
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  
  // Actions
  fetchAllProgress: () => Promise<void>;
  fetchCourseProgress: (courseId: string) => Promise<void>;
  updateProgress: (data: {
    courseId: string;
    lessonId?: string;
    progressPercent?: number;
    isCompleted?: boolean;
  }) => Promise<void>;
  markLessonComplete: (courseId: string, lessonId: string) => Promise<void>;
  clearError: () => void;
  
  // Realtime
  subscribeToProgress: (userId: string) => () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      // Initial state
      progress: [],
      currentCourseProgress: null,
      currentModuleProgress: [],
      currentLessonProgress: [],
      stats: null,
      isLoading: false,
      isUpdating: false,
      error: null,

      // Fetch all user progress
      fetchAllProgress: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiFetch('/api/progress');
          
          // apiFetch handles 401 by redirecting, so if we get here, it's a real error
          if (!response.ok) {
            let errorMessage = 'Kunne ikke hente fremgang';
            try {
              const error = await response.json();
              errorMessage = error.error || errorMessage;
            } catch {
              // If JSON parse fails, use status text
              errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
          }
          
          const data = await response.json();
          
          set({
            progress: data.progress || [],
            stats: data.stats || null,
            isLoading: false,
          });
        } catch (error) {
          // Don't set error if we got redirected (page is navigating away)
          if (error instanceof Error && error.message.includes('redirect')) {
            return;
          }
          set({
            error: error instanceof Error ? error.message : 'Ukjent feil',
            isLoading: false,
          });
        }
      },

      // Fetch specific course progress
      fetchCourseProgress: async (courseId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiFetch(`/api/progress/${courseId}`);
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Kunne ikke hente kurs-fremgang');
          }
          
          const data = await response.json();
          
          set({
            currentCourseProgress: data.progress || null,
            currentModuleProgress: data.moduleProgress || [],
            currentLessonProgress: data.lessonProgress || [],
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Ukjent feil',
            isLoading: false,
          });
        }
      },

      // Update progress
      updateProgress: async ({
        courseId,
        lessonId,
        progressPercent,
        isCompleted,
      }) => {
        set({ isUpdating: true, error: null });
        
        try {
          const response = await apiFetch('/api/progress', {
            method: 'POST',
            body: JSON.stringify({
              courseId,
              lessonId,
              progressPercent,
              isCompleted,
            }),
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Kunne ikke oppdatere fremgang');
          }
          
          const data = await response.json();
          
          // Update local state
          const { progress } = get();
          const updatedProgress = progress.map(p =>
            p.courseId === courseId && p.lessonId === lessonId
              ? { ...p, ...data.progress }
              : p
          );
          
          // Add new progress if not exists
          if (!updatedProgress.find(p => 
            p.courseId === courseId && p.lessonId === lessonId
          )) {
            updatedProgress.push(data.progress);
          }
          
          set({
            progress: updatedProgress,
            isUpdating: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Ukjent feil',
            isUpdating: false,
          });
        }
      },

      // Mark lesson as complete (convenience method)
      markLessonComplete: async (courseId: string, lessonId: string) => {
        await get().updateProgress({
          courseId,
          lessonId,
          progressPercent: 100,
          isCompleted: true,
        });
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Subscribe to realtime updates
      subscribeToProgress: (userId: string) => {
        const supabase = createClient();
        
        const subscription = supabase
          .channel('user_course_progress_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_course_progress',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              // Refetch all progress when changes occur
              get().fetchAllProgress();
            }
          )
          .subscribe();

        // Return unsubscribe function
        return () => {
          subscription.unsubscribe();
        };
      },
    }),
    {
      name: 'progress-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        progress: state.progress,
        stats: state.stats,
      }),
    }
  )
);

// Selectors
export const selectCourseProgress = (courseId: string) => (state: ProgressState) =>
  state.progress.filter(p => p.courseId === courseId);

export const selectCompletedLessons = (state: ProgressState) =>
  state.progress.filter(p => p.isCompleted);

export const selectOverallProgress = (state: ProgressState) => {
  if (state.progress.length === 0) return 0;
  const total = state.progress.reduce((acc, p) => acc + (p.progressPercent || 0), 0);
  return Math.round(total / state.progress.length);
};

export default useProgressStore;
