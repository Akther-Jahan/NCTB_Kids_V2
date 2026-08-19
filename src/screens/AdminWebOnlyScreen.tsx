import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ScreenProps } from "../navigation/routes";

export default function AdminWebOnlyScreen({
  navigation,
}: ScreenProps<"AdminLogin">) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🖥️</Text>
        </View>

        <Text style={styles.eyebrow}>STAFF ACCESS</Text>
        <Text style={styles.title}>Admin CMS is web-only</Text>
        <Text style={styles.description}>
          Curriculum, quiz এবং content management production mobile app-এর
          অংশ নয়। অনুমোদিত staff-রা আলাদা Web Admin CMS ব্যবহার করবেন।
        </Text>

        <View style={styles.note}>
          <Text style={styles.noteIcon}>🔐</Text>
          <Text style={styles.noteText}>
            এতে শিশুদের app-এর release bundle ছোট ও নিরাপদ থাকে এবং admin
            management interface student device থেকে আলাদা থাকে।
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Settings")}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Settings-এ ফিরে যাই</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Subjects")}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Student app-এ ফিরে যাই</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFDF7",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 46,
    backgroundColor: "#EEE8FA",
  },
  icon: {
    fontSize: 44,
  },
  eyebrow: {
    marginTop: 22,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "900",
    color: "#88799B",
  },
  title: {
    marginTop: 7,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: "#2F2268",
    textAlign: "center",
  },
  description: {
    maxWidth: 480,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600",
    color: "#665D70",
    textAlign: "center",
  },
  note: {
    maxWidth: 480,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 22,
    padding: 15,
    borderRadius: 20,
    backgroundColor: "#F3F8EF",
  },
  noteIcon: {
    fontSize: 20,
  },
  noteText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: "#55704D",
  },
  primaryButton: {
    width: "100%",
    maxWidth: 420,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: "#2F2268",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  secondaryButton: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6F6480",
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
