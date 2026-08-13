import * as Speech from "expo-speech";

export type LearningVoiceOptions = {
  rate?: number;
  pitch?: number;
};

const DEFAULT_RATE = 0.76;
const DEFAULT_PITCH = 1.04;

let queue: Promise<void> = Promise.resolve();
let generation = 0;

function speakOne(
  text: string,
  expectedGeneration: number,
  options?: LearningVoiceOptions,
) {
  const clean = text.trim();

  if (!clean || expectedGeneration !== generation) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    Speech.speak(clean, {
      language: "bn-BD",
      rate: options?.rate ?? DEFAULT_RATE,
      pitch: options?.pitch ?? DEFAULT_PITCH,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
}

export async function stopLearningVoice() {
  generation += 1;
  queue = Promise.resolve();

  try {
    await Speech.stop();
  } catch {
    // Voice errors should never block a learning activity.
  }
}

export function queueLearningVoice(
  text: string,
  options?: LearningVoiceOptions,
) {
  const expectedGeneration = generation;

  queue = queue
    .catch(() => undefined)
    .then(() =>
      speakOne(text, expectedGeneration, options),
    );

  return queue;
}

export async function speakLearningVoice(
  text: string,
  options?: LearningVoiceOptions,
) {
  await stopLearningVoice();
  return queueLearningVoice(text, options);
}

export async function speakOptionThenFeedback(
  optionText: string,
  feedbackText: string,
) {
  await stopLearningVoice();
  await queueLearningVoice(optionText);
  await queueLearningVoice(feedbackText);
}

export async function speakQuizSummary({
  total,
  correct,
  remaining,
}: {
  total: number;
  correct: number;
  remaining: number;
}) {
  const text =
    remaining > 0
      ? `তোমার ${total}টির মধ্যে ${correct}টি সঠিক হয়েছে। বাকি ${remaining}টি আবার চেষ্টা করি।`
      : `দারুণ! তোমার ${total}টির মধ্যে সবগুলো সঠিক হয়েছে।`;

  return speakLearningVoice(text, {
    rate: 0.78,
  });
}
