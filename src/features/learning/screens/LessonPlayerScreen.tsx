import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import * as Speech from "expo-speech";

import { AppHeader } from "../../../components/AppHeader";
import type { ScreenProps } from "../../../navigation/routes";

import { isSupabaseConfigured } from "../../../config/supabase";

import { colors, shadows } from "../../../theme/theme";

import { useGamificationStore } from "../../gamification/store/gamificationStore";
import { useStudentStore } from "../../student/store/studentStore";

import { type Activity } from "../data/curriculum";

import { useCurriculumChapter } from "../hooks/useCurriculumChapter";

import { progressService } from "../services/progressService";

import { useLessonSessionStore } from "../store/lessonSessionStore";

// Activities

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

// ⭐ Mimi component

import MimiIntroActivity from "../components/MimiIntroActivity";
import AnimatedStoryActivity from "../components/AnimatedStoryActivity";

async function speakBangla(text: string) {
  await Speech.stop();

  Speech.speak(text, {
    language: "bn-BD",
    rate: 0.78,
    pitch: 1,
  });
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
    "voice",
    "matching",
    "picture_choice",
    "drag_game",
    "choice",
    "quiz",
  ].includes(activity.type);
}

function calculateQuizScore(
  activities: Activity[],
  attemptsByActivity: Record<string, number>,
) {
  const quizzes = activities.filter(
    (activity) => activity.type === "quiz" || activity.type === "choice",
  );

  if (!quizzes.length) return 100;

  const total = quizzes.reduce((sum, quiz) => {
    const attempts = Math.max(1, attemptsByActivity[quiz.id] ?? 1);

    return sum + Math.max(40, 100 - (attempts - 1) * 20);
  }, 0);

  return Math.round(total / quizzes.length);
}

export default function LessonPlayerScreen({
  navigation,
  route,
}: ScreenProps<"Lesson">) {
  const chapterId = route.params.chapterId;

  const { chapter, loading, error, retry } = useCurriculumChapter(chapterId);

  const completeChapter = useGamificationStore(
    (state) => state.completeChapter,
  );

  const addBadge = useGamificationStore((state) => state.addBadge);

  const student = useStudentStore((state) => state.student);

  const session = useLessonSessionStore((state) => state.sessions[chapterId]);

  const startOrResume = useLessonSessionStore((state) => state.startOrResume);

  const saveStep = useLessonSessionStore((state) => state.setStep);

  const markActivityComplete = useLessonSessionStore(
    (state) => state.markActivityComplete,
  );

  const recordAttempt = useLessonSessionStore((state) => state.recordAttempt);

  const clearSession = useLessonSessionStore((state) => state.clearSession);

  const [step, setStep] = useState(0);

  const [finished, setFinished] = useState(false);

  const [result, setResult] = useState({
    score: 100,

    points: 30,

    stars: 3,
  });

  useEffect(() => {
    if (!chapter) return;

    const restored = startOrResume(chapterId);

    const safeStep = Math.min(
      restored.step,
      Math.max(0, chapter.activities.length - 1),
    );

    setStep(safeStep);

    setFinished(false);
  }, [chapter, chapterId, startOrResume]);

  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  const activity = chapter?.activities[step];
  console.log("CURRENT ACTIVITY:", JSON.stringify(activity, null, 2));

  const completedActivityIds = session?.completedActivityIds ?? [];

  const attemptsByActivity = session?.attemptsByActivity ?? {};

  const activityComplete = activity
    ? !needsCompletion(activity) || completedActivityIds.includes(activity.id)
    : false;

  const progress = chapter?.activities.length
    ? ((step + (activityComplete ? 1 : 0)) / chapter.activities.length) * 100
    : 0;

  const moveToStep = (nextStep: number) => {
    setStep(nextStep);

    saveStep(chapterId, nextStep);

    void Speech.stop();
  };
  const finishChapter = async () => {
    if (!chapter) return;

    const score = calculateQuizScore(chapter.activities, attemptsByActivity);

    const stars = score >= 90 ? 3 : score >= 70 ? 2 : 1;

    const points = stars === 3 ? 30 : stars === 2 ? 20 : 10;

    completeChapter({
      chapterId: chapter.id,

      nextChapterId: chapter.nextChapterId,

      starsEarned: stars,

      quizScore: score,
    });

    if (chapter.title === "আমার পরিচয়") {
      addBadge("identity_expert");
    }

    if (student && isSupabaseConfigured && !student.id.startsWith("local-")) {
      try {
        await progressService.completeChapter(student.id, chapter.id);
      } catch (syncError) {
        console.warn("Cloud sync failed", syncError);
      }
    }

    setResult({
      score,

      points,

      stars,
    });

    setFinished(true);

    clearSession(chapterId);
  };

  const next = async () => {
    if (!chapter || !activity) return;

    if (!activityComplete) {
      Alert.alert(
        "কাজটি শেষ করো",
        "এই শেখার কাজটি শেষ করলে পরের ধাপে যেতে পারবে।",
      );

      return;
    }

    if (step < chapter.activities.length - 1) {
      moveToStep(step + 1);

      return;
    }

    await finishChapter();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.blue} />

          <Text style={styles.helper}>পাঠ লোড হচ্ছে...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>পাঠটি লোড করা যায়নি</Text>

          <Text style={styles.helper}>{error}</Text>

          <Pressable style={styles.primaryButton} onPress={retry}>
            <Text style={styles.primaryButtonText}>আবার চেষ্টা করি</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  if (!chapter || !activity) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.helper}>কোনো activity পাওয়া যায়নি।</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.reward}>
          <Text style={styles.celebration}>🎈 🎉 🎈</Text>

          <Image
            source={require("../../../../assets/images/tiger.png")}
            style={styles.rewardTiger}
            resizeMode="contain"
          />

          <Text style={styles.rewardTitle}>দারুণ করেছ!</Text>

          <Text style={styles.rewardStars}>{"⭐".repeat(result.stars)}</Text>

          <Text style={styles.rewardText}>Quiz score: {result.score}%</Text>

          <Text style={styles.rewardText}>
            তুমি {result.points} points পেয়েছ
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>Chapter list-এ ফিরি</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <AppHeader title={chapter.title} />

        <View style={styles.stepRow}>
          <Text style={styles.stepText}>
            ধাপ {step + 1}/{chapter.activities.length}
          </Text>

          <Text style={activityComplete ? styles.doneText : styles.todoText}>
            {activityComplete ? "✓ সম্পন্ন" : "কাজ চলছে"}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, progress)}%`,
              },
            ]}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.activityCard}
          showsVerticalScrollIndicator={false}
        >
          <ActivityRenderer
            key={activity.id}
            activity={activity}
            attempts={attemptsByActivity[activity.id] ?? 0}
            completed={completedActivityIds.includes(activity.id)}
            onAttempt={(correct) => {
              recordAttempt(chapterId, activity.id);

              if (correct) {
                markActivityComplete(chapterId, activity.id);
              }
            }}
            onComplete={() => {
              markActivityComplete(chapterId, activity.id);
            }}
          />
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => (step ? moveToStep(step - 1) : navigation.goBack())}
          >
            <Text style={styles.secondaryButtonText}>← আগে</Text>
          </Pressable>

          <Pressable
            style={[styles.nextButton, !activityComplete && styles.disabled]}
            onPress={() => void next()}
          >
            <Text style={styles.nextButtonText}>
              {step === chapter.activities.length - 1 ? "শেষ করি" : "পরেরটি →"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
function ActivityRenderer({
  activity,
  attempts,
  completed,
  onAttempt,
  onComplete,
}: {
  activity: Activity;
  attempts: number;
  completed: boolean;
  onAttempt: (correct: boolean) => void;
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
        <QuestionActivity
          prompt={activity.prompt}
          options={activity.options}
          answer={activity.answer}
          hint={activity.hint}
          attempts={attempts}
          onAttempt={onAttempt}
        />
      );

    case "quiz":
      return (
        <QuestionActivity
          prompt={activity.question}
          options={activity.options}
          answer={activity.answer}
          hint={activity.hint}
          attempts={attempts}
          onAttempt={onAttempt}
        />
      );

    default:
      return (
        <View>
          <Text style={styles.helper}>এই activity দেখানো যাচ্ছে না।</Text>
        </View>
      );
  }
}

function ListenButton({ text }: { text: string }) {
  return (
    <Pressable
      style={styles.listenButton}
      onPress={() => void speakBangla(text)}
    >
      <Text style={styles.listenButtonText}>🔊 শুনে শেখো</Text>
    </Pressable>
  );
}

function QuestionActivity({
  prompt,
  options,
  answer,
  hint,
  attempts,
  onAttempt,
}: {
  prompt: string;

  options: string[];

  answer: number;

  hint: string;

  attempts: number;

  onAttempt: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const [correct, setCorrect] = useState(false);

  const choose = (index: number) => {
    setSelected(index);

    const result = index === answer;

    setCorrect(result);

    onAttempt(result);

    if (result) {
      void speakBangla("সঠিক উত্তর। দারুণ করেছ।");
    }
  };

  return (
    <View>
      <Text style={styles.title}>{prompt}</Text>

      {options.map((option, index) => (
        <Pressable
          key={option}
          style={[
            styles.option,

            selected === index &&
              (correct ? styles.correctOption : styles.wrongOption),
          ]}
          onPress={() => choose(index)}
        >
          <Text style={styles.optionText}>{option}</Text>
        </Pressable>
      ))}

      {selected !== null && !correct ? (
        <Text style={styles.hint}>💡 {hint}</Text>
      ) : null}

      {correct ? <Text style={styles.success}>✓ সঠিক উত্তর!</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  page: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  helper: {
    marginTop: 12,
    textAlign: "center",
    color: colors.muted,
    fontWeight: "700",
  },

  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },

  stepText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.muted,
  },

  doneText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.greenDark,
  },

  todoText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.orange,
  },

  progressTrack: {
    height: 12,
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: "#E7EDF1",
    borderRadius: 8,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.green,
  },

  activityCard: {
    minHeight: 430,

    padding: 18,

    borderRadius: 22,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: colors.border,

    ...shadows.card,
  },

  title: {
    fontSize: 22,

    lineHeight: 29,

    fontWeight: "900",

    color: colors.ink,

    textAlign: "center",
  },

  body: {
    marginTop: 7,

    fontSize: 16,

    lineHeight: 23,

    color: colors.ink,

    fontWeight: "700",

    textAlign: "center",
  },

  speechBubble: {
    marginTop: 15,

    width: "95%",

    padding: 18,

    borderRadius: 22,

    backgroundColor: "#FFF3BF",

    borderWidth: 2,

    borderColor: "#FFB000",

    alignItems: "center",
  },

  listenButton: {
    alignSelf: "center",

    marginTop: 18,

    paddingHorizontal: 22,

    paddingVertical: 13,

    borderRadius: 20,

    backgroundColor: "#DDF5FF",

    borderWidth: 2,

    borderColor: colors.blue,
  },

  listenButtonText: {
    fontWeight: "900",

    fontSize: 16,

    color: "#125C7B",
  },

  poemLine: {
    marginTop: 10,

    fontSize: 17,

    lineHeight: 25,

    fontWeight: "800",

    color: colors.ink,

    textAlign: "center",
  },

  option: {
    marginTop: 12,

    padding: 15,

    borderRadius: 16,

    backgroundColor: "#F7FBFD",

    borderWidth: 2,

    borderColor: "#BFD4E2",
  },

  correctOption: {
    backgroundColor: "#DFF7D8",

    borderColor: colors.green,
  },

  wrongOption: {
    backgroundColor: "#FFE2E2",

    borderColor: colors.red,
  },

  optionText: {
    fontSize: 16,

    fontWeight: "900",

    color: colors.ink,
  },

  hint: {
    marginTop: 14,

    padding: 12,

    borderRadius: 14,

    backgroundColor: "#FFF3BF",

    fontWeight: "800",

    color: colors.ink,
  },

  success: {
    marginTop: 14,

    fontSize: 17,

    fontWeight: "900",

    color: colors.greenDark,

    textAlign: "center",
  },

  actions: {
    flexDirection: "row",

    gap: 10,

    marginTop: 10,
  },

  secondaryButton: {
    flex: 1,

    minHeight: 50,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 18,

    backgroundColor: "#FFFFFF",

    borderWidth: 2,

    borderColor: "#BFD4E2",
  },

  secondaryButtonText: {
    fontWeight: "900",

    color: "#125C7B",
  },

  nextButton: {
    flex: 1.4,

    minHeight: 50,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 18,

    backgroundColor: colors.green,

    borderWidth: 2,

    borderColor: colors.greenDark,
  },

  nextButtonText: {
    fontWeight: "900",

    color: "#FFFFFF",
  },

  disabled: {
    opacity: 0.45,
  },

  primaryButton: {
    marginTop: 18,

    paddingHorizontal: 20,

    paddingVertical: 14,

    borderRadius: 18,

    backgroundColor: colors.green,

    borderWidth: 2,

    borderColor: colors.greenDark,

    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",

    fontWeight: "900",
  },

  reward: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    padding: 24,
  },

  celebration: {
    fontSize: 42,
  },

  rewardTiger: {
    width: 150,

    height: 165,
  },

  rewardTitle: {
    fontSize: 30,

    fontWeight: "900",

    color: colors.greenDark,
  },

  rewardStars: {
    marginTop: 10,

    fontSize: 36,
  },

  rewardText: {
    marginTop: 8,

    fontSize: 16,

    fontWeight: "800",

    color: colors.ink,
  },
});