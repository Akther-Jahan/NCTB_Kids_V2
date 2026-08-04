import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import { useStudentStore } from "../../student/store/studentStore";
import { useGamificationStore } from "../../gamification/store/gamificationStore";
import { ParentLinkRequestModal } from "../../parent/components/ParentLinkRequestModal";
import { colors, shadows } from "../../../theme/theme";
import { env } from "../../../config/env";
import { getSubjects } from "../data/curriculum";

type Subject = {
  id: string;
  title_bn: string;
  subtitle: string;
  color: string;
  icon: string;
};

function useSubjects(classId: number) {
  const subjects: Subject[] = getSubjects(classId).map((subject) => ({
    id: subject.id,
    title_bn: subject.title_bn,
    subtitle: subject.subtitle,
    color: subject.color,
    icon: subject.icon,
  }));

  return { subjects, loading: false };
}

export default function SubjectSelectionScreen({
  navigation,
}: ScreenProps<"Subjects">) {
  const student = useStudentStore((state) => state.student);
  const refreshParentLink = useStudentStore((state) => state.linkParent);
  const completed = useGamificationStore(
    (state) => Object.keys(state.completedChapters).length,
  );
  const classId = student?.classLevel ?? 1;
  const { subjects, loading } = useSubjects(classId);

  const openPrivacyPolicy = () => {
    if (!env.PRIVACY_POLICY_URL) {
      Alert.alert("Privacy Policy", "Privacy Policy URL এখনো configure করা হয়নি।");
      return;
    }

    void Linking.openURL(env.PRIVACY_POLICY_URL).catch(() =>
      Alert.alert("লিংক খোলা যায়নি", "আবার চেষ্টা করুন।")
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.page}>
        <AppHeader
          onParentPress={() =>
            navigation.navigate("AdultGate", { destination: "parent" })
          }
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require("../../../../assets/images/tiger.png")}
            style={styles.tiger}
            resizeMode="contain"
          />
          <View style={styles.speech}>
            <Text style={styles.speechText}>চলো এখন একটি বই বাছি!</Text>
          </View>

          {student ? (
            <Pressable
              style={styles.idCard}
              onPress={() =>
                Alert.alert(
                  "Student ID",
                  `${student.studentCode}\n\nএই ID Parent Dashboard-এ লিখে Link Request পাঠাতে হবে।`,
                )
              }
            >
              <Text style={styles.idIcon}>🪪</Text>
              <View style={styles.idCopy}>
                <Text style={styles.idLabel}>STUDENT ID</Text>
                <Text style={styles.idValue}>{student.studentCode}</Text>
                <Text style={styles.idHelp}>
                  {student.parentLinked
                    ? "✓ Parent account linked"
                    : "Parent-কে এই ID দিন"}
                </Text>
              </View>
              <Text style={styles.idAction}>দেখুন ›</Text>
            </Pressable>
          ) : null}

          {subjects.map((subject) => (
            <Pressable
              key={subject.id}
              style={[styles.subjectCard, { backgroundColor: subject.color }]}
              onPress={() =>
                navigation.navigate("ChapterPath", {
                  classId,
                  subjectId: subject.id,
                })
              }
            >
              <View style={styles.circle}>
                <Text style={styles.subjectIcon}>{subject.icon}</Text>
              </View>
              <Text style={styles.subjectTitle}>{subject.title_bn}</Text>
              <Text style={styles.subjectSubtitle}>{subject.subtitle}</Text>
            </Pressable>
          ))}

          <View style={styles.goalCard}>
            <View style={styles.goalRow}>
              <Text style={styles.goalTitle}>আজকের লক্ষ্য</Text>
              <Text style={styles.goalCount}>{Math.min(completed, 5)}/৫</Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(100, completed * 20)}%` },
                ]}
              />
            </View>
          </View>

          <Pressable style={styles.privacyLink} onPress={openPrivacyPolicy}>
            <Text style={styles.privacyText}>Privacy Policy</Text>
          </Pressable>
        </ScrollView>

        {student ? (
          <ParentLinkRequestModal
            studentId={student.id}
            onLinked={refreshParentLink}
          />
        ) : null}

        <BottomNav navigation={navigation} active="Subjects" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6 },
  content: { padding: 8, paddingBottom: 16 },
  tiger: { alignSelf: "center", width: 82, height: 82 },
  speech: {
    alignSelf: "center",
    marginBottom: 14,
    backgroundColor: colors.orange,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: "#9F4D00",
  },
  speechText: { fontSize: 16, fontWeight: "900", color: "#2D210F" },
  idCard: {
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#7EB4D1",
    backgroundColor: "#EFF9FF",
    flexDirection: "row",
    alignItems: "center",
  },
  idIcon: { fontSize: 28 },
  idCopy: { flex: 1, marginLeft: 10 },
  idLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#51606B",
    letterSpacing: 1,
  },
  idValue: { marginTop: 1, fontSize: 17, fontWeight: "900", color: "#174F72" },
  idHelp: { marginTop: 2, fontSize: 10, fontWeight: "700", color: "#527386" },
  idAction: { color: "#14709A", fontSize: 11, fontWeight: "900" },
  subjectCard: {
    minHeight: 128,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  circle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  subjectIcon: { fontSize: 29, fontWeight: "900", color: "#263238" },
  subjectTitle: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "900",
    color: "#263238",
  },
  subjectSubtitle: { fontSize: 11, fontWeight: "700", color: "#37474F" },
  goalCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalRow: { flexDirection: "row", justifyContent: "space-between" },
  goalTitle: { fontSize: 13, fontWeight: "900", color: colors.muted },
  goalCount: { fontSize: 12, fontWeight: "900", color: "#14709A" },
  track: {
    height: 14,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: "#E9EDF0",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 8, backgroundColor: colors.green },
  privacyLink: { alignSelf: "center", marginTop: 16, padding: 10 },
  privacyText: {
    color: "#126D90",
    fontSize: 12,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
