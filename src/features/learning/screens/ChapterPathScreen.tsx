import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ScreenProps } from "../../../navigation/routes";
import { AppHeader } from "../../../components/AppHeader";
import { BottomNav } from "../../../components/BottomNav";
import { useChapterPath } from "../hooks/useChapterPath";
import { useGamificationStore } from "../../gamification/store/gamificationStore";
import { colors, shadows } from "../../../theme/theme";

export default function ChapterPathScreen({
  navigation,
  route,
}: ScreenProps<"ChapterPath">) {
  const { classId, subjectId } = route.params;
  const { subject, chapters, loading, error, retry, source } = useChapterPath(
    classId,
    subjectId,
  );
  const unlocked = useGamificationStore((state) => state.unlockedChapterIds);
  const completed = useGamificationStore((state) => state.completedChapters);

  if (!subject)
    return (
      <View style={styles.center}>
        <Text>বিষয়টি পাওয়া যায়নি।</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <AppHeader
          title={`${subject.title} · Class ${classId}`}
          onParentPress={() =>
            navigation.navigate("AdultGate", { destination: "parent" })
          }
        />
        <ScrollView
          contentContainerStyle={styles.path}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.statusCard}>
              <ActivityIndicator size="small" color={colors.blue} />
              <Text style={styles.statusText}>নতুন পাঠ খোঁজা হচ্ছে...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>অনলাইন পাঠ লোড হয়নি</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={retry}>
                <Text style={styles.retryText}>আবার চেষ্টা করি</Text>
              </Pressable>
            </View>
          ) : null}

          {!loading && !error && chapters.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>এখনো কোনো পাঠ প্রকাশ হয়নি</Text>
              <Text style={styles.emptyText}>
                এই class ও subject-এর published chapter এবং activity পাওয়া
                যায়নি।
              </Text>
              <Pressable style={styles.retryButton} onPress={retry}>
                <Text style={styles.retryText}>আবার দেখুন</Text>
              </Pressable>
            </View>
          ) : null}

          {chapters.length > 0 ? <View style={styles.line} /> : null}
          {chapters.map((chapter, index) => {
            const isCompleted = Boolean(completed[chapter.id]);
            const isUnlocked =
              index === 0 || unlocked.includes(chapter.id) || isCompleted;
            const left = index % 2 === 0;
            return (
              <View
                key={chapter.id}
                style={[styles.stepRow, left ? styles.left : styles.right]}
              >
                <Pressable
                  disabled={!isUnlocked}
                  onPress={() =>
                    navigation.navigate("Lesson", { chapterId: chapter.id })
                  }
                  style={[
                    styles.node,
                    isUnlocked
                      ? { backgroundColor: subject.color }
                      : styles.lockedNode,
                  ]}
                >
                  <Text style={styles.nodeIcon}>
                    {isCompleted ? "✓" : isUnlocked ? chapter.icon : "🔒"}
                  </Text>
                </Pressable>
                <View style={[styles.label, !isUnlocked && styles.lockedLabel]}>
                  <Text style={styles.labelTitle}>{chapter.title}</Text>
                  <Text style={styles.labelSubtitle}>{chapter.subtitle}</Text>
                  {isCompleted ? (
                    <Text style={styles.completeText}>
                      Completed · ⭐ {completed[chapter.id].starsEarned}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
          {chapters.length > 0 ? (
            <View style={styles.mascotRow}>
              <Image
                source={require("../../../../assets/images/tiger.png")}
                style={styles.tiger}
                resizeMode="contain"
              />
              <View style={styles.mascotBubble}>
                <Text style={styles.mascotText}>
                  প্রথম chapter-টি শেষ করো। তারপর পরেরটি খুলে যাবে!
                </Text>
              </View>
            </View>
          ) : null}
          {source === "local" ? (
            <Text style={styles.localModeText}>Local curriculum test mode</Text>
          ) : null}
        </ScrollView>
        <BottomNav navigation={navigation} active="Subjects" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  path: {
    position: "relative",
    paddingVertical: 22,
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  statusCard: {
    marginBottom: 14,
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#DDF5FF",
    borderWidth: 1,
    borderColor: colors.blue,
  },
  statusText: { fontSize: 13, fontWeight: "800", color: "#125C7B" },
  errorCard: {
    marginBottom: 14,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FFF3BF",
    borderWidth: 1,
    borderColor: colors.orange,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.ink,
    textAlign: "center",
  },
  errorText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.muted,
    textAlign: "center",
  },
  retryButton: {
    alignSelf: "center",
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.orange,
  },
  retryText: { color: "#FFF", fontWeight: "900" },
  emptyCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.muted,
    textAlign: "center",
  },
  line: {
    position: "absolute",
    top: 25,
    bottom: 100,
    left: "50%",
    width: 5,
    borderRadius: 3,
    backgroundColor: "#C8E1EA",
    transform: [{ rotate: "7deg" }],
  },
  stepRow: {
    width: "100%",
    minHeight: 128,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end", flexDirection: "row-reverse" },
  node: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderBottomWidth: 6,
    borderColor: "#126D90",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  lockedNode: { backgroundColor: colors.locked, borderColor: "#A9B1B7" },
  nodeIcon: { fontSize: 28, fontWeight: "900", color: "#FFF" },
  label: {
    maxWidth: 165,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  lockedLabel: { opacity: 0.65 },
  labelTitle: { fontSize: 15, fontWeight: "900", color: colors.ink },
  labelSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
  },
  completeText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "900",
    color: colors.greenDark,
  },
  mascotRow: { marginTop: 8, flexDirection: "row", alignItems: "flex-end" },
  tiger: { width: 75, height: 88 },
  mascotBubble: {
    flex: 1,
    backgroundColor: colors.orange,
    borderRadius: 18,
    padding: 12,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: "#9C4B00",
  },
  mascotText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    color: "#2D210F",
  },
  localModeText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
});
