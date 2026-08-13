export type QuestionStatus =
  | "unanswered"
  | "correct"
  | "needs_retry";

export type QuestionResult = {
  status: QuestionStatus;
  attempts: number;
  attemptsInRound: number;
  selectedOption?: number;
  selectedOptionHistory: number[];
  rewardGranted: boolean;
  updatedAt: string;
};

export type QuizSummary = {
  total: number;
  correct: number;
  needsRetry: number;
  unanswered: number;
  totalAttempts: number;
};

export function createQuestionResult(): QuestionResult {
  return {
    status: "unanswered",
    attempts: 0,
    attemptsInRound: 0,
    selectedOptionHistory: [],
    rewardGranted: false,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeQuestionResult(
  value?: Partial<QuestionResult>,
): QuestionResult {
  const fallback = createQuestionResult();

  if (!value) {
    return fallback;
  }

  return {
    ...fallback,
    ...value,
    selectedOptionHistory: Array.isArray(
      value.selectedOptionHistory,
    )
      ? value.selectedOptionHistory.filter(
          (item): item is number =>
            Number.isInteger(item) && item >= 0,
        )
      : [],
  };
}

export function summarizeQuestionResults(
  questionIds: string[],
  results: Record<string, QuestionResult>,
): QuizSummary {
  const total = questionIds.length;
  let correct = 0;
  let needsRetry = 0;
  let unanswered = 0;
  let totalAttempts = 0;

  for (const questionId of questionIds) {
    const result = results[questionId];

    if (!result) {
      unanswered += 1;
      continue;
    }

    totalAttempts += result.attempts;

    if (result.status === "correct") {
      correct += 1;
    } else if (result.status === "needs_retry") {
      needsRetry += 1;
    } else {
      unanswered += 1;
    }
  }

  return {
    total,
    correct,
    needsRetry,
    unanswered,
    totalAttempts,
  };
}
