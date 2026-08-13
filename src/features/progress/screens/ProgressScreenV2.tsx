import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ScreenProps } from "../../../navigation/routes";
import { getSubjects } from "../../learning/data/curriculum";
import { speakQuizSummary } from "../../learning/services/learningVoice";
import { useLessonSessionStore } from "../../learning/store/lessonSessionStore";
import { normalizeQuestionResult } from "../../learning/types/questionResults";
import { useStudentStore } from "../../student/store/studentStore";
import ProgressScreen from "./ProgressScreen";

type IncompleteChapter = {
  chapterId: string;
  title: string;
  total: number;
  correct: number;
  remaining: number;
  totalAttempts: number;
};

export default function ProgressScreenV2(
  props: ScreenProps<"Progress">,
) {
  const { navigation } = props;
  const classLevel = useStudentStore(
    (state) => state.student?.classLevel ?? 1,
  );
  const sessions = useLessonSessionStore(
    (state) => state.sessions,
  );
  const [open, setOpen] = useState(false);

  const titleByChapter = useMemo(() => {
    const entries = getSubjects(classLevel).flatMap(
      (subject) =>
        subject.chapters.map((chapter) => [
          chapter.id,
          chapter.title,
        ] as const),
    );

    return Object.fromEntries(entries) as Record<
      string,
      string
    >;
  }, [classLevel]);

  const incomplete = useMemo<IncompleteChapter[]>(
    () =>
      Object.values(sessions)
        .filter(
          (session) =>
            Boolean(session.lessonCompletedAt) &&
            Object.keys(session.questionResults).length > 0,
        )
        .map((session) => {
          const results = Object.values(
            session.questionResults,
          ).map(normalizeQuestionResult);
          const total = results.length;
          const correct = results.filter(
            (result) => result.status === "correct",
          ).length;
          const totalAttempts = results.reduce(
            (sum, result) => sum + result.attempts,
            0,
          );

          return {
            chapterId: session.chapterId,
            title:
              titleByChapter[session.chapterId] ??
              "অসম্পূর্ণ Quiz",
            total,
            correct,
            remaining: Math.max(0, total - correct),
            totalAttempts,
          };
        })
        .filter((item) => item.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining),
    [sessions, titleByChapter],
  );

  const remainingTotal = incomplete.reduce(
    (sum, item) => sum + item.remaining,
    0,
  );

  return (
    <View style={styles.root}>
      <ProgressScreen {...props} />

      {remainingTotal > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${remainingTotal}টি quiz প্রশ্ন আবার করতে হবে`}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.floatingButton,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.floatingIcon}>
            <Text style={styles.floatingIconText}>🔁</Text>
          </View>
          <View style={styles.floatingCopy}>
            <Text style={styles.floatingEyebrow}>
              MIMI PRACTICE
            </Text>
            <Text style={styles.floatingTitle}>
              {remainingTotal}টি Quiz বাকি
            </Text>
          </View>
          <Text style={styles.floatingArrow}>›</Text>
        </Pressable>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderCopy}>
                  <Text style={styles.sheetEyebrow}>
                    PRACTICE NEEDED
                  </Text>
                  <Text style={styles.sheetTitle}>
                    বাকি Quiz আবার করি
                  </Text>
                  <Text style={styles.sheetSubtitle}>
                    সঠিক করা প্রশ্নগুলো আর দিতে হবে না।
                  </Text>
                </View>

                <Pressable
                  onPress={() => setOpen(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
              >
                {incomplete.map((item) => (
                  <View
                    key={item.chapterId}
                    style={styles.card}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.cardCopy}>
                        <Text style={styles.cardTitle}>
                          {item.title}
                        </Text>
                        <Text style={styles.lessonDone}>
                          Lesson: সম্পন্ন ✅
                        </Text>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${item.title} এর ফলাফল শুনি`}
                        onPress={() =>
                          void speakQuizSummary({
                            total: item.total,
                            correct: item.correct,
                            remaining: item.remaining,
                          })
                        }
                        style={styles.voiceButton}
                      >
                        <Text style={styles.voiceIcon}>🔊</Text>
                      </Pressable>
                    </View>

                    <View style={styles.statsRow}>
                      <MiniStat
                        label="Quiz"
                        value={`${item.correct}/${item.total}`}
                      />
                      <MiniStat
                        label="আবার করতে হবে"
                        value={String(item.remaining)}
                      />
                      <MiniStat
                        label="মোট চেষ্টা"
                        value={String(item.totalAttempts)}
                      />
                    </View>

                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${
                              item.total > 0
                                ? Math.round(
                                    (item.correct /
                                      item.total) *
                                      100,
                                  )
                                : 0
                            }%`,
                          },
                        ]}
                      />
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setOpen(false);
                        navigation.navigate("Lesson", {
                          chapterId: item.chapterId,
                          retryIncomplete: true,
                        });
                      }}
                      style={({ pressed }) => [
                        styles.retryButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.retryText}>
                        🔁 বাকি Quiz আবার করি
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  floatingButton: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 86,
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DDD2F1",
    backgroundColor: "#FFFFFF",
    shadowColor: "#332943",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 10,
  },
  floatingIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#EEE6FF",
  },
  floatingIconText: {
    fontSize: 22,
  },
  floatingCopy: {
    flex: 1,
    marginLeft: 11,
  },
  floatingEyebrow: {
    fontSize: 8,
    letterSpacing: 1.1,
    fontWeight: "900",
    color: "#918696",
  },
  floatingTitle: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "900",
    color: "#332C37",
  },
  floatingArrow: {
    marginTop: -3,
    fontSize: 32,
    color: "#7653BD",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(31, 25, 35, 0.42)",
  },
  modalSafe: {
    maxHeight: "88%",
  },
  sheet: {
    maxHeight: "100%",
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "#F8F5FA",
  },
  sheetHandle: {
    width: 46,
    height: 5,
    alignSelf: "center",
    borderRadius: 3,
    backgroundColor: "#C8C0CC",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
  },
  sheetHeaderCopy: {
    flex: 1,
  },
  sheetEyebrow: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: "900",
    color: "#8E8492",
  },
  sheetTitle: {
    marginTop: 3,
    fontSize: 23,
    fontWeight: "900",
    color: "#2B2530",
  },
  sheetSubtitle: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "700",
    color: "#77707C",
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
    fontSize: 29,
    color: "#342E38",
  },
  list: {
    gap: 12,
    paddingTop: 18,
    paddingBottom: 12,
  },
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#E3DDE7",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#302A34",
  },
  lessonDone: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: "#5A8652",
  },
  voiceButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#EAF5FF",
  },
  voiceIcon: {
    fontSize: 17,
  },
  statsRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 13,
  },
  miniStat: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderRadius: 15,
    backgroundColor: "#F5F2F7",
  },
  miniValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#4A3A5B",
  },
  miniLabel: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
    color: "#837A87",
  },
  track: {
    height: 9,
    overflow: "hidden",
    marginTop: 12,
    borderRadius: 5,
    backgroundColor: "#E7E1EA",
  },
  fill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#7653BD",
  },
  retryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: "#7653BD",
  },
  retryText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
