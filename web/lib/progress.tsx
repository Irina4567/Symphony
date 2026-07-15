"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { manifest } from "@/content/manifest";
import { useHydrated } from "./use-hydrated";

const STORAGE_KEY = "symphony-course-progress-v1";

interface ProgressState {
  completedLessons: Record<string, true>;
  completedExercises: Record<string, true>;
  quizResults: Record<string, { correct: number; total: number }>;
  checklists: Record<string, Record<string, true>>;
}

const emptyState: ProgressState = {
  completedLessons: {},
  completedExercises: {},
  quizResults: {},
  checklists: {},
};

export interface ProgressExportFile {
  format: "symfony-course-progress";
  version: 1;
  exportedAt: string;
  progress: ProgressState;
}

function isProgressExportFile(data: unknown): data is ProgressExportFile {
  return (
    typeof data === "object" &&
    data !== null &&
    "progress" in data &&
    typeof (data as { progress: unknown }).progress === "object" &&
    (data as { progress: unknown }).progress !== null
  );
}

function lessonKey(block: string, lesson: string) {
  return `${block}/${lesson}`;
}

interface ProgressContextValue {
  hydrated: boolean;
  markLessonComplete: (block: string, lesson: string) => void;
  isLessonComplete: (block: string, lesson: string) => boolean;
  markExerciseComplete: (exerciseId: string) => void;
  isExerciseComplete: (exerciseId: string) => boolean;
  setQuizResult: (quizId: string, correct: number, total: number) => void;
  getQuizResult: (quizId: string) => { correct: number; total: number } | undefined;
  toggleChecklistItem: (projectKey: string, itemId: string) => void;
  isChecklistItemDone: (projectKey: string, itemId: string) => boolean;
  blockProgress: (blockSlug: string) => { done: number; total: number };
  overallProgress: () => { done: number; total: number };
  getExportPayload: () => ProgressExportFile;
  /** Возвращает true при успешном импорте, false — если файл не похож на экспорт прогресса. */
  importProgress: (data: unknown) => boolean;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(emptyState);
  const hydrated = useHydrated();

  useEffect(() => {
    // Единоразовая синхронизация с внешней системой (localStorage) при монтировании.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState({ ...emptyState, ...JSON.parse(raw) });
    } catch {
      // повреждённые данные в localStorage — просто стартуем с чистого состояния
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const markLessonComplete = useCallback((block: string, lesson: string) => {
    setState((prev) => ({
      ...prev,
      completedLessons: { ...prev.completedLessons, [lessonKey(block, lesson)]: true },
    }));
  }, []);

  const isLessonComplete = useCallback(
    (block: string, lesson: string) => Boolean(state.completedLessons[lessonKey(block, lesson)]),
    [state.completedLessons]
  );

  const markExerciseComplete = useCallback((exerciseId: string) => {
    setState((prev) => ({
      ...prev,
      completedExercises: { ...prev.completedExercises, [exerciseId]: true },
    }));
  }, []);

  const isExerciseComplete = useCallback(
    (exerciseId: string) => Boolean(state.completedExercises[exerciseId]),
    [state.completedExercises]
  );

  const setQuizResult = useCallback((quizId: string, correct: number, total: number) => {
    setState((prev) => ({
      ...prev,
      quizResults: { ...prev.quizResults, [quizId]: { correct, total } },
    }));
  }, []);

  const getQuizResult = useCallback((quizId: string) => state.quizResults[quizId], [state.quizResults]);

  const toggleChecklistItem = useCallback((projectKey: string, itemId: string) => {
    setState((prev) => {
      const current = prev.checklists[projectKey] ?? {};
      const next = { ...current };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = true;
      }
      return { ...prev, checklists: { ...prev.checklists, [projectKey]: next } };
    });
  }, []);

  const isChecklistItemDone = useCallback(
    (projectKey: string, itemId: string) => Boolean(state.checklists[projectKey]?.[itemId]),
    [state.checklists]
  );

  const blockProgress = useCallback(
    (blockSlug: string) => {
      const block = manifest.find((b) => b.slug === blockSlug);
      if (!block) return { done: 0, total: 0 };
      const done = block.lessons.filter((lesson) =>
        Boolean(state.completedLessons[lessonKey(blockSlug, lesson.slug)])
      ).length;
      return { done, total: block.lessons.length };
    },
    [state.completedLessons]
  );

  const overallProgress = useCallback(() => {
    const total = manifest.reduce((sum, block) => sum + block.lessons.length, 0);
    const done = Object.keys(state.completedLessons).length;
    return { done, total };
  }, [state.completedLessons]);

  const getExportPayload = useCallback(
    (): ProgressExportFile => ({
      format: "symfony-course-progress",
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: state,
    }),
    [state]
  );

  const importProgress = useCallback((data: unknown): boolean => {
    const progress = isProgressExportFile(data)
      ? data.progress
      : typeof data === "object" && data !== null
        ? (data as Partial<ProgressState>)
        : null;
    if (!progress) return false;
    setState({ ...emptyState, ...progress });
    return true;
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      hydrated,
      markLessonComplete,
      isLessonComplete,
      markExerciseComplete,
      isExerciseComplete,
      setQuizResult,
      getQuizResult,
      toggleChecklistItem,
      isChecklistItemDone,
      blockProgress,
      overallProgress,
      getExportPayload,
      importProgress,
    }),
    [
      hydrated,
      markLessonComplete,
      isLessonComplete,
      markExerciseComplete,
      isExerciseComplete,
      setQuizResult,
      getQuizResult,
      toggleChecklistItem,
      isChecklistItemDone,
      blockProgress,
      overallProgress,
      getExportPayload,
      importProgress,
    ]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
