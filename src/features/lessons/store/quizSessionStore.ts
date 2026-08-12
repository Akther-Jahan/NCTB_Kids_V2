import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type QuestionStatus = 'unanswered' | 'correct' | 'incorrect';

export type QuestionResult = {
  status: QuestionStatus;
  attempts: number;
  selectedOption?: number;
};

type QuizSession = {
  chapterId: string;
  questionResults: Record<string, QuestionResult>;
};

type QuizSessionStore = {
  sessions: Record<string, QuizSession>;
  load: () => Promise<void>;
  ensureSession: (chapterId: string, questionIds: string[]) => void;
  recordAttempt: (
    chapterId: string,
    questionId: string,
    selectedOption: number,
    status: QuestionStatus,
  ) => void;
  getSession: (chapterId: string) => QuizSession | undefined;
  clearSession: (chapterId: string) => void;
};

const STORAGE_KEY = 'nctb_kids_quiz_sessions_v1';

const persist = async (sessions: Record<string, QuizSession>) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const useQuizSessionStore = create<QuizSessionStore>((set, get) => ({
  sessions: {},

  load: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      set({ sessions: JSON.parse(raw) as Record<string, QuizSession> });
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ sessions: {} });
    }
  },

  ensureSession: (chapterId, questionIds) => {
    const existing = get().sessions[chapterId];

    if (existing) {
      const nextResults = { ...existing.questionResults };
      let changed = false;

      for (const questionId of questionIds) {
        if (!nextResults[questionId]) {
          nextResults[questionId] = { status: 'unanswered', attempts: 0 };
          changed = true;
        }
      }

      if (!changed) {
        return;
      }

      const nextSessions = {
        ...get().sessions,
        [chapterId]: {
          ...existing,
          questionResults: nextResults,
        },
      };

      set({ sessions: nextSessions });
      void persist(nextSessions);
      return;
    }

    const questionResults = Object.fromEntries(
      questionIds.map((questionId) => [
        questionId,
        { status: 'unanswered' as const, attempts: 0 },
      ]),
    );

    const nextSessions = {
      ...get().sessions,
      [chapterId]: { chapterId, questionResults },
    };

    set({ sessions: nextSessions });
    void persist(nextSessions);
  },

  recordAttempt: (chapterId, questionId, selectedOption, status) => {
    const current = get().sessions[chapterId];

    if (!current) {
      return;
    }

    const previous = current.questionResults[questionId] ?? {
      status: 'unanswered' as const,
      attempts: 0,
    };

    const questionResults = {
      ...current.questionResults,
      [questionId]: {
        status,
        attempts: previous.attempts + 1,
        selectedOption,
      },
    };

    const nextSessions = {
      ...get().sessions,
      [chapterId]: {
        ...current,
        questionResults,
      },
    };

    set({ sessions: nextSessions });
    void persist(nextSessions);
  },

  getSession: (chapterId) => get().sessions[chapterId],

  clearSession: (chapterId) => {
    const nextSessions = { ...get().sessions };
    delete nextSessions[chapterId];
    set({ sessions: nextSessions });
    void persist(nextSessions);
  },
}));
