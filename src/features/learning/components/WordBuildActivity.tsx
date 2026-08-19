import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import {
  speakLearningVoice,
  stopLearningVoice,
} from "../services/learningVoice";
import MimiCharacter from "./MimiCharacter";
import RewardToast from "./RewardToast";
import {
  clampMaxAttempts,
  type ActivityAttemptResult,
} from "../types/attemptPolicy";

type Props = {
  activity: {
    title?: string;
    instruction?: string;
    data: {
      prompt: string;
      letters: string[];
      answer: string;
      locale?: string;
    };
  };
  attempts?: number;
  maxAttempts?: number;
  onComplete: () => void;
  onAttempt?: (correct: boolean) => ActivityAttemptResult;
};

type SlotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function expectedTileOrder(
  answer: string,
  letters: string[],
): string[] | null {
  const used = new Set<number>();
  const expected: string[] = [];
  let remaining = answer;

  for (let step = 0; step < letters.length; step += 1) {
    const candidates = letters
      .map((letter, index) => ({ letter, index }))
      .filter(
        ({ letter, index }) =>
          !used.has(index) && remaining.startsWith(letter),
      )
      .sort((a, b) => b.letter.length - a.letter.length);

    const candidate = candidates[0];

    if (!candidate) {
      return null;
    }

    used.add(candidate.index);
    expected.push(candidate.letter);
    remaining = remaining.slice(candidate.letter.length);
  }

  return remaining.length === 0 ? expected : null;
}

export default function WordBuildActivity({
  activity,
  attempts = 0,
  maxAttempts,
  onComplete,
  onAttempt,
}: Props) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= 600;
  const { data } = activity;

  const tileCount = data.letters.length;
  const emptySlots = useMemo(
    () => Array<number | null>(tileCount).fill(null),
    [tileCount],
  );

  const entrance = useRef(new Animated.Value(0)).current;
  const answerScale = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const slotRefs = useRef<
    Array<React.ElementRef<typeof View> | null>
  >([]);
  const slotRects = useRef<Array<SlotRect | null>>([]);

  const [slots, setSlots] = useState<Array<number | null>>(emptySlots);
  const [history, setHistory] = useState<Array<Array<number | null>>>([]);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const [wrongMessage, setWrongMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const [rewardVisible, setRewardVisible] = useState(false);
  const [localAttempts, setLocalAttempts] = useState(attempts);
  const [continueUnlocked, setContinueUnlocked] = useState(false);
  const limit = clampMaxAttempts(maxAttempts);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setLocalAttempts(attempts);
    setContinueUnlocked(attempts >= limit);
  }, [attempts, limit]);

  useEffect(() => {
    setSlots(Array<number | null>(tileCount).fill(null));
    setHistory([]);
    setSelectedTile(null);
    setSelectedSlot(null);
    setWrong(false);
    setWrongMessage("");
    setCompleted(false);
    completedRef.current = false;
  }, [data.answer, data.letters, tileCount]);

  useEffect(() => {
    const animation = Animated.spring(entrance, {
      toValue: 1,
      friction: 6,
      tension: 55,
      useNativeDriver: true,
    });

    animation.start();

    const timer = setTimeout(() => {
      void speakLearningVoice(
        data.prompt || "অক্ষরগুলো সাজিয়ে শব্দ তৈরি করো।",
        { language: data.locale },
      );
    }, 350);

    if (tileCount === 0 && !completedRef.current) {
      completedRef.current = true;
      setCompleted(true);
      onCompleteRef.current();
    }

    return () => {
      clearTimeout(timer);
      animation.stop();
      void stopLearningVoice();
    };
  }, [data.prompt, entrance, tileCount]);

  const expected = useMemo(
    () => expectedTileOrder(data.answer, data.letters),
    [data.answer, data.letters],
  );

  const assembledLetters = useMemo(
    () =>
      slots.map((tileIndex) =>
        tileIndex === null ? "" : data.letters[tileIndex],
      ),
    [data.letters, slots],
  );
  const word = assembledLetters.join("");
  const filledCount = slots.filter((item) => item !== null).length;
  const progress = tileCount > 0
    ? Math.round((filledCount / tileCount) * 100)
    : 100;

  const measureSlots = useCallback(() => {
    slotRefs.current.forEach((node, index) => {
      node?.measureInWindow((x, y, slotWidth, slotHeight) => {
        slotRects.current[index] = {
          x,
          y,
          width: slotWidth,
          height: slotHeight,
        };
      });
    });
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(measureSlots);
    return () => cancelAnimationFrame(frame);
  }, [measureSlots, slots]);

  const remember = useCallback(
    (current: Array<number | null>) => {
      setHistory((items) => [...items.slice(-11), [...current]]);
    },
    [],
  );

  const applySlots = useCallback(
    (next: Array<number | null>) => {
      remember(slots);
      setSlots(next);
      setWrong(false);
      setWrongMessage("");
      setSelectedTile(null);
      setSelectedSlot(null);
    },
    [remember, slots],
  );

  const moveTileToSlot = useCallback(
    (tileIndex: number, targetSlot: number) => {
      if (completed || targetSlot < 0 || targetSlot >= tileCount) {
        return;
      }

      const next = [...slots];
      const sourceSlot = next.indexOf(tileIndex);
      const displaced = next[targetSlot];

      if (sourceSlot === targetSlot) {
        setSelectedTile(null);
        setSelectedSlot(null);
        return;
      }

      if (sourceSlot >= 0) {
        next[sourceSlot] = displaced;
      }

      next[targetSlot] = tileIndex;
      applySlots(next);
      void speakLearningVoice(data.letters[tileIndex], { language: data.locale });
    },
    [applySlots, completed, data.letters, slots, tileCount],
  );

  const removeTile = useCallback(
    (tileIndex: number) => {
      if (completed) return;
      const sourceSlot = slots.indexOf(tileIndex);
      if (sourceSlot < 0) return;

      const next = [...slots];
      next[sourceSlot] = null;
      applySlots(next);
    },
    [applySlots, completed, slots],
  );

  const dropTile = useCallback(
    (tileIndex: number, x: number, y: number) => {
      const target = slotRects.current.findIndex(
        (rect) =>
          Boolean(
            rect &&
              x >= rect.x &&
              x <= rect.x + rect.width &&
              y >= rect.y &&
              y <= rect.y + rect.height,
          ),
      );

      if (target >= 0) {
        moveTileToSlot(tileIndex, target);
      } else if (slots.includes(tileIndex)) {
        removeTile(tileIndex);
      }
    },
    [moveTileToSlot, removeTile, slots],
  );

  const tapBankTile = (tileIndex: number) => {
    if (completed) return;
    setSelectedTile(tileIndex);
    setSelectedSlot(null);
    setWrong(false);
    void speakLearningVoice(data.letters[tileIndex], { language: data.locale });
  };

  const tapSlot = (slotIndex: number) => {
    if (completed) return;

    const tileIndex = slots[slotIndex];

    if (selectedTile !== null) {
      moveTileToSlot(selectedTile, slotIndex);
      return;
    }

    if (selectedSlot !== null) {
      const sourceTile = slots[selectedSlot];
      if (sourceTile !== null) {
        if (selectedSlot === slotIndex) {
          removeTile(sourceTile);
        } else {
          moveTileToSlot(sourceTile, slotIndex);
        }
      }
      return;
    }

    if (tileIndex !== null) {
      setSelectedSlot(slotIndex);
      void speakLearningVoice(data.letters[tileIndex], { language: data.locale });
    }
  };

  const undo = () => {
    if (completed || history.length === 0) return;

    const previous = history[history.length - 1];
    setHistory((items) => items.slice(0, -1));
    setSlots([...previous]);
    setSelectedTile(null);
    setSelectedSlot(null);
    setWrong(false);
    setWrongMessage("");
  };

  const reset = () => {
    if (completed || filledCount === 0) return;
    remember(slots);
    setSlots(Array<number | null>(tileCount).fill(null));
    setSelectedTile(null);
    setSelectedSlot(null);
    setWrong(false);
    setWrongMessage("");
    void speakLearningVoice("আবার সাজাই। যেখান থেকে চাই, সেখান থেকেই শুরু করো।");
  };

  const runWrongAnimation = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start();
  };

  const runSuccessAnimation = () => {
    Animated.sequence([
      Animated.timing(answerScale, {
        toValue: 1.1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.spring(answerScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const registerAttempt = (correct: boolean) => {
    const result = onAttempt?.(correct);
    const nextAttempts = result?.attemptsInRound ?? localAttempts + 1;
    const unlocked = result?.canGoNext ?? (correct || nextAttempts >= limit);
    setLocalAttempts(nextAttempts);
    setContinueUnlocked(unlocked && !correct);
    return unlocked;
  };

  const checkWord = () => {
    if (completed || filledCount !== tileCount) return;

    if (word === data.answer) {
      registerAttempt(true);
      completedRef.current = true;
      setCompleted(true);
      setWrong(false);
      setRewardVisible(true);
      runSuccessAnimation();
      void speakLearningVoice(
        `${data.answer}। দারুণ! তুমি ${data.answer} শব্দটি তৈরি করেছো।`,
      );
      onCompleteRef.current();
      return;
    }

    let message = "শব্দটি ঠিক হয়নি। ভুল জায়গাটি বদলে আবার যাচাই করো।";

    if (expected) {
      const mismatch = assembledLetters.findIndex(
        (letter, index) => letter !== expected[index],
      );
      if (mismatch >= 0) {
        message = `${mismatch + 1} নম্বর জায়গাটি আবার দেখো। পুরো শব্দ নতুন করে শুরু করতে হবে না।`;
      }
    }

    const unlocked = registerAttempt(false);
    if (unlocked) {
      message = `${message} পরের ধাপ খুলে গেছে—চাইলে আবার চেষ্টা করো।`;
    }

    setWrong(true);
    setWrongMessage(message);
    runWrongAnimation();
    void speakLearningVoice(`${word}। ${message}`);
  };

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
    outputRange: [-9, 0, 9],
  });
  const characterSize = isTablet ? 195 : isSmallPhone ? 120 : 145;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <RewardToast
        visible={rewardVisible}
        title="দারুণ!"
        message="শব্দটি সঠিক হয়েছে"
        stars={1}
        onHidden={() => setRewardVisible(false)}
      />

      <View style={styles.header}>
        <View style={styles.headerIcon}><Text style={styles.headerIconText}>🧩</Text></View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>শব্দ বানাই</Text>
          <Text style={styles.title}>{activity.title ?? "শব্দ বানাই"}</Text>
        </View>
        <View style={styles.attemptBadge}>
          <Text style={styles.attemptLabel}>চেষ্টা</Text>
          <Text style={styles.attemptValue}>{Math.min(localAttempts + 1, limit)}/{limit}</Text>
        </View>
        <Pressable
          onPress={() => void speakLearningVoice(data.answer, { language: data.locale })}
          style={styles.wordVoiceButton}
        >
          <Text style={styles.wordVoiceText}>🔊 শব্দ শুনি</Text>
        </Pressable>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${completed ? 100 : progress}%` }]} />
      </View>

      {continueUnlocked && !completed ? (
        <View style={styles.unlockedBanner}>
          <Text style={styles.unlockedText}>✓ পরের ধাপ খুলে গেছে। চাইলে আরও অনুশীলন করো।</Text>
        </View>
      ) : null}

      <View style={styles.guideCard}>
        <MimiCharacter
          emotion={completed ? "celebrate" : wrong ? "talking" : "happy"}
          size={characterSize}
        />
        <View style={styles.promptCard}>
          <Text style={styles.promptLabel}>তোমার mission</Text>
          <Text style={styles.promptText}>{data.prompt}</Text>
          <Pressable
            onPress={() => void speakLearningVoice(data.prompt, { language: data.locale })}
            style={styles.listenCircle}
          >
            <Text>🔊</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>তোমার শব্দ</Text>
          <Text style={styles.sectionTitle}>অক্ষর বসাও বা জায়গা বদলাও</Text>
        </View>
        <Text style={styles.counter}>{filledCount}/{tileCount}</Text>
      </View>

      <Animated.View
        style={[
          styles.answerCard,
          wrong && styles.answerCardWrong,
          completed && styles.answerCardCorrect,
          { transform: [{ translateX: shakeX }, { scale: answerScale }] },
        ]}
      >
        <View style={styles.slotsRow}>
          {slots.map((tileIndex, slotIndex) => {
            const letter = tileIndex === null ? null : data.letters[tileIndex];
            const slotSelected = selectedSlot === slotIndex;

            return (
              <Pressable
                key={`slot-${slotIndex}`}
                onPress={() => tapSlot(slotIndex)}
                style={styles.slotPressable}
              >
                <View
                  ref={(node) => {
                    slotRefs.current[slotIndex] = node;
                  }}
                  onLayout={() => requestAnimationFrame(measureSlots)}
                  style={[
                    styles.slot,
                    letter && styles.slotFilled,
                    slotSelected && styles.slotSelected,
                    completed && styles.slotCorrect,
                  ]}
                >
                  {tileIndex !== null && letter ? (
                    <DraggableTile
                      tileIndex={tileIndex}
                      label={letter}
                      compact
                      disabled={completed}
                      selected={slotSelected}
                      onTap={() => tapSlot(slotIndex)}
                      onDrop={dropTile}
                    />
                  ) : (
                    <Text style={styles.slotPlaceholder}>{slotIndex + 1}</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.preview, wrong && styles.previewWrong, completed && styles.previewCorrect]}>
          {word || "অক্ষরগুলো এখানে বসাও"}
        </Text>

        <View style={[styles.feedback, wrong && styles.feedbackWrong, completed && styles.feedbackCorrect]}>
          <Text style={styles.feedbackIcon}>{completed ? "🏆" : wrong ? "💡" : "↕️"}</Text>
          <Text style={styles.feedbackText}>
            {completed
              ? "অসাধারণ! শব্দটি সঠিক হয়েছে।"
              : wrong
                ? wrongMessage
                : "Drag করে slot-এ রাখো। চাইলে tile চাপ দিয়ে তারপর slot চাপতে পারো।"}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>অক্ষরের টুকরা</Text>
          <Text style={styles.sectionTitle}>যে অক্ষর লাগবে সেটি নাও</Text>
        </View>
      </View>

      <View style={styles.bank}>
        {data.letters.map((letter, tileIndex) => {
          const placed = slots.includes(tileIndex);
          if (placed) return null;

          return (
            <DraggableTile
              key={`${letter}-${tileIndex}`}
              tileIndex={tileIndex}
              label={letter}
              disabled={completed}
              selected={selectedTile === tileIndex}
              onTap={() => tapBankTile(tileIndex)}
              onDrop={dropTile}
            />
          );
        })}
        {filledCount === tileCount ? (
          <Text style={styles.bankEmpty}>সব অক্ষর slot-এ আছে ✓</Text>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Pressable
          disabled={history.length === 0 || completed}
          onPress={undo}
          style={[styles.controlButton, (history.length === 0 || completed) && styles.controlDisabled]}
        >
          <Text style={styles.controlText}>↶ Undo</Text>
        </Pressable>
        <Pressable
          disabled={filledCount === 0 || completed}
          onPress={reset}
          style={[styles.controlButton, (filledCount === 0 || completed) && styles.controlDisabled]}
        >
          <Text style={styles.controlText}>↻ সব আবার</Text>
        </Pressable>
      </View>

      <Pressable
        disabled={filledCount !== tileCount || completed}
        onPress={checkWord}
        style={[
          styles.checkButton,
          (filledCount !== tileCount || completed) && styles.checkButtonDisabled,
          completed && styles.checkButtonDone,
        ]}
      >
        <Text style={styles.checkButtonText}>
          {completed ? "✓ সঠিক হয়েছে" : "✓ যাচাই করি"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function DraggableTile({
  tileIndex,
  label,
  selected,
  disabled,
  compact = false,
  onTap,
  onDrop,
}: {
  tileIndex: number;
  label: string;
  selected: boolean;
  disabled: boolean;
  compact?: boolean;
  onTap: () => void;
  onDrop: (tileIndex: number, x: number, y: number) => void;
}) {
  const translate = useRef(new Animated.ValueXY()).current;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
        onPanResponderMove: (_, gesture) => {
          translate.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          const moved = Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8;

          if (moved) {
            onDrop(tileIndex, gesture.moveX, gesture.moveY);
          } else {
            onTap();
          }

          Animated.spring(translate, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translate, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            useNativeDriver: true,
          }).start();
        },
      }),
    [disabled, onDrop, onTap, tileIndex, translate],
  );

  return (
    <Animated.View
      {...responder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={`${label} অক্ষর`}
      style={[
        compact ? styles.slotTile : styles.bankTile,
        selected && styles.tileSelected,
        disabled && styles.tileDisabled,
        { transform: translate.getTranslateTransform() },
      ]}
    >
      <Text style={[styles.tileText, compact && styles.slotTileText]}>{label}</Text>
      {!compact ? <Text style={styles.dragHint}>↕</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", width: "100%", alignItems: "center" },
  header: { width: "100%", flexDirection: "row", alignItems: "center" },
  headerIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#7653BD" },
  headerIconText: { fontSize: 22 },
  attemptBadge: { marginLeft: 8, minWidth: 58, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, alignItems: "center", backgroundColor: "#F2ECFF" },
  attemptLabel: { fontSize: 8, fontWeight: "900", color: "#897D92" },
  attemptValue: { marginTop: 1, fontSize: 12, fontWeight: "900", color: "#7653BD" },
  unlockedBanner: { width: "100%", marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: "#EAF5FF" },
  unlockedText: { fontSize: 12, fontWeight: "800", textAlign: "center", color: "#287DA4" },
  headerCopy: { flex: 1, marginLeft: 11 },
  eyebrow: { fontSize: 8, letterSpacing: 1.2, fontWeight: "900", color: "#958A9A" },
  title: { marginTop: 3, fontSize: 18, fontWeight: "900", color: "#2B252F" },
  wordVoiceButton: { minHeight: 38, paddingHorizontal: 10, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF5FF" },
  wordVoiceText: { fontSize: 9, fontWeight: "900", color: "#287DA4" },
  progressTrack: { width: "100%", height: 8, overflow: "hidden", marginTop: 12, borderRadius: 4, backgroundColor: "#E7E1EA" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: "#7653BD" },
  guideCard: { width: "100%", alignItems: "center", marginTop: 13, paddingTop: 6, paddingBottom: 14, borderRadius: 26, backgroundColor: "#E8DFFA" },
  promptCard: { width: "92%", minHeight: 70, marginTop: -10, padding: 13, paddingRight: 52, borderRadius: 20, backgroundColor: "#FFFFFF" },
  promptLabel: { fontSize: 9, fontWeight: "900", color: "#8B8290" },
  promptText: { marginTop: 4, fontSize: 16, lineHeight: 23, fontWeight: "900", color: "#302A34" },
  listenCircle: { position: "absolute", right: 10, top: 16, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF5FF" },
  sectionHeader: { width: "100%", marginTop: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionEyebrow: { fontSize: 8, letterSpacing: 1.1, fontWeight: "900", color: "#9A919E" },
  sectionTitle: { marginTop: 2, fontSize: 14, fontWeight: "900", color: "#302A34" },
  counter: { minWidth: 48, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14, textAlign: "center", fontSize: 11, fontWeight: "900", color: "#7653BD", backgroundColor: "#EEE6FF" },
  answerCard: { width: "100%", marginTop: 9, padding: 13, borderWidth: 2, borderColor: "#E3DEE6", borderRadius: 22, backgroundColor: "#FBFAFC" },
  answerCardWrong: { borderColor: "#E3A34D", backgroundColor: "#FFF8EC" },
  answerCardCorrect: { borderColor: "#6EBE62", backgroundColor: "#F3FFF0" },
  slotsRow: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  slotPressable: { borderRadius: 16 },
  slot: { width: 58, height: 62, borderWidth: 2, borderStyle: "dashed", borderColor: "#C9C1CE", borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  slotFilled: { borderStyle: "solid", borderColor: "#9B83CF", backgroundColor: "#F5F0FF" },
  slotSelected: { borderColor: "#7653BD", borderWidth: 3 },
  slotCorrect: { borderColor: "#6EBE62", backgroundColor: "#EAFFE6" },
  slotPlaceholder: { fontSize: 11, fontWeight: "800", color: "#C2BAC6" },
  preview: { marginTop: 12, textAlign: "center", fontSize: 24, fontWeight: "900", color: "#4B414F" },
  previewWrong: { color: "#A25D17" },
  previewCorrect: { color: "#317A2A" },
  feedback: { minHeight: 44, marginTop: 10, paddingHorizontal: 11, borderRadius: 15, flexDirection: "row", alignItems: "center", backgroundColor: "#F0EDF2" },
  feedbackWrong: { backgroundColor: "#FFF0D8" },
  feedbackCorrect: { backgroundColor: "#E6F9E1" },
  feedbackIcon: { fontSize: 17 },
  feedbackText: { flex: 1, marginLeft: 8, fontSize: 10, lineHeight: 15, fontWeight: "800", color: "#625866" },
  bank: { width: "100%", minHeight: 76, marginTop: 9, padding: 10, borderRadius: 20, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 9, backgroundColor: "#F4F1F6" },
  bankTile: { minWidth: 58, height: 58, paddingHorizontal: 12, borderWidth: 2, borderColor: "#D9D2DE", borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", zIndex: 20 },
  slotTile: { width: 52, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F0FF", zIndex: 30 },
  tileSelected: { borderColor: "#7653BD", backgroundColor: "#EEE6FF" },
  tileDisabled: { opacity: 0.76 },
  tileText: { fontSize: 23, fontWeight: "900", color: "#342D38" },
  slotTileText: { fontSize: 22 },
  dragHint: { position: "absolute", right: 4, top: 3, fontSize: 8, color: "#9B91A0" },
  bankEmpty: { fontSize: 11, fontWeight: "800", color: "#6E8768" },
  controls: { width: "100%", flexDirection: "row", gap: 9, marginTop: 12 },
  controlButton: { flex: 1, minHeight: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#EEEAF1" },
  controlDisabled: { opacity: 0.42 },
  controlText: { fontSize: 11, fontWeight: "900", color: "#504755" },
  checkButton: { width: "100%", minHeight: 52, marginTop: 11, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#7653BD" },
  checkButtonDisabled: { backgroundColor: "#C9C3CE" },
  checkButtonDone: { backgroundColor: "#62AD58" },
  checkButtonText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
});
