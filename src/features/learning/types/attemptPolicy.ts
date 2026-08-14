export const DEFAULT_ACTIVITY_MAX_ATTEMPTS = 3;

export type AttemptStatus = "unanswered" | "correct" | "needs_retry";

export type ActivityAttemptResult = {
  attemptsInRound: number;
  canGoNext: boolean;
  status: AttemptStatus;
};

export function clampMaxAttempts(value?: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_ACTIVITY_MAX_ATTEMPTS;
  }

  return Math.max(1, Math.min(5, Math.round(value as number)));
}
