import React, {
  useEffect,
  useRef,
} from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  stars?: number;
  onHidden?: () => void;
};

export default function RewardToast({
  visible,
  title = "দারুণ!",
  message = "সঠিক উত্তর",
  stars = 1,
  onHidden,
}: Props) {
  const translateY = useRef(
    new Animated.Value(-120),
  ).current;
  const opacity = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    if (!visible) {
      translateY.setValue(-120);
      opacity.setValue(0);
      return;
    }

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1600),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        onHidden?.();
      }
    });

    return () => animation.stop();
  }, [
    onHidden,
    opacity,
    translateY,
    visible,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={styles.layer}
    >
      <Animated.View
        style={[
          styles.card,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.star}>⭐</Text>

        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>
            {message}
          </Text>
        </View>

        <View style={styles.pill}>
          <Text style={styles.pillText}>
            +{Math.max(1, stars)}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 10,
    left: 14,
    right: 14,
    zIndex: 999,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 560,
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#E9DFA2",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#221A2B",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  star: {
    marginRight: 11,
    fontSize: 32,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: "#2B2630",
  },
  message: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#746C79",
  },
  pill: {
    minWidth: 46,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#FFF1B6",
  },
  pillText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#7D5E00",
  },
});
