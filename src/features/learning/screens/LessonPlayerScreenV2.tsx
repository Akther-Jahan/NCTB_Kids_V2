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

function requiresCompletion(activity: Activity) {
  return activity.type !== "audio_story";
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
    default:
      return activity.prompt;
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
      return ["🖼️", "ছবি দেখে শিখি"] as const;
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
    case "picture_choice":
      return ["🔍", "ছবি চিনি"] as const;
    case "drag_game":
      return ["🎯", "খেলা"] as const;
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

  const allActivities = chapter?.activities ?? [];
  const quizIds = useMemo(
    () => allActivities.filter(isQuizActivity).map((item) => item.id),
    [allActivities],
  );
  const runActivities = useMemo(() => {
    if (!retryActivityIds) return allActivities;
    const ids = new Set(retryActivityIds);
    return allActivities.filter((item) => ids.has(item.id));
  }, [allActivities, retryActivityIds]);

  useEffect(() => {
    if (!chapter) return;

    const restored = startOrResume(chapterId);

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
  }, [chapter, chapterId, resetRetryQuestions, retryIncomplete, startOrResume]);

  useEffect(() => () => {
    void stopLearningVoice();
  }, []);

  const activity = runActivities[step];
  const completedActivityIds = session?.completedActivityIds ?? [];
  const questionResults = session?.questionResults ?? {};
  const questionResult = activity ? questionResults[activity.id] : undefined;
  const activityComplete = activity
    ? !requiresCompletion(activity) ||
      completedActivityIds.includes(activity.id) ||
      (isQuizActivity(activity) &&
        Boolean(
          questionResult &&
            (questionResult.status === "correct" ||
              questionResult.attemptsInRound >= DEFAULT_QUIZ_MAX_ATTEMPTS),
        ))
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
    const allQuizCorrect = summary.total === 0 || summary.correct === summary.total;
    const score = summary.total
      ? Math.round((summary.correct / summary.total) * 100)
      : 100;
    const chapterBonusStars = score >= 90 ? 3 : score >= 70 ? 2 : 1;

    if (student && isSupabaseConfigured && !student.id.startsWith("local-")) {
      try {
        if (allQuizCorrect) {
          await progressService.completeChapter(student.id, chapter.id);
        } else {
          await progressService.syncQuizAttempts(student.id, chapter.id);
        }
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : String(syncError);
        console.error("Cloud progress save failed:", message);
        Alert.alert("Cloud progress save হয়নি", message);
        return;
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
        isQuizActivity(activity)
          ? "একটি উত্তর বেছে নিয়ে জমা দাও। সর্বোচ্চ ৩ বার ভুল হলে পরের প্রশ্নে যেতে পারবে।"
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
              <ResultStat label="মোট প্রশ্ন" value={result.summary.total} />
              <ResultStat label="সঠিক" value={result.summary.correct} />
              <ResultStat label="আবার করতে হবে" value={remaining} />
              <ResultStat label="মোট চেষ্টা" value={result.summary.totalAttempts} />
            </View>

            <View style={styles.masteryHeader}>
              <Text style={styles.masteryLabel}>Quiz mastery</Text>
              <Text style={styles.masteryValue}>{result.score}%</Text>
            </View>
            <View style={styles.masteryTrack}>
              <View style={[styles.masteryFill, { width: `${result.score}%` }]} />
            </View>

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
                <Text style={styles.secondaryResultText}>↻ পুরো Quiz আবার করি</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={() => navigation.goBack()} style={styles.secondaryResultButton}>
              <Text style={styles.secondaryResultText}>📚 Chapter list-এ ফিরি</Text>
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
                  {retryActivityIds ? `${chapter.title} • Practice` : chapter.title}
                </Text>
                <Text style={styles.stepText}>ধাপ {step + 1} / {runActivities.length}</Text>
              </View>
              <View style={[styles.statusBadge, activityComplete && styles.statusBadgeDone]}>
                <Text style={styles.statusText}>{activityComplete ? "✓ প্রস্তুত" : "কাজ চলছে"}</Text>
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
                  <Text style={styles.eyebrow}>ACTIVITY</Text>
                  <Text style={styles.activityLabel}>{label}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => void speakLearningVoice(instruction)}
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
              onComplete={() => markActivityComplete(chapterId, activity.id)}
              onQuestionSelect={(index) =>
                selectQuestionOption(chapterId, activity.id, index)
              }
              onQuestionSubmit={(index, correct) => {
                const submitted = submitQuestionAnswer({
                  chapterId,
                  activityId: activity.id,
                  selectedOption: index,
                  correct,
                  maxAttempts: DEFAULT_QUIZ_MAX_ATTEMPTS,
                });
                if (submitted.canGoNext) {
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
  onComplete,
  onQuestionSelect,
  onQuestionSubmit,
  onQuestionReward,
}: {
  activity: Activity;
  completed: boolean;
  questionResult?: QuestionResult;
  onComplete: () => void;
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
          activity={{ title: activity.title, data: { lines: activity.lines, buttonText: "পরেরটি 🚀" } }}
          onComplete={onComplete}
        />
      );
    case "audio_story":
      return <AudioStoryActivity activity={{ payload: { title: activity.title, text: activity.text, audio: activity.audio } }} />;
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
      return <VideoActivity title={activity.title} url={activity.url} completed={completed} onComplete={onComplete} />;
    case "letter":
      return (
        <LetterActivity
          activity={{ title: "অক্ষর শিখি", data: { letter: activity.letter, sound: activity.sound, examples: activity.examples } }}
          onComplete={onComplete}
        />
      );
    case "word_build":
      return (
        <WordBuildActivity
          activity={{ title: "শব্দ বানাই", data: { prompt: activity.prompt, letters: activity.letters, answer: activity.answer } }}
          onComplete={onComplete}
        />
      );
    case "tap":
      return <TapCards activity={{ payload: { prompt: activity.prompt, items: activity.items } }} onComplete={onComplete} />;
    case "flashcard":
      return <FlashcardActivity activity={{ payload: { prompt: activity.prompt, cards: activity.cards } }} onComplete={onComplete} />;
    case "voice":
      return <VoiceActivity activity={{ payload: { prompt: activity.prompt, word: activity.word, emoji: activity.emoji } }} onComplete={onComplete} />;
    case "matching":
      return <MatchingActivity activity={{ payload: { prompt: activity.prompt, pairs: activity.pairs } }} onComplete={onComplete} />;
    case "picture_choice":
      return (
        <PictureChoiceActivity
          activity={{ title: "ছবি চিনে নেই", data: { question: activity.question, options: activity.options, answer: activity.answer } }}
          onComplete={onComplete}
        />
      );
    case "drag_game":
      return <DragGameActivity activity={{ payload: { prompt: activity.prompt, items: activity.items } }} onComplete={onComplete} />;
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
  safe: { flex: 1, backgroundColor: "#F6F3F8" },
  page: { flex: 1, backgroundColor: "#F6F3F8" },
  maxWidth: { width: "100%", alignSelf: "center" },
  top: { paddingTop: 5, paddingBottom: 9 },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center" },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  closeText: { marginTop: -3, fontSize: 30, color: "#29242C" },
  headerCopy: { flex: 1, alignItems: "center", marginHorizontal: 8 },
  chapterTitle: { maxWidth: "100%", fontSize: 16, fontWeight: "900", color: "#201C22" },
  stepText: { marginTop: 2, fontSize: 10, fontWeight: "800", color: "#817984" },
  statusBadge: { minWidth: 72, paddingHorizontal: 9, paddingVertical: 7, alignItems: "center", borderRadius: 16, backgroundColor: "#FFF0C8" },
  statusBadgeDone: { backgroundColor: "#DFF5DB" },
  statusText: { fontSize: 9, fontWeight: "900", color: "#4F4752" },
  progressTrack: { height: 8, overflow: "hidden", marginTop: 5, borderRadius: 4, backgroundColor: "#E5E1E8" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: "#7653BD" },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: 3, paddingBottom: 18 },
  activityCard: { width: "100%", minHeight: 470, alignSelf: "center", padding: 16, borderWidth: 1, borderColor: "#E1DCE5", borderRadius: 27, backgroundColor: "#FFFFFF" },
  activityHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activityMeta: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#EEE6FF" },
  icon: { fontSize: 23 },
  eyebrow: { marginLeft: 10, fontSize: 8, letterSpacing: 1.3, fontWeight: "900", color: "#9A919E" },
  activityLabel: { marginTop: 2, marginLeft: 10, fontSize: 15, fontWeight: "900", color: "#2B262D" },
  listenButton: { minHeight: 39, paddingHorizontal: 11, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#E9F5FF" },
  listenText: { fontSize: 10, fontWeight: "900", color: "#2678A2" },
  divider: { height: 1, marginTop: 13, marginBottom: 16, backgroundColor: "#EEEAF0" },
  actionsWrap: { paddingTop: 8, paddingBottom: 7 },
  actions: { width: "100%", minHeight: 58, alignSelf: "center", flexDirection: "row", gap: 9 },
  backButton: { width: 102, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#D5CFD9", borderRadius: 29, backgroundColor: "#FFFFFF" },
  backText: { fontSize: 13, fontWeight: "900", color: "#322C35" },
  nextButton: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 29, backgroundColor: "#1A171C" },
  nextButtonDisabled: { backgroundColor: "#C8C3CC" },
  nextText: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
  resultScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  resultCard: { width: "100%", alignItems: "center", padding: 22, borderRadius: 30, backgroundColor: "#FFFFFF" },
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
