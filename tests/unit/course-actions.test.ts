import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  markLessonComplete,
  submitQuizAnswer,
  trackLessonTime,
  hasCompletedRequiredModules,
  getModuleProgress,
} from "@/lib/courses/actions";

// Mock the Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("Course Actions", () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    upsert: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    in: vi.fn(() => mockSupabase),
    single: vi.fn(() => mockSupabase),
    maybeSingle: vi.fn(() => mockSupabase),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe("markLessonComplete", () => {
    it("should upsert correct fields for lesson completion", async () => {
      const userId = "test-user-id";
      const lessonId = "test-lesson-id";
      const mockData = {
        id: "progress-id",
        user_id: userId,
        lesson_id: lessonId,
        status: "completed",
        completed_at: expect.any(String),
      };

      mockSupabase.upsert.mockResolvedValue({ data: mockData, error: null });

      const result = await markLessonComplete(userId, lessonId);

      expect(mockSupabase.from).toHaveBeenCalledWith("user_lesson_progress");
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        {
          user_id: userId,
          lesson_id: lessonId,
          status: "completed",
          completed_at: expect.any(String),
        },
        { onConflict: "user_id,lesson_id" }
      );
    });

    it("should throw error when upsert fails", async () => {
      const userId = "test-user-id";
      const lessonId = "test-lesson-id";

      mockSupabase.upsert.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(markLessonComplete(userId, lessonId)).rejects.toThrow(
        "Failed to mark lesson as complete"
      );
    });
  });

  describe("submitQuizAnswer", () => {
    it("should return isCorrect=true when answer is correct", async () => {
      const userId = "test-user-id";
      const questionId = "test-question-id";
      const selectedOptionId = "option-b";

      // Mock question fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: { correct_option_id: "option-b" },
        error: null,
      });

      // Mock attempt upsert
      mockSupabase.upsert.mockResolvedValueOnce({
        data: { id: "attempt-id", is_correct: true },
        error: null,
      });

      const result = await submitQuizAnswer(userId, questionId, selectedOptionId);

      expect(result.isCorrect).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("lesson_quiz_questions");
    });

    it("should return isCorrect=false when answer is incorrect", async () => {
      const userId = "test-user-id";
      const questionId = "test-question-id";
      const selectedOptionId = "option-a";

      // Mock question fetch - correct answer is "option-b"
      mockSupabase.single.mockResolvedValueOnce({
        data: { correct_option_id: "option-b" },
        error: null,
      });

      // Mock attempt upsert
      mockSupabase.upsert.mockResolvedValueOnce({
        data: { id: "attempt-id", is_correct: false },
        error: null,
      });

      const result = await submitQuizAnswer(userId, questionId, selectedOptionId);

      expect(result.isCorrect).toBe(false);
    });

    it("should throw error when question not found", async () => {
      const userId = "test-user-id";
      const questionId = "non-existent-id";
      const selectedOptionId = "option-a";

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      await expect(
        submitQuizAnswer(userId, questionId, selectedOptionId)
      ).rejects.toThrow("Question not found");
    });

    it("should record attempt in lesson_quiz_attempts table", async () => {
      const userId = "test-user-id";
      const questionId = "test-question-id";
      const selectedOptionId = "option-b";

      mockSupabase.single.mockResolvedValueOnce({
        data: { correct_option_id: "option-b" },
        error: null,
      });

      mockSupabase.upsert.mockResolvedValueOnce({
        data: { id: "attempt-id" },
        error: null,
      });

      await submitQuizAnswer(userId, questionId, selectedOptionId);

      expect(mockSupabase.from).toHaveBeenCalledWith("lesson_quiz_attempts");
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        {
          user_id: userId,
          question_id: questionId,
          selected_option_id: selectedOptionId,
          is_correct: true,
          attempted_at: expect.any(String),
        },
        { onConflict: "user_id,question_id" }
      );
    });
  });

  describe("trackLessonTime", () => {
    it("should add time to existing progress", async () => {
      const userId = "test-user-id";
      const lessonId = "test-lesson-id";
      const secondsSpent = 300;

      // Mock existing progress
      mockSupabase.single.mockResolvedValueOnce({
        data: { time_spent_seconds: 600, status: "in_progress" },
        error: null,
      });

      mockSupabase.upsert.mockResolvedValueOnce({
        data: { time_spent_seconds: 900 },
        error: null,
      });

      await trackLessonTime(userId, lessonId, secondsSpent);

      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        {
          user_id: userId,
          lesson_id: lessonId,
          time_spent_seconds: 900,
          status: "in_progress",
        },
        { onConflict: "user_id,lesson_id" }
      );
    });

    it("should set status to in_progress when starting", async () => {
      const userId = "test-user-id";
      const lessonId = "test-lesson-id";
      const secondsSpent = 120;

      // No existing progress
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      mockSupabase.upsert.mockResolvedValueOnce({
        data: { time_spent_seconds: 120, status: "in_progress" },
        error: null,
      });

      await trackLessonTime(userId, lessonId, secondsSpent);

      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "in_progress",
        }),
        { onConflict: "user_id,lesson_id" }
      );
    });
  });

  describe("hasCompletedRequiredModules", () => {
    it("should return true when no required modules exist", async () => {
      const userId = "test-user-id";

      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await hasCompletedRequiredModules(userId);

      expect(result).toBe(true);
    });

    it("should return true when all required lessons are completed", async () => {
      const userId = "test-user-id";

      // Required modules
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: "module-1" }],
        error: null,
      });

      // Required lessons
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: "lesson-1" }, { id: "lesson-2" }],
        error: null,
      });

      // User's completed lessons
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ lesson_id: "lesson-1" }, { lesson_id: "lesson-2" }],
        error: null,
      });

      const result = await hasCompletedRequiredModules(userId);

      expect(result).toBe(true);
    });

    it("should return false when some required lessons are not completed", async () => {
      const userId = "test-user-id";

      // Required modules
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: "module-1" }],
        error: null,
      });

      // Required lessons
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: "lesson-1" }, { id: "lesson-2" }],
        error: null,
      });

      // Only one lesson completed
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ lesson_id: "lesson-1" }],
        error: null,
      });

      const result = await hasCompletedRequiredModules(userId);

      expect(result).toBe(false);
    });
  });

  describe("getModuleProgress", () => {
    it("should calculate correct progress percentage", async () => {
      const userId = "test-user-id";
      const moduleId = "module-1";

      // Module has 4 lessons
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { id: "lesson-1" },
          { id: "lesson-2" },
          { id: "lesson-3" },
          { id: "lesson-4" },
        ],
        error: null,
      });

      // User completed 2 of 4
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ lesson_id: "lesson-1" }, { lesson_id: "lesson-2" }],
        error: null,
      });

      const result = await getModuleProgress(userId, moduleId);

      expect(result).toEqual({
        total: 4,
        completed: 2,
        percentage: 50,
      });
    });

    it("should return 0% when no lessons completed", async () => {
      const userId = "test-user-id";
      const moduleId = "module-1";

      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: "lesson-1" }, { id: "lesson-2" }],
        error: null,
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getModuleProgress(userId, moduleId);

      expect(result.percentage).toBe(0);
    });

    it("should return 100% when all lessons completed", async () => {
      const userId = "test-user-id";
      const moduleId = "module-1";

      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: "lesson-1" }, { id: "lesson-2" }],
        error: null,
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: [{ lesson_id: "lesson-1" }, { lesson_id: "lesson-2" }],
        error: null,
      });

      const result = await getModuleProgress(userId, moduleId);

      expect(result.percentage).toBe(100);
    });
  });
});
