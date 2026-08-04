import React, { useState } from "react";

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
type Props = {
  activity: {
    payload: {
      prompt: string;
      cards: {
        emoji: string;
        word: string;
      }[];
    };
  };
};

export default function FlashcardActivity({ activity }: Props) {
  const data = activity.payload;
  const [index, setIndex] = useState(0);

  const [show, setShow] = useState(false);

  const card = data.cards[index];

  function nextCard() {
    setShow(false);

    if (index < data.cards.length - 1) {
      setIndex(index + 1);
    } else {
      setIndex(0);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{data.prompt}</Text>

      <TouchableOpacity style={styles.card} onPress={() => setShow(!show)}>
        <Text style={styles.emoji}>{card.emoji}</Text>

        <Text style={styles.word}>{show ? card.word : "ট্যাপ করো"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={nextCard}>
        <Text style={styles.buttonText}>পরের শব্দ ➡️</Text>
      </TouchableOpacity>

      <Text style={styles.count}>
        {index + 1}/{data.cards.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",

    padding: 20,
  },

  prompt: {
    fontSize: 24,

    fontWeight: "700",

    marginBottom: 30,
  },

  card: {
    width: 250,

    height: 220,

    backgroundColor: "#FFD166",

    borderRadius: 30,

    justifyContent: "center",

    alignItems: "center",
  },

  emoji: {
    fontSize: 80,
  },

  word: {
    fontSize: 30,

    fontWeight: "bold",

    marginTop: 20,
  },

  button: {
    backgroundColor: "#7BDFF2",

    padding: 15,

    borderRadius: 20,

    marginTop: 30,
  },

  buttonText: {
    fontSize: 20,

    fontWeight: "700",
  },

  count: {
    marginTop: 15,

    fontSize: 18,
  },
});
