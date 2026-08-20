import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

import MimiCharacter from "./MimiCharacter";
import { speakLearningVoice, stopLearningVoice } from "../services/learningVoice";

type Props = {
  activity: {
    payload: {
      prompt: string;
      word: string;
      emoji: string;
      locale?: string;
      imageUrl?: string;
      audioUrl?: string;
    };
  };
  onComplete: () => void;
};

function formatSeconds(milliseconds: number) {
  return Math.max(0, Math.round(milliseconds / 1000));
}

export default function VoiceActivity({ activity, onComplete }: Props) {
  const data = activity.payload;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);

  // expo-audio objects are native shared objects. These refs prevent two
  // overlapping prepare/stop operations and prevent cleanup from racing
  // against an in-flight recording operation.
  const recordingBusyRef = useRef(false);
  const mountedRef = useRef(true);
  const completedRef = useRef(false);

  const targetText = useMemo(
    () => String(data.word || data.prompt || "").trim(),
    [data.prompt, data.word],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      completedRef.current = true;

      // Do not call player.pause() here. useAudioPlayer owns the native
      // player lifecycle and releases it during unmount. Calling pause() from
      // cleanup can hit an already-released shared object.
      void stopLearningVoice();

      if (recorderState.isRecording) {
        void (async () => {
          try {
            await recorder.stop();
          } catch {
            // The recorder may already have been released during unmount.
          }
          try {
            await setAudioModeAsync({
              allowsRecording: false,
              playsInSilentMode: true,
            });
          } catch {
            // Audio mode cleanup must never crash the app.
          }
        })();
      } else {
        void setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        }).catch(() => undefined);
      }
    };
  }, [recorder, recorderState.isRecording]);

  const playTarget = async () => {
    if (completedRef.current) return;

    setMessage("");
    await stopLearningVoice();

    const source = String(data.audioUrl ?? "").trim();
    if (source) {
      try {
        player.pause();
        player.replace(source);
        player.play();
      } catch (error) {
        if (__DEV__) console.log("Voice target audio could not play:", error);
        if (targetText) {
          await speakLearningVoice(targetText, {
            language: data.locale ?? "en-US",
            rate: 0.72,
          });
        }
      }
      return;
    }

    if (targetText) {
      await speakLearningVoice(targetText, {
        language: data.locale ?? "en-US",
        rate: 0.72,
      });
    }
  };

  const startRecording = async () => {
    if (completedRef.current || recordingBusyRef.current || recorderState.isRecording) {
      return;
    }

    recordingBusyRef.current = true;

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "মাইক্রোফোন অনুমতি দরকার",
          "তোমার কথা রেকর্ড করতে মাইক্রোফোনের অনুমতি দাও।",
        );
        return;
      }

      await stopLearningVoice();
      try {
        player.pause();
      } catch {
        // Player can already be stopped/released; recording can continue.
      }

      if (recorderState.isRecording) return;

      setRecordedUri(null);
      setMessage("");
      setFinished(false);
      completedRef.current = false;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      if (__DEV__) console.log("Voice recording could not start:", error);
      if (mountedRef.current) {
        setMessage("রেকর্ড শুরু করা যায়নি। আবার চেষ্টা করো।");
      }
    } finally {
      recordingBusyRef.current = false;
    }
  };

  const stopRecording = async () => {
    if (recordingBusyRef.current || !recorderState.isRecording) return;

    recordingBusyRef.current = true;

    try {
      await recorder.stop();
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      const uri = recorder.uri ?? null;
      if (!mountedRef.current) return;

      setRecordedUri(uri);
      setMessage(
        uri
          ? "দারুণ! এবার নিজের কথাটা শুনে দেখো 🎧"
          : "রেকর্ডটি পাওয়া যায়নি। আবার চেষ্টা করো।",
      );
    } catch (error) {
      if (__DEV__) console.log("Voice recording could not stop:", error);
      if (mountedRef.current) {
        setMessage("রেকর্ডটি শেষ করা যায়নি। আবার চেষ্টা করো।");
      }
    } finally {
      recordingBusyRef.current = false;
    }
  };

  const playRecording = async () => {
    if (!recordedUri || completedRef.current) return;

    await stopLearningVoice();

    try {
      player.pause();
      player.replace(recordedUri);
      player.play();
    } catch (error) {
      if (__DEV__) console.log("Recorded audio could not play:", error);
      if (mountedRef.current) {
        setMessage("রেকর্ডটি চালানো যায়নি। আবার রেকর্ড করো।");
      }
    }
  };

  const finishPractice = async () => {
    if (!recordedUri || finished || completedRef.current || recordingBusyRef.current) return;

    completedRef.current = true;
    setFinished(true);
    setMessage("চমৎকার! এই অনুশীলন শেষ হয়েছে 🌟");

    // Stop audio BEFORE notifying the parent. The parent may immediately
    // unmount this component, so no native player operation should remain
    // after onComplete() starts the navigation/completion flow.
    await stopLearningVoice();
    try {
      if (playerStatus.playing) player.pause();
    } catch {
      // Ignore an already-released/stopped player.
    }

    onComplete();
  };

  const isRecording = recorderState.isRecording;
  const duration = formatSeconds(recorderState.durationMillis ?? 0);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <MimiCharacter emotion={isRecording ? "talking" : finished ? "celebrate" : "happy"} size={154} />
        <View style={styles.guidePill}>
          <Text style={styles.guideDot}>●</Text>
          <Text style={styles.guideText}>মিমির সাথে বলি</Text>
        </View>
      </View>

      <View style={styles.promptCard}>
        <View style={styles.promptTopRow}>
          <View style={styles.promptCopy}>
            <Text style={styles.promptEyebrow}>শুনে বলো</Text>
            <Text style={styles.promptText}>{data.prompt || "শব্দটি শুনে বলো"}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void playTarget()} style={styles.listenButton}>
            <Text style={styles.listenIcon}>{playerStatus.playing ? "⏸️" : "🔊"}</Text>
            <Text style={styles.listenLabel}>শুনি</Text>
          </Pressable>
        </View>

        <View style={styles.wordStage}>
          {data.imageUrl ? (
            <Image source={{ uri: data.imageUrl }} style={styles.image} resizeMode="contain" />
          ) : data.emoji ? (
            <Text style={styles.emoji}>{data.emoji}</Text>
          ) : null}
          {targetText ? <Text style={styles.word}>{targetText}</Text> : null}
        </View>
      </View>

      <View style={[styles.recordCard, isRecording && styles.recordCardActive]}>
        <Text style={styles.recordTitle}>
          {isRecording ? `🎙️ রেকর্ড হচ্ছে • ${duration}s` : recordedUri ? "✅ তোমার রেকর্ড তৈরি হয়েছে" : "🎤 এবার তুমি বলো"}
        </Text>
        <Text style={styles.recordHelper}>
          {isRecording
            ? "বলা শেষ হলে নিচের Stop বোতামে চাপ দাও।"
            : recordedUri
              ? "নিজের কথা শোনো, চাইলে আবার রেকর্ড করো।"
              : "রেকর্ড চাপ দিয়ে শব্দটি পরিষ্কার করে বলো."}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => void (isRecording ? stopRecording() : startRecording())}
          style={[styles.recordButton, isRecording && styles.stopButton]}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? "■ রেকর্ড বন্ধ করি" : recordedUri ? "↻ আবার রেকর্ড করি" : "● রেকর্ড শুরু করি"}
          </Text>
        </Pressable>

        {recordedUri ? (
          <View style={styles.actionRow}>
            <Pressable accessibilityRole="button" onPress={() => void playRecording()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{playerStatus.playing ? "⏸ একটু থামি" : "▶️ আমার কথা শুনি"}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={finished}
              onPress={() => void finishPractice()}
              style={[styles.doneButton, finished && styles.doneButtonFinished]}
            >
              <Text style={styles.doneButtonText}>{finished ? "✓ হয়ে গেছে" : "হয়ে গেছে ✓"}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {message ? (
        <View style={[styles.message, finished && styles.messageDone]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", alignItems: "center" },
  hero: { width: "100%", alignItems: "center", paddingTop: 2, paddingBottom: 14, borderRadius: 28, backgroundColor: "#E8DFFA" },
  guidePill: { marginTop: -12, paddingHorizontal: 13, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 18, backgroundColor: "#2D2831" },
  guideDot: { color: "#63D67A", fontSize: 9 },
  guideText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  promptCard: { width: "100%", marginTop: 14, padding: 16, borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8E1EC" },
  promptTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  promptCopy: { flex: 1 },
  promptEyebrow: { fontSize: 10, fontWeight: "900", color: "#8A8090" },
  promptText: { marginTop: 4, fontSize: 18, lineHeight: 26, fontWeight: "900", color: "#2C2630" },
  listenButton: { minWidth: 64, minHeight: 58, paddingHorizontal: 10, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#E9F6FF" },
  listenIcon: { fontSize: 20 },
  listenLabel: { marginTop: 2, fontSize: 9, fontWeight: "900", color: "#287DA4" },
  wordStage: { minHeight: 126, marginTop: 14, paddingHorizontal: 14, paddingVertical: 16, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F3FC" },
  image: { width: 150, height: 118 },
  emoji: { fontSize: 66 },
  word: { marginTop: 8, fontSize: 32, lineHeight: 40, fontWeight: "900", textAlign: "center", color: "#28222B" },
  recordCard: { width: "100%", marginTop: 14, padding: 16, borderRadius: 24, borderWidth: 2, borderColor: "#E5DDEF", backgroundColor: "#FBF9FD" },
  recordCardActive: { borderColor: "#F1A3A3", backgroundColor: "#FFF7F7" },
  recordTitle: { fontSize: 17, fontWeight: "900", textAlign: "center", color: "#302936" },
  recordHelper: { marginTop: 5, fontSize: 12, lineHeight: 18, fontWeight: "700", textAlign: "center", color: "#756C79" },
  recordButton: { minHeight: 54, marginTop: 14, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: "#7653BD" },
  stopButton: { backgroundColor: "#E25C5C" },
  recordButtonText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
  actionRow: { marginTop: 10, flexDirection: "row", gap: 9 },
  secondaryButton: { flex: 1, minHeight: 48, paddingHorizontal: 10, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF5FF" },
  secondaryButtonText: { fontSize: 11, fontWeight: "900", textAlign: "center", color: "#287DA4" },
  doneButton: { flex: 1, minHeight: 48, paddingHorizontal: 10, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#5CB66B" },
  doneButtonFinished: { backgroundColor: "#9FD9A7" },
  doneButtonText: { fontSize: 12, fontWeight: "900", color: "#FFFFFF" },
  message: { width: "100%", marginTop: 12, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, backgroundColor: "#FFF3D7" },
  messageDone: { backgroundColor: "#E5F7E7" },
  messageText: { fontSize: 12, lineHeight: 18, fontWeight: "800", textAlign: "center", color: "#4A414D" },
});
