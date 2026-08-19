import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "../../../theme/theme";

type ImageActivity = {
  title?: string;
  instruction?: string;
  data: {
    image?: string;
    description?: string;
    sourceLabel?: string;
  };
};

type Props = {
  activity: ImageActivity;
  completed: boolean;
  onComplete: () => void;
};

export function ImageLessonActivity({ activity, completed, onComplete }: Props) {
  const { title, instruction, data } = activity;
  const hasImage = Boolean(String(data.image ?? "").trim());
  const [loading, setLoading] = useState(hasImage);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingIcon}><Text style={styles.headingIconText}>🖼️</Text></View>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>{hasImage ? "ছবি দেখে শিখি" : "শিখে নিই"}</Text>
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      </View>

      {instruction ? <Text style={styles.instruction}>{instruction}</Text> : null}

      {hasImage && !imageFailed ? (
        <View style={styles.imageCard}>
          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#7653BD" />
              <Text style={styles.loadingText}>ছবিটি আসছে...</Text>
            </View>
          ) : null}
          <Image
            source={{ uri: data.image }}
            style={styles.image}
            resizeMode="contain"
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setImageFailed(true);
            }}
          />
        </View>
      ) : (
        <View style={styles.noImageCard}>
          <Text style={styles.noImageIcon}>✨</Text>
          <Text style={styles.noImageTitle}>{imageFailed ? "ছবিটি এখন লোড হয়নি" : "এই অংশে ছবি দেওয়া হয়নি"}</Text>
          <Text style={styles.noImageText}>
            {imageFailed
              ? "সমস্যা নেই—উপরের লেখাটি দেখে শেখা চালিয়ে যাও।"
              : "লেখাটি পড়ে বা শুনে শেখা চালিয়ে যেতে পারো।"}
          </Text>
        </View>
      )}

      {data.sourceLabel && hasImage ? <Text style={styles.source}>{data.sourceLabel}</Text> : null}

      <Pressable
        accessibilityRole="button"
        style={[styles.completeButton, completed && styles.completedButton]}
        onPress={onComplete}
      >
        <Text style={styles.completeText}>{completed ? "✓ হয়ে গেছে" : hasImage ? "দেখা শেষ ✓" : "শেখা শেষ ✓"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  headingIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE6FF",
  },
  headingIconText: { fontSize: 24 },
  headingCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "900", color: "#8A8090" },
  title: { marginTop: 2, fontSize: 22, lineHeight: 29, fontWeight: "900", color: colors.ink },
  instruction: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 25,
    color: "#6F6773",
    fontWeight: "800",
  },
  imageCard: {
    minHeight: 250,
    marginTop: 16,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#E5DDEE",
    backgroundColor: "#FBF9FE",
    overflow: "hidden",
  },
  loaderWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBF9FE",
  },
  loadingText: { marginTop: 8, fontSize: 11, fontWeight: "800", color: "#766D7A" },
  image: { width: "100%", height: 310, backgroundColor: "#FFFFFF" },
  noImageCard: {
    minHeight: 150,
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF6DA",
  },
  noImageIcon: { fontSize: 36 },
  noImageTitle: { marginTop: 7, fontSize: 17, fontWeight: "900", textAlign: "center", color: "#3F3743" },
  noImageText: { marginTop: 5, fontSize: 12, lineHeight: 18, fontWeight: "700", textAlign: "center", color: "#756B78" },
  source: { marginTop: 8, color: "#8A818D", fontSize: 10, fontWeight: "700", textAlign: "center" },
  completeButton: {
    minHeight: 54,
    marginTop: 18,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7653BD",
  },
  completedButton: { backgroundColor: "#5CB66B" },
  completeText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
