import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppHeader } from "../../../components/AppHeader";
import { BottomNav } from "../../../components/BottomNav";
import { env } from "../../../config/env";
import { isSupabaseConfigured } from "../../../config/supabase";
import type { ScreenProps } from "../../../navigation/routes";
import { colors, shadows } from "../../../theme/theme";
import { useGamificationStore } from "../../gamification/store/gamificationStore";
import { getSubjects } from "../../learning/data/curriculum";
import {
  getPublishedChapters,
  type ChapterListItem,
} from "../../learning/services/curriculumService";
import { ParentLinkRequestModal } from "../../parent/components/ParentLinkRequestModal";
import { useStudentStore } from "../../student/store/studentStore";

export default function ProgressScreen({
  navigation,
}: ScreenProps<"Progress">) {
  const student = useStudentStore((state) => state.student);
  const refreshParentLink = useStudentStore((state) => state.linkParent);

  const stars = useGamificationStore((state) => state.stars);
  const level = useGamificationStore((state) => state.level);
  const streak = useGamificationStore((state) => state.streak);
  const completed = useGamificationStore((state) => state.completedChapters);

  const classId = student?.classLevel ?? 1;

  // Use the same curriculum source as the chapter and lesson screens.
  // CurriculumSubject already contains a strongly typed `chapters` array.
  const subjects = useMemo(() => getSubjects(classId), [classId]);
  const [remoteChaptersBySubject, setRemoteChaptersBySubject] = useState<
    Record<string, ChapterListItem[]> | null
  >(null);
  const [curriculumLoading, setCurriculumLoading] = useState(
    env.USE_REMOTE_CURRICULUM,
  );
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    if (!env.USE_REMOTE_CURRICULUM) {
      setRemoteChaptersBySubject(null);
      setCurriculumLoading(false);
      setCurriculumError(null);
      return () => {
        active = false;
      };
    }

    if (!isSupabaseConfigured) {
      setRemoteChaptersBySubject({});
      setCurriculumLoading(false);
      setCurriculumError(
        "এই build-এ Supabase URL অথবা public anon key configure করা নেই।",
      );
      return () => {
        active = false;
      };
    }

    setCurriculumLoading(true);
    setCurriculumError(null);

    void Promise.all(
      subjects.map(async (subject) => [
        subject.id,
        await getPublishedChapters(classId, subject.id),
      ] as const)
    )
      .then((entries) => {
        if (active) {
          setRemoteChaptersBySubject(Object.fromEntries(entries));
          setCurriculumLoading(false);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setRemoteChaptersBySubject({});
          setCurriculumLoading(false);
          setCurriculumError(
            loadError instanceof Error
              ? loadError.message
              : "অনলাইন curriculum লোড করা যায়নি।",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [classId, reloadKey, subjects]);

  const subjectProgress = useMemo(
    () =>
      subjects.map((subject) => {
        const chapterIds = env.USE_REMOTE_CURRICULUM
          ? (remoteChaptersBySubject?.[subject.id] ?? []).map(
              (chapter) => chapter.id
            )
          : subject.chapters.map((chapter) => chapter.id);
        const completedCount = chapterIds.filter((chapterId) =>
          Boolean(completed[chapterId])
        ).length;

        return {
          ...subject,
          chapterIds,
          completedCount,
        };
      }),
    [completed, remoteChaptersBySubject, subjects]
  );

  const totalChapters = useMemo(
    () =>
      subjectProgress.reduce(
        (total, subject) => total + subject.chapterIds.length,
        0,
      ),
    [subjectProgress],
  );

  const completedChapterCount = useMemo(
    () =>
      subjectProgress.reduce(
        (total, subject) => total + subject.completedCount,
        0,
      ),
    [subjectProgress],
  );

  const overall =
    totalChapters > 0
      ? Math.round((completedChapterCount / totalChapters) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <AppHeader
          title="আমার উন্নতি"
          onParentPress={() =>
            navigation.navigate("AdultGate", { destination: "parent" })
          }
        />

        <ScrollView contentContainerStyle={styles.content}>
          {curriculumLoading ? (
            <View style={styles.statusCard}>
              <ActivityIndicator size="small" color={colors.blue} />
              <Text style={styles.statusText}>
                অনলাইন curriculum লোড হচ্ছে...
              </Text>
            </View>
          ) : null}

          {curriculumError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Progress data লোড হয়নি</Text>
              <Text style={styles.errorText}>{curriculumError}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => setReloadKey((value) => value + 1)}
              >
                <Text style={styles.retryText}>আবার চেষ্টা করি</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.hero}>
            <Text style={styles.ring}>{overall}%</Text>
            <Text style={styles.heroTitle}>Overall Progress</Text>
            <Text style={styles.heroText}>Class {classId} curriculum</Text>
          </View>

          <View style={styles.stats}>
            <Stat icon="⭐" value={stars} label="Stars" />
            <Stat icon="🏅" value={level} label="Level" />
            <Stat icon="🔥" value={streak} label="Streak" />
          </View>

          <Text style={styles.section}>বিষয়ভিত্তিক অগ্রগতি</Text>

          {subjectProgress.map((subject) => {
            const subjectTotal = subject.chapterIds.length;
            const completedInSubject = subject.completedCount;
            const percent =
              subjectTotal > 0
                ? Math.round((completedInSubject / subjectTotal) * 100)
                : 0;

            return (
              <View key={subject.id} style={styles.subject}>
                <View style={styles.row}>
                  <Text style={styles.subjectName}>
                    {subject.icon} {subject.title_bn}
                  </Text>
                  <Text style={styles.percent}>{percent}%</Text>
                </View>

                <Text style={styles.chapterCount}>
                  {completedInSubject}/{subjectTotal} chapter completed
                </Text>

                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${percent}%`,
                        backgroundColor: subject.color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}

          {subjectProgress.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>কোনো বিষয় পাওয়া যায়নি</Text>
              <Text style={styles.emptyText}>
                নির্বাচিত ক্লাসের curriculum এখনো যোগ করা হয়নি।
              </Text>
            </View>
          ) : null}

          <View style={styles.tip}>
            <Text style={styles.tipTitle}>🐯 আজকের পরামর্শ</Text>
            <Text style={styles.tipText}>
              প্রতিদিন অন্তত একটি activity শেষ করলে শেখা আরও মজবুত হবে।
            </Text>
          </View>
        </ScrollView>

        {student ? (
          <ParentLinkRequestModal
            studentId={student.id}
            onLinked={refreshParentLink}
          />
        ) : null}

        <BottomNav navigation={navigation} active="Progress" />
      </View>
    </SafeAreaView>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, padding: 10 },
  content: { padding: 8, paddingBottom: 18 },
  statusCard: {
    minHeight: 48,
    marginTop: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#DDF5FF",
    borderWidth: 1,
    borderColor: colors.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  statusText: { color: "#125C7B", fontWeight: "800", fontSize: 12 },
  errorCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFF3BF",
    borderWidth: 1,
    borderColor: colors.orange,
  },
  errorTitle: {
    color: colors.ink,
    fontWeight: "900",
    textAlign: "center",
  },
  errorText: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  retryButton: {
    alignSelf: "center",
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.orange,
  },
  retryText: { color: "#FFF", fontWeight: "900" },
  hero: {
    alignItems: "center",
    marginTop: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#E9F8D8",
    ...shadows.card,
  },
  ring: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 12,
    borderColor: colors.green,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 27,
    fontWeight: "900",
    color: colors.greenDark,
    backgroundColor: "#FFF",
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 21,
    fontWeight: "900",
    color: colors.ink,
  },
  heroText: { color: colors.muted, fontWeight: "700" },
  stats: { flexDirection: "row", gap: 10, marginTop: 14 },
  stat: {
    flex: 1,
    alignItems: "center",
    padding: 13,
    borderRadius: 18,
    backgroundColor: "#FFF",
    ...shadows.card,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 21, fontWeight: "900", color: "#126D90" },
  statLabel: { fontSize: 11, fontWeight: "700", color: colors.muted },
  section: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink,
  },
  subject: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  subjectName: { fontWeight: "900", fontSize: 15, color: colors.ink },
  percent: { fontWeight: "900", color: "#126D90" },
  chapterCount: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  track: {
    height: 12,
    marginTop: 9,
    borderRadius: 7,
    backgroundColor: "#E8EDF0",
    overflow: "hidden",
  },
  fill: { height: "100%" },
  emptyCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontWeight: "900", color: colors.ink },
  emptyText: {
    marginTop: 5,
    color: colors.muted,
    fontWeight: "700",
    lineHeight: 20,
  },
  tip: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: "#FFF3C7",
    padding: 15,
  },
  tipTitle: { fontWeight: "900", color: "#7A5800" },
  tipText: {
    marginTop: 5,
    lineHeight: 20,
    color: "#765F28",
    fontWeight: "700",
  },
});
