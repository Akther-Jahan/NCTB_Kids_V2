import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../../contexts/AuthContext";
import type { ScreenProps } from "../../../navigation/routes";
import { colors, shadows } from "../../../theme/theme";
import { env } from "../../../config/env";
import {
  parentService,
  type ParentChild,
  type ParentLinkRequest,
} from "../services/parentService";

const statusText: Record<ParentLinkRequest["status"], string> = {
  pending: "Child approval-এর অপেক্ষায়",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
};

function getStatusText(status: ParentLinkRequest["status"]) {
  return statusText[status] ?? status;
}

export default function ParentDashboardScreen({
  navigation,
}: ScreenProps<"ParentDashboard">) {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [requests, setRequests] = useState<ParentLinkRequest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [sending, setSending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setError("");

    try {
      const [nextChildren, nextRequests] = await Promise.all([
        parentService.getChildren(),
        parentService.getLinkRequests(),
      ]);

      setChildren(nextChildren);
      setRequests(nextRequests);
      setSelectedId((current) =>
        nextChildren.some((child) => child.id === current)
          ? current
          : (nextChildren[0]?.id ?? ""),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Dashboard data load হয়নি।",
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigation.replace("Login");
      return;
    }

    let active = true;
    let removeRealtime: (() => void) | undefined;

    void loadDashboard();
    void parentService
      .subscribeToLinkChanges(() => void loadDashboard())
      .then((remove) => {
        if (active) {
          removeRealtime = remove;
        } else {
          remove();
        }
      })
      .catch((subscriptionError) => {
        console.warn(
          "Parent link realtime subscription failed.",
          subscriptionError,
        );
      });

    return () => {
      active = false;
      removeRealtime?.();
    };
  }, [authLoading, isAuthenticated, loadDashboard, navigation]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedId) ?? children[0],
    [children, selectedId],
  );

  const pendingRequests = requests.filter(
    (request) => request.status === "pending",
  );

  const sendLinkRequest = async () => {
    const normalizedCode = studentCode.trim().toUpperCase();

    if (!normalizedCode) {
      Alert.alert(
        "Student ID দিন",
        "Child-এর Class Selection screen থেকে ID দেখুন।",
      );
      return;
    }

    setSending(true);

    try {
      await parentService.requestLink(normalizedCode);
      setStudentCode("");
      await loadDashboard();
      Alert.alert(
        "Request পাঠানো হয়েছে",
        "এখন child-এর Subjects screen খুলুন। সেখানে Allow Parent চাপলে account link হবে।",
      );
    } catch (requestError) {
      Alert.alert(
        "Request পাঠানো যায়নি",
        requestError instanceof Error
          ? requestError.message
          : "আবার চেষ্টা করুন।",
      );
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: "Subjects" }],
      });
    } catch (logoutError) {
      Alert.alert(
        "Logout হয়নি",
        logoutError instanceof Error
          ? logoutError.message
          : "আবার চেষ্টা করুন।",
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      "Parent account থেকে Logout?",
      "Logout করলে আবার Parent Dashboard দেখতে login করতে হবে।",
      [
        { text: "না", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => void handleLogout(),
        },
      ],
    );
  };

  const openAccountDeletion = () => {
    if (!env.ACCOUNT_DELETION_URL) {
      Alert.alert(
        "Account deletion",
        "Account-deletion request URL এখনো configure করা হয়নি।"
      );
      return;
    }

    void Linking.openURL(env.ACCOUNT_DELETION_URL).catch(() =>
      Alert.alert("লিংক খোলা যায়নি", "আবার চেষ্টা করুন।")
    );
  };

  if (authLoading || (!isAuthenticated && loadingData)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Parent Dashboard খুলছে…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loadingData}
            onRefresh={() => void loadDashboard()}
            colors={[colors.green]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>👪 PARENT AREA</Text>
            <Text style={styles.title}>Parent Dashboard</Text>
            <Text style={styles.parentName}>{user?.name ?? user?.email}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[
                styles.headerLogoutButton,
                loggingOut && styles.disabled,
              ]}
              onPress={confirmLogout}
              disabled={loggingOut}
            >
              <Text style={styles.headerLogoutText}>
                {loggingOut ? "Logout হচ্ছে…" : "↪ Logout"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.closeButton}
              onPress={() => navigation.navigate("Subjects")}
            >
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadDashboard()}>
              <Text style={styles.retry}>আবার চেষ্টা করুন</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.linkCard}>
          <Text style={styles.cardTitle}>🔗 সন্তানকে যুক্ত করুন</Text>
          <Text style={styles.helper}>
            Class Selection screen-এ থাকা Student ID লিখে request পাঠান।
          </Text>
          <TextInput
            value={studentCode}
            onChangeText={setStudentCode}
            style={styles.input}
            placeholder="যেমন: SS-C3-ABC123"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!sending}
          />
          <Pressable
            style={[styles.linkButton, sending && styles.disabled]}
            onPress={() => void sendLinkRequest()}
            disabled={sending}
          >
            <Text style={styles.linkText}>
              {sending ? "Request পাঠানো হচ্ছে…" : "Link Request পাঠান"}
            </Text>
          </Pressable>

          {pendingRequests.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <Text style={styles.requestIcon}>⏳</Text>
              <View style={styles.requestCopy}>
                <Text style={styles.requestTitle}>
                  {getStatusText(request.status as ParentLinkRequest["status"])}
                </Text>
                <Text style={styles.requestId}>
                  Request #{request.id.slice(0, 8)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>আমার সন্তান</Text>
        {children.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.children}
          >
            {children.map((child) => (
              <Pressable
                key={child.id}
                style={[
                  styles.childCard,
                  child.id === selectedChild?.id && styles.selectedChild,
                ]}
                onPress={() => setSelectedId(child.id)}
              >
                <Text style={styles.childAvatar}>🐯</Text>
                <Text style={styles.childName} numberOfLines={1}>
                  {child.displayName}
                </Text>
                <Text style={styles.childClass}>Class {child.classLevel}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>＋</Text>
            <Text style={styles.emptyTitle}>এখনো কোনো child link হয়নি</Text>
            <Text style={styles.emptyText}>
              উপরে Student ID দিয়ে request পাঠান, তারপর child device থেকে Allow
              করুন।
            </Text>
          </View>
        )}

        {selectedChild ? (
          <>
            <View style={styles.progressCard}>
              <Text style={styles.cardTitle}>📊 Overall Progress</Text>
              <View style={styles.overallRow}>
                <View style={styles.ring}>
                  <Text style={styles.ringText}>
                    {Math.round(selectedChild.totalProgress)}%
                  </Text>
                </View>
                <View style={styles.overallInfo}>
                  <Text style={styles.childBig}>
                    {selectedChild.displayName}
                  </Text>
                  <Text style={styles.muted}>
                    Class {selectedChild.classLevel}
                  </Text>
                  <Text style={styles.studentId}>
                    {selectedChild.studentCode}
                  </Text>
                  <View style={styles.scoreRow}>
                    <Text style={styles.score}>
                      ⭐ {selectedChild.totalStars}
                    </Text>
                    <Text style={styles.score}>
                      🏆 {selectedChild.totalPoints} points
                    </Text>
                  </View>
                </View>
              </View>

              {selectedChild.subjectProgress.length > 0 ? (
                selectedChild.subjectProgress.map((subject) => (
                  <ProgressBar
                    key={subject.subjectId}
                    label={subject.titleBn || subject.titleEn}
                    detail={`${subject.completedChapters}/${subject.totalChapters} chapter`}
                    value={subject.percentage}
                    color={subjectColor(subject.subjectId)}
                  />
                ))
              ) : (
                <Text style={styles.noProgress}>
                  Published chapter complete করলে এখানে subject progress দেখা
                  যাবে।
                </Text>
              )}
            </View>

            <View style={styles.backupCard}>
              <Text style={styles.backupTitle}>☁️ Cloud backup active</Text>
              <Text style={styles.backupText}>
                এই child এখন Parent account-এর সঙ্গে securely linked। Progress
                Supabase-এ থাকবে।
              </Text>
            </View>
          </>
        ) : null}

        <Pressable
          style={[styles.logoutButton, loggingOut && styles.disabled]}
          onPress={confirmLogout}
          disabled={loggingOut}
        >
          <Text style={styles.logoutText}>
            {loggingOut ? "Logout হচ্ছে…" : "Parent account থেকে Logout"}
          </Text>
        </Pressable>
        <Pressable
          style={styles.deleteAccountButton}
          onPress={openAccountDeletion}
        >
          <Text style={styles.deleteAccountText}>
            Parent account ও data deletion request
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function subjectColor(subjectId: string) {
  const normalized = subjectId.toLowerCase();

  if (normalized.includes("bangla")) return colors.green;
  if (normalized.includes("english")) return colors.blue;
  if (normalized.includes("math")) return colors.orange;
  return colors.yellow;
}

function ProgressBar({
  label,
  detail,
  value,
  color,
}: {
  label: string;
  detail: string;
  value: number;
  color: string;
}) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <View style={styles.progress}>
      <View style={styles.progressHead}>
        <View>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressDetail}>{detail}</Text>
        </View>
        <Text style={styles.progressValue}>{safeValue}%</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${safeValue}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { padding: 16, paddingBottom: 38 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: colors.muted, fontWeight: "800" },
  header: { flexDirection: "row", alignItems: "flex-start" },
  headerCopy: { flex: 1 },
  headerActions: {
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLogoutButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F2A4A4",
  },
  headerLogoutText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: "900",
  },
  eyebrow: { color: colors.greenDark, fontSize: 11, fontWeight: "900" },
  title: { marginTop: 2, fontSize: 27, fontWeight: "900", color: colors.ink },
  parentName: { marginTop: 3, color: colors.muted, fontWeight: "700" },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  close: { color: colors.muted, fontSize: 18, fontWeight: "900" },
  errorCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: colors.red,
  },
  errorText: { color: "#9F2626", fontWeight: "700" },
  retry: { marginTop: 8, color: "#9F2626", fontWeight: "900" },
  linkCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#FFF",
    ...shadows.card,
  },
  cardTitle: { fontSize: 17, fontWeight: "900", color: colors.ink },
  helper: {
    marginTop: 6,
    color: colors.muted,
    lineHeight: 19,
    fontWeight: "600",
  },
  input: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 15,
    padding: 13,
    backgroundColor: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
  linkButton: {
    marginTop: 10,
    backgroundColor: colors.orange,
    borderRadius: 15,
    padding: 14,
    alignItems: "center",
  },
  linkText: { color: "#FFF", fontWeight: "900", fontSize: 15 },
  disabled: { opacity: 0.6 },
  requestRow: {
    marginTop: 12,
    padding: 10,
    borderRadius: 13,
    backgroundColor: "#FFF7DF",
    flexDirection: "row",
    alignItems: "center",
  },
  requestIcon: { fontSize: 22 },
  requestCopy: { marginLeft: 9, flex: 1 },
  requestTitle: { color: "#8A5700", fontWeight: "900" },
  requestId: { marginTop: 2, color: colors.muted, fontSize: 11 },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 9,
    color: colors.ink,
    fontWeight: "900",
  },
  children: { gap: 10, paddingRight: 4 },
  childCard: {
    width: 112,
    padding: 12,
    borderRadius: 20,
    backgroundColor: "#FFF",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectedChild: { borderColor: colors.green, backgroundColor: "#F1FFE6" },
  childAvatar: { fontSize: 38 },
  childName: { marginTop: 3, fontWeight: "900", color: colors.ink },
  childClass: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    padding: 22,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#B9C7D0",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  emptyIcon: { fontSize: 38, color: "#A5B3BC" },
  emptyTitle: { marginTop: 4, color: colors.ink, fontWeight: "900" },
  emptyText: {
    marginTop: 6,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
  },
  progressCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: colors.green,
  },
  overallRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  ring: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 10,
    borderColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5FFEC",
  },
  ringText: { fontSize: 21, fontWeight: "900", color: colors.greenDark },
  overallInfo: { marginLeft: 15, flex: 1 },
  childBig: { fontSize: 21, fontWeight: "900", color: colors.ink },
  muted: { color: colors.muted, fontWeight: "700" },
  studentId: {
    marginTop: 3,
    color: "#126D90",
    fontSize: 12,
    fontWeight: "900",
  },
  scoreRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  score: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  progress: { marginTop: 14 },
  progressHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  progressLabel: { color: colors.ink, fontWeight: "900" },
  progressDetail: { marginTop: 2, color: colors.muted, fontSize: 10 },
  progressValue: { color: colors.ink, fontWeight: "900" },
  track: {
    height: 11,
    marginTop: 6,
    borderRadius: 6,
    backgroundColor: "#E8EDF0",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 6 },
  noProgress: {
    marginTop: 12,
    color: colors.muted,
    lineHeight: 19,
    fontWeight: "600",
  },
  backupCard: {
    marginTop: 14,
    padding: 15,
    borderRadius: 18,
    backgroundColor: "#EAF7FF",
    borderWidth: 1,
    borderColor: colors.blue,
  },
  backupTitle: { color: "#126D90", fontWeight: "900" },
  backupText: { marginTop: 4, color: "#486773", lineHeight: 18 },
  logoutButton: { marginTop: 22, padding: 13, alignItems: "center" },
  logoutText: { color: colors.red, fontWeight: "900" },
  deleteAccountButton: { padding: 10, alignItems: "center" },
  deleteAccountText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});