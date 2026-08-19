import React, { useState } from "react";
import { useEventListener } from "expo";
import { StyleSheet, Text, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

import { colors } from "../../../theme/theme";

type VideoActivityProps = {
  title: string;
  url: string;
  completed: boolean;
  autoplay?: boolean;
  onComplete: () => void;
};

export function VideoActivity({
  title,
  url,
  completed,
  autoplay = false,
  onComplete,
}: VideoActivityProps) {
  const [watchedToEnd, setWatchedToEnd] = useState(completed);

  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    if (autoplay) instance.play();
  });

  useEventListener(player, "playToEnd", () => {
    setWatchedToEnd(true);
    onComplete();
  });

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.icon}><Text style={styles.iconText}>▶️</Text></View>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>ভিডিও দেখে শিখি</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <View style={styles.videoCard}>
        <VideoView
          style={styles.video}
          player={player}
          nativeControls
          fullscreenOptions={{ enable: true }}
          contentFit="contain"
        />
      </View>

      <View style={[styles.statusCard, watchedToEnd && styles.statusCardDone]}>
        <Text style={styles.statusIcon}>{watchedToEnd ? "🌟" : "💡"}</Text>
        <Text style={styles.statusText}>
          {watchedToEnd
            ? "দারুণ! ভিডিওটি দেখা শেষ হয়েছে।"
            : "ভিডিওটি শেষ পর্যন্ত দেখো। দরকার হলে আবারও দেখতে পারো।"}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#EEE6FF" },
  iconText: { fontSize: 22 },
  headingCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "900", color: "#8A8090" },
  title: { marginTop: 2, fontSize: 21, lineHeight: 28, fontWeight: "900", color: colors.ink },
  videoCard: { marginTop: 16, padding: 5, borderRadius: 24, backgroundColor: "#EAE2F7", overflow: "hidden" },
  video: { width: "100%", height: 230, borderRadius: 20, backgroundColor: "#17141A" },
  statusCard: { marginTop: 14, padding: 13, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FFF5D9" },
  statusCardDone: { backgroundColor: "#E6F7E8" },
  statusIcon: { fontSize: 22 },
  statusText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "800", color: "#574E5A" },
});
