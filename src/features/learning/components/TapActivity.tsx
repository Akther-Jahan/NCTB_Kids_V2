import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Speech from "expo-speech";

import MimiCharacter from "./MimiCharacter";
import MimiBubble from "../components/MimiBubble";

type Props = {
  activity: {
    payload: {
      prompt: string;
      items: {
        id: string;
        emoji: string;
        label: string;
        description: string;
      }[];
    };
  };

  onComplete: () => void;
};

export default function TapActivity({
  activity,
  onComplete,
}: Props) {
  const data = activity.payload;

  const [done, setDone] = useState<string[]>([]);

  const tapItem = (item: (typeof data.items)[0]) => {
    if (done.includes(item.id)) return;

    const next = [...done, item.id];
    setDone(next);

    Speech.stop();
    Speech.speak(item.description, {
      language: "bn-BD",
      rate: 0.75,
    });

    if (next.length === data.items.length) {
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  };

  return (
    <View style={styles.container}>
      <MimiCharacter emotion="happy" size={180} />
      <MimiBubble text={data.prompt} />

      {data.items.map((item) => (
        <Pressable
          key={item.id}
          style={[
            styles.card,
            done.includes(item.id) && styles.done,
          ]}
          onPress={() => tapItem(item)}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
  },
  card: {
    width: 260,
    padding: 18,
    marginVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFD166",
    alignItems: "center",
  },
  done: {
    backgroundColor: "#A8E6A3",
  },
  emoji: {
    fontSize: 48,
  },
  label: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
  },
});