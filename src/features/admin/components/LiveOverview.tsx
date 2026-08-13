import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ScreenProps } from "../../../navigation/routes";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import {
  adminService,
  type AdminChapter,
} from "../services/adminService";
import {
  adminDashboardService,
  type AdminDashboardAnalytics,
} from "../services/adminDashboardService";
import { adminLiveStyles as styles } from "./adminLiveStyles";

const EMPTY: AdminDashboardAnalytics = {
  students: 0,
  parents: 0,
  quizQuestions: 0,
  publishedQuizQuestions: 0,
  attempts: 0,
  correctAttempts: 0,
  completedChapters: 0,
  pendingParentLinks: 0,
  studentsByClass: { 1: 0, 2: 0, 3: 0 },
};

const subjectName = (id: string) =>
  ({ bangla: "বাংলা", english: "English", math: "গণিত" })[id] ?? id;

const pct = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

export default function LiveOverview({
  navigation,
  route,
}: ScreenProps<"AdminDashboard">) {
  const [managerVisible, setManagerVisible] = useState(false);
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [analytics, setAnalytics] =
    useState<AdminDashboardAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const [chapterRows, live] = await Promise.all([
        adminService.listChapters(),
        adminDashboardService.getAnalytics(),
      ]);
      setChapters(chapterRows);
      setAnalytics(live);
      setUpdatedAt(new Date());
    } catch (error) {
      Alert.alert(
        "Dashboard data লোড হয়নি",
        error instanceof Error ? error.message : "আবার চেষ্টা করুন।",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(true), 30000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const summary = useMemo(() => {
    const published = chapters.filter((x) => x.status === "published").length;
    const activities = chapters.reduce((sum, x) => sum + x.activity_count, 0);
    const publishedActivities = chapters.reduce(
      (sum, x) => sum + x.published_activity_count,
      0,
    );
    const needsAttention = chapters.filter(
      (x) =>
        x.status === "draft" ||
        x.activity_count === 0 ||
        x.published_activity_count === 0,
    ).length;

    return {
      activities,
      publishedActivities,
      needsAttention,
      chapterRate: pct(published, chapters.length),
      activityRate: pct(publishedActivities, activities),
      quizRate: pct(
        analytics.publishedQuizQuestions,
        analytics.quizQuestions,
      ),
      accuracy: pct(analytics.correctAttempts, analytics.attempts),
    };
  }, [analytics, chapters]);

  if (managerVisible) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Pressable
            onPress={() => setManagerVisible(false)}
            style={styles.exitButton}
          >
            <Text style={styles.exitText}>← Live Overview</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <AdminDashboardScreen
            navigation={navigation}
            route={route}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#315F85" />
          <Text style={styles.loadingText}>Live dashboard লোড হচ্ছে...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>NCTB KIDS · LIVE CONTROL</Text>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.meta}>Auto refresh every 30 seconds</Text>
          </View>
          <Pressable onPress={() => void load(true)} style={styles.roundButton}>
            <Text style={styles.roundButtonText}>{refreshing ? "…" : "↻"}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>LIVE OPERATIONS</Text>
          <Text style={styles.heroTitle}>Content, learners & quiz health—এক জায়গায়</Text>
          <Text style={styles.heroText}>
            Supabase data থেকে live metrics, publishing health এবং learner activity।
          </Text>
          <Text style={styles.updated}>
            Updated {updatedAt?.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) ?? "—"}
          </Text>
          <Pressable
            onPress={() => setManagerVisible(true)}
            style={[styles.exitButton, { alignSelf: "flex-start", marginTop: 14 }]}
          >
            <Text style={styles.exitText}>Open Content Manager →</Text>
          </Pressable>
        </View>

        <Text style={styles.heading}>Live metrics</Text>
        <View style={styles.grid}>
          <Metric icon="👧" value={analytics.students} label="Students" />
          <Metric icon="📚" value={chapters.length} label="Chapters" />
          <Metric icon="🧩" value={summary.activities} label="Activities" />
          <Metric icon="❓" value={analytics.quizQuestions} label="Quiz Questions" />
          <Metric icon="🎯" value={analytics.attempts} label="Quiz Attempts" />
          <Metric icon="✅" value={analytics.completedChapters} label="Completions" />
          <Metric icon="👨‍👩‍👧" value={analytics.parents} label="Parents" />
          <Metric icon="🔗" value={analytics.pendingParentLinks} label="Pending Links" />
        </View>

        <Text style={styles.heading}>Publishing health</Text>
        <Progress label="Chapters" value={summary.chapterRate} />
        <Progress label="Activities" value={summary.activityRate} />
        <Progress label="Quiz Questions" value={summary.quizRate} />
        <Progress label="Quiz Accuracy" value={summary.accuracy} />

        <View style={styles.warning}>
          <Text style={styles.warningTitle}>⚠️ Needs attention</Text>
          <Text style={styles.warningText}>
            {summary.needsAttention} chapters need content or publishing review.
          </Text>
        </View>

        <Text style={styles.heading}>Students by class</Text>
        <View style={styles.classRow}>
          {[1, 2, 3].map((level) => (
            <View key={level} style={styles.classCard}>
              <Text style={styles.classLabel}>Class {level}</Text>
              <Text style={styles.classValue}>
                {analytics.studentsByClass[level] ?? 0}
              </Text>
              <Text style={styles.small}>students</Text>
            </View>
          ))}
        </View>

        <View style={styles.headingRow}>
          <Text style={styles.heading}>Chapter monitor</Text>
          <Text style={styles.small}>Tap to manage activities</Text>
        </View>
        <View style={styles.panel}>
          {chapters.slice(0, 10).map((chapter) => (
            <Pressable
              key={chapter.id}
              style={styles.chapterRow}
              onPress={() =>
                navigation.navigate("AdminContentEditor", {
                  chapterId: chapter.id,
                  chapterTitle: chapter.title_bn,
                })
              }
            >
              <View style={styles.numberBox}>
                <Text style={styles.numberText}>{chapter.chapter_number}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.chapterTitle}>{chapter.title_bn}</Text>
                <Text style={styles.small}>
                  Class {chapter.class_level} · {subjectName(chapter.subject_id)} · {chapter.published_activity_count}/{chapter.activity_count} published
                </Text>
              </View>
              <Text style={styles.open}>Open ›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.progressCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{value}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fillBar, { width: `${value}%` }]} />
      </View>
    </View>
  );
}
