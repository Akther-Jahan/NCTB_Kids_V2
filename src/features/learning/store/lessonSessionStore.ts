import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import {
  normalizeQuestionResult,
  type QuestionResult,
} from "../types/questionResults";

const STORAGE_KEY =
  "nctb_kids_lesson_sessions_v2";
const LEGACY_STORAGE_KEY =
  "nctb_kids_lesson_sessions_v1";

export const DEFAULT_QUIZ_MAX_ATTEMPTS = 3;

export type LessonSession = {
  chapterId: string;
  step: number;
  startedAt: string;
  updatedAt: string;
  completedActivityIds: string[];
  attemptsByActivity: Record<string, number>;
  questionResults: Record<string, QuestionResult>;
  lessonCompletedAt?: string;
};

export type SubmitQuestionAnswerInput = {
  chapterId: string;
  activityId: string;
  selectedOption: number;
  correct: boolean;
  maxAttempts?: number;
};

export type SubmitQuestionAnswerResult = {
  question: QuestionResult;
  canGoNext: boolean;
  becameCorrect: boolean;
  rewardAllowed: boolean;
};

type LessonSessionStore = {
  sessions: Record<string, LessonSession>;
  loadSessions: () => Promise<void>;
  startOrResume: (
    chapterId: string,
  ) => LessonSession;
  setStep: (
    chapterId: string,
    step: number,
  ) => void;
  markActivityComplete: (
    chapterId: string,
    activityId: string,
  ) => void;
  recordAttempt: (
    chapterId: string,
    activityId: string,
  ) => void;
  selectQuestionOption: (
    chapterId: string,
    activityId: string,
    selectedOption: number,
  ) => void;
  submitQuestionAnswer: (
    input: SubmitQuestionAnswerInput,
  ) => SubmitQuestionAnswerResult;
  markQuestionRewardGranted: (
    chapterId: string,
    activityId: string,
  ) => void;
  resetQuestionForRetry: (
    chapterId: string,
    activityId: string,
    force?: boolean,
  ) => void;
  resetRetryQuestions: (
    chapterId: string,
  ) => string[];
  clearSession: (chapterId: string) => void;
  resetAllSessions: () => Promise<void>;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeMaxAttempts(value?: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_QUIZ_MAX_ATTEMPTS;
  }

  return Math.max(
    1,
    Math.min(5, Math.round(value as number)),
  );
}

function createSession(
  chapterId: string,
): LessonSession {
  const now = nowIso();

  return {
    chapterId,
    step: 0,
    startedAt: now,
    updatedAt: now,
    completedActivityIds: [],
    attemptsByActivity: {},
    questionResults: {},
  };
}

function normalizeQuestionResults(
  value: unknown,
): Record<string, QuestionResult> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(
      value as Record<
        string,
        Partial<QuestionResult>
      >,
    ).map(([activityId, result]) => [
      activityId,
      normalizeQuestionResult(result),
    ]),
  );
}

function normalizeSession(
  chapterId: string,
  session: Partial<LessonSession> | undefined,
): LessonSession {
  const fallback = createSession(chapterId);

  if (!session) {
    return fallback;
  }

  return {
    ...fallback,
    ...session,
    chapterId,
    completedActivityIds: Array.isArray(
      session.completedActivityIds,
    )
      ? session.completedActivityIds
      : [],
    attemptsByActivity:
      session.attemptsByActivity &&
      typeof session.attemptsByActivity === "object"
        ? session.attemptsByActivity
        : {},
    questionResults: normalizeQuestionResults(
      session.questionResults,
    ),
  };
}

function normalizeSessions(
  input: Record<string, Partial<LessonSession>>,
) {
  return Object.fromEntries(
    Object.entries(input).map(
      ([chapterId, session]) => [
        chapterId,
        normalizeSession(chapterId, session),
      ],
    ),
  );
}

async function persist(
  sessions: Record<string, LessonSession>,
) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sessions),
  );
}

async function readStoredSessions() {
  const current =
    await AsyncStorage.getItem(STORAGE_KEY);

  if (current) {
    return current;
  }

  return AsyncStorage.getItem(
    LEGACY_STORAGE_KEY,
  );
}

export const useLessonSessionStore =
  create<LessonSessionStore>((set, get) => ({
    sessions: {},

    loadSessions: async () => {
      const raw = await readStoredSessions();

      if (!raw) {
        return;
      }

      try {
        const parsed = JSON.parse(raw) as Record<
          string,
          Partial<LessonSession>
        >;

        const sessions =
          parsed && typeof parsed === "object"
            ? normalizeSessions(parsed)
            : {};

        set({ sessions });
        await persist(sessions);
      } catch {
        await Promise.all([
          AsyncStorage.removeItem(STORAGE_KEY),
          AsyncStorage.removeItem(
            LEGACY_STORAGE_KEY,
          ),
        ]);
        set({ sessions: {} });
      }
    },

    startOrResume: (chapterId) => {
      const existing =
        get().sessions[chapterId];

      if (existing) {
        return existing;
      }

      const session = createSession(chapterId);

      const sessions = {
        ...get().sessions,
        [chapterId]: session,
      };

      set({ sessions });
      void persist(sessions);

      return session;
    },

    setStep: (chapterId, step) => {
      const current = normalizeSession(
        chapterId,
        get().sessions[chapterId],
      );

      const sessions = {
        ...get().sessions,
        [chapterId]: {
          ...current,
          step: Math.max(0, step),
          updatedAt: nowIso(),
        },
      };

      set({ sessions });
      void persist(sessions);
    },

    markActivityComplete: (
      chapterId,
      activityId,
    ) => {
      const current = normalizeSession(
        chapterId,
        get().sessions[chapterId],
      );

      if (
        current.completedActivityIds.includes(
          activityId,
        )
      ) {
        return;
      }

      const sessions = {
        ...get().sessions,
        [chapterId]: {
          ...current,
          completedActivityIds: [
            ...current.completedActivityIds,
            activityId,
          ],
          updatedAt: nowIso(),
        },
      };

      set({ sessions });
      void persist(sessions);
    },

    recordAttempt: (
      chapterId,
      activityId,
    ) => {
      const current = normalizeSession(
        chapterId,
        get().sessions[chapterId],
      );

      const sessions = {
        ...get().sessions,
        [chapterId]: {
          ...current,
          attemptsByActivity: {
            ...current.attemptsByActivity,
            [activityId]:
              (current.attemptsByActivity[
                activityId
              ] ?? 0) + 1,
          },
          updatedAt: nowIso(),
        },
      };

      set({ sessions });
      void persist(sessions);
    },

    selectQuestionOption: (
      chapterId,
      activityId,
      selectedOption,
    ) => {
      const current = normalizeSession(
        chapterId,
        get().sessions[chapterId],
      );
      const previous = normalizeQuestionResult(
        current.questionResults[activityId],
      );

      if (previous.status === "correct") {
        return;
      }

      const timestamp = nowIso();
      const sessions = {
        ...get().sessions,
        [chapterId]: {
          ...current,
          questionResults: {
            ...current.questionResults,
            [activityId]: {
              ...previous,
              selectedOption,
              updatedAt: timestamp,
            },
          },
          updatedAt: timestamp,
        },
      };

      set({ sessions });
      void persist(sessions);
    },

    submitQuestionAnswer: ({
      chapterId,
      activityId,
      selectedOption,
      correct,
      maxAttempts,
    }) => {
      const current = normalizeSession(
        chapterId,
        get().sessions[chapterId],
      );
      const previous = normalizeQuestionResult(
        current.questionResults[activityId],
      );

      if (previous.status === "correct") {
        return {
          question: previous,
          canGoNext: true,
          becameCorrect: false,
          rewardAllowed: false,
        };
      }

      const limit =
        normalizeMaxAttempts(maxAttempts);
      const attempts = previous.attempts + 1;
      const attemptsInRound =
        previous.attemptsInRound + 1;
      const timestamp = nowIso();
      const status = correct
        ? "correct"
        : attemptsInRound >= limit
          ? "needs_retry"
          : "unanswered";

      const question: QuestionResult = {
        ...previous,
        status,
        attempts,
        attemptsInRound,
        selectedOption,
        selectedOptionHistory: [
          ...previous.selectedOptionHistory,
          selectedOption,
        ],
        updatedAt: timestamp,
      };

      const sessions = {
        ...get().sessions,
        [chapterId]: {
          ...current,
          attemptsByActivity: {
            ...current.attemptsByActivity,
            [activityId]: attempts,
          },
          questionResults: {
            ...current.questionResults,
            [activityId]: question,
          },
          updatedAt: timestamp,
        },
      };

      set({ sessions });
      void persist(sessions);

      const becameCorrect = correct;

      return {
        question,
        canGoNext:
          status === "correct" ||
          attemptsInRound >= limit,
        becameCorrect,
        rewardAllowed:
          becameCorrect &&
          !previous.rewardGranted,
      };
    },

    markQuestionRewardGranted: (
      chapterId,
      activityId,
    ) => {
      const current = get().sessions[chapterId];
      const previous =
        current?.questionResults[activityId];

      if (
        !current ||
        !previous ||
        previous.rewardGranted
      ) {
        return;
      }

      const timestamp = nowIso();
      const sessions = {
        ...get().sessions,
        [chapterId]: {
          ...current,
          questionResults: {
            ...current.questionResults,
            [activityId]: {
              ...previous,
              rewardGranted: true,
              updatedAt: timestamp,
            },
          },
          updatedAt: timestamp,
        },
      };

      set({ sessions });
      void persist(sessions);
    },

    resetQuestionForRetry: (
      chapterId,
      activityId,
      force = false,
    ) => {
      const current = get().sessions[chapterId];
      const previous =
        current?.questionResults[activityId];

      if (!current) {
        return;
      }

      const normalized =
        normalizeQuestionResult(previous);

      if (
        normalized.status === "correct" &&
        !force
      ) {
        return;
      }

      const question: QuestionResult = {
        ...normalized,
        status: "unanswered",
        attemptsInRound: 0,
        updatedAt: nowIso(),
      };

      delete question.selectedOption;

      const sessions = {
        ...get().sessions,
        [chapterId]: {
          ...current,
          completedActivityIds:
            current.completedActivityIds.filter(
              (id) => id !== activityId,
            ),
          questionResults: {
            ...current.questionResults,
            [activityId]: question,
          },
          updatedAt: nowIso(),
        },
      };

      set({ sessions });
      void persist(sessions);
    },

    resetRetryQuestions: (chapterId) => {
      const current = get().sessions[chapterId];

      if (!current) {
        return [];
      }

      const retryIds = Object.entries(
        current.questionResults,
      )
        .filter(
          ([, result]) =>
            normalizeQuestionResult(result)
              .status !== "correct",
        )
        .map(([activityId]) => activityId);

      const questionResults = {
        ...current.questionResults,
      };

      for (const activityId of retryIds) {
        const previous =
          normalizeQuestionResult(
            questionResults[activityId],
          );
        const next: QuestionResult = {
          ...previous,
          status: "unanswered",
          attemptsInRound: 0,
          updatedAt: nowIso(),
        };

        delete next.selectedOption;
        questionResults[activityId] = next;
      }

      const sessions = {
        ...get().sessions,
        [chapterId]: {
          ...current,
          completedActivityIds:
            current.completedActivityIds.filter(
              (id) => !retryIds.includes(id),
            ),
          questionResults,
          updatedAt: nowIso(),
        },
      };

      set({ sessions });
      void persist(sessions);

      return retryIds;
    },

    clearSession: (chapterId) => {
      const current = get().sessions[chapterId];

      if (!current) {
        return;
      }

      const timestamp = nowIso();
      const sessions = {
        ...get().sessions,
        [chapterId]: {
          ...createSession(chapterId),
          questionResults:
            current.questionResults ?? {},
          lessonCompletedAt: timestamp,
          updatedAt: timestamp,
        },
      };

      set({ sessions });
      void persist(sessions);
    },

    resetAllSessions: async () => {
      set({ sessions: {} });
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEY),
        AsyncStorage.removeItem(
          LEGACY_STORAGE_KEY,
        ),
      ]);
    },
  }));
