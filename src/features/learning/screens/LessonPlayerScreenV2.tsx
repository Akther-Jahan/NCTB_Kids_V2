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

import { isSupabaseConfigured } from "../../../config/supabase";
import type { ScreenProps } from "../../../navigation/routes";
import { useGamificationStore } from "../../gamification/store/gamificationStore";
import { useStudentStore } from "../../student/store/studentStore";
import { type Activity } from "../data/curriculum";
import { useCurriculumChapter } from "../hooks/useCurriculumChapter";
import {
  speakLearningVoice,
  speakQuizSummary,
  stopLearningVoice,
} from "../services/learningVoice";
import { progressService } from "../services/progressService";
import {
  DEFAULT_QUIZ_MAX_ATTEMPTS,
  useLessonSessionStore,
} from "../store/lessonSessionStore";
import {
  summarizeQuestionResults,
  type QuizSummary,
} from "../types/questionResults";

import AudioStoryActivity from "../components/AudioStoryActivity";
import LetterActivity from "../components/LetterActivity";
import WordBuildActivity from "../components/WordBuildActivity";
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

const EMPTY_SUMMARY: QuizSummary = {
  total: 0,
  correct: 0,
  needsRetry: 0,
  unanswered: 0,
  totalAttempts: 0,
};

function isQuizActivity(activity: Activity) {
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

export default function LessonPlayerScreenV2({
  navigation,
  route,
}: ScreenProps<"Lesson">) {
  const { width, height } = useWindowDimensions();
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

  const student = useStudentStore(
    (state) => state.student,
  );
  const completeChapter = useGamificationStore(
    (state) => state.completeChapter,
  );
  const addBadge = useGamificationStore(
    (state) => state.addBadge,
  );

  const session = useLessonSessionStore(
    (state) => state.sessions[chapterId],
  );
  const startOrResume = useLessonSessionStore(
    (state) => state.startOrResume,
  );
  const saveStep = useLessonSessionStore(
    (state) => state.setStep,
  );
  const markActivityComplete =
    useLessonSessionStore(
      (state) => state.markActivityComplete,
    );
  const selectQuestionOption =
    useLessonSessionStore(
      (state) => state.selectQuestionOption,
    );
  const submitQuestionAnswer =
    useLessonSessionStore(
      (state) => state.submitQuestionAnswer,
    );
  const markQuestionRewardGranted =
    useLessonSessionStore(
      (state) => state.markQuestionRewardGranted,
    );
  const resetRetryQuestions =
    useLessonSessionStore(
      (state) => state.resetRetryQuestions,
    );
  const clearSession = useLessonSessionStore(
    (state) => state.clearSession,
  );

  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [retryActivityIds, setRetryActivityIds] =
    useState<string[] | null>(null);
  const [result, setResult] = useState({
    score: 100,
    points: 30,
    stars: 3,
    summary: EMPTY_SUMMARY,
  });

  const allActivities = chapter?.activities ?? [];
  const runActivities = useMemo(() => {
    if (!retryActivityIds) {
      return allActivities;
    }

    const retrySet = new Set(retryActivityIds);
    return allActivities.filter((item) =>
      retrySet.has(item.id),
    );
  }, [allActivities, retryActivityIds]);

  const quizIds = useMemo(
    () =>
      allActivities
        .filter(isQuizActivity)
        .map((item) => item.id),
    [allActivities],
  );

  useEffect(() => {
    if (!chapter) {
      return;
    }

    const restored = startOrResume(chapterId);
    const safeStep = Math.min(
      restored.step,
      Math.max(
        0,
        chapter.activities.length - 1,
      ),
    );

    setStep(safeStep);
    setFinished(false);
    setRetryActivityIds(null);
  }, [chapter, chapterId, startOrResume]);

  useEffect(() => {
    return () => {
      void stopLearningVoice();
    };
  }, []);

  const activity = runActivities[step];
  const completedActivityIds =
    session?.completedActivityIds ?? [];
  const questionResults =
    session?.questionResults ?? {};
  const currentQuestionResult = activity
    ? questionResults[activity.id]
    : undefined;

  const activityComplete = activity
    ? !needsCompletion(activity) ||
      completedActivityIds.includes(activity.id) ||
      (isQuizActivity(activity) &&
        Boolean(
          currentQuestionResult &&
            (currentQuestionResult.status ===
              "correct" ||
              currentQuestionResult.attemptsInRound >=
                DEFAULT_QUIZ_MAX_ATTEMPTS),
        ))
    : false;

  const progress = runActivities.length
    ? ((step + (activityComplete ? 1 : 0)) /
        runActivities.length) *
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

  const moveToStep = (nextStep: number) => {
    setStep(nextStep);

    if (!retryActivityIds) {
      saveStep(chapterId, nextStep);
    }

    void stopLearningVoice();
  };

  const buildSummary = () =>
    summarizeQuestionResults(
      quizIds,
      useLessonSessionStore.getState().sessions[
        chapterId
      ]?.questionResults ?? {},
    );

  const showFinishedResult = (
    summary: QuizSummary,
  ) => {
    const score = summary.total
      ? Math.round(
          (summary.correct / summary.total) *
            100,
        )
      : 100;
    const stars =
      score >= 90 ? 3 : score >= 70 ? 2 : 1;
    const points =
      stars === 3 ? 30 : stars === 2 ? 20 : 10;

    setResult({
      score,
      points,
      stars,
      summary,
    });
    setFinished(true);

    if (student?.classLevel === 1) {
      void speakQuizSummary({
        total: summary.total,
        correct: summary.correct,
        remaining:
          summary.needsRetry +
          summary.unanswered,
      });
    }
  };

  const finishChapter = async () => {
    if (!chapter) {
      return;
    }

    const summary = buildSummary();
    const score = summary.total
      ? Math.round(
          (summary.correct / summary.total) *
            100,
        )
      : 100;
    const stars =
      score >= 90 ? 3 : score >= 70 ? 2 : 1;

    if (!retryActivityIds) {
      completeChapter({
        chapterId: chapter.id,
        nextChapterId: chapter.nextChapterId,
        starsEarned: stars,
        quizScore: score,
      });

      if (chapter.title === "আমার পরিচয়") {
        addBadge("identity_expert");
      }
    }

    if (
      student &&
      isSupabaseConfigured &&
      !student.id.startsWith("local-")
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

    showFinishedResult(summary);

    if (!retryActivityIds) {
      clearSession(chapterId);
    }
  };

  const next = async () => {
    if (!chapter || !activity) {
      return;
    }

    if (!activityComplete) {
      Alert.alert(
        "কাজটি শেষ করো",
        isQuizActivity(activity)
          ? "উত্তর জমা দাও। সর্বোচ্চ ৩ বার চেষ্টা করার পরেও পরের প্রশ্নে যেতে পারবে।"
          : "এই শেখার কাজটি শেষ করলে পরের ধাপে যেতে পারবে।",
      );
      return;
    }

    if (step < runActivities.length - 1) {
      moveToStep(step + 1);
      return;
    }

    await finishChapter();
  };

  const goBack = () => {
    if (step > 0) {
      moveToStep(step - 1);
      return;
    }

    navigation.goBack();
  };

  const retryRemaining = () => {
    const retryIds =
      resetRetryQuestions(chapterId);

    if (!retryIds.length) {
      return;
    }

    setRetryActivityIds(retryIds);
    setFinished(false);
    setStep(0);
  };

  const retryAllQuiz = () => {
    const ids = quizIds;

    for (const id of ids) {
      useLessonSessionStore
        .getState()
        .resetQuestionForRetry(
          chapterId,
          id,
        );
    }

    setRetryActivityIds(ids);
    setFinished(false);
    setStep(0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#7653BD"
          />
          <Text style={styles.centerTitle}>
            পাঠ লোড হচ্ছে...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <Text style={styles.centerEmoji}>⚠️</Text>
          <Text style={styles.centerTitle}>
            পাঠটি লোড করা যায়নি
          </Text>
          <Text style={styles.centerHelper}>
            {error}
          </Text>
          <Pressable
            onPress={retry}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              আবার চেষ্টা করি
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!chapter || !activity) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <Text style={styles.centerEmoji}>📭</Text>
          <Text style={styles.centerTitle}>
            কোনো activity পাওয়া যায়নি
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              Chapter list-এ ফিরি
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    const remaining =
      result.summary.needsRetry +
      result.summary.unanswered;

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.resultScroll,
            {
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >
          <View
            style={[
              styles.resultCard,
              { maxWidth },
            ]}
          >
            <Image
              source={require("../../../../assets/characters/mimi/waving.png")}
              style={styles.resultMimi}
              resizeMode="contain"
            />

            <Text style={styles.resultTitle}>
              আজকের ফলাফল
            </Text>
            <Text style={styles.resultSubtitle}>
              তুমি খুব সুন্দরভাবে চেষ্টা করেছো 🌟
            </Text>

            <View style={styles.resultGrid}>
              <ResultStat
                label="মোট প্রশ্ন"
                value={result.summary.total}
              />
              <ResultStat
                label="সঠিক"
                value={result.summary.correct}
              />
              <ResultStat
                label="আবার করতে হবে"
                value={remaining}
              />
              <ResultStat
                label="মোট চেষ্টা"
                value={
                  result.summary.totalAttempts
                }
              />
            </View>

            <View style={styles.masteryRow}>
              <Text style={styles.masteryLabel}>
                Quiz mastery
              </Text>
              <Text style={styles.masteryValue}>
                {result.score}%
              </Text>
            </View>
            <View style={styles.masteryTrack}>
              <View
                style={[
                  styles.masteryFill,
                  {
                    width: `${result.score}%`,
                  },
                ]}
              />
            </View>

            <Pressable
              onPress={() =>
                void speakQuizSummary({
                  total: result.summary.total,
                  correct: result.summary.correct,
                  remaining,
                })
              }
              style={styles.voiceSummaryButton}
            >
              <Text style={styles.voiceSummaryText}>
                🔊 ফলাফল শুনি
              </Text>
            </Pressable>

            {remaining > 0 ? (
              <Pressable
                onPress={retryRemaining}
                style={styles.retryMainButton}
              >
                <Text style={styles.retryMainText}>
                  🔁 বাকি {remaining}টি আবার করি
                </Text>
              </Pressable>
            ) : null}

            {quizIds.length > 0 ? (
              <Pressable
                onPress={retryAllQuiz}
                style={styles.secondaryResultButton}
              >
                <Text
                  style={styles.secondaryResultText}
                >
                  ↻ পুরো Quiz আবার করি
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.secondaryResultButton}
            >
              <Text
                style={styles.secondaryResultText}
              >
                📚 Chapter list-এ ফিরি
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
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
            <View style={styles.header}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>

              <View style={styles.headerCopy}>
                <Text
                  style={styles.chapterTitle}
                  numberOfLines={1}
                >
                  {retryActivityIds
                    ? `${chapter.title} • Practice`
                    : chapter.title}
                </Text>
                <Text style={styles.stepText}>
                  ধাপ {step + 1} /{" "}
                  {runActivities.length}
                </Text>
              </View>

              <View
                style={[
                  styles.completionBadge,
                  activityComplete
                    ? styles.completionBadgeDone
                    : styles.completionBadgeTodo,
                ]}
              >
                <Text style={styles.completionBadgeText}>
                  {activityComplete
                    ? "✓ প্রস্তুত"
                    : "কাজ চলছে"}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
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
          style={styles.activityScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.activityScrollContent,
            {
              paddingHorizontal:
                horizontalPadding,
              paddingBottom: isShortScreen
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
                padding: activityPadding,
                minHeight: isTablet
                  ? 560
                  : isShortScreen
                    ? 390
                    : 470,
              },
            ]}
          >
            <View style={styles.activityHeader}>
              <View style={styles.activityMeta}>
                <View
                  style={styles.activityIconCircle}
                >
                  <Text style={styles.activityIcon}>
                    {activityMeta.icon}
                  </Text>
                </View>
                <View>
                  <Text style={styles.activityEyebrow}>
                    ACTIVITY
                  </Text>
                  <Text style={styles.activityLabel}>
                    {activityMeta.label}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() =>
                  void speakLearningVoice(
                    activityMeta.instruction,
                  )
                }
                style={styles.listenButton}
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

            <View style={styles.activityDivider} />

            <View style={styles.rendererWrap}>
              <ActivityRenderer
                key={`${
                  retryActivityIds ? "retry" : "lesson"
                }-${activity.id}`}
                activity={activity}
                completed={completedActivityIds.includes(
                  activity.id,
                )}
                questionResult={
                  currentQuestionResult
                }
                onComplete={() => {
                  markActivityComplete(
                    chapterId,
                    activity.id,
                  );
                }}
                onQuestionSelect={(index) => {
                  selectQuestionOption(
                    chapterId,
                    activity.id,
                    index,
                  );
                }}
                onQuestionSubmit={(
                  index,
                  correct,
                ) => {
                  const submitResult =
                    submitQuestionAnswer({
                      chapterId,
                      activityId: activity.id,
                      selectedOption: index,
                      correct,
                      maxAttempts:
                        DEFAULT_QUIZ_MAX_ATTEMPTS,
                    });

                  if (submitResult.canGoNext) {
                    markActivityComplete(
                      chapterId,
                      activity.id,
                    );
                  }

                  return submitResult;
                }}
                onQuestionReward={() => {
                  markQuestionRewardGranted(
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
              onPress={goBack}
              style={styles.backButton}
            >
              <Text style={styles.backButtonIcon}>
                ‹
              </Text>
              <Text style={styles.backButtonText}>
                আগে
              </Text>
            </Pressable>

            <Pressable
              accessibilityState={{
                disabled: !activityComplete,
              }}
              disabled={!activityComplete}
              onPress={() => void next()}
              style={[
                styles.nextButton,
                !activityComplete &&
                  styles.nextButtonDisabled,
              ]}
            >
              <Text style={styles.nextButtonText}>
                {step === runActivities.length - 1
                  ? retryActivityIds
                    ? "Practice শেষ করি"
                    : "শেষ করি"
                  : "পরেরটি"}
              </Text>
              <View style={styles.nextArrowCircle}>
                <Text style={styles.nextArrow}>
                  {step === runActivities.length - 1
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
  completed,
  questionResult,
  onComplete,
  onQuestionSelect,
  onQuestionSubmit,
  onQuestionReward,
}: {
  activity: Activity;
  completed: boolean;
  questionResult?: import("../types/questionResults").QuestionResult;
  onComplete: () => void;
  onQuestionSelect: (index: number) => void;
  onQuestionSubmit: (
    index: number,
    correct: boolean,
  ) => ReturnType<
    typeof useLessonSessionStore.getState
  >["submitQuestionAnswer"] extends (
    input: never,
  ) => infer R
    ? R
    : never;
  onQuestionReward: () => void;
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
              buttonText: "পরেরটি 🚀",
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
            instruction: activity.instruction,
            data: {
              image: activity.imageUrl,
              description: activity.instruction,
              sourceLabel: activity.sourceLabel,
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
              letter: activity.letter,
              sound: activity.sound,
              examples: activity.examples,
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
              prompt: activity.prompt,
              letters: activity.letters,
              answer: activity.answer,
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
              prompt: activity.prompt,
              items: activity.items,
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
              prompt: activity.prompt,
              cards: activity.cards,
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
              prompt: activity.prompt,
              word: activity.word,
              emoji: activity.emoji,
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
              prompt: activity.prompt,
              pairs: activity.pairs,
            },
          }}
          onComplete={onComplete}
        />
      );
    case "picture_choice":
      return (
        <PictureChoiceActivity
          activity={{
            title: "ছবি চিনে নেই",
            data: {
              question: activity.question,
              options: activity.options,
              answer: activity.answer,
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
              prompt: activity.prompt,
              items: activity.items,
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
          maxAttempts={DEFAULT_QUIZ_MAX_ATTEMPTS}
          result={questionResult}
          onSelectOption={onQuestionSelect}
          onSubmitAnswer={onQuestionSubmit}
          onRewardGranted={onQuestionReward}
        />
      );
    case "quiz":
      return (
        <QuizBattleActivity
          prompt={activity.question}
          options={activity.options}
          answer={activity.answer}
          hint={activity.hint}
          maxAttempts={DEFAULT_QUIZ_MAX_ATTEMPTS}
          result={questionResult}
          onSelectOption={onQuestionSelect}
          onSubmitAnswer={onQuestionSubmit}
          onRewardGranted={onQuestionReward}
        />
      );
    default:
      return (
        <View style={styles.unsupportedCard}>
          <Text style={styles.centerEmoji}>🧩</Text>
          <Text style={styles.centerHelper}>
            এই activity দেখানো যাচ্ছে না।
          </Text>
        </View>
      );
  }
}

function ResultStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.resultStat}>
      <Text style={styles.resultStatValue}>
        {value}
      </Text>
      <Text style={styles.resultStatLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F3F8",
  },
  page: {
    flex: 1,
    backgroundColor: "#F6F3F8",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerEmoji: {
    fontSize: 44,
  },
  centerTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    color: "#2B2630",
  },
  centerHelper: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: "#756D79",
  },
  primaryButton: {
    minHeight: 50,
    minWidth: 190,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    borderRadius: 25,
    backgroundColor: "#7653BD",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  topShell: {
    paddingTop: 5,
    paddingBottom: 9,
  },
  topInner: {
    width: "100%",
    alignSelf: "center",
  },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  closeText: {
    marginTop: -3,
    fontSize: 30,
    color: "#29242C",
  },
  headerCopy: {
    flex: 1,
    alignItems: "center",
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
    minWidth: 72,
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 16,
  },
  completionBadgeDone: {
    backgroundColor: "#DFF5DB",
  },
  completionBadgeTodo: {
    backgroundColor: "#FFF0C8",
  },
  completionBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#4F4752",
  },
  progressTrack: {
    height: 8,
    overflow: "hidden",
    marginTop: 5,
    borderRadius: 4,
    backgroundColor: "#E5E1E8",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#7653BD",
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
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#E1DCE5",
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    shadowColor: "#77707C",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIconCircle: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: "#EEE6FF",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    borderRadius: 20,
    backgroundColor: "#E9F5FF",
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
    backgroundColor: "#EEEAF0",
  },
  rendererWrap: {
    flex: 1,
  },
  unsupportedCard: {
    alignItems: "center",
    paddingVertical: 30,
  },
  actionShell: {
    paddingTop: 8,
    paddingBottom: 7,
  },
  actions: {
    width: "100%",
    minHeight: 58,
    flexDirection: "row",
    alignSelf: "center",
    gap: 9,
  },
  backButton: {
    width: 102,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#D5CFD9",
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
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
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 21,
    paddingRight: 7,
    borderRadius: 29,
    backgroundColor: "#1A171C",
  },
  nextButtonDisabled: {
    backgroundColor: "#C8C3CC",
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
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#C98BFF",
  },
  nextArrow: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  resultScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  resultCard: {
    width: "100%",
    alignItems: "center",
    padding: 22,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
  },
  resultMimi: {
    width: 150,
    height: 150,
  },
  resultTitle: {
    marginTop: 4,
    fontSize: 25,
    fontWeight: "900",
    color: "#2B2630",
  },
  resultSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    color: "#756D79",
  },
  resultGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },
  resultStat: {
    width: "48%",
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#F6F3F8",
  },
  resultStatValue: {
    fontSize: 23,
    fontWeight: "900",
    color: "#342D38",
  },
  resultStatLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "800",
    color: "#7C7380",
  },
  masteryRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  masteryLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#625966",
  },
  masteryValue: {
    fontSize: 12,
    fontWeight: "900",
    color: "#7653BD",
  },
  masteryTrack: {
    width: "100%",
    height: 11,
    overflow: "hidden",
    marginTop: 7,
    borderRadius: 6,
    backgroundColor: "#E7E1EA",
  },
  masteryFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#7653BD",
  },
  voiceSummaryButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: "#EAF5FF",
  },
  voiceSummaryText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#287DA4",
  },
  retryMainButton: {
    width: "100%",
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderRadius: 27,
    backgroundColor: "#7653BD",
  },
  retryMainText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  secondaryResultButton: {
    width: "100%",
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
    borderRadius: 25,
    backgroundColor: "#F1EDF4",
  },
  secondaryResultText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#4A424E",
  },
});
