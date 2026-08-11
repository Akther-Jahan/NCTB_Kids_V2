import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";

import type { ScreenProps } from "../../../navigation/routes";
import { isSupabaseConfigured } from "../../../config/supabase";
import { useGamificationStore } from "../../gamification/store/gamificationStore";
import { useStudentStore } from "../../student/store/studentStore";
import { type Activity } from "../data/curriculum";
import { useCurriculumChapter } from "../hooks/useCurriculumChapter";
import { progressService } from "../services/progressService";
import {
  type LessonSession,
  type QuestionResult,
  useLessonSessionStore,
} from "../store/lessonSessionStore";

import AudioStoryActivity from "../components/AudioStoryActivity";
import LetterActivity from "../components/LetterActivity";
import WordBuildActivity from "../components/WordBuildActivity";
import MissingLetterActivity from "../components/MissingLetterActivity";
import PictureChoiceActivity from "../components/PictureChoiceActivity";
import DragGameActivity from "../components/DragGameActivity";
import FlashcardActivity from "../components/FlashcardActivity";
import MatchingActivity from "../components/MatchingActivity";
import TapCards from "../components/TapActivity";
import VoiceActivity from "../components/VoiceActivity";
import { ImageLessonActivity } from "../components/ImageLessonActivity";
import { VideoActivity } from "../components/VideoActivity";
import MimiIntroActivity from "../components/MimiIntroActivity";
import AnimatedStoryActivity from "../components/AnimatedStoryActivity";
import QuizBattleActivity from "../components/QuizBattleActivity";

const DEFAULT_MAX_QUIZ_ATTEMPTS = 3;

type LessonResult = {
  score: number;
  points: number;
  stars: number;
  totalQuestions: number;
  correctQuestions: number;
  needsRetryQuestions: number;
  totalAttempts: number;
};

const EMPTY_RESULT: LessonResult = {
  score: 100,
  points: 30,
  stars: 3,
  totalQuestions: 0,
  correctQuestions: 0,
  needsRetryQuestions: 0,
  totalAttempts: 0,
};

async function speakBangla(text: string) {
  await Speech.stop();

  Speech.speak(text, {
    language: "bn-BD",
    rate: 0.78,
    pitch: 1.03,
  });
}

function isQuizActivity(
  activity: Activity,
): boolean {
  return (
    activity.type === "quiz" ||
    activity.type === "choice"
  );
}

function needsCompletion(activity: Activity) {
  return [
    "intro",
    "snippet",
    "letter",
    "image_lesson",
    "video",
    "word_build",
    "missing_letter",
    "tap",
    "flashcard",
    "voice",
    "matching",
    "picture_choice",
    "drag_game",
    "choice",
    "quiz",
  ].includes(activity.type);
}

function getQuestionResult(
  session: LessonSession | undefined,
  activityId: string,
): QuestionResult | undefined {
  return session?.questionResults?.[activityId];
}

function calculateLessonResult(
  activities: Activity[],
  session: LessonSession,
): LessonResult {
  const quizzes = activities.filter(
    isQuizActivity,
  );

  if (!quizzes.length) {
    return EMPTY_RESULT;
  }

  let correctQuestions = 0;
  let totalAttempts = 0;

  for (const quiz of quizzes) {
    const result =
      session.questionResults[quiz.id];

    if (result?.status === "correct") {
      correctQuestions += 1;
    }

    totalAttempts +=
      result?.attempts ?? 0;
  }

  const totalQuestions = quizzes.length;
  const needsRetryQuestions =
    totalQuestions - correctQuestions;

  const score = Math.round(
    (correctQuestions / totalQuestions) * 100,
  );

  const stars =
    score >= 90 ? 3 : score >= 70 ? 2 : 1;

  const points =
    stars === 3 ? 30 : stars === 2 ? 20 : 10;

  return {
    score,
    points,
    stars,
    totalQuestions,
    correctQuestions,
    needsRetryQuestions,
    totalAttempts,
  };
}

function getActivityMeta(activity: Activity) {
  switch (activity.type) {
    case "intro":
      return {
        icon: "👋",
        label: "শুরু করি",
        instruction: activity.title,
      };

    case "snippet":
      return {
        icon: "📖",
        label: "গল্প",
        instruction: activity.title,
      };

    case "audio_story":
      return {
        icon: "🎧",
        label: "শুনে শিখি",
        instruction: activity.text,
      };

    case "image_lesson":
      return {
        icon: "🖼️",
        label: "ছবি দেখে শিখি",
        instruction: activity.instruction,
      };

    case "video":
      return {
        icon: "▶️",
        label: "ভিডিও",
        instruction: activity.title,
      };

    case "letter":
      return {
        icon: "🔤",
        label: "অক্ষর",
        instruction: `${activity.letter}। ${activity.sound}`,
      };

    case "word_build":
      return {
        icon: "🧩",
        label: "শব্দ বানাই",
        instruction: activity.prompt,
      };

    case "missing_letter":
      return {
        icon: "🔎",
        label: "হারানো অক্ষর",
        instruction: activity.prompt,
      };

    case "tap":
      return {
        icon: "👆",
        label: "চাপ দিয়ে শিখি",
        instruction: activity.prompt,
      };

    case "flashcard":
      return {
        icon: "🃏",
        label: "কার্ড",
        instruction: activity.prompt,
      };

    case "voice":
      return {
        icon: "🎤",
        label: "বলে শিখি",
        instruction: activity.prompt,
      };

    case "matching":
      return {
        icon: "🔗",
        label: "মিল খুঁজি",
        instruction: activity.prompt,
      };

    case "picture_choice":
      return {
        icon: "🔍",
        label: "ছবি চিনি",
        instruction: activity.question,
      };

    case "drag_game":
      return {
        icon: "🎯",
        label: "খেলা",
        instruction: activity.prompt,
      };

    case "choice":
      return {
        icon: "❓",
        label: "প্রশ্ন",
        instruction: activity.prompt,
      };

    case "quiz":
      return {
        icon: "🏆",
        label: "কুইজ",
        instruction: activity.question,
      };

    default:
      return {
        icon: "⭐",
        label: "শেখার কাজ",
        instruction: "চলো কাজটি শেষ করি।",
      };
  }
}

export default function LessonPlayerScreen({
  navigation,
  route,
}: ScreenProps<"Lesson">) {
  const { width, height } =
    useWindowDimensions();

  const isSmallPhone = width < 360;
  const isShortScreen = height < 760;
  const isTablet = width >= 600;

  const maxWidth = isTablet ? 820 : 620;

  const horizontalPadding = isSmallPhone
    ? 10
    : isTablet
      ? 28
      : 14;

  const activityPadding = isSmallPhone
    ? 12
    : isTablet
      ? 24
      : 16;

  const chapterId = route.params.chapterId;

  const {
    chapter,
    loading,
    error,
    retry,
  } = useCurriculumChapter(chapterId);

  const completeChapter =
    useGamificationStore(
      (state) => state.completeChapter,
    );

  const addBadge =
    useGamificationStore(
      (state) => state.addBadge,
    );

  const student =
    useStudentStore(
      (state) => state.student,
    );

  const session =
    useLessonSessionStore(
      (state) =>
        state.sessions[chapterId],
    );

  const startOrResume =
    useLessonSessionStore(
      (state) => state.startOrResume,
    );

  const saveStep =
    useLessonSessionStore(
      (state) => state.setStep,
    );

  const markActivityComplete =
    useLessonSessionStore(
      (state) =>
        state.markActivityComplete,
    );

  const recordQuestionAttempt =
    useLessonSessionStore(
      (state) =>
        state.recordQuestionAttempt,
    );

  const markQuestionNeedsRetry =
    useLessonSessionStore(
      (state) =>
        state.markQuestionNeedsRetry,
    );

  const resetQuestionForRetry =
    useLessonSessionStore(
      (state) =>
        state.resetQuestionForRetry,
    );

  const markSessionFinished =
    useLessonSessionStore(
      (state) =>
        state.markSessionFinished,
    );

  const [step, setStep] =
    useState(0);

  const [finished, setFinished] =
    useState(false);

  const [result, setResult] =
    useState<LessonResult>(
      EMPTY_RESULT,
    );

  /**
   * When non-null, only these question IDs are traversed.
   * This gives us an in-screen "retry wrong questions only"
   * flow without changing navigation routes yet.
   */
  const [
    retryQuestionIds,
    setRetryQuestionIds,
  ] = useState<string[] | null>(
    null,
  );

  useEffect(() => {
    if (!chapter) {
      return;
    }

    const restored =
      startOrResume(chapterId);

    if (restored.finishedAt) {
      setResult(
        calculateLessonResult(
          chapter.activities,
          restored,
        ),
      );
      setFinished(true);
      setRetryQuestionIds(null);
      return;
    }

    const safeStep = Math.min(
      restored.step,
      Math.max(
        0,
        chapter.activities.length - 1,
      ),
    );

    setStep(safeStep);
    setFinished(false);
  }, [
    chapter,
    chapterId,
    startOrResume,
  ]);

  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  const activity =
    chapter?.activities[step];

  const completedActivityIds =
    session?.completedActivityIds ?? [];

  const currentQuestionResult =
    activity && isQuizActivity(activity)
      ? getQuestionResult(
          session,
          activity.id,
        )
      : undefined;

  const activityCorrect =
    activity && isQuizActivity(activity)
      ? currentQuestionResult?.status ===
        "correct"
      : activity
        ? completedActivityIds.includes(
            activity.id,
          )
        : false;

  /**
   * Important:
   * - correct => may advance
   * - max attempts => may advance but remains NOT correct
   */
  const activityCanAdvance =
    activity
      ? isQuizActivity(activity)
        ? activityCorrect ||
          (currentQuestionResult?.runAttempts ??
            0) >=
            DEFAULT_MAX_QUIZ_ATTEMPTS
        : !needsCompletion(activity) ||
          completedActivityIds.includes(
            activity.id,
          )
      : false;

  const progress =
    chapter?.activities.length
      ? ((step +
          (activityCanAdvance ? 1 : 0)) /
          chapter.activities.length) *
        100
      : 0;

  const activityMeta = useMemo(
    () =>
      activity
        ? getActivityMeta(activity)
        : {
            icon: "⭐",
            label: "শেখার কাজ",
            instruction: "",
          },
    [activity],
  );

  const moveToStep = (
    nextStep: number,
  ) => {
    setStep(nextStep);
    saveStep(chapterId, nextStep);
    void Speech.stop();
  };

  const getFreshSession = () => {
    return (
      useLessonSessionStore.getState()
        .sessions[chapterId] ??
      startOrResume(chapterId)
    );
  };

  const finishChapter = async () => {
    if (!chapter) {
      return;
    }

    const freshSession =
      getFreshSession();

    const summary =
      calculateLessonResult(
        chapter.activities,
        freshSession,
      );

    completeChapter({
      chapterId: chapter.id,
      nextChapterId:
        chapter.nextChapterId,
      starsEarned: summary.stars,
      quizScore: summary.score,
    });

    if (
      chapter.title ===
      "আমার পরিচয়"
    ) {
      addBadge(
        "identity_expert",
      );
    }

    if (
      student &&
      isSupabaseConfigured &&
      !student.id.startsWith(
        "local-",
      )
    ) {
      try {
        await progressService.completeChapter(
          student.id,
          chapter.id,
        );

      } catch (syncError) {
  const message =
    syncError instanceof Error
      ? syncError.message
      : String(syncError);

  console.error(
    "Cloud progress save failed:",
    message,
  );

  Alert.alert(
    "Cloud progress save হয়নি",
    message,
  );

  return;
}

    }

    /**
     * Do NOT clear the session here.
     * Progress/Retry needs questionResults after lesson completion.
     */
    markSessionFinished(
      chapterId,
    );

    setResult(summary);
    setFinished(true);
    setRetryQuestionIds(null);

    if (
      student?.classLevel === 1 &&
      summary.totalQuestions > 0
    ) {
      void speakBangla(
        `তোমার ${summary.totalQuestions}টির মধ্যে ${summary.correctQuestions}টি সঠিক হয়েছে। বাকি ${summary.needsRetryQuestions}টি আবার চেষ্টা করি।`,
      );
    } else if (
      summary.totalQuestions > 0
    ) {
      void speakBangla(
        `দারুণ চেষ্টা! ${summary.totalQuestions}টির মধ্যে ${summary.correctQuestions}টি সঠিক হয়েছে।`,
      );
    } else {
      void speakBangla(
        `দারুণ করেছ! তুমি ${summary.stars}টি তারা পেয়েছ।`,
      );
    }
  };

  const markCurrentQuestionForRetryIfNeeded =
    () => {
      if (
        !activity ||
        !isQuizActivity(activity)
      ) {
        return;
      }

      const fresh =
        getQuestionResult(
          getFreshSession(),
          activity.id,
        );

      if (
        fresh?.status === "correct"
      ) {
        return;
      }

      if (
        (fresh?.runAttempts ?? 0) >=
        DEFAULT_MAX_QUIZ_ATTEMPTS
      ) {
        markQuestionNeedsRetry(
          chapterId,
          activity.id,
        );
      }
    };

  const next = async () => {
    if (!chapter || !activity) {
      return;
    }

    if (!activityCanAdvance) {
      Alert.alert(
        "কাজটি শেষ করো",
        isQuizActivity(activity)
          ? `সঠিক উত্তর দাও, অথবা ${DEFAULT_MAX_QUIZ_ATTEMPTS} বার চেষ্টা করলে পরের প্রশ্নে যেতে পারবে।`
          : "এই শেখার কাজটি শেষ করলে পরের ধাপে যেতে পারবে।",
      );
      return;
    }

    if (isQuizActivity(activity)) {
      markCurrentQuestionForRetryIfNeeded();
    }

    /**
     * Retry mode:
     * jump only among questions that were incorrect/incomplete.
     */
    if (
      retryQuestionIds &&
      retryQuestionIds.length > 0
    ) {
      const currentRetryIndex =
        retryQuestionIds.indexOf(
          activity.id,
        );

      if (
        currentRetryIndex >= 0 &&
        currentRetryIndex <
          retryQuestionIds.length - 1
      ) {
        const nextQuestionId =
          retryQuestionIds[
            currentRetryIndex + 1
          ];

        const nextStep =
          chapter.activities.findIndex(
            (item) =>
              item.id ===
              nextQuestionId,
          );

        if (nextStep >= 0) {
          moveToStep(nextStep);
          return;
        }
      }

      await finishChapter();
      return;
    }

    if (
      step <
      chapter.activities.length - 1
    ) {
      moveToStep(step + 1);
      return;
    }

    await finishChapter();
  };

  const goBack = () => {
    if (
      retryQuestionIds &&
      retryQuestionIds.length > 0 &&
      activity
    ) {
      const currentRetryIndex =
        retryQuestionIds.indexOf(
          activity.id,
        );

      if (currentRetryIndex > 0) {
        const previousQuestionId =
          retryQuestionIds[
            currentRetryIndex - 1
          ];

        const previousStep =
          chapter?.activities.findIndex(
            (item) =>
              item.id ===
              previousQuestionId,
          ) ?? -1;

        if (previousStep >= 0) {
          moveToStep(previousStep);
          return;
        }
      }

      navigation.goBack();
      return;
    }

    if (step > 0) {
      moveToStep(step - 1);
      return;
    }

    navigation.goBack();
  };

  const retryWrongQuestions = () => {
    if (!chapter) {
      return;
    }

    const freshSession =
      getFreshSession();

    const questionIds =
      chapter.activities
        .filter(isQuizActivity)
        .filter((item) => {
          const question =
            freshSession.questionResults[
              item.id
            ];

          return (
            question?.status !==
            "correct"
          );
        })
        .map((item) => item.id);

    if (!questionIds.length) {
      return;
    }

    for (const questionId of questionIds) {
      resetQuestionForRetry(
        chapterId,
        questionId,
      );
    }

    const firstStep =
      chapter.activities.findIndex(
        (item) =>
          item.id ===
          questionIds[0],
      );

    if (firstStep < 0) {
      return;
    }

    setRetryQuestionIds(
      questionIds,
    );
    setFinished(false);
    moveToStep(firstStep);

    void speakBangla(
      `চলো বাকি ${questionIds.length}টি প্রশ্ন আবার চেষ্টা করি।`,
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View
          style={
            styles.centerState
          }
        >
          <View
            style={
              styles.loadingCircle
            }
          >
            <ActivityIndicator
              size="large"
              color="#7653BD"
            />
          </View>

          <Text
            style={
              styles.centerTitle
            }
          >
            পাঠ লোড হচ্ছে...
          </Text>

          <Text
            style={
              styles.centerHelper
            }
          >
            একটু অপেক্ষা করো বন্ধু
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View
          style={
            styles.centerState
          }
        >
          <Text
            style={
              styles.centerEmoji
            }
          >
            ⚠️
          </Text>

          <Text
            style={
              styles.centerTitle
            }
          >
            পাঠটি লোড করা যায়নি
          </Text>

          <Text
            style={
              styles.centerHelper
            }
          >
            {error}
          </Text>

          <Pressable
            onPress={retry}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              আবার চেষ্টা করি
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!chapter || !activity) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View
          style={
            styles.centerState
          }
        >
          <Text
            style={
              styles.centerEmoji
            }
          >
            📭
          </Text>

          <Text
            style={
              styles.centerTitle
            }
          >
            কোনো activity পাওয়া যায়নি
          </Text>

          <Pressable
            onPress={() =>
              navigation.goBack()
            }
            style={({ pressed }) => [
              styles.primaryButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Chapter list-এ ফিরি
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.rewardScroll,
            {
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >
          <View
            style={[
              styles.rewardCard,
              {
                maxWidth,
                padding: isTablet
                  ? 34
                  : 22,
              },
            ]}
          >
            <View
              style={
                styles.rewardOrbOne
              }
            />
            <View
              style={
                styles.rewardOrbTwo
              }
            />

            <Text
              style={
                styles.rewardConfetti
              }
            >
              ✦ 🎉 ✦
            </Text>

            <View
              style={[
                styles.rewardGuideCircle,
                {
                  width: isTablet
                    ? 245
                    : 190,
                  height: isTablet
                    ? 245
                    : 190,
                  borderRadius:
                    isTablet
                      ? 123
                      : 95,
                },
              ]}
            >
              <Image
                source={require(
                  "../../../../assets/characters/mimi/waving.png"
                )}
                style={
                  styles.rewardGuide
                }
                resizeMode="contain"
              />
            </View>

            <Text
              style={[
                styles.rewardTitle,
                isTablet &&
                  styles.rewardTitleTablet,
              ]}
            >
              আজকের ফলাফল
            </Text>

            <Text
              style={
                styles.rewardSubtitle
              }
            >
              তুমি পাঠটি শেষ করেছ — বাকি প্রশ্ন পরে আবার করা যাবে
            </Text>

            <Text
              style={[
                styles.rewardStars,
                isTablet &&
                  styles.rewardStarsTablet,
              ]}
            >
              {"⭐".repeat(
                result.stars,
              )}
            </Text>

            {result.totalQuestions >
            0 ? (
              <>
                <View
                  style={
                    styles.summaryGrid
                  }
                >
                  <ResultStat
                    icon="📝"
                    value={
                      result.totalQuestions
                    }
                    label="মোট প্রশ্ন"
                  />

                  <ResultStat
                    icon="✅"
                    value={
                      result.correctQuestions
                    }
                    label="সঠিক"
                  />

                  <ResultStat
                    icon="🔁"
                    value={
                      result.needsRetryQuestions
                    }
                    label="আবার করতে হবে"
                  />

                  <ResultStat
                    icon="🎯"
                    value={
                      result.totalAttempts
                    }
                    label="মোট চেষ্টা"
                  />
                </View>

                <View
                  style={
                    styles.scoreStrip
                  }
                >
                  <Text
                    style={
                      styles.scoreStripLabel
                    }
                  >
                    Quiz score
                  </Text>

                  <Text
                    style={
                      styles.scoreStripValue
                    }
                  >
                    {result.score}%
                  </Text>
                </View>
              </>
            ) : (
              <View
                style={
                  styles.resultRow
                }
              >
                <View
                  style={
                    styles.resultBox
                  }
                >
                  <Text
                    style={
                      styles.resultIcon
                    }
                  >
                    ✨
                  </Text>

                  <Text
                    style={
                      styles.resultValue
                    }
                  >
                    +{result.points}
                  </Text>

                  <Text
                    style={
                      styles.resultLabel
                    }
                  >
                    Points
                  </Text>
                </View>
              </View>
            )}

            {result.needsRetryQuestions >
            0 ? (
              <Pressable
                onPress={
                  retryWrongQuestions
                }
                style={({
                  pressed,
                }) => [
                  styles.retryButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={
                    styles.retryButtonIcon
                  }
                >
                  🔁
                </Text>

                <Text
                  style={
                    styles.retryButtonText
                  }
                >
                  ভুল ও অসম্পূর্ণ প্রশ্ন আবার করি
                </Text>
              </Pressable>
            ) : (
              <View
                style={
                  styles.allCorrectCard
                }
              >
                <Text
                  style={
                    styles.allCorrectEmoji
                  }
                >
                  🌟
                </Text>

                <Text
                  style={
                    styles.allCorrectText
                  }
                >
                  সব প্রশ্ন সঠিক হয়েছে!
                </Text>
              </View>
            )}

            <Pressable
              onPress={() =>
                navigation.goBack()
              }
              style={({ pressed }) => [
                styles.rewardButton,
                pressed &&
                  styles.pressed,
              ]}
            >
              <Text
                style={
                  styles.rewardButtonIcon
                }
              >
                📚
              </Text>

              <Text
                style={
                  styles.rewardButtonText
                }
              >
                Chapter list-এ ফিরি
              </Text>

              <Text
                style={
                  styles.rewardButtonArrow
                }
              >
                ›
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const headerStatusText =
    activityCorrect
      ? "✓ সম্পন্ন"
      : isQuizActivity(activity) &&
          activityCanAdvance
        ? "↻ পরে আবার"
        : "কাজ চলছে";

  return (
    <SafeAreaView
      style={styles.safe}
    >
      <View
        style={styles.page}
      >
        <View
          style={[
            styles.topShell,
            {
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >
          <View
            style={[
              styles.topInner,
              { maxWidth },
            ]}
          >
            <View
              style={
                styles.header
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="পাঠ থেকে বের হই"
                onPress={() =>
                  navigation.goBack()
                }
                style={({
                  pressed,
                }) => [
                  styles.closeButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={
                    styles.closeText
                  }
                >
                  ×
                </Text>
              </Pressable>

              <View
                style={
                  styles.headerCopy
                }
              >
                <Text
                  style={
                    styles.chapterTitle
                  }
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={
                    0.75
                  }
                >
                  {chapter.title}
                </Text>

                <Text
                  style={
                    styles.stepText
                  }
                >
                  {retryQuestionIds
                    ? `পুনরায় চেষ্টা • ${
                        retryQuestionIds.indexOf(
                          activity.id,
                        ) + 1
                      } / ${retryQuestionIds.length}`
                    : `ধাপ ${step + 1} / ${chapter.activities.length}`}
                </Text>
              </View>

              <View
                style={[
                  styles.completionBadge,
                  activityCorrect
                    ? styles.completionBadgeDone
                    : styles.completionBadgeTodo,
                ]}
              >
                <Text
                  style={[
                    styles.completionBadgeText,
                    activityCorrect
                      ? styles.completionTextDone
                      : styles.completionTextTodo,
                  ]}
                >
                  {headerStatusText}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.progressTrack
              }
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      100,
                      progress,
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <ScrollView
          style={
            styles.activityScroll
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.activityScrollContent,
            {
              paddingHorizontal:
                horizontalPadding,
              paddingBottom:
                isShortScreen
                  ? 16
                  : 24,
            },
          ]}
        >
          <View
            style={[
              styles.activityShell,
              {
                maxWidth,
                padding:
                  activityPadding,
                minHeight: isTablet
                  ? 560
                  : isShortScreen
                    ? 390
                    : 470,
              },
            ]}
          >
            <View
              style={
                styles.activityHeader
              }
            >
              <View
                style={
                  styles.activityMeta
                }
              >
                <View
                  style={
                    styles.activityIconCircle
                  }
                >
                  <Text
                    style={
                      styles.activityIcon
                    }
                  >
                    {
                      activityMeta.icon
                    }
                  </Text>
                </View>

                <View>
                  <Text
                    style={
                      styles.activityEyebrow
                    }
                  >
                    ACTIVITY
                  </Text>

                  <Text
                    style={
                      styles.activityLabel
                    }
                  >
                    {
                      activityMeta.label
                    }
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="নির্দেশনা শুনি"
                onPress={() =>
                  void speakBangla(
                    activityMeta.instruction,
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.listenButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={
                    styles.listenIcon
                  }
                >
                  🔊
                </Text>

                {!isSmallPhone ? (
                  <Text
                    style={
                      styles.listenText
                    }
                  >
                    শুনি
                  </Text>
                ) : null}
              </Pressable>
            </View>

            <View
              style={
                styles.activityDivider
              }
            />

            <View
              style={
                styles.rendererWrap
              }
            >
              <ActivityRenderer
                key={activity.id}
                activity={
                  activity
                }
                questionResult={
                  currentQuestionResult
                }
                completed={
                  completedActivityIds.includes(
                    activity.id,
                  )
                }
                onQuizAnswer={(
                  selectedOption,
                  correct,
                ) => {
                  recordQuestionAttempt(
                    chapterId,
                    activity.id,
                    selectedOption,
                    correct,
                  );
                }}
                onComplete={() => {
                  markActivityComplete(
                    chapterId,
                    activity.id,
                  );
                }}
              />
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.actionShell,
            {
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >
          <View
            style={[
              styles.actions,
              { maxWidth },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={goBack}
              style={({
                pressed,
              }) => [
                styles.backButton,
                pressed &&
                  styles.pressed,
              ]}
            >
              <Text
                style={
                  styles.backButtonIcon
                }
              >
                ‹
              </Text>

              <Text
                style={
                  styles.backButtonText
                }
              >
                আগে
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled:
                  !activityCanAdvance,
              }}
              onPress={() =>
                void next()
              }
              style={({
                pressed,
              }) => [
                styles.nextButton,
                !activityCanAdvance &&
                  styles.nextButtonDisabled,
                pressed &&
                  activityCanAdvance &&
                  styles.nextButtonPressed,
              ]}
            >
              <Text
                style={
                  styles.nextButtonText
                }
              >
                {retryQuestionIds
                  ? retryQuestionIds.indexOf(
                        activity.id,
                      ) ===
                      retryQuestionIds.length -
                        1
                    ? "ফলাফল দেখি"
                    : "পরের প্রশ্ন"
                  : step ===
                      chapter.activities.length -
                        1
                    ? "শেষ করি"
                    : isQuizActivity(
                          activity,
                        ) &&
                        !activityCorrect &&
                        activityCanAdvance
                      ? "পরের প্রশ্নে যাই"
                      : "পরেরটি"}
              </Text>

              <View
                style={
                  styles.nextArrowCircle
                }
              >
                <Text
                  style={
                    styles.nextArrow
                  }
                >
                  {(!retryQuestionIds &&
                    step ===
                      chapter.activities.length -
                        1) ||
                  (retryQuestionIds &&
                    retryQuestionIds.indexOf(
                      activity.id,
                    ) ===
                      retryQuestionIds.length -
                        1)
                    ? "✓"
                    : "→"}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ActivityRenderer({
  activity,
  questionResult,
  completed,
  onQuizAnswer,
  onComplete,
}: {
  activity: Activity;
  questionResult?: QuestionResult;
  completed: boolean;
  onQuizAnswer: (
    selectedOption: number,
    correct: boolean,
  ) => void;
  onComplete: () => void;
}) {
  switch (activity.type) {
    case "intro":
      return (
        <MimiIntroActivity
          activity={activity}
          onComplete={onComplete}
        />
      );

    case "snippet":
      return (
        <AnimatedStoryActivity
          activity={{
            title: activity.title,
            data: {
              lines: activity.lines,
              buttonText:
                "পরেরটি 🚀",
            },
          }}
          onComplete={onComplete}
        />
      );

    case "audio_story":
      return (
        <AudioStoryActivity
          activity={{
            payload: {
              title: activity.title,
              text: activity.text,
              audio: activity.audio,
            },
          }}
        />
      );

    case "image_lesson":
      return (
        <ImageLessonActivity
          activity={{
            title: activity.title,
            instruction:
              activity.instruction,
            data: {
              image:
                activity.imageUrl,
              description:
                activity.instruction,
              sourceLabel:
                activity.sourceLabel,
            },
          }}
          completed={completed}
          onComplete={onComplete}
        />
      );

    case "video":
      return (
        <VideoActivity
          title={activity.title}
          url={activity.url}
          completed={completed}
          onComplete={onComplete}
        />
      );

    case "letter":
      return (
        <LetterActivity
          activity={{
            title: "অক্ষর শিখি",
            data: {
              letter:
                activity.letter,
              sound:
                activity.sound,
              examples:
                activity.examples,
            },
          }}
          onComplete={onComplete}
        />
      );

    case "word_build":
      return (
        <WordBuildActivity
          activity={{
            title: "শব্দ বানাই",
            data: {
              prompt:
                activity.prompt,
              letters:
                activity.letters,
              answer:
                activity.answer,
            },
          }}
          onComplete={onComplete}
        />
      );

    case "missing_letter":
      return (
        <MissingLetterActivity
          activity={{
            title: "হারানো অক্ষর",
            instruction:
              activity.prompt,
            data: {
              prompt:
                activity.prompt,
              wordParts:
                activity.wordParts,
              missingIndex:
                activity.missingIndex,
              options:
                activity.options,
              answer:
                activity.answer,
              emoji:
                activity.emoji,
              hint:
                activity.hint,
            },
          }}
          onComplete={onComplete}
        />
      );

    case "tap":
      return (
        <TapCards
          activity={{
            payload: {
              prompt:
                activity.prompt,
              items:
                activity.items,
            },
          }}
          onComplete={onComplete}
        />
      );

    case "flashcard":
      return (
        <FlashcardActivity
          activity={{
            payload: {
              prompt:
                activity.prompt,
              cards:
                activity.cards,
            },
          }}
          onComplete={onComplete}
        />
      );

    case "voice":
      return (
        <VoiceActivity
          activity={{
            payload: {
              prompt:
                activity.prompt,
              word:
                activity.word,
              emoji:
                activity.emoji,
            },
          }}
          onComplete={onComplete}
        />
      );

    case "matching":
      return (
        <MatchingActivity
          activity={{
            payload: {
              prompt:
                activity.prompt,
              pairs:
                activity.pairs,
            },
          }}
          onComplete={onComplete}
        />
      );

    case "picture_choice":
      return (
        <PictureChoiceActivity
          activity={{
            title:
              "ছবি চিনে নেই",
            data: {
              question:
                activity.question,
              options:
                activity.options,
              answer:
                activity.answer,
            },
          }}
          onComplete={onComplete}
        />
      );

    case "drag_game":
      return (
        <DragGameActivity
          activity={{
            payload: {
              prompt:
                activity.prompt,
              items:
                activity.items,
            },
          }}
          onComplete={onComplete}
        />
      );

    case "choice":
      return (
        <QuizBattleActivity
          prompt={activity.prompt}
          options={activity.options}
          answer={activity.answer}
          hint={activity.hint}
          attempts={
            questionResult?.runAttempts ??
            0
          }
          status={
            questionResult?.status ??
            "unanswered"
          }
          maxAttempts={
            DEFAULT_MAX_QUIZ_ATTEMPTS
          }
          onAnswer={onQuizAnswer}
        />
      );

    case "quiz":
      return (
        <QuizBattleActivity
          prompt={
            activity.question
          }
          options={
            activity.options
          }
          answer={
            activity.answer
          }
          hint={activity.hint}
          attempts={
            questionResult?.runAttempts ??
            0
          }
          status={
            questionResult?.status ??
            "unanswered"
          }
          maxAttempts={
            DEFAULT_MAX_QUIZ_ATTEMPTS
          }
          onAnswer={onQuizAnswer}
        />
      );

    default:
      return (
        <View
          style={
            styles.unsupportedCard
          }
        >
          <Text
            style={
              styles.centerEmoji
            }
          >
            🧩
          </Text>

          <Text
            style={
              styles.centerHelper
            }
          >
            এই activity দেখানো যাচ্ছে না।
          </Text>
        </View>
      );
  }
}

function ResultStat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <View
      style={
        styles.summaryBox
      }
    >
      <Text
        style={
          styles.summaryIcon
        }
      >
        {icon}
      </Text>

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        "#F6F3F8",
    },

    page: {
      flex: 1,
      backgroundColor:
        "#F6F3F8",
    },

    topShell: {
      paddingTop: 5,
      paddingBottom: 9,
      backgroundColor:
        "#F6F3F8",
    },

    topInner: {
      width: "100%",
      alignSelf:
        "center",
    },

    header: {
      minHeight: 52,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    closeButton: {
      width: 40,
      height: 40,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 20,
      backgroundColor:
        "#FFFFFF",
    },

    closeText: {
      marginTop: -3,
      fontSize: 30,
      fontWeight: "500",
      color: "#29242C",
    },

    headerCopy: {
      flex: 1,
      alignItems:
        "center",
      marginHorizontal: 8,
    },

    chapterTitle: {
      maxWidth: "100%",
      fontSize: 16,
      fontWeight: "900",
      color: "#201C22",
    },

    stepText: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: "800",
      color: "#817984",
    },

    completionBadge: {
      minWidth: 78,
      alignItems:
        "center",
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 16,
    },

    completionBadgeDone: {
      backgroundColor:
        "#DFF5DB",
    },

    completionBadgeTodo: {
      backgroundColor:
        "#FFF0C8",
    },

    completionBadgeText: {
      fontSize: 9,
      fontWeight: "900",
    },

    completionTextDone: {
      color: "#3C9236",
    },

    completionTextTodo: {
      color: "#A36A00",
    },

    progressTrack: {
      height: 8,
      overflow:
        "hidden",
      marginTop: 5,
      borderRadius: 4,
      backgroundColor:
        "#E5E1E8",
    },

    progressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor:
        "#7653BD",
    },

    activityScroll: {
      flex: 1,
    },

    activityScrollContent: {
      flexGrow: 1,
      paddingTop: 3,
    },

    activityShell: {
      width: "100%",
      alignSelf:
        "center",
      borderWidth: 1,
      borderColor:
        "#E1DCE5",
      borderRadius: 27,
      backgroundColor:
        "#FFFFFF",
      shadowColor:
        "#77707C",
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.09,
      shadowRadius: 12,
      elevation: 4,
    },

    activityHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    activityMeta: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    activityIconCircle: {
      width: 46,
      height: 46,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 23,
      backgroundColor:
        "#EEE6FF",
    },

    activityIcon: {
      fontSize: 23,
    },

    activityEyebrow: {
      marginLeft: 10,
      fontSize: 8,
      letterSpacing: 1.3,
      fontWeight: "900",
      color: "#9A919E",
    },

    activityLabel: {
      marginTop: 2,
      marginLeft: 10,
      fontSize: 15,
      fontWeight: "900",
      color: "#2B262D",
    },

    listenButton: {
      minHeight: 39,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      paddingHorizontal: 11,
      borderRadius: 20,
      backgroundColor:
        "#E9F5FF",
    },

    listenIcon: {
      fontSize: 15,
    },

    listenText: {
      fontSize: 10,
      fontWeight: "900",
      color: "#2678A2",
    },

    activityDivider: {
      height: 1,
      marginTop: 13,
      marginBottom: 16,
      backgroundColor:
        "#EEEAF0",
    },

    rendererWrap: {
      flex: 1,
    },

    actionShell: {
      paddingTop: 8,
      paddingBottom: 7,
      backgroundColor:
        "#F6F3F8",
    },

    actions: {
      width: "100%",
      minHeight: 58,
      flexDirection:
        "row",
      alignSelf:
        "center",
      gap: 9,
    },

    backButton: {
      width: 102,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 2,
      borderColor:
        "#D5CFD9",
      borderRadius: 29,
      backgroundColor:
        "#FFFFFF",
    },

    backButtonIcon: {
      marginTop: -3,
      marginRight: 5,
      fontSize: 28,
      color: "#322C35",
    },

    backButtonText: {
      fontSize: 13,
      fontWeight: "900",
      color: "#322C35",
    },

    nextButton: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingLeft: 21,
      paddingRight: 7,
      borderRadius: 29,
      backgroundColor:
        "#1A171C",
      shadowColor:
        "#1A171C",
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },

    nextButtonDisabled: {
      backgroundColor:
        "#C8C3CC",
      shadowOpacity: 0,
      elevation: 0,
    },

    nextButtonPressed: {
      transform: [
        {
          translateY: 2,
        },
      ],
    },

    nextButtonText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    nextArrowCircle: {
      width: 44,
      height: 44,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 22,
      backgroundColor:
        "#C98BFF",
    },

    nextArrow: {
      fontSize: 19,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    pressed: {
      transform: [
        {
          scale: 0.96,
        },
      ],
      opacity: 0.88,
    },

    centerState: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 24,
      backgroundColor:
        "#F6F3F8",
    },

    loadingCircle: {
      width: 82,
      height: 82,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 41,
      backgroundColor:
        "#EEE6FF",
    },

    centerEmoji: {
      fontSize: 42,
    },

    centerTitle: {
      marginTop: 13,
      fontSize: 20,
      fontWeight: "900",
      color: "#28232A",
      textAlign:
        "center",
    },

    centerHelper: {
      maxWidth: 360,
      marginTop: 7,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
      color: "#776E79",
      textAlign:
        "center",
    },

    primaryButton: {
      marginTop: 18,
      paddingHorizontal: 21,
      paddingVertical: 13,
      borderRadius: 21,
      backgroundColor:
        "#1A171C",
    },

    primaryButtonText: {
      fontSize: 12,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    rewardScroll: {
      flexGrow: 1,
      justifyContent:
        "center",
      paddingVertical: 18,
      backgroundColor:
        "#F6F3F8",
    },

    rewardCard: {
      position:
        "relative",
      width: "100%",
      alignSelf:
        "center",
      alignItems:
        "center",
      overflow:
        "hidden",
      borderRadius: 34,
      backgroundColor:
        "#CBBBF2",
    },

    rewardOrbOne: {
      position:
        "absolute",
      top: -75,
      right: -60,
      width: 210,
      height: 210,
      borderRadius: 105,
      backgroundColor:
        "rgba(255,255,255,0.23)",
    },

    rewardOrbTwo: {
      position:
        "absolute",
      left: -62,
      bottom: -72,
      width: 190,
      height: 190,
      borderRadius: 95,
      backgroundColor:
        "rgba(255,255,255,0.2)",
    },

    rewardConfetti: {
      fontSize: 27,
      color: "#FFFFFF",
    },

    rewardGuideCircle: {
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 5,
      backgroundColor:
        "rgba(255,255,255,0.42)",
    },

    rewardGuide: {
      width: "100%",
      height: "100%",
    },

    rewardTitle: {
      marginTop: 4,
      fontSize: 31,
      fontWeight: "900",
      color: "#171419",
      textAlign: "center",
    },

    rewardTitleTablet: {
      fontSize: 40,
    },

    rewardSubtitle: {
      maxWidth: 480,
      marginTop: 4,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "800",
      color: "#554960",
      textAlign: "center",
    },

    rewardStars: {
      marginTop: 11,
      fontSize: 34,
    },

    rewardStarsTablet: {
      fontSize: 43,
    },

    summaryGrid: {
      width: "100%",
      flexDirection:
        "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 18,
    },

    summaryBox: {
      width: "48%",
      flexGrow: 1,
      alignItems:
        "center",
      paddingVertical: 13,
      paddingHorizontal: 8,
      borderRadius: 20,
      backgroundColor:
        "rgba(255,255,255,0.78)",
    },

    summaryIcon: {
      fontSize: 21,
    },

    summaryValue: {
      marginTop: 3,
      fontSize: 20,
      fontWeight: "900",
      color: "#28232A",
    },

    summaryLabel: {
      marginTop: 2,
      fontSize: 9,
      fontWeight: "800",
      color: "#746A79",
      textAlign: "center",
    },

    scoreStrip: {
      width: "100%",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginTop: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 19,
      backgroundColor:
        "rgba(255,255,255,0.58)",
    },

    scoreStripLabel: {
      fontSize: 11,
      fontWeight: "900",
      color: "#65596D",
    },

    scoreStripValue: {
      fontSize: 18,
      fontWeight: "900",
      color: "#2C2630",
    },

    resultRow: {
      width: "100%",
      flexDirection:
        "row",
      gap: 10,
      marginTop: 18,
    },

    resultBox: {
      flex: 1,
      alignItems:
        "center",
      paddingVertical: 14,
      borderRadius: 22,
      backgroundColor:
        "rgba(255,255,255,0.78)",
    },

    resultIcon: {
      fontSize: 24,
    },

    resultValue: {
      marginTop: 4,
      fontSize: 21,
      fontWeight: "900",
      color: "#28232A",
    },

    resultLabel: {
      marginTop: 2,
      fontSize: 9,
      fontWeight: "800",
      color: "#746A79",
    },

    retryButton: {
      width: "100%",
      minHeight: 62,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 18,
      paddingHorizontal: 16,
      borderRadius: 31,
      backgroundColor:
        "#4F3C8C",
    },

    retryButtonIcon: {
      marginRight: 9,
      fontSize: 21,
    },

    retryButtonText: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "900",
      color: "#FFFFFF",
      textAlign: "center",
    },

    allCorrectCard: {
      width: "100%",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 18,
      paddingVertical: 13,
      borderRadius: 20,
      backgroundColor:
        "rgba(232,250,226,0.86)",
    },

    allCorrectEmoji: {
      marginRight: 8,
      fontSize: 22,
    },

    allCorrectText: {
      fontSize: 13,
      fontWeight: "900",
      color: "#39733C",
    },

    rewardButton: {
      width: "100%",
      minHeight: 62,
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 10,
      paddingHorizontal: 8,
      borderRadius: 31,
      backgroundColor:
        "#1A171C",
    },

    rewardButtonIcon: {
      width: 46,
      textAlign:
        "center",
      fontSize: 22,
    },

    rewardButtonText: {
      flex: 1,
      marginLeft: 7,
      fontSize: 14,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    rewardButtonArrow: {
      marginRight: 16,
      fontSize: 28,
      color: "#FFFFFF",
    },

    unsupportedCard: {
      alignItems:
        "center",
      justifyContent:
        "center",
      minHeight: 240,
    },
  });