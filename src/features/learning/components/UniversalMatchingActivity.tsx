import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { UniversalMatchingActivity as UniversalMatching } from "../data/curriculum";
import { speakLearningVoice, stopLearningVoice } from "../services/learningVoice";
import {
  clampMaxAttempts,
  type ActivityAttemptResult,
} from "../types/attemptPolicy";

type Props = {
  activity: UniversalMatching;
  attempts?: number;
  maxAttempts?: number;
  onComplete: () => void;
  onAttempt?: (correct: boolean) => ActivityAttemptResult;
};

function SideContent({
  text,
  imageUrl,
  emoji,
}: {
  text?: string;
  imageUrl?: string;
  emoji?: string;
}) {
  return (
    <View style={styles.sideContent}>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" /> : null}
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      {text ? <Text style={styles.sideText}>{text}</Text> : null}
    </View>
  );
}

export default function UniversalMatchingActivity({
  activity,
  attempts = 0,
  maxAttempts,
  onComplete,
  onAttempt,
}: Props) {
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [feedback, setFeedback] = useState("");
  const [wrong, setWrong] = useState(false);
  const [localAttempts, setLocalAttempts] = useState(attempts);
  const [continueUnlocked, setContinueUnlocked] = useState(false);
  const limit = clampMaxAttempts(maxAttempts ?? activity.maxAttempts);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setLocalAttempts(attempts);
    setContinueUnlocked(attempts >= limit);
  }, [attempts, limit]);

  useEffect(() => {
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatched([]);
    setFeedback("");
    setWrong(false);
    completedRef.current = false;

    const timer = setTimeout(() => {
      if (activity.prompt.trim()) void speakLearningVoice(activity.prompt);
    }, 300);

    if (activity.pairs.length === 0) {
      completedRef.current = true;
      onCompleteRef.current();
    }

    return () => {
      clearTimeout(timer);
      void stopLearningVoice();
    };
  }, [activity.id, activity.pairs.length, activity.prompt]);

  const rightChoices = useMemo(
    () => activity.pairs.map((pair, pairIndex) => ({ pairIndex, pair })).reverse(),
    [activity.pairs],
  );

  const registerAttempt = (correct: boolean) => {
    const result = onAttempt?.(correct);
    const nextAttempts = result?.attemptsInRound ?? localAttempts + 1;
    const unlocked = result?.canGoNext ?? (correct || nextAttempts >= limit);
    setLocalAttempts(nextAttempts);
    setContinueUnlocked(unlocked && !correct);
    return unlocked;
  };

  const check = (leftIndex: number, rightIndex: number) => {
    const target = rightChoices[rightIndex];
    if (!target) return;

    if (target.pairIndex === leftIndex) {
      const next = matched.includes(leftIndex) ? matched : [...matched, leftIndex];
      setMatched(next);
      setWrong(false);
      setFeedback("Correct match ✅");
      setSelectedLeft(null);
      setSelectedRight(null);

      if (next.length === activity.pairs.length && !completedRef.current) {
        registerAttempt(true);
        completedRef.current = true;
        setContinueUnlocked(false);
        setFeedback("All pairs matched! 🎉");
        onCompleteRef.current();
      }
      return;
    }

    const unlocked = registerAttempt(false);
    setWrong(true);
    setFeedback(
      unlocked
        ? "Not a match yet. Next is unlocked — you can keep practicing."
        : "Not a match yet. Try again 🙂",
    );
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  const chooseLeft = (index: number) => {
    if (matched.includes(index) || completedRef.current) return;
    setSelectedLeft(index);
    setWrong(false);
    setFeedback("");
    if (selectedRight !== null) check(index, selectedRight);
  };

  const chooseRight = (index: number) => {
    const target = rightChoices[index];
    if (!target || matched.includes(target.pairIndex) || completedRef.current) return;
    setSelectedRight(index);
    setWrong(false);
    setFeedback("");
    if (selectedLeft !== null) check(selectedLeft, index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>MATCHING</Text>
          <Text style={styles.title}>Find each pair</Text>
        </View>
        <View style={styles.attemptBadge}>
          <Text style={styles.attemptLabel}>TRY</Text>
          <Text style={styles.attemptValue}>{Math.min(localAttempts + 1, limit)}/{limit}</Text>
        </View>
        <Pressable onPress={() => void speakLearningVoice(activity.prompt)} style={styles.listenButton}>
          <Text style={styles.listenText}>🔊</Text>
        </Pressable>
      </View>

      {activity.prompt ? <Text style={styles.prompt}>{activity.prompt}</Text> : null}
      {continueUnlocked && !completedRef.current ? (
        <Text style={styles.unlockedText}>✓ Next is unlocked. You can keep matching.</Text>
      ) : null}
      <Text style={styles.progress}>{matched.length}/{activity.pairs.length} matched</Text>

      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Left</Text>
          {activity.pairs.map((pair, index) => {
            const done = matched.includes(index);
            const active = selectedLeft === index;
            return (
              <Pressable
                key={`left-${pair.id}`}
                disabled={done || completedRef.current}
                onPress={() => chooseLeft(index)}
                style={[styles.card, active && styles.cardActive, done && styles.cardDone]}
              >
                <SideContent text={pair.leftText} imageUrl={pair.leftImageUrl} />
                {done ? <Text style={styles.done}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.column}>
          <Text style={styles.columnTitle}>Right</Text>
          {rightChoices.map(({ pair, pairIndex }, index) => {
            const done = matched.includes(pairIndex);
            const active = selectedRight === index;
            return (
              <Pressable
                key={`right-${pair.id}`}
                disabled={done || completedRef.current}
                onPress={() => chooseRight(index)}
                style={[styles.card, active && styles.cardActive, done && styles.cardDone]}
              >
                <SideContent text={pair.rightText} imageUrl={pair.rightImageUrl} emoji={pair.rightEmoji} />
                {done ? <Text style={styles.done}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {feedback ? (
        <View style={[styles.feedback, wrong ? styles.feedbackWrong : styles.feedbackCorrect]}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerCopy: { flex: 1 },
  attemptBadge: { minWidth: 58, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, alignItems: "center", backgroundColor: "#F2ECFF" },
  attemptLabel: { fontSize: 8, fontWeight: "900", color: "#897D92" },
  attemptValue: { marginTop: 1, fontSize: 12, fontWeight: "900", color: "#7653BD" },
  unlockedText: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, fontSize: 12, fontWeight: "800", textAlign: "center", color: "#287DA4", backgroundColor: "#EAF5FF" },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, fontWeight: "900", color: "#8B8190" },
  title: { marginTop: 3, fontSize: 22, fontWeight: "900", color: "#2A242D" },
  listenButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF5FF" },
  listenText: { fontSize: 20 },
  prompt: { marginTop: 12, fontSize: 16, lineHeight: 23, fontWeight: "800", color: "#574F5B" },
  progress: { marginTop: 10, fontSize: 12, fontWeight: "900", color: "#7653BD" },
  columns: { flexDirection: "row", gap: 10, marginTop: 16, alignItems: "flex-start" },
  column: { flex: 1, gap: 9 },
  columnTitle: { fontSize: 11, fontWeight: "900", textAlign: "center", color: "#776E7B" },
  card: { minHeight: 92, padding: 9, borderWidth: 2, borderColor: "#DDD5E4", borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  cardActive: { borderColor: "#7653BD", backgroundColor: "#F0E9FF" },
  cardDone: { borderColor: "#A9D7A3", backgroundColor: "#E7F7E4", opacity: 0.72 },
  sideContent: { alignItems: "center", justifyContent: "center", gap: 5 },
  image: { width: 58, height: 52 },
  emoji: { fontSize: 28 },
  sideText: { fontSize: 15, lineHeight: 20, fontWeight: "900", textAlign: "center", color: "#352F39" },
  done: { position: "absolute", top: 5, right: 7, fontSize: 15, fontWeight: "900", color: "#3F8B39" },
  feedback: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 },
  feedbackCorrect: { backgroundColor: "#E4F7E2" },
  feedbackWrong: { backgroundColor: "#FFF0E7" },
  feedbackText: { fontSize: 13, fontWeight: "800", textAlign: "center", color: "#443B47" },
});
