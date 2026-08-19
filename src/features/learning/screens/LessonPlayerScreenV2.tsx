import React, { useEffect, useMemo, useState } from "react";
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
import AudioStoryActivity from "../components/AudioStoryActivity";
import AnimatedStoryActivity from "../components/AnimatedStoryActivity";
import DragGameActivity from "../components/DragGameActivity";
import FlashcardActivity from "../components/FlashcardActivity";
import { ImageLessonActivity } from "../components/ImageLessonActivity";
import LetterActivity from "../components/LetterActivity";
import MatchingActivity from "../components/MatchingActivity";
import MimiIntroActivity from "../components/MimiIntroActivity";
import PictureChoiceActivity from "../components/PictureChoiceActivity";
import QuizBattleActivity from "../components/QuizBattleActivity";
import TapCards from "../components/TapActivity";
import UniversalPuzzleActivity from "../components/UniversalPuzzleActivity";
import UniversalMatchingActivity from "../components/UniversalMatchingActivity";
import { VideoActivity } from "../components/VideoActivity";
import VoiceActivity from "../components/VoiceActivity";
import WordBuildActivity from "../components/WordBuildActivity";
import type { Activity } from "../data/curriculum";
import { useCurriculumChapter } from "../hooks/useCurriculumChapter";
import {
  speakLearningVoice,
  speakQuizSummary,
  stopLearningVoice,
} from "../services/learningVoice";
import { progressService } from "../services/progressService";
import {
  DEFAULT_QUIZ_MAX_ATTEMPTS,
  type SubmitQuestionAnswerResult,
  useLessonSessionStore,
} from "../store/lessonSessionStore";
import {
  summarizeQuestionResults,
  type QuestionResult,
  type QuizSummary,
} from "../types/questionResults";
import {
  clampMaxAttempts,
  type ActivityAttemptResult,
} from "../types/attemptPolicy";

const EMPTY_SUMMARY: QuizSummary = {
  total: 0,
  correct: 0,
  needsRetry: 0,
  unanswered: 0,
  totalAttempts: 0,
};

function isQuizActivity(activity: Activity) {
  return activity.type === "quiz" || activity.type === "choice";
}

function isAttemptBasedActivity(activity: Activity) {
  return (
    activity.type === "quiz" ||
    activity.type === "choice" ||
    activity.type === "word_build" ||
    activity.type === "matching" ||
    activity.type === "universal_matching" ||
    activity.type === "picture_choice" ||
    activity.type === "universal_puzzle"
  );
}

function activityMaxAttempts(activity: Activity) {
  switch (activity.type) {
    case "quiz":
    case "choice":
    case "word_build":
    case "matching":
    case "universal_matching":
    case "picture_choice":
    case "universal_puzzle":
      return clampMaxAttempts(
        activity.maxAttempts ?? DEFAULT_QUIZ_MAX_ATTEMPTS,
      );
    default:
      return DEFAULT_QUIZ_MAX_ATTEMPTS;
  }
}

function requiresCompletion(_activity: Activity) {
  return true;
}

function activityInstruction(activity: Activity) {
  switch (activity.type) {
    case "intro":
    case "snippet":
    case "video":
      return activity.title;
    case "audio_story":
      return activity.text;
    case "image_lesson":
      return activity.instruction;
    case "letter":
      return `${activity.letter}। ${activity.sound}`;
    case "picture_choice":
      return activity.question;
    case "quiz":
      return activity.question;
    case "universal_puzzle":
      return activity.voiceText || activity.prompt || activity.expression || activity.pattern || activity.sequenceText || activity.statement || "Puzzle";
    default:
      return activity.prompt;
  }
}

function activityLocale(activity: Activity) {
  switch (activity.type) {
    case "audio_story":
    case "snippet":
    case "letter":
    case "word_build":
    case "tap":
    case "flashcard":
    case "voice":
    case "matching":
    case "universal_matching":
    case "picture_choice":
    case "drag_game":
    case "universal_puzzle":
    case "choice":
    case "quiz":
      return activity.locale;
    default:
      return undefined;
  }
}

function activityLabel(activity: Activity) {
  switch (activity.type) {
    case "intro":
      return ["👋", "শুরু করি"] as const;
    case "snippet":
      return ["📖", "গল্প"] as const;
    case "audio_story":
      return ["🎧", "শুনে শিখি"] as const;
    case "image_lesson":
      return activity.imageUrl
        ? (["🖼️", "ছবি দেখে শিখি"] as const)
        : (["✨", "শিখে নিই"] as const);
    case "video":
      return ["▶️", "ভিডিও"] as const;
    case "letter":
      return ["🔤", "অক্ষর"] as const;
    case "word_build":
      return ["🧩", "শব্দ বানাই"] as const;
    case "tap":
      return ["👆", "চাপ দিয়ে শিখি"] as const;
    case "flashcard":
      return ["🃏", "কার্ড"] as const;
    case "voice":
      return ["🎤", "বলে শিখি"] as const;
    case "matching":
      return ["🔗", "মিল খুঁজি"] as const;
    case "universal_matching":
      return ["🔗", "মিল খুঁজি"] as const;
    case "picture_choice":
      return activity.options.some((option) => option.imageUrl || option.emoji)
        ? (["🔍", "ছবি চিনি"] as const)
        : (["✅", "সঠিকটি বেছে নিই"] as const);
    case "drag_game":
      return ["🎯", "খেলা"] as const;
    case "universal_puzzle":
      return ["🧠", "পাজল"] as const;
    case "choice":
      return ["❓", "প্রশ্ন"] as const;
    case "quiz":
      return ["🏆", "কুইজ"] as const;
  }
}

export default function LessonPlayerScreenV2({ navigation, route }: ScreenProps<"Lesson">) {
  const chapterId = route.params.chapterId;
  const retryIncomplete = route.params.retryIncomplete === true;
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const maxWidth = isTablet ? 820 : 620;
  const sidePadding = width < 360 ? 10 : isTablet ? 28 : 14;

  const { chapter, loading, error, retry } = useCurriculumChapter(chapterId);
  const student = useStudentStore((state) => state.student);
  const completeChapter = useGamificationStore((state) => state.completeChapter);
  const addBadge = useGamificationStore((state) => state.addBadge);
  const awardStars = useGamificationStore((state) => state.awardStars);

  const session = useLessonSessionStore((state) => state.sessions[chapterId]);
  const startOrResume = useLessonSessionStore((state) => state.startOrResume);
  const startFreshRun = useLessonSessionStore((state) => state.startFreshRun);
  const saveStep = useLessonSessionStore((state) => state.setStep);
  const markActivityComplete = useLessonSessionStore((state) => state.markActivityComplete);
  const selectQuestionOption = useLessonSessionStore((state) => state.selectQuestionOption);
  const submitQuestionAnswer = useLessonSessionStore((state) => state.submitQuestionAnswer);
  const markQuestionRewardGranted = useLessonSessionStore(
    (state) => state.markQuestionRewardGranted,
  );
  const resetRetryQuestions = useLessonSessionStore((state) => state.resetRetryQuestions);
  const resetQuestionForRetry = useLessonSessionStore((state) => state.resetQuestionForRetry);
  const clearSession = useLessonSessionStore((state) => state.clearSession);

  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [retryActivityIds, setRetryActivityIds] = useState<string[] | null>(null);
  const [result, setResult] = useState({ score: 100, summary: EMPTY_SUMMARY });
  const [cloudSyncPending, setCloudSyncPending] = useState(false);

  const allActivities = chapter?.activities ?? [];
  const quizIds = useMemo(
    () => allActivities.filter(isQuizActivity).map((item) => item.id),
    [allActivities],
  );
  const gradedActivityIds = useMemo(
    () => allActivities.filter(isAttemptBasedActivity).map((item) => item.id),
    [allActivities],
  );
  const cloudQuizIds = useMemo(
    () =>
      allActivities
        .filter((item) => item.type === "quiz")
        .map((item) => item.id),
    [allActivities],
  );
  const runActivities = useMemo(() => {
    if (!retryActivityIds) return allActivities;
    const ids = new Set(retryActivityIds);
    return allActivities.filter((item) => ids.has(item.id));
  }, [allActivities, retryActivityIds]);

  useEffect(() => {
    if (!chapter) return;

    const previousSession =
      useLessonSessionStore.getState().sessions[
        chapterId
      ];
    const restored =
      !retryIncomplete &&
      previousSession?.lessonCompletedAt
        ? startFreshRun(chapterId)
        : startOrResume(chapterId);

    if (retryIncomplete) {
      const ids = resetRetryQuestions(chapterId);
      if (ids.length > 0) {
        setRetryActivityIds(ids);
        setStep(0);
        setFinished(false);
        return;
      }
    }

    setRetryActivityIds(null);
    setStep(
      Math.min(restored.step, Math.max(0, chapter.activities.length - 1)),
    );
    setFinished(false);
  }, [chapter, chapterId, resetRetryQuestions, retryIncomplete, startFreshRun, startOrResume]);

  useEffect(() => () => {
    void stopLearningVoice();
  }, []);

  const activity = runActivities[step];
  const completedActivityIds = session?.completedActivityIds ?? [];
  const questionResults = session?.questionResults ?? {};
  const questionResult = activity ? questionResults[activity.id] : undefined;
  const currentMaxAttempts = activity
    ? activityMaxAttempts(activity)
    : DEFAULT_QUIZ_MAX_ATTEMPTS;
  const attemptGateUnlocked = Boolean(
    activity &&
      isAttemptBasedActivity(activity) &&
      questionResult &&
      (questionResult.status === "correct" ||
        questionResult.attemptsInRound >= currentMaxAttempts),
  );
  const activityComplete = activity
    ? !requiresCompletion(activity) ||
      completedActivityIds.includes(activity.id) ||
      attemptGateUnlocked
    : false;
  const progress = runActivities.length
    ? ((step + (activityComplete ? 1 : 0)) / runActivities.length) * 100
    : 0;

  const moveToStep = (nextStep: number) => {
    setStep(nextStep);
    if (!retryActivityIds) saveStep(chapterId, nextStep);
    void stopLearningVoice();
  };

  const currentSummary = () =>
    summarizeQuestionResults(
      gradedActivityIds,
      useLessonSessionStore.getState().sessions[chapterId]?.questionResults ?? {},
    );

  const currentQuizSummary = () =>
    summarizeQuestionResults(
      quizIds,
      useLessonSessionStore.getState().sessions[chapterId]?.questionResults ?? {},
    );

  const showResult = (summary: QuizSummary) => {
    const score = summary.total
      ? Math.round((summary.correct / summary.total) * 100)
      : 100;
    setResult({ score, summary });
    setFinished(true);

    if (student?.classLevel === 1) {
      void speakQuizSummary({
        total: summary.total,
        correct: summary.correct,
        remaining: summary.needsRetry + summary.unanswered,
      });
    }
  };

  const finishRun = async () => {
    if (!chapter) return;

    const summary = currentSummary();
    const quizSummary = currentQuizSummary();
    const allQuizCorrect =
      quizSummary.total === 0 || quizSummary.correct === quizSummary.total;
    const score = summary.total
      ? Math.round((summary.correct / summary.total) * 100)
      : 100;
    const chapterBonusStars = score >= 90 ? 3 : score >= 70 ? 2 : 1;

    setCloudSyncPending(false);

    if (student && isSupabaseConfigured && !student.id.startsWith("local-")) {
      try {
        if (allQuizCorrect) {
          await progressService.completeChapter(
            student.id,
            chapter.id,
            cloudQuizIds,
          );
        } else {
          await progressService.syncQuizAttempts(
            student.id,
            chapter.id,
            cloudQuizIds,
          );
        }
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : String(syncError);
        if (__DEV__) console.log("Cloud progress save deferred:", message);
        setCloudSyncPending(true);
      }
    }

    if (!retryActivityIds) {
      completeChapter({
        chapterId: chapter.id,
        nextChapterId: chapter.nextChapterId,
        starsEarned: chapterBonusStars,
        quizScore: score,
      });
      if (chapter.title === "আমার পরিচয়") addBadge("identity_expert");
      clearSession(chapterId);
    }

    showResult(summary);
  };

  const next = async () => {
    if (!activity) return;

    if (!activityComplete) {
      Alert.alert(
        "কাজটি শেষ করো",
        isAttemptBasedActivity(activity)
          ? `উত্তর জমা দাও। ${currentMaxAttempts} বার চেষ্টা করার পরও না হলে পরের ধাপ নিজে থেকেই খুলে যাবে।`
          : "এই শেখার কাজটি শেষ করলে পরের ধাপে যেতে পারবে।",
      );
      return;
    }

    if (step < runActivities.length - 1) {
      moveToStep(step + 1);
      return;
    }

    await finishRun();
  };

  const retryRemaining = () => {
    const ids = resetRetryQuestions(chapterId);
    if (!ids.length) return;
    setRetryActivityIds(ids);
    setStep(0);
    setFinished(false);
  };

  const retryAllQuiz = () => {
    for (const id of quizIds) {
      resetQuestionForRetry(chapterId, id, true);
    }
    setRetryActivityIds(quizIds);
    setStep(0);
    setFinished(false);
  };

  if (loading) {
    return <StateView emoji="⏳" title="পাঠ লোড হচ্ছে..." loading />;
  }

  if (error) {
    return (
      <StateView
        emoji="⚠️"
        title="পাঠটি লোড করা যায়নি"
        helper={error}
        button="আবার চেষ্টা করি"
        onPress={retry}
      />
    );
  }

  if (!chapter || !activity) {
    return (
      <StateView
        emoji="📭"
        title="কোনো activity পাওয়া যায়নি"
        button="Chapter list-এ ফিরি"
        onPress={() => navigation.goBack()}
      />
    );
  }

  if (finished) {
    const remaining = result.summary.needsRetry + result.summary.unanswered;
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[styles.resultScroll, { paddingHorizontal: sidePadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.resultCard, { maxWidth }]}> 
            <Image
              source={require("../../../../assets/characters/mimi/waving.png")}
              style={styles.resultMimi}
              resizeMode="contain"
            />
            <Text style={styles.resultTitle}>আজকের ফলাফল</Text>
            <Text style={styles.resultSubtitle}>তুমি খুব সুন্দরভাবে চেষ্টা করেছো 🌟</Text>

            <View style={styles.resultGrid}>
              <ResultStat label="মোট অনুশীলন" value={result.summary.total} />
              <ResultStat label="সঠিক" value={result.summary.correct} />
              <ResultStat label="আবার করতে হবে" value={remaining} />
              <ResultStat label="মোট চেষ্টা" value={result.summary.totalAttempts} />
            </View>

            <View style={styles.masteryHeader}>
              <Text style={styles.masteryLabel}>অনুশীলনের দক্ষতা</Text>
              <Text style={styles.masteryValue}>{result.score}%</Text>
            </View>
            <View style={styles.masteryTrack}>
              <View style={[styles.masteryFill, { width: `${result.score}%` }]} />
            </View>

            {cloudSyncPending ? (
              <View style={styles.cloudNote}>
                <Text style={styles.cloudNoteIcon}>☁️</Text>
                <View style={styles.cloudNoteCopy}>
                  <Text style={styles.cloudNoteTitle}>ফলাফল এই ডিভাইসে রাখা হয়েছে</Text>
                  <Text style={styles.cloudNoteText}>ইন্টারনেট সিঙ্ক পরে আবার চেষ্টা হবে। তোমার শেখা থামবে না।</Text>
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={() =>
                void speakQuizSummary({
                  total: result.summary.total,
                  correct: result.summary.correct,
                  remaining,
                })
              }
              style={styles.voiceButton}
            >
              <Text style={styles.voiceButtonText}>🔊 ফলাফল শুনি</Text>
            </Pressable>

            {remaining > 0 ? (
              <Pressable onPress={retryRemaining} style={styles.primaryResultButton}>
                <Text style={styles.primaryResultText}>🔁 বাকি {remaining}টি আবার করি</Text>
              </Pressable>
            ) : null}

            {quizIds.length > 0 ? (
              <Pressable onPress={retryAllQuiz} style={styles.secondaryResultButton}>
                <Text style={styles.secondaryResultText}>↻ পুরো কুইজ আবার করি</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={() => navigation.goBack()} style={styles.secondaryResultButton}>
              <Text style={styles.secondaryResultText}>📚 পাঠের তালিকায় ফিরি</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const [icon, label] = activityLabel(activity);
  const instruction = activityInstruction(activity);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <View style={[styles.top, { paddingHorizontal: sidePadding }]}> 
          <View style={[styles.maxWidth, { maxWidth }]}> 
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={styles.chapterTitle} numberOfLines={1}>
                  {retryActivityIds ? `${chapter.title} • আবার অনুশীলন` : chapter.title}
                </Text>
                <Text style={styles.stepText}>ধাপ {step + 1} / {runActivities.length}</Text>
              </View>
              <View style={[styles.statusBadge, activityComplete && styles.statusBadgeDone]}>
                <Text style={styles.statusText}>{activityComplete ? "✓ প্রস্তুত" : "চলছে"}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: sidePadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.activityCard, { maxWidth }]}> 
            <View style={styles.activityHeader}>
              <View style={styles.activityMeta}>
                <View style={styles.iconCircle}><Text style={styles.icon}>{icon}</Text></View>
                <View>
                  <Text style={styles.eyebrow}>শেখার কাজ</Text>
                  <Text style={styles.activityLabel}>{label}</Text>
                </View>
              </View>
              <Pressable
                onPress={() =>
                  void speakLearningVoice(instruction, {
                    language: activityLocale(activity),
                  })
                }
                style={styles.listenButton}
              >
                <Text style={styles.listenText}>🔊 শুনি</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />
            <ActivityRenderer
              key={`${retryActivityIds ? "retry" : "lesson"}-${activity.id}`}
              activity={activity}
              completed={completedActivityIds.includes(activity.id)}
              questionResult={questionResult}
              attempts={questionResult?.attemptsInRound ?? 0}
              maxAttempts={currentMaxAttempts}
              onComplete={() => markActivityComplete(chapterId, activity.id)}
              onActivityAttempt={(correct) => {
                const submitted = submitQuestionAnswer({
                  chapterId,
                  activityId: activity.id,
                  selectedOption: 0,
                  correct,
                  maxAttempts: currentMaxAttempts,
                });

                if (submitted.question.status === "correct") {
                  markActivityComplete(chapterId, activity.id);
                }

                return {
                  attemptsInRound: submitted.question.attemptsInRound,
                  canGoNext: submitted.canGoNext,
                  status: submitted.question.status,
                };
              }}
              onQuestionSelect={(index) =>
                selectQuestionOption(chapterId, activity.id, index)
              }
              onQuestionSubmit={(index, correct) => {
                const submitted = submitQuestionAnswer({
                  chapterId,
                  activityId: activity.id,
                  selectedOption: index,
                  correct,
                  maxAttempts: currentMaxAttempts,
                });
                if (submitted.question.status === "correct") {
                  markActivityComplete(chapterId, activity.id);
                }
                return submitted;
              }}
              onQuestionReward={() => {
                markQuestionRewardGranted(chapterId, activity.id);
                awardStars(1);
              }}
            />
          </View>
        </ScrollView>

        <View style={[styles.actionsWrap, { paddingHorizontal: sidePadding }]}> 
          <View style={[styles.actions, { maxWidth }]}> 
            <Pressable
              onPress={() => (step > 0 ? moveToStep(step - 1) : navigation.goBack())}
              style={styles.backButton}
            >
              <Text style={styles.backText}>‹ আগে</Text>
            </Pressable>
            <Pressable
              disabled={!activityComplete}
              accessibilityState={{ disabled: !activityComplete }}
              onPress={() => void next()}
              style={[styles.nextButton, !activityComplete && styles.nextButtonDisabled]}
            >
              <Text style={styles.nextText}>
                {step === runActivities.length - 1 ? "শেষ করি ✓" : "পরেরটি →"}
              </Text>
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
  attempts,
  maxAttempts,
  onComplete,
  onActivityAttempt,
  onQuestionSelect,
  onQuestionSubmit,
  onQuestionReward,
}: {
  activity: Activity;
  completed: boolean;
  questionResult?: QuestionResult;
  attempts: number;
  maxAttempts: number;
  onComplete: () => void;
  onActivityAttempt: (correct: boolean) => ActivityAttemptResult;
  onQuestionSelect: (index: number) => void;
  onQuestionSubmit: (index: number, correct: boolean) => SubmitQuestionAnswerResult;
  onQuestionReward: () => void;
}) {
  switch (activity.type) {
    case "intro":
      return <MimiIntroActivity activity={activity} onComplete={onComplete} />;
    case "snippet":
      return (
        <AnimatedStoryActivity
          activity={{
            title: activity.title,
            data: {
              lines: activity.lines,
              speechText: activity.speechText,
              imageUrl: activity.imageUrl,
              locale: activity.locale,
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
              locale: activity.locale,
              imageUrl: activity.imageUrl,
            },
          }}
          completed={completed}
          onComplete={onComplete}
        />
      );
    case "image_lesson":
      return (
        <ImageLessonActivity
          activity={{
            title: activity.title,
            instruction: activity.instruction,
            data: { image: activity.imageUrl, description: activity.instruction, sourceLabel: activity.sourceLabel },
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
          autoplay={activity.autoplay}
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
              locale: activity.locale,
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
              locale: activity.locale,
            },
          }}
          attempts={attempts}
          maxAttempts={maxAttempts}
          onAttempt={onActivityAttempt}
          onComplete={onComplete}
        />
      );
    case "tap":
      return (
        <TapCards
          activity={{
            payload: {
              prompt: activity.prompt,
              locale: activity.locale,
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
              locale: activity.locale,
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
              locale: activity.locale,
              imageUrl: activity.imageUrl,
              audioUrl: activity.audioUrl,
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
              locale: activity.locale,
              pairs: activity.pairs,
            },
          }}
          attempts={attempts}
          maxAttempts={maxAttempts}
          onAttempt={onActivityAttempt}
          onComplete={onComplete}
        />
      );
    case "universal_matching":
      return (
        <UniversalMatchingActivity
          activity={activity}
          attempts={attempts}
          maxAttempts={maxAttempts}
          onAttempt={onActivityAttempt}
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
              locale: activity.locale,
              options: activity.options,
              answer: activity.answer,
            },
          }}
          attempts={attempts}
          maxAttempts={maxAttempts}
          onAttempt={onActivityAttempt}
          onComplete={onComplete}
        />
      );
    case "drag_game":
      return (
        <DragGameActivity
          activity={{
            payload: {
              prompt: activity.prompt,
              locale: activity.locale,
              items: activity.items,
            },
          }}
          onComplete={onComplete}
        />
      );
    case "universal_puzzle":
      return (
        <UniversalPuzzleActivity
          activity={activity}
          completed={completed}
          attempts={attempts}
          maxAttempts={maxAttempts}
          onAttempt={onActivityAttempt}
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
          locale={activity.locale}
          maxAttempts={maxAttempts}
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
          locale={activity.locale}
          maxAttempts={maxAttempts}
          result={questionResult}
          onSelectOption={onQuestionSelect}
          onSubmitAnswer={onQuestionSubmit}
          onRewardGranted={onQuestionReward}
        />
      );
  }
}

function StateView({
  emoji,
  title,
  helper,
  loading,
  button,
  onPress,
}: {
  emoji: string;
  title: string;
  helper?: string;
  loading?: boolean;
  button?: string;
  onPress?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.stateView}>
        {loading ? <ActivityIndicator size="large" color="#7653BD" /> : <Text style={styles.stateEmoji}>{emoji}</Text>}
        <Text style={styles.stateTitle}>{title}</Text>
        {helper ? <Text style={styles.stateHelper}>{helper}</Text> : null}
        {button && onPress ? (
          <Pressable onPress={onPress} style={styles.primaryResultButton}>
            <Text style={styles.primaryResultText}>{button}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function ResultStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.resultStat}>
      <Text style={styles.resultStatValue}>{value}</Text>
      <Text style={styles.resultStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F5FB" },
  page: { flex: 1, backgroundColor: "#F8F5FB" },
  maxWidth: { width: "100%", alignSelf: "center" },
  top: { paddingTop: 6, paddingBottom: 10 },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center" },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", elevation: 2 },
  closeText: { marginTop: -3, fontSize: 31, fontWeight: "700", color: "#29242C" },
  headerCopy: { flex: 1, alignItems: "center", marginHorizontal: 8 },
  chapterTitle: { maxWidth: "100%", fontSize: 18, fontWeight: "900", color: "#201C22" },
  stepText: { marginTop: 3, fontSize: 11, fontWeight: "800", color: "#817984" },
  statusBadge: { minWidth: 72, paddingHorizontal: 9, paddingVertical: 7, alignItems: "center", borderRadius: 16, backgroundColor: "#FFF0C8" },
  statusBadgeDone: { backgroundColor: "#DFF5DB" },
  statusText: { fontSize: 9, fontWeight: "900", color: "#4F4752" },
  progressTrack: { height: 8, overflow: "hidden", marginTop: 5, borderRadius: 4, backgroundColor: "#E5E1E8" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: "#7653BD" },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: 4, paddingBottom: 28 },
  activityCard: { width: "100%", alignSelf: "center", padding: 15, borderWidth: 1, borderColor: "#E6E0E9", borderRadius: 30, backgroundColor: "#FFFFFF", elevation: 1 },
  activityHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activityMeta: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#EEE6FF" },
  icon: { fontSize: 23 },
  eyebrow: { marginLeft: 10, fontSize: 9, fontWeight: "900", color: "#9A919E" },
  activityLabel: { marginTop: 2, marginLeft: 10, fontSize: 17, fontWeight: "900", color: "#2B262D" },
  listenButton: { minHeight: 39, paddingHorizontal: 11, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#E9F5FF" },
  listenText: { fontSize: 10, fontWeight: "900", color: "#2678A2" },
  divider: { height: 1, marginTop: 13, marginBottom: 16, backgroundColor: "#EEEAF0" },
  actionsWrap: { paddingTop: 9, paddingBottom: 8, borderTopWidth: 1, borderTopColor: "#ECE6EF", backgroundColor: "#F8F5FB" },
  actions: { width: "100%", minHeight: 58, alignSelf: "center", flexDirection: "row", gap: 9 },
  backButton: { width: 104, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#DCD5E1", borderRadius: 29, backgroundColor: "#FFFFFF" },
  backText: { fontSize: 13, fontWeight: "900", color: "#322C35" },
  nextButton: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 29, backgroundColor: "#7653BD" },
  nextButtonDisabled: { backgroundColor: "#D2CCD6" },
  nextText: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
  resultScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  resultCard: { width: "100%", alignItems: "center", padding: 22, borderRadius: 32, backgroundColor: "#FFFFFF", elevation: 2 },
  resultMimi: { width: 150, height: 150 },
  resultTitle: { marginTop: 4, fontSize: 25, fontWeight: "900", color: "#2B2630" },
  resultSubtitle: { marginTop: 6, fontSize: 13, fontWeight: "700", textAlign: "center", color: "#756D79" },
  resultGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
  resultStat: { width: "48%", minHeight: 76, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F3F8" },
  resultStatValue: { fontSize: 23, fontWeight: "900", color: "#342D38" },
  resultStatLabel: { marginTop: 3, fontSize: 11, fontWeight: "800", color: "#7C7380" },
  masteryHeader: { width: "100%", flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  masteryLabel: { fontSize: 12, fontWeight: "900", color: "#625966" },
  masteryValue: { fontSize: 12, fontWeight: "900", color: "#7653BD" },
  masteryTrack: { width: "100%", height: 11, overflow: "hidden", marginTop: 7, borderRadius: 6, backgroundColor: "#E7E1EA" },
  masteryFill: { height: "100%", borderRadius: 6, backgroundColor: "#7653BD" },
  cloudNote: { width: "100%", marginTop: 14, padding: 13, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF5D9" },
  cloudNoteIcon: { fontSize: 24 },
  cloudNoteCopy: { flex: 1 },
  cloudNoteTitle: { fontSize: 12, fontWeight: "900", color: "#4B424F" },
  cloudNoteText: { marginTop: 2, fontSize: 10, lineHeight: 15, fontWeight: "700", color: "#786F7C" },
  voiceButton: { minHeight: 42, marginTop: 16, paddingHorizontal: 18, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF5FF" },
  voiceButtonText: { fontSize: 12, fontWeight: "900", color: "#287DA4" },
  primaryResultButton: { width: "100%", minHeight: 54, marginTop: 16, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: "#7653BD" },
  primaryResultText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
  secondaryResultButton: { width: "100%", minHeight: 50, marginTop: 9, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "#F1EDF4" },
  secondaryResultText: { fontSize: 13, fontWeight: "900", color: "#4A424E" },
  stateView: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  stateEmoji: { fontSize: 44 },
  stateTitle: { marginTop: 12, fontSize: 20, fontWeight: "900", textAlign: "center", color: "#2B2630" },
  stateHelper: { marginTop: 8, fontSize: 13, lineHeight: 20, textAlign: "center", color: "#756D79" },
});
