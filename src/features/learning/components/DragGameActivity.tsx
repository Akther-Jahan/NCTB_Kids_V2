import React, { useState } from "react";

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
type Props = {
  activity: {
    payload: {
      prompt: string;
      items: {
        emoji: string;
        target: string;
      }[];
    };
  };

  onComplete: () => void;
};

export default function DragGameActivity({ activity, onComplete }: Props) {
  const data = activity.payload;
  const [doneIndices, setDoneIndices] = useState<number[]>([]);

  const completeItem = (index: number) => {
    const nextDoneIndices = doneIndices.includes(index)
      ? doneIndices
      : [...doneIndices, index];

    setDoneIndices(nextDoneIndices);

    if (nextDoneIndices.length === data.items.length) {
      onComplete();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{data.prompt}</Text>

      {data.items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.item, doneIndices.includes(index) && styles.doneItem]}
          onPress={() => completeItem(index)}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>

          <Text style={styles.text}>➡️ {item.target}</Text>
        </TouchableOpacity>
      ))}

      {doneIndices.length === data.items.length && (
        <Text style={styles.success}>🎉 খুব ভালো!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,

    alignItems: "center",
  },

  prompt: {
    fontSize: 25,

    fontWeight: "700",

    marginBottom: 30,
  },

  item: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#95D5B2",

    padding: 20,

    borderRadius: 20,
  },

  doneItem: {
    opacity: 0.65,
  },

  emoji: {
    fontSize: 50,
  },

  text: {
    fontSize: 22,

    marginLeft: 20,
  },

  success: {
    fontSize: 25,

    color: "green",

    marginTop: 30,
  },
});
