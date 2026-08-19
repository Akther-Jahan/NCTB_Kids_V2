import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { speakLearningVoice, stopLearningVoice } from "../services/learningVoice";

type Props = {
  activity: {
    payload: {
      title: string;
      text: string;
      audio?: string;
      locale?: string;
      imageUrl?: string;
    };
  };
  completed?: boolean;
  onComplete?: () => void;
};

function isPlayableUri(value?: string) {
  const clean = String(value ?? "").trim();
  return /^(https?:|file:|content:|asset:)/i.test(clean) ? clean : "";
}

export default function AudioStoryActivity({ activity, completed = false, onComplete }: Props) {
  const data = activity.payload;
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const audioUri = isPlayableUri(data.audio);
  const completeRef = useRef(onComplete);
  const completedRef = useRef(completed);
  const [listened, setListened] = useState(completed);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    completedRef.current = completed;
    if (completed) setListened(true);
  }, [completed]);

  const markListened = () => {
    setListened(true);
    if (!completedRef.current) {
      completedRef.current = true;
      completeRef.current?.();
    }
  };

  useEffect(() => {
    if (status.didJustFinish) markListened();
  }, [status.didJustFinish]);

  useEffect(() => {
    return () => {
      player.pause();
      void stopLearningVoice();
    };
  }, [player]);

  const listen = async () => {
    await stopLearningVoice();

    if (audioUri) {
      player.pause();
      player.replace(audioUri);
      player.play();
      return;
    }

    await speakLearningVoice(data.text || data.title, {
      language: data.locale ?? "bn-BD",
      rate: 0.74,
    });
    markListened();
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        {data.imageUrl ? (
          <Image source={{ uri: data.imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.audioBubble}>
            <Text style={styles.audioEmoji}>🎧</Text>
          </View>
        )}

        <View style={styles.badge}>
          <Text style={styles.badgeText}>শুনে শিখি</Text>
        </View>
      </View>

      <View style={styles.copyCard}>
        {data.title ? <Text style={styles.title}>{data.title}</Text> : null}
        <Text style={styles.text}>{data.text}</Text>

        <Pressable accessibilityRole="button" style={[styles.button, listened && styles.buttonDone]} onPress={() => void listen()}>
          <Text style={styles.buttonText}>
            {status.playing ? "🔊 শুনছি..." : listened ? "↻ আবার শুনি" : "🔊 শুনি"}
          </Text>
        </Pressable>

        <View style={[styles.helperCard, listened && styles.helperCardDone]}>
          <Text style={styles.helperIcon}>{listened ? "🌟" : "💡"}</Text>
          <Text style={styles.helper}>
            {listened
              ? "শোনা হয়েছে! চাইলে আবার শুনে অনুশীলন করতে পারো।"
              : audioUri
                ? "অডিওটি মন দিয়ে শোনো। শেষ হলে পরের ধাপ খুলবে।"
                : "মিমির কণ্ঠে বাক্যটি শুনে ধীরে ধীরে বলার চেষ্টা করো।"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center" },
  heroCard: {
    width: "100%",
    minHeight: 180,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: "#E8DFFA",
  },
  image: { width: 210, height: 150 },
  audioBubble: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  audioEmoji: { fontSize: 56 },
  badge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#2D2831",
  },
  badgeText: { fontSize: 10, fontWeight: "900", color: "#FFFFFF" },
  copyCard: {
    width: "100%",
    marginTop: 14,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E8E1EC",
    backgroundColor: "#FFFFFF",
  },
  title: { fontSize: 22, lineHeight: 30, fontWeight: "900", textAlign: "center", color: "#2B2530" },
  text: { marginTop: 9, fontSize: 21, lineHeight: 33, fontWeight: "800", textAlign: "center", color: "#413847" },
  button: {
    minHeight: 54,
    marginTop: 18,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7653BD",
  },
  buttonDone: { backgroundColor: "#5CB66B" },
  buttonText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
  helperCard: { marginTop: 11, padding: 10, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF5D9" },
  helperCardDone: { backgroundColor: "#E6F7E8" },
  helperIcon: { fontSize: 18 },
  helper: { flex: 1, fontSize: 11, lineHeight: 17, fontWeight: "700", color: "#706773" },
});
