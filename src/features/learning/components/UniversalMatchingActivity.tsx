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
      {!imageUrl && emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      {text ? (
        <Text
          style={styles.sideText}
          numberOfLines={4}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
        >
          {text}
        </Text>
      ) : null}
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
      if (activity.prompt.trim()) {
        void speakLearningVoice(activity.prompt, { language: activity.locale });
      }
    }, 300);

    if (activity.pairs.length === 0) {
      completedRef.current = true;
      onCompleteRef.current();
    }

    return () => {
      clearTimeout(timer);
      void stopLearningVoice();
    };
  }, [activity.id, activity.locale, activity.pairs.length, activity.prompt]);

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
      setFeedback("দারুণ! জোড়াটি মিলেছে ✅");
      setSelectedLeft(null);
      setSelectedRight(null);

      if (next.length === activity.pairs.length && !completedRef.current) {
        registerAttempt(true);
        completedRef.current = true;
        setContinueUnlocked(false);
        setFeedback("সবগুলো জোড়া মিলেছে! 🎉");
        onCompleteRef.current();
      }
      return;
    }

    const unlocked = registerAttempt(false);
    setWrong(true);
    setFeedback(
      unlocked
        ? "এটা মেলেনি। পরের ধাপ খুলে গেছে—চাইলে আরও অনুশীলন করো।"
        : "এটা মেলেনি। আরেকবার চেষ্টা করো 🙂",
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
        <View style={styles.headerIcon}><Text style={styles.headerIconText}>🔗</Text></View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>মিল খুঁজি</Text>
          <Text style={styles.title}>সঠিক জোড়াটি খুঁজে বের করো</Text>
        </View>
        <View style={styles.attemptBadge}>
          <Text style={styles.attemptLabel}>চেষ্টা</Text>
          <Text style={styles.attemptValue}>{Math.min(localAttempts + 1, limit)}/{limit}</Text>
        </View>
      </View>

      <View style={styles.missionCard}>
        <Text style={styles.missionIcon}>🎯</Text>
        <Text style={styles.prompt}>{activity.prompt || "এক পাশ থেকে একটি কার্ড, তারপর অন্য পাশ থেকে তার জোড়াটি বেছে নাও।"}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="নির্দেশনা শুনি"
          onPress={() => void speakLearningVoice(activity.prompt, { language: activity.locale })}
          style={styles.listenButton}
        >
          <Text style={styles.listenText}>🔊</Text>
        </Pressable>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>মিলেছে</Text>
        <Text style={styles.progressValue}>{matched.length}/{activity.pairs.length}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${activity.pairs.length ? (matched.length / activity.pairs.length) * 100 : 0}%` },
          ]}
        />
      </View>

      {continueUnlocked && !completedRef.current ? (
        <View style={styles.unlockedBanner}>
          <Text style={styles.unlockedText}>✓ পরের ধাপ খুলে গেছে। চাইলে এখানেই আরও মিলিয়ে দেখতে পারো।</Text>
        </View>
      ) : null}

      <View style={styles.columnLabels}>
        <Text style={styles.columnLabel}>প্রথম দিক</Text>
        <Text style={styles.columnLabel}>জোড়া দিক</Text>
      </View>

      <View style={styles.rows}>
        {activity.pairs.map((leftPair, rowIndex) => {
          const rightChoice = rightChoices[rowIndex];
          const leftDone = matched.includes(rowIndex);
          const rightDone = rightChoice ? matched.includes(rightChoice.pairIndex) : false;
          const leftActive = selectedLeft === rowIndex;
          const rightActive = selectedRight === rowIndex;

          return (
            <View key={`match-row-${leftPair.id}`} style={styles.matchRow}>
              <Pressable
                disabled={leftDone || completedRef.current}
                onPress={() => chooseLeft(rowIndex)}
                style={[styles.card, leftActive && styles.cardActive, leftDone && styles.cardDone]}
              >
                <SideContent text={leftPair.leftText} imageUrl={leftPair.leftImageUrl} />
                {leftDone ? <Text style={styles.done}>✓</Text> : null}
              </Pressable>

              <View style={[styles.connector, leftDone && styles.connectorDone]}>
                <Text style={styles.connectorText}>{leftDone ? "✓" : "↔"}</Text>
              </View>

              {rightChoice ? (
                <Pressable
                  disabled={rightDone || completedRef.current}
                  onPress={() => chooseRight(rowIndex)}
                  style={[styles.card, rightActive && styles.cardActive, rightDone && styles.cardDone]}
                >
                  <SideContent
                    text={rightChoice.pair.rightText}
                    imageUrl={rightChoice.pair.rightImageUrl}
                    emoji={rightChoice.pair.rightEmoji}
                  />
                  {rightDone ? <Text style={styles.done}>✓</Text> : null}
                </Pressable>
              ) : null}
            </View>
          );
        })}
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
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#7653BD" },
  headerIconText: { fontSize: 23 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "900", color: "#8A8090" },
  title: { marginTop: 2, fontSize: 18, lineHeight: 24, fontWeight: "900", color: "#2B2530" },
  attemptBadge: { minWidth: 58, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 15, alignItems: "center", backgroundColor: "#F2ECFF" },
  attemptLabel: { fontSize: 8, fontWeight: "900", color: "#897D92" },
  attemptValue: { marginTop: 1, fontSize: 12, fontWeight: "900", color: "#7653BD" },
  missionCard: { marginTop: 14, padding: 13, paddingRight: 55, minHeight: 72, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 21, backgroundColor: "#F7F3FC" },
  missionIcon: { fontSize: 24 },
  prompt: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: "800", color: "#514957" },
  listenButton: { position: "absolute", right: 10, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#E8F5FF" },
  listenText: { fontSize: 18 },
  progressRow: { marginTop: 14, flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 11, fontWeight: "900", color: "#756C79" },
  progressValue: { fontSize: 11, fontWeight: "900", color: "#7653BD" },
  progressTrack: { height: 8, marginTop: 6, borderRadius: 4, overflow: "hidden", backgroundColor: "#E8E1EA" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: "#7653BD" },
  unlockedBanner: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 15, backgroundColor: "#EAF5FF" },
  unlockedText: { fontSize: 11, lineHeight: 17, fontWeight: "800", textAlign: "center", color: "#287DA4" },
  columnLabels: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6 },
  columnLabel: { width: "42%", fontSize: 10, fontWeight: "900", textAlign: "center", color: "#7D7480" },
  rows: { marginTop: 7, gap: 10 },
  matchRow: { flexDirection: "row", alignItems: "stretch", gap: 7 },
  card: { flex: 1, minHeight: 104, paddingHorizontal: 8, paddingVertical: 10, borderWidth: 2, borderColor: "#E0D8E6", borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  cardActive: { borderColor: "#7653BD", backgroundColor: "#F1EBFF" },
  cardDone: { borderColor: "#79C989", backgroundColor: "#EBF9EE" },
  sideContent: { width: "100%", alignItems: "center", justifyContent: "center", gap: 5 },
  image: { width: 58, height: 52 },
  emoji: { fontSize: 29 },
  sideText: { width: "100%", fontSize: 14, lineHeight: 19, fontWeight: "900", textAlign: "center", color: "#352F39" },
  connector: { width: 34, height: 34, alignSelf: "center", borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#E9F5FF" },
  connectorDone: { backgroundColor: "#DFF4E4" },
  connectorText: { fontSize: 16, fontWeight: "900", color: "#4C8BA5" },
  done: { position: "absolute", top: 6, right: 8, fontSize: 15, fontWeight: "900", color: "#3F8B39" },
  feedback: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 17 },
  feedbackCorrect: { backgroundColor: "#E4F7E7" },
  feedbackWrong: { backgroundColor: "#FFF0E7" },
  feedbackText: { fontSize: 12, lineHeight: 18, fontWeight: "800", textAlign: "center", color: "#443B47" },
});
