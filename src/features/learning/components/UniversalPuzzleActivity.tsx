import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { UniversalPuzzleActivity as UniversalPuzzle } from "../data/curriculum";
import { speakLearningVoice, stopLearningVoice } from "../services/learningVoice";
import {
  clampMaxAttempts,
  type ActivityAttemptResult,
} from "../types/attemptPolicy";

const NUMERIC_MODES = new Set([
  "numeric_answer",
  "equation",
  "missing_number",
  "number_sequence",
  "counting",
]);

type Props = {
  activity: UniversalPuzzle;
  completed?: boolean;
  attempts?: number;
  maxAttempts?: number;
  onComplete: () => void;
  onAttempt?: (correct: boolean) => ActivityAttemptResult;
};

function clean(value: string | undefined) {
  return String(value ?? "").trim();
}

function normalized(value: string | undefined) {
  return clean(value).toLocaleLowerCase();
}

function answersMatch(
  mode: UniversalPuzzle["mode"],
  entered: string,
  expected: string | undefined,
  accepted: string[] | undefined,
) {
  const candidates = [expected, ...(accepted ?? [])]
    .map(clean)
    .filter(Boolean);
  const input = clean(entered);

  if (!input || candidates.length === 0) return false;

  if (NUMERIC_MODES.has(mode)) {
    const inputNumber = Number(input);
    if (Number.isFinite(inputNumber)) {
      return candidates.some((candidate) => {
        const candidateNumber = Number(candidate);
        return Number.isFinite(candidateNumber) && candidateNumber === inputNumber;
      });
    }
  }

  return candidates.some((candidate) => normalized(candidate) === normalized(input));
}

function modeTitle(mode: UniversalPuzzle["mode"]) {
  switch (mode) {
    case "equation":
      return "Solve the equation";
    case "numeric_answer":
      return "Write the answer";
    case "missing_number":
      return "Find the missing number";
    case "number_sequence":
      return "Complete the sequence";
    case "fill_blank":
      return "Fill in the blank";
    case "counting":
      return "Count and answer";
    case "ordering":
      return "Put in the correct order";
    case "category_sort":
      return "Sort into the right group";
    case "true_false":
      return "True or False?";
  }
}

export default function UniversalPuzzleActivity({
  activity,
  completed = false,
  attempts = 0,
  maxAttempts,
  onComplete,
  onAttempt,
}: Props) {
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(completed);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [wrong, setWrong] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [activeSortId, setActiveSortId] = useState<string | null>(null);
  const [sortedIds, setSortedIds] = useState<string[]>([]);
  const [localAttempts, setLocalAttempts] = useState(attempts);
  const [continueUnlocked, setContinueUnlocked] = useState(false);
  const limit = clampMaxAttempts(maxAttempts ?? activity.maxAttempts);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  useEffect(() => {
    setLocalAttempts(attempts);
    setContinueUnlocked(!completed && attempts >= limit);
  }, [attempts, completed, limit]);

  useEffect(() => {
    setAnswer("");
    setFeedback("");
    setWrong(false);
    setSelectedOrder([]);
    setActiveSortId(null);
    setSortedIds([]);

    const timer = setTimeout(() => {
      const voice = clean(activity.voiceText) || clean(activity.prompt) || modeTitle(activity.mode);
      if (voice) void speakLearningVoice(voice);
    }, 300);

    return () => {
      clearTimeout(timer);
      void stopLearningVoice();
    };
  }, [activity.id, activity.mode, activity.prompt, activity.voiceText]);

  const registerAttempt = (correct: boolean) => {
    const fallbackAttempts = localAttempts + 1;
    const result = onAttempt?.(correct);
    const nextAttempts = result?.attemptsInRound ?? fallbackAttempts;
    const unlocked = result?.canGoNext ?? (correct || nextAttempts >= limit);

    setLocalAttempts(nextAttempts);
    setContinueUnlocked(unlocked && !correct);

    return { nextAttempts, unlocked };
  };

  const complete = (message = "Great job! ✅") => {
    setWrong(false);
    setFeedback(message);
    if (!completedRef.current) {
      registerAttempt(true);
      completedRef.current = true;
      onCompleteRef.current();
    }
  };

  const reject = (message = "Try again 🙂", countAttempt = true) => {
    let unlocked = continueUnlocked;
    if (countAttempt) {
      unlocked = registerAttempt(false).unlocked;
    }

    setWrong(true);
    setFeedback(
      unlocked
        ? `${message} Next is unlocked — you can keep practicing.`
        : message,
    );
  };

  const checkSimpleAnswer = () => {
    if (
      answersMatch(
        activity.mode,
        answer,
        activity.correctAnswer,
        activity.acceptedAnswers,
      )
    ) {
      complete();
      return;
    }
    reject(activity.hint ? `Try again. Hint: ${activity.hint}` : "Not quite. Try again 🙂");
  };

  const orderedWords = activity.words ?? [];
  const correctOrder = activity.correctOrder ?? [];
  const categoryItems = activity.items ?? [];
  const categories = activity.categories ?? [];

  const remainingOrderIndices = useMemo(
    () => orderedWords.map((_, index) => index).filter((index) => !selectedOrder.includes(index)),
    [orderedWords, selectedOrder],
  );

  const checkOrder = () => {
    const current = selectedOrder.map((index) => orderedWords[index]);
    const isCorrect =
      current.length === correctOrder.length &&
      current.every((item, index) => normalized(item) === normalized(correctOrder[index]));

    if (isCorrect) complete("Perfect order! ✅");
    else reject(activity.hint ? `Try again. Hint: ${activity.hint}` : "The order is not correct yet. Try again.");
  };

  const chooseSortCategory = (category: string) => {
    if (!activeSortId) {
      reject("Choose an item first.", false);
      return;
    }

    const item = categoryItems.find((candidate) => candidate.id === activeSortId);
    if (!item) return;

    if (normalized(item.target) !== normalized(category)) {
      reject(activity.hint ? `Try another group. Hint: ${activity.hint}` : "That group is not correct. Try another one.");
      return;
    }

    const next = sortedIds.includes(item.id) ? sortedIds : [...sortedIds, item.id];
    setSortedIds(next);
    setActiveSortId(null);
    setWrong(false);
    setFeedback("Correct group ✅");

    if (next.length === categoryItems.length) {
      complete("Everything is sorted correctly! 🎉");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>PUZZLE</Text>
          <Text style={styles.title}>{modeTitle(activity.mode)}</Text>
        </View>
        <View style={styles.attemptBadge}>
          <Text style={styles.attemptLabel}>TRY</Text>
          <Text style={styles.attemptValue}>{Math.min(localAttempts + 1, limit)}/{limit}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Listen to instruction"
          onPress={() =>
            void speakLearningVoice(
              clean(activity.voiceText) || clean(activity.prompt) || modeTitle(activity.mode),
            )
          }
          style={styles.listenButton}
        >
          <Text style={styles.listenText}>🔊</Text>
        </Pressable>
      </View>

      {clean(activity.prompt) ? <Text style={styles.prompt}>{activity.prompt}</Text> : null}
      {continueUnlocked && !completedRef.current ? (
        <View style={styles.unlockedBanner}>
          <Text style={styles.unlockedText}>✓ Next is unlocked. Keep practicing if you want.</Text>
        </View>
      ) : null}

      {activity.mode === "equation" ? (
        <View style={styles.heroBox}><Text style={styles.heroText}>{activity.expression}</Text></View>
      ) : null}

      {activity.mode === "missing_number" || activity.mode === "fill_blank" ? (
        <View style={styles.heroBox}><Text style={styles.heroText}>{activity.pattern}</Text></View>
      ) : null}

      {activity.mode === "number_sequence" ? (
        <View style={styles.heroBox}><Text style={styles.heroText}>{activity.sequenceText}</Text></View>
      ) : null}

      {activity.mode === "true_false" ? (
        <View style={styles.heroBox}><Text style={styles.heroText}>{activity.statement}</Text></View>
      ) : null}

      {activity.mode === "counting" ? (
        <CountingStage activity={activity} />
      ) : null}

      {activity.mode === "ordering" ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your order</Text>
          <View style={styles.tileWrap}>
            {selectedOrder.length === 0 ? <Text style={styles.helper}>Tap the tiles below in the correct order.</Text> : null}
            {selectedOrder.map((index, position) => (
              <Pressable
                key={`chosen-${index}`}
                onPress={() => setSelectedOrder((items) => items.filter((_, i) => i !== position))}
                style={[styles.tile, styles.tileChosen]}
              >
                <Text style={styles.tileText}>{orderedWords[index]}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionLabel}>Available tiles</Text>
          <View style={styles.tileWrap}>
            {remainingOrderIndices.map((index) => (
              <Pressable
                key={`bank-${index}`}
                onPress={() => {
                  setSelectedOrder((items) => [...items, index]);
                  setFeedback("");
                  setWrong(false);
                }}
                style={styles.tile}
              >
                <Text style={styles.tileText}>{orderedWords[index]}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.buttonRow}>
            <Pressable onPress={() => { setSelectedOrder([]); setFeedback(""); setWrong(false); }} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Reset</Text>
            </Pressable>
            <Pressable disabled={selectedOrder.length !== orderedWords.length || completedRef.current} onPress={checkOrder} style={[styles.primaryButton, selectedOrder.length !== orderedWords.length && styles.buttonDisabled]}>
              <Text style={styles.primaryButtonText}>Check ✓</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activity.mode === "category_sort" ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>1. Choose an item</Text>
          <View style={styles.sortItems}>
            {categoryItems.map((item) => {
              const done = sortedIds.includes(item.id);
              const active = activeSortId === item.id;
              return (
                <Pressable
                  key={item.id}
                  disabled={done || completedRef.current}
                  onPress={() => {
                    setActiveSortId(item.id);
                    setFeedback("");
                    setWrong(false);
                  }}
                  style={[styles.sortItem, active && styles.sortItemActive, done && styles.sortItemDone]}
                >
                  {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.sortImage} resizeMode="contain" /> : null}
                  {item.emoji ? <Text style={styles.sortEmoji}>{item.emoji}</Text> : null}
                  {item.label ? <Text style={styles.sortLabel}>{item.label}</Text> : null}
                  {done ? <Text style={styles.doneMark}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.sectionLabel}>2. Choose the correct group</Text>
          <View style={styles.categoryWrap}>
            {categories.map((category) => (
              <Pressable
                key={category}
                disabled={!activeSortId || completedRef.current}
                onPress={() => chooseSortCategory(category)}
                style={[styles.categoryButton, !activeSortId && styles.buttonDisabled]}
              >
                <Text style={styles.categoryText}>{category}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.helper}>{sortedIds.length}/{categoryItems.length} sorted</Text>
        </View>
      ) : null}

      {activity.mode === "true_false" ? (
        <View style={styles.choiceWrap}>
          {["true", "false"].map((value) => (
            <Pressable
              key={value}
              disabled={completedRef.current}
              onPress={() => {
                setAnswer(value);
                if (normalized(value) === normalized(activity.correctAnswer)) complete();
                else reject(activity.hint ? `Try again. Hint: ${activity.hint}` : "Try the other answer.");
              }}
              style={[styles.choiceButton, answer === value && styles.choiceButtonSelected]}
            >
              <Text style={styles.choiceText}>{value === "true" ? "✓ True" : "✕ False"}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!["ordering", "category_sort", "true_false"].includes(activity.mode) ? (
        <AnswerArea
          activity={activity}
          answer={answer}
          setAnswer={(value) => { setAnswer(value); setFeedback(""); setWrong(false); }}
          onCheck={checkSimpleAnswer}
          disabled={completedRef.current}
        />
      ) : null}

      {feedback ? (
        <View style={[styles.feedback, wrong ? styles.feedbackWrong : styles.feedbackCorrect]}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}
    </View>
  );
}

function AnswerArea({
  activity,
  answer,
  setAnswer,
  onCheck,
  disabled,
}: {
  activity: UniversalPuzzle;
  answer: string;
  setAnswer: (value: string) => void;
  onCheck: () => void;
  disabled: boolean;
}) {
  const options = (activity.options ?? []).map(clean).filter(Boolean);
  const useChoices = ["missing_number", "number_sequence", "fill_blank"].includes(activity.mode) && options.length >= 2;

  if (useChoices) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Choose the answer</Text>
        <View style={styles.choiceWrap}>
          {options.map((option, index) => (
            <Pressable
              key={`${option}-${index}`}
              disabled={disabled}
              onPress={() => setAnswer(option)}
              style={[styles.choiceButton, answer === option && styles.choiceButtonSelected]}
            >
              <Text style={styles.choiceText}>{option}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable disabled={!answer || disabled} onPress={onCheck} style={[styles.primaryButton, (!answer || disabled) && styles.buttonDisabled]}>
          <Text style={styles.primaryButtonText}>Check ✓</Text>
        </Pressable>
      </View>
    );
  }

  const numeric = NUMERIC_MODES.has(activity.mode);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Your answer</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={answer}
          editable={!disabled}
          onChangeText={setAnswer}
          keyboardType={numeric ? "numeric" : "default"}
          autoCapitalize="none"
          placeholder="Type answer"
          placeholderTextColor="#9B949F"
          style={styles.input}
          onSubmitEditing={onCheck}
          returnKeyType="done"
        />
        {activity.unit ? <Text style={styles.unit}>{activity.unit}</Text> : null}
      </View>
      <Pressable disabled={!clean(answer) || disabled} onPress={onCheck} style={[styles.primaryButton, (!clean(answer) || disabled) && styles.buttonDisabled]}>
        <Text style={styles.primaryButtonText}>Check ✓</Text>
      </Pressable>
    </View>
  );
}

function CountingStage({ activity }: { activity: UniversalPuzzle }) {
  const quantity = Math.max(0, Math.min(50, Number(activity.quantity) || 0));
  const item = activity.countItem ?? {};

  return (
    <View style={styles.countStage}>
      {Array.from({ length: quantity }, (_, index) => (
        <View key={index} style={styles.countItem}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.countImage} resizeMode="contain" />
          ) : (
            <Text style={styles.countEmoji}>{item.emoji || "●"}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headingCopy: { flex: 1 },
  attemptBadge: { minWidth: 58, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, alignItems: "center", backgroundColor: "#F2ECFF" },
  attemptLabel: { fontSize: 8, fontWeight: "900", color: "#897D92" },
  attemptValue: { marginTop: 1, fontSize: 12, fontWeight: "900", color: "#7653BD" },
  unlockedBanner: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: "#EAF5FF" },
  unlockedText: { fontSize: 12, lineHeight: 17, fontWeight: "800", textAlign: "center", color: "#287DA4" },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, fontWeight: "900", color: "#8A8190" },
  title: { marginTop: 3, fontSize: 22, lineHeight: 28, fontWeight: "900", color: "#28222B" },
  listenButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF5FF" },
  listenText: { fontSize: 20 },
  prompt: { marginTop: 14, fontSize: 16, lineHeight: 24, fontWeight: "800", color: "#544B58" },
  heroBox: { minHeight: 100, marginTop: 16, paddingHorizontal: 18, paddingVertical: 20, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F0FA" },
  heroText: { fontSize: 30, lineHeight: 40, fontWeight: "900", textAlign: "center", color: "#29232D" },
  section: { marginTop: 18 },
  sectionLabel: { marginBottom: 9, fontSize: 12, fontWeight: "900", color: "#6D6471" },
  helper: { fontSize: 12, lineHeight: 18, color: "#827A86" },
  inputRow: { minHeight: 58, flexDirection: "row", alignItems: "center", borderWidth: 2, borderColor: "#DCD4E3", borderRadius: 18, backgroundColor: "#FFFFFF" },
  input: { flex: 1, minHeight: 56, paddingHorizontal: 16, fontSize: 22, fontWeight: "900", color: "#28222B" },
  unit: { paddingHorizontal: 14, fontSize: 15, fontWeight: "900", color: "#6E6472" },
  primaryButton: { minHeight: 52, marginTop: 12, paddingHorizontal: 18, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#7653BD" },
  primaryButtonText: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
  secondaryButton: { flex: 1, minHeight: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "#EFEAF3" },
  secondaryButtonText: { fontSize: 14, fontWeight: "900", color: "#514857" },
  buttonDisabled: { opacity: 0.42 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  choiceButton: { minWidth: "46%", flexGrow: 1, minHeight: 58, paddingHorizontal: 14, borderWidth: 2, borderColor: "#DDD5E4", borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  choiceButtonSelected: { borderColor: "#7653BD", backgroundColor: "#F0E9FF" },
  choiceText: { fontSize: 18, fontWeight: "900", color: "#322B36" },
  feedback: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 },
  feedbackCorrect: { backgroundColor: "#E4F7E2" },
  feedbackWrong: { backgroundColor: "#FFF0E7" },
  feedbackText: { fontSize: 13, lineHeight: 19, fontWeight: "800", textAlign: "center", color: "#443B47" },
  countStage: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16, padding: 14, borderRadius: 22, backgroundColor: "#F8F5FA" },
  countItem: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  countEmoji: { fontSize: 30 },
  countImage: { width: 38, height: 38 },
  tileWrap: { minHeight: 56, flexDirection: "row", flexWrap: "wrap", gap: 9, padding: 10, borderRadius: 18, backgroundColor: "#F8F5FA" },
  tile: { minWidth: 54, minHeight: 48, paddingHorizontal: 14, borderWidth: 2, borderColor: "#DDD5E4", borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  tileChosen: { borderColor: "#7653BD", backgroundColor: "#EFE7FF" },
  tileText: { fontSize: 17, fontWeight: "900", color: "#352E39" },
  sortItems: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sortItem: { minWidth: "46%", flexGrow: 1, minHeight: 82, padding: 10, borderWidth: 2, borderColor: "#DDD5E4", borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  sortItemActive: { borderColor: "#7653BD", backgroundColor: "#F0E9FF" },
  sortItemDone: { borderColor: "#A8D8A1", backgroundColor: "#E7F8E4", opacity: 0.72 },
  sortImage: { width: 52, height: 52 },
  sortEmoji: { fontSize: 30 },
  sortLabel: { marginTop: 4, fontSize: 15, fontWeight: "900", color: "#352E39" },
  doneMark: { position: "absolute", top: 6, right: 8, fontSize: 16, fontWeight: "900", color: "#3E8A39" },
  categoryWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryButton: { minWidth: "46%", flexGrow: 1, minHeight: 54, paddingHorizontal: 12, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#2F2933" },
  categoryText: { fontSize: 14, fontWeight: "900", textAlign: "center", color: "#FFFFFF" },
});
