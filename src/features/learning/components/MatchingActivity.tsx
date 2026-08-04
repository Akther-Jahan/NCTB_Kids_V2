import React, { useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Speech from "expo-speech";

import MimiBubble from "./MimiBubble";
import MimiCharacter from "./MimiCharacter";

type Pair = {
  emoji: string;
  word: string;
};

type Props = {
  activity: {
    payload: {
      prompt: string;
      pairs: Pair[];
    };
  };
  onComplete: () => void;
};

export default function MatchingActivity({
  activity,
  onComplete,
}: Props) {
  const data = activity.payload;
  const completedRef = useRef(false);

  const wordChoices = useMemo(
    () =>
      data.pairs
        .map((pair, pairIndex) => ({
          pairIndex,
          word: pair.word,
        }))
        .reverse(),
    [data.pairs],
  );

  const [selectedPicture, setSelectedPicture] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [message, setMessage] = useState("ছবি ও সঠিক শব্দ মিল করো।");

  const checkMatch = (pictureIndex: number, wordIndex: number) => {
    const wordChoice = wordChoices[wordIndex];

    if (wordChoice.pairIndex === pictureIndex) {
      const nextMatched = matched.includes(pictureIndex)
        ? matched
        : [...matched, pictureIndex];

      setMatched(nextMatched);
      setMessage("সঠিক মিল! দারুণ করেছো।");

      void Speech.stop();
      Speech.speak("সঠিক মিল", {
        language: "bn-BD",
        rate: 0.75,
      });

      if (
        nextMatched.length === data.pairs.length &&
        !completedRef.current
      ) {
        completedRef.current = true;

        setTimeout(() => {
          onComplete();
        }, 700);
      }
    } else {
      setMessage("মিল হয়নি। আবার চেষ্টা করো।");

      void Speech.stop();
      Speech.speak("আবার চেষ্টা করো", {
        language: "bn-BD",
        rate: 0.75,
      });
    }

    setSelectedPicture(null);
    setSelectedWord(null);
  };

  const choosePicture = (index: number) => {
    if (matched.includes(index)) return;

    setSelectedPicture(index);

    if (selectedWord !== null) {
      checkMatch(index, selectedWord);
    }
  };

  const chooseWord = (index: number) => {
    const pairIndex = wordChoices[index].pairIndex;

    if (matched.includes(pairIndex)) return;

    setSelectedWord(index);

    if (selectedPicture !== null) {
      checkMatch(selectedPicture, index);
    }
  };

  return (
    <View style={styles.container}>
      <MimiCharacter emotion="happy" size={160} />
      <MimiBubble text={data.prompt} />

      <View style={styles.columns}>
        <View style={styles.column}>
          {data.pairs.map((pair, index) => {
            const isMatched = matched.includes(index);

            return (
              <Pressable
                key={`picture-${index}`}
                style={[
                  styles.card,
                  selectedPicture === index && styles.selectedCard,
                  isMatched && styles.matchedCard,
                ]}
                onPress={() => choosePicture(index)}
                disabled={isMatched}
              >
                <Text style={styles.emoji}>{pair.emoji}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.column}>
          {wordChoices.map((choice, index) => {
            const isMatched = matched.includes(choice.pairIndex);

            return (
              <Pressable
                key={`word-${choice.pairIndex}`}
                style={[
                  styles.card,
                  selectedWord === index && styles.selectedCard,
                  isMatched && styles.matchedCard,
                ]}
                onPress={() => chooseWord(index)}
                disabled={isMatched}
              >
                <Text style={styles.word}>{choice.word}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.message}>{message}</Text>

      {matched.length === data.pairs.length ? (
        <Text style={styles.success}>🎉 সবগুলো সঠিকভাবে মিলেছে!</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 12,
  },
  columns: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  column: {
    flex: 1,
    gap: 10,
  },
  card: {
    minHeight: 74,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#BFD4E2",
    backgroundColor: "#F7FBFD",
    padding: 10,
  },
  selectedCard: {
    borderColor: "#FFB000",
    backgroundColor: "#FFF3BF",
  },
  matchedCard: {
    borderColor: "#4CAF50",
    backgroundColor: "#DFF7D8",
  },
  emoji: {
    fontSize: 42,
  },
  word: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  success: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "900",
    color: "#2E7D32",
    textAlign: "center",
  },
});