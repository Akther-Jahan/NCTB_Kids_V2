import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Pressable,
  Text,
  View,
} from "react-native";
import type { Activity } from "../data/curriculum";

import * as Speech from "expo-speech";

type Props = {
  activity: Extract<Activity, { type: "intro" | "snippet" }>;
  onComplete: () => void;
};
function speakBangla(text: string, onStart?: () => void, onEnd?: () => void) {
  Speech.stop();

  Speech.speak(text, {
    language: "bn-BD",

    rate: 0.65,

    pitch: 1.3,

    volume: 1,

    onStart: () => {
      onStart?.();
    },

    onDone: () => {
      onEnd?.();
    },

    onStopped: () => {
      onEnd?.();
    },
  });
}

export default function MimiIntroActivity({ activity, onComplete }: Props) {
  const entrance = useRef(new Animated.Value(0)).current;

  const floating = useRef(new Animated.Value(0)).current;

  const buttonScale = useRef(new Animated.Value(1)).current;
  const talkingScale = useRef(new Animated.Value(1)).current;

  const [isTalking, setIsTalking] = useState(false);

  const [displayText, setDisplayText] = useState("");

  const fullText = `হ্যালো বন্ধু! আমি মিমি। আজ আমরা ${activity.title} শিখবো। চলো শুরু করি।`;

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      friction: 5,
      tension: 45,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floating, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),

        Animated.timing(floating, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.08,
          duration: 700,
          useNativeDriver: true,
        }),

        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(talkingScale, {
          toValue: 1.04,
          duration: 350,
          useNativeDriver: true,
        }),

        Animated.timing(talkingScale, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    let index = 0;

    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index));

        index++;
      }
    }, 80);
    setTimeout(() => {
      speakBangla(
        fullText,

        () => setIsTalking(true),

        () => setIsTalking(false),
      );
    }, 1200);

    return () => {
      clearInterval(timer);
      Speech.stop();
    };
  }, []);

  const translateY = entrance.interpolate({
    inputRange: [0, 1],

    outputRange: [120, 0],
  });

  const scale = entrance.interpolate({
    inputRange: [0, 1],

    outputRange: [0.7, 1],
  });

  const floatY = floating.interpolate({
    inputRange: [0, 1],

    outputRange: [0, -10],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>✨ তোমার শেখার বন্ধু মিমি ✨</Text>
      <Animated.View
        style={{
          transform: [
            {
              translateY,
            },

            {
              scale: isTalking ? Animated.multiply(scale, talkingScale) : scale,
            },

            {
              translateY: floatY,
            },
          ],
        }}
      >
        <Image
          source={require("../../../../assets/characters/mimi/waving.png")}
          style={styles.mimi}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.bubble}>
        {activity.type === "intro" ? (
          <>
            <Text style={styles.greeting}>হ্যালো বন্ধু! আমি মিমি 👋</Text>

            <Text style={styles.body}>
              আজ আমরা {activity.title} শিখবো।
              {"\n"}
              চলো শুরু করি। 🚀
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>{activity.title}</Text>

            {activity.lines.map((line, index) => (
              <Text key={index} style={styles.body}>
                {line}
              </Text>
            ))}
          </>
        )}
      </View>
      <Animated.View
        style={{
          transform: [
            {
              scale: buttonScale,
            },
          ],
        }}
      >
        <Pressable
          style={styles.startButton}
          onPress={() => {
            Speech.stop();

            onComplete();
          }}
        >
          <Text style={styles.startText}>শুরু করি 🚀</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
    paddingTop: 10,
  },

  header: {
    fontSize: 16,
    fontWeight: "900",
    color: "#D84C83",
    marginBottom: 5,
  },

  mimi: {
    width: 420,
    height: 500,
  },

  bubble: {
    width: "90%",
    padding: 22,

    backgroundColor: "#FFF3BF",

    borderRadius: 24,

    borderWidth: 2,

    borderColor: "#FFB000",

    alignItems: "center",

    marginTop: 5,
  },

  greeting: {
    fontSize: 20,

    fontWeight: "900",

    color: "#D84C83",

    textAlign: "center",

    marginBottom: 8,
  },

  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#222",
    marginTop: 8,
    textAlign: "center",
  },

  body: {
    fontSize: 16,

    fontWeight: "700",

    lineHeight: 24,

    marginTop: 8,

    textAlign: "center",

    color: "#333",
  },
  startButton: {
    marginTop: 25,

    paddingHorizontal: 45,

    paddingVertical: 16,

    borderRadius: 25,

    backgroundColor: "#4CAF50",
  },

  startText: {
    color: "#fff",

    fontSize: 18,

    fontWeight: "900",
  },
});
