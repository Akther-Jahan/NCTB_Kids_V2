import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { QuestionResult } from "../types/questionResults";
import {
  speakLearningVoice,
  speakOptionThenFeedback,
  stopLearningVoice,
} from "../services/learningVoice";
import MimiCharacter from "./MimiCharacter";
import RewardToast from "./RewardToast";

type SubmitResult = {
  question: QuestionResult;
  canGoNext: boolean;
  becameCorrect: boolean;
  rewardAllowed: boolean;
};

type Props = {
  prompt: string;
  options: string[];
  answer: number;
  hint: string;
  locale?: string;
  attempts?: number;
  maxAttempts?: number;
  result?: QuestionResult;
  onSelectOption?: (index: number) => void;
  onSubmitAnswer?: (
    index: number,
    correct: boolean,
  ) => SubmitResult;
  onAttempt?: (correct: boolean) => void;
  onContinueUnlocked?: () => void;
  onRewardGranted?: () => void;
};

function clampMaxAttempts(value?: number) {
  if (!Number.isFinite(value)) {
    return 3;
  }

  return Math.max(
    1,
    Math.min(5, Math.round(value as number)),
  );
}

export default function QuizBattleActivity({
  prompt,
  options,
  answer,
  attempts = 0,
  hint,
  locale,
  maxAttempts = 3,
  result,
  onSelectOption,
  onSubmitAnswer,
  onAttempt,
  onContinueUnlocked,
  onRewardGranted,
}: Props) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= 600;
  const limit = clampMaxAttempts(maxAttempts);

  const entrance = useRef(
    new Animated.Value(0),
  ).current;
  const shake = useRef(
    new Animated.Value(0),
  ).current;
  const successScale = useRef(
    new Animated.Value(1),
  ).current;

  const [selected, setSelected] =
    useState<number | null>(
      result?.selectedOption ?? null,
    );
  const [localAttempts, setLocalAttempts] =
    useState(result?.attemptsInRound ?? attempts);
  const [localStatus, setLocalStatus] = useState<
    QuestionResult["status"]
  >(result?.status ?? "unanswered");
  const [wrongOptions, setWrongOptions] =
    useState<number[]>([]);
  const [rewardVisible, setRewardVisible] =
    useState(false);

  const correct = localStatus === "correct";
  const canGoNext =
    correct || localAttempts >= limit;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 6,
      tension: 55,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      void speakLearningVoice(prompt, { language: locale });
    }, 350);

    return () => {
      clearTimeout(timer);
      void stopLearningVoice();
    };
  }, [entrance, prompt]);

  useEffect(() => {
    if (!result) {
      return;
    }

    setSelected(result.selectedOption ?? null);
    setLocalAttempts(result.attemptsInRound);
    setLocalStatus(result.status);
  }, [result]);

  const opacity = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const shakeX = shake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-10, 0, 10],
  });

  const characterSize = isTablet
    ? 205
    : isSmallPhone
      ? 125
      : 155;

  const helperText = useMemo(() => {
    if (correct) {
      return "সঠিক উত্তর! এখন পরের ধাপে যেতে পারো।";
    }

    if (canGoNext) {
      return "চাইলে আবার চেষ্টা করো, অথবা পরের প্রশ্নে যাও।";
    }

    if (localAttempts > 0) {
      return hint || "প্রশ্নটি মন দিয়ে পড়ে আবার চেষ্টা করো।";
    }

    return "একটি উত্তর বেছে নিয়ে জমা দাও।";
  }, [
    canGoNext,
    correct,
    hint,
    localAttempts,
  ]);

  const runWrongAnimation = () => {
    shake.setValue(0);

    Animated.sequence([
      Animated.timing(shake, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -1,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 0,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const runSuccessAnimation = () => {
    Animated.sequence([
      Animated.timing(successScale, {
        toValue: 1.08,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const choose = (index: number) => {
    if (correct) {
      return;
    }

    setSelected(index);
    onSelectOption?.(index);
    void speakLearningVoice(options[index], { language: locale });
  };

  const submit = () => {
    if (selected === null || correct) {
      return;
    }

    const isCorrect = selected === answer;
    let nextAttempts = localAttempts + 1;
    let nextStatus: QuestionResult["status"] =
      isCorrect
        ? "correct"
        : nextAttempts >= limit
          ? "needs_retry"
          : "unanswered";
    let rewardAllowed = isCorrect;
    let continueUnlocked =
      isCorrect || nextAttempts >= limit;

    if (onSubmitAnswer) {
      const submitResult = onSubmitAnswer(
        selected,
        isCorrect,
      );

      nextAttempts =
        submitResult.question.attemptsInRound;
      nextStatus = submitResult.question.status;
      rewardAllowed = submitResult.rewardAllowed;
      continueUnlocked = submitResult.canGoNext;
    } else {
      onAttempt?.(isCorrect);
    }

    setLocalAttempts(nextAttempts);
    setLocalStatus(nextStatus);

    if (isCorrect) {
      runSuccessAnimation();

      if (rewardAllowed) {
        setRewardVisible(true);
        onRewardGranted?.();
      }

      if (continueUnlocked) {
        onContinueUnlocked?.();
      }

      void speakOptionThenFeedback(
        options[selected],
        "সঠিক উত্তর! দারুণ করেছো।",
      );
      return;
    }

    setWrongOptions((current) =>
      current.includes(selected)
        ? current
        : [...current, selected],
    );
    runWrongAnimation();

    if (continueUnlocked) {
      onContinueUnlocked?.();
    }

    const feedback = continueUnlocked
      ? "এই প্রশ্নটি পরে আবার চেষ্টা করব। চাইলে এখন আবার চেষ্টা করো, অথবা পরের প্রশ্নে যাও।"
      : `${hint || "ইঙ্গিত দেখে আবার চেষ্টা করো।"}`;

    void speakOptionThenFeedback(
      options[selected],
      feedback,
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <RewardToast
        visible={rewardVisible}
        title="দারুণ!"
        message="সঠিক উত্তর"
        stars={1}
        onHidden={() =>
          setRewardVisible(false)
        }
      />

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>
            ⚔️
          </Text>
        </View>

        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>
            মজার কুইজ
          </Text>
          <Text
            style={[
              styles.title,
              isTablet && styles.titleTablet,
            ]}
          >
            সঠিক উত্তর খুঁজে নাও
          </Text>
        </View>

        <View style={styles.attemptBadge}>
          <Text style={styles.attemptLabel}>
            TRY
          </Text>
          <Text style={styles.attemptValue}>
            {Math.min(localAttempts + 1, limit)}/{limit}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: correct
                ? "100%"
                : `${Math.max(
                    20,
                    Math.round(
                      (localAttempts / limit) * 100,
                    ),
                  )}%`,
            },
          ]}
        />
      </View>

      <View style={styles.stage}>
        <MimiCharacter
          emotion={
            correct
              ? "celebrate"
              : selected !== null
                ? "talking"
                : "happy"
          }
          size={characterSize}
        />

        <Animated.View
          style={[
            styles.questionCard,
            correct &&
              styles.questionCardCorrect,
            {
              transform: [
                { translateX: shakeX },
                { scale: successScale },
              ],
            },
          ]}
        >
          <View style={styles.questionTop}>
            <View style={styles.questionCopy}>
              <Text style={styles.questionLabel}>
                প্রশ্ন
              </Text>
              <Text style={styles.questionHelper}>
                উত্তর বেছে নিয়ে জমা দাও
              </Text>
            </View>

            <Pressable
              onPress={() =>
                void speakLearningVoice(prompt, { language: locale })
              }
              style={({ pressed }) => [
                styles.listenButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.listenIcon}>
                🔊
              </Text>
              {!isSmallPhone ? (
                <Text style={styles.listenText}>
                  শুনি
                </Text>
              ) : null}
            </Pressable>
          </View>

          <Text
            style={[
              styles.question,
              isTablet && styles.questionTablet,
            ]}
          >
            {prompt}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.optionList}>
        {options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrectOption =
            correct && index === answer;
          const wasWrong =
            wrongOptions.includes(index);

          return (
            <Pressable
              key={`${option}-${index}`}
              disabled={correct}
              onPress={() => choose(index)}
              style={({ pressed }) => [
                styles.option,
                isSelected &&
                  styles.optionSelected,
                wasWrong &&
                  !isSelected &&
                  styles.optionPreviouslyWrong,
                isCorrectOption &&
                  styles.optionCorrect,
                pressed &&
                  !correct &&
                  styles.optionPressed,
              ]}
            >
              <View
                style={[
                  styles.optionLetter,
                  isSelected &&
                    styles.optionLetterSelected,
                  isCorrectOption &&
                    styles.optionLetterCorrect,
                ]}
              >
                <Text
                  style={[
                    styles.optionLetterText,
                    (isSelected ||
                      isCorrectOption) &&
                      styles.optionLetterTextActive,
                  ]}
                >
                  {isCorrectOption
                    ? "✓"
                    : String.fromCharCode(
                        65 + index,
                      )}
                </Text>
              </View>

              <Text
                style={[
                  styles.optionText,
                  isCorrectOption &&
                    styles.optionTextCorrect,
                ]}
              >
                {option}
              </Text>

              <Text style={styles.optionVoice}>
                🔊
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!correct ? (
        <Pressable
          disabled={selected === null}
          onPress={submit}
          style={({ pressed }) => [
            styles.submitButton,
            selected === null &&
              styles.submitButtonDisabled,
            pressed &&
              selected !== null &&
              styles.pressed,
          ]}
        >
          <Text style={styles.submitText}>
            জমা দাও
          </Text>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.feedbackCard,
          correct && styles.feedbackSuccess,
          canGoNext &&
            !correct &&
            styles.feedbackRetry,
        ]}
      >
        <Text style={styles.feedbackIcon}>
          {correct
            ? "🏆"
            : canGoNext
              ? "🔁"
              : "💡"}
        </Text>

        <View style={styles.feedbackCopy}>
          <Text style={styles.feedbackTitle}>
            {correct
              ? "সঠিক উত্তর!"
              : canGoNext
                ? "পরে আবার করব"
                : localAttempts > 0
                  ? "মিমির ইঙ্গিত"
                  : "প্রস্তুত?"}
          </Text>
          <Text style={styles.feedbackText}>
            {helperText}
          </Text>
        </View>

        <Pressable
          onPress={() =>
            void speakLearningVoice(helperText)
          }
          style={styles.feedbackListen}
        >
          <Text>🔊</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    alignItems: "center",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#7653BD",
  },
  headerIconText: {
    fontSize: 22,
  },
  headerCopy: {
    flex: 1,
    marginLeft: 11,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    fontWeight: "900",
    color: "#958A9A",
  },
  title: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: "900",
    color: "#2B252F",
  },
  titleTablet: {
    fontSize: 22,
  },
  attemptBadge: {
    minWidth: 58,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: "#EEE8F8",
  },
  attemptLabel: {
    fontSize: 7,
    fontWeight: "900",
    color: "#94889A",
  },
  attemptValue: {
    marginTop: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#7653BD",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    overflow: "hidden",
    marginTop: 12,
    borderRadius: 4,
    backgroundColor: "#E7E1EA",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#7653BD",
  },
  stage: {
    width: "100%",
    alignItems: "center",
    marginTop: 13,
    paddingTop: 8,
    paddingBottom: 14,
    borderRadius: 28,
    backgroundColor: "#E5DBFA",
  },
  questionCard: {
    width: "92%",
    marginTop: -8,
    padding: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  questionCardCorrect: {
    borderColor: "#78C96A",
    backgroundColor: "#F5FFF2",
  },
  questionTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  questionCopy: {
    flex: 1,
  },
  questionLabel: {
    fontSize: 8,
    letterSpacing: 1.1,
    fontWeight: "900",
    color: "#8D8292",
  },
  questionHelper: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: "#77707C",
  },
  listenButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: "#EAF5FF",
  },
  listenIcon: {
    fontSize: 14,
  },
  listenText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#287DA4",
  },
  question: {
    marginTop: 12,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: "900",
    color: "#29232C",
  },
  questionTablet: {
    fontSize: 26,
    lineHeight: 36,
  },
  optionList: {
    width: "100%",
    marginTop: 15,
    gap: 9,
  },
  option: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: "#E3DEE6",
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },
  optionSelected: {
    borderColor: "#7653BD",
    backgroundColor: "#F4EEFF",
  },
  optionPreviouslyWrong: {
    opacity: 0.62,
  },
  optionCorrect: {
    borderColor: "#6DBB61",
    backgroundColor: "#EFFBEA",
  },
  optionPressed: {
    transform: [{ scale: 0.99 }],
  },
  optionLetter: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#EEEAF1",
  },
  optionLetterSelected: {
    backgroundColor: "#7653BD",
  },
  optionLetterCorrect: {
    backgroundColor: "#68B75C",
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#625A66",
  },
  optionLetterTextActive: {
    color: "#FFFFFF",
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#312B34",
  },
  optionTextCorrect: {
    color: "#317A2A",
  },
  optionVoice: {
    marginLeft: 8,
    fontSize: 16,
  },
  submitButton: {
    width: "100%",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderRadius: 26,
    backgroundColor: "#7653BD",
  },
  submitButtonDisabled: {
    backgroundColor: "#C9C3CE",
  },
  submitText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  feedbackCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#FFF4D5",
  },
  feedbackSuccess: {
    backgroundColor: "#E7F8E3",
  },
  feedbackRetry: {
    backgroundColor: "#F0E9FF",
  },
  feedbackIcon: {
    fontSize: 24,
  },
  feedbackCopy: {
    flex: 1,
    marginLeft: 10,
  },
  feedbackTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#4B404F",
  },
  feedbackText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    color: "#625866",
  },
  feedbackListen: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },
  pressed: {
    opacity: 0.88,
  },
});
