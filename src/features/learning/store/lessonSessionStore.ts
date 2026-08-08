import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "nctb_kids_lesson_sessions_v1";

export type QuestionStatus =
  | "unanswered"
  | "correct"
  | "incorrect";

export type QuestionResult = {
  status: QuestionStatus;

  /**
   * Total attempts across all runs.
   * Used for lesson/result summaries.
   */
  attempts: number;

  /**
   * Attempts in the current retry run.
   * This prevents an old failed run from instantly unlocking Next
   * when the student retries the question later.
   */
  runAttempts: number;

  selectedOption?: number;
  completedAt?: string;
};

export type LessonSession = {
  chapterId: string;
  step: number;
  startedAt: string;
  updatedAt: string;

  /**
   * Kept for compatibility with the current LessonPlayerScreen.
   */
  completedActivityIds: string[];

  /**
   * Kept for compatibility with the current score/progress code.
   * For quiz questions this mirrors QuestionResult.attempts.
   */
  attemptsByActivity: Record<string, number>;

  /**
   * New question-level state for quiz retry/result/progress.
   */
  questionResults: Record<string, QuestionResult>;

  /**
   * We retain finished lesson data instead of deleting it immediately,
   * so Progress and Retry can still read quiz results.
   */
  finishedAt?: string;
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

  /**
   * Legacy method kept so the current repo remains compatible
   * until LessonPlayerScreen is updated in the next step.
   */
  recordAttempt: (
    chapterId: string,
    activityId: string,
  ) => void;

  /**
   * New single source of truth for quiz attempts.
   * Do NOT call recordAttempt together with this method.
   */
  recordQuestionAttempt: (
    chapterId: string,
    questionId: string,
    selectedOption: number,
    correct: boolean,
  ) => void;

  /**
   * Called only when the student chooses Next after reaching
   * the configured maximum attempts without a correct answer.
   */
  markQuestionNeedsRetry: (
    chapterId: string,
    questionId: string,
  ) => void;

  /**
   * Prepares one incorrect question for another practice run
   * while preserving lifetime attempt history.
   */
  resetQuestionForRetry: (
    chapterId: string,
    questionId: string,
  ) => void;

  /**
   * Marks lesson flow finished while retaining session results.
   */
  markSessionFinished: (
    chapterId: string,
  ) => void;

  /**
   * Still kept for compatibility/manual reset.
   * LessonPlayerScreen should stop calling this automatically
   * after the result/retry integration is added.
   */
  clearSession: (
    chapterId: string,
  ) => void;

  resetAllSessions: () => Promise<void>;
};

function nowIso() {
  return new Date().toISOString();
}

function createQuestionResult(): QuestionResult {
  return {
    status: "unanswered",
    attempts: 0,
    runAttempts: 0,
  };
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

/**
 * Safely upgrades old AsyncStorage sessions created before
 * questionResults/runAttempts existed.
 */
function normalizeSession(
  chapterId: string,
  value: unknown,
): LessonSession {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return createSession(chapterId);
  }

  const raw = value as Partial<LessonSession>;

  const questionResults =
    raw.questionResults &&
    typeof raw.questionResults === "object"
      ? Object.fromEntries(
          Object.entries(
            raw.questionResults,
          ).map(([questionId, result]) => {
            const safe =
              result &&
              typeof result === "object"
                ? (result as Partial<QuestionResult>)
                : {};

            return [
              questionId,
              {
                status:
                  safe.status === "correct" ||
                  safe.status === "incorrect"
                    ? safe.status
                    : "unanswered",
                attempts:
                  typeof safe.attempts === "number"
                    ? Math.max(0, safe.attempts)
                    : 0,
                runAttempts:
                  typeof safe.runAttempts === "number"
                    ? Math.max(
                        0,
                        safe.runAttempts,
                      )
                    : 0,
                ...(typeof safe.selectedOption ===
                "number"
                  ? {
                      selectedOption:
                        safe.selectedOption,
                    }
                  : {}),
                ...(typeof safe.completedAt ===
                "string"
                  ? {
                      completedAt:
                        safe.completedAt,
                    }
                  : {}),
              } satisfies QuestionResult,
            ];
          }),
        )
      : {};

  return {
    chapterId:
      typeof raw.chapterId === "string"
        ? raw.chapterId
        : chapterId,
    step:
      typeof raw.step === "number"
        ? Math.max(0, raw.step)
        : 0,
    startedAt:
      typeof raw.startedAt === "string"
        ? raw.startedAt
        : nowIso(),
    updatedAt:
      typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : nowIso(),
    completedActivityIds:
      Array.isArray(
        raw.completedActivityIds,
      )
        ? raw.completedActivityIds.filter(
            (
              id,
            ): id is string =>
              typeof id === "string",
          )
        : [],
    attemptsByActivity:
      raw.attemptsByActivity &&
      typeof raw.attemptsByActivity ===
        "object"
        ? raw.attemptsByActivity
        : {},
    questionResults,
    ...(typeof raw.finishedAt === "string"
      ? { finishedAt: raw.finishedAt }
      : {}),
  };
}

async function persist(
  sessions: Record<string, LessonSession>,
) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sessions),
  );
}

export const useLessonSessionStore =
  create<LessonSessionStore>(
    (set, get) => ({
      sessions: {},

      loadSessions: async () => {
        const raw =
          await AsyncStorage.getItem(
            STORAGE_KEY,
          );

        if (!raw) {
          return;
        }

        try {
          const parsed = JSON.parse(
            raw,
          ) as unknown;

          if (
            !parsed ||
            typeof parsed !== "object"
          ) {
            throw new Error(
              "Invalid lesson session storage",
            );
          }

          const normalized =
            Object.fromEntries(
              Object.entries(
                parsed as Record<
                  string,
                  unknown
                >,
              ).map(
                ([
                  chapterId,
                  session,
                ]) => [
                  chapterId,
                  normalizeSession(
                    chapterId,
                    session,
                  ),
                ],
              ),
            );

          set({
            sessions: normalized,
          });

          // Persist the normalized shape so old
          // sessions are migrated only once.
          void persist(normalized);
        } catch {
          await AsyncStorage.removeItem(
            STORAGE_KEY,
          );

          set({
            sessions: {},
          });
        }
      },

      startOrResume: (
        chapterId,
      ) => {
        const existing =
          get().sessions[
            chapterId
          ];

        if (existing) {
          return existing;
        }

        const session =
          createSession(
            chapterId,
          );

        const sessions = {
          ...get().sessions,
          [chapterId]:
            session,
        };

        set({ sessions });
        void persist(
          sessions,
        );

        return session;
      },

      setStep: (
        chapterId,
        step,
      ) => {
        const current =
          get().sessions[
            chapterId
          ] ??
          createSession(
            chapterId,
          );

        const sessions = {
          ...get().sessions,
          [chapterId]: {
            ...current,
            step: Math.max(
              0,
              step,
            ),
            updatedAt:
              nowIso(),
          },
        };

        set({ sessions });
        void persist(
          sessions,
        );
      },

      markActivityComplete: (
        chapterId,
        activityId,
      ) => {
        const current =
          get().sessions[
            chapterId
          ] ??
          createSession(
            chapterId,
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
            completedActivityIds:
              [
                ...current.completedActivityIds,
                activityId,
              ],
            updatedAt:
              nowIso(),
          },
        };

        set({ sessions });
        void persist(
          sessions,
        );
      },

      recordAttempt: (
        chapterId,
        activityId,
      ) => {
        const current =
          get().sessions[
            chapterId
          ] ??
          createSession(
            chapterId,
          );

        const sessions = {
          ...get().sessions,
          [chapterId]: {
            ...current,
            attemptsByActivity:
              {
                ...current.attemptsByActivity,
                [activityId]:
                  (current
                    .attemptsByActivity[
                    activityId
                  ] ??
                    0) +
                  1,
              },
            updatedAt:
              nowIso(),
          },
        };

        set({ sessions });
        void persist(
          sessions,
        );
      },

      recordQuestionAttempt: (
        chapterId,
        questionId,
        selectedOption,
        correct,
      ) => {
        const current =
          get().sessions[
            chapterId
          ] ??
          createSession(
            chapterId,
          );

        const previous =
          current
            .questionResults[
            questionId
          ] ??
          createQuestionResult();

        // A correct question is final for the current lesson.
        // Ignore accidental duplicate callbacks.
        if (
          previous.status ===
          "correct"
        ) {
          return;
        }

        const nextAttempts =
          previous.attempts +
          1;

        const nextRunAttempts =
          previous.runAttempts +
          1;

        const {
          completedAt: _previousCompletedAt,
          ...previousWithoutCompletedAt
        } = previous;

        const nextResult: QuestionResult = {
          ...previousWithoutCompletedAt,
          status: correct
            ? "correct"
            : "unanswered",
          attempts: nextAttempts,
          runAttempts: nextRunAttempts,
          selectedOption,
          ...(correct
            ? {
                completedAt: nowIso(),
              }
            : {}),
        };

        const nextCompleted =
          correct &&
          !current.completedActivityIds.includes(
            questionId,
          )
            ? [
                ...current.completedActivityIds,
                questionId,
              ]
            : current.completedActivityIds;

        const sessions = {
          ...get().sessions,
          [chapterId]: {
            ...current,
            completedActivityIds:
              nextCompleted,
            attemptsByActivity:
              {
                ...current.attemptsByActivity,
                [questionId]:
                  nextAttempts,
              },
            questionResults:
              {
                ...current.questionResults,
                [questionId]:
                  nextResult,
              },
            updatedAt:
              nowIso(),
          },
        };

        set({ sessions });
        void persist(
          sessions,
        );
      },

      markQuestionNeedsRetry: (
        chapterId,
        questionId,
      ) => {
        const current =
          get().sessions[
            chapterId
          ] ??
          createSession(
            chapterId,
          );

        const previous =
          current
            .questionResults[
            questionId
          ] ??
          createQuestionResult();

        if (
          previous.status ===
          "correct"
        ) {
          return;
        }

        const incorrectResult: QuestionResult = {
          ...previous,
          status: "incorrect",
          completedAt: nowIso(),
        };

        const questionResults: Record<string, QuestionResult> = {
          ...current.questionResults,
          [questionId]: incorrectResult,
        };

        const nextSession: LessonSession = {
          ...current,
          questionResults,
          updatedAt: nowIso(),
        };

        const sessions: Record<string, LessonSession> = {
          ...get().sessions,
          [chapterId]: nextSession,
        };

        set({ sessions });
        void persist(
          sessions,
        );
      },

      resetQuestionForRetry: (
        chapterId,
        questionId,
      ) => {
        const current =
          get().sessions[
            chapterId
          ];

        if (!current) {
          return;
        }

        const previous =
          current
            .questionResults[
            questionId
          ];

        if (
          !previous ||
          previous.status ===
            "correct"
        ) {
          return;
        }

        const {
          selectedOption: _selectedOption,
          completedAt: _completedAt,
          ...previousForRetry
        } = previous;

        const {
          finishedAt: _finishedAt,
          ...currentWithoutFinishedAt
        } = current;

        const retryResult: QuestionResult = {
          ...previousForRetry,
          status: "unanswered",
          runAttempts: 0,
        };

        const questionResults: Record<string, QuestionResult> = {
          ...current.questionResults,
          [questionId]: retryResult,
        };

        const nextSession: LessonSession = {
          ...currentWithoutFinishedAt,
          questionResults,
          updatedAt: nowIso(),
        };

        const sessions: Record<string, LessonSession> = {
          ...get().sessions,
          [chapterId]: nextSession,
        };

        set({ sessions });
        void persist(
          sessions,
        );
      },

      markSessionFinished: (
        chapterId,
      ) => {
        const current =
          get().sessions[
            chapterId
          ] ??
          createSession(
            chapterId,
          );

        const now =
          nowIso();

        const sessions = {
          ...get().sessions,
          [chapterId]: {
            ...current,
            finishedAt:
              now,
            updatedAt:
              now,
          },
        };

        set({ sessions });
        void persist(
          sessions,
        );
      },

      clearSession: (
        chapterId,
      ) => {
        const sessions = {
          ...get().sessions,
        };

        delete sessions[
          chapterId
        ];

        set({ sessions });
        void persist(
          sessions,
        );
      },

      resetAllSessions:
        async () => {
          set({
            sessions: {},
          });

          await AsyncStorage.removeItem(
            STORAGE_KEY,
          );
        },
    }),
  );