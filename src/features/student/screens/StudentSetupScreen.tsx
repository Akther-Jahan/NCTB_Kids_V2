import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";

import { useStudentStore } from "../store/studentStore";

type Language = "bn" | "en";
type ClassLevel = 1 | 2 | 3;

type ClassOption = {
  level: ClassLevel;
  numberBn: string;
  numberEn: string;
  labelBn: string;
  labelEn: string;
  icon: string;
  backgroundColor: string;
  accentColor: string;
  shadowColor: string;
};

const CLASS_OPTIONS: ClassOption[] = [
  {
    level: 1,
    numberBn: "১",
    numberEn: "1",
    labelBn: "প্রথম",
    labelEn: "One",
    icon: "⭐",
    backgroundColor: "#DDF5FF",
    accentColor: "#2D9CDB",
    shadowColor: "#177CAD",
  },
  {
    level: 2,
    numberBn: "২",
    numberEn: "2",
    labelBn: "দ্বিতীয়",
    labelEn: "Two",
    icon: "🏆",
    backgroundColor: "#FFF0BE",
    accentColor: "#FFAA1F",
    shadowColor: "#D98400",
  },
  {
    level: 3,
    numberBn: "৩",
    numberEn: "3",
    labelBn: "তৃতীয়",
    labelEn: "Three",
    icon: "📚",
    backgroundColor: "#DFF6D9",
    accentColor: "#55BC4A",
    shadowColor: "#369A2D",
  },
];

const TEXT = {
  bn: {
    eyebrow: "NCTB KIDS",
    headline: "চলো শেখা\nশুরু করি!",
    question: "তুমি কোন শ্রেণিতে পড়ো?",
    voice:
      "হ্যালো বন্ধু! তুমি কোন শ্রেণিতে পড়ো? নিচের একটি শ্রেণি বেছে নাও।",
    classWord: "শ্রেণি",
    listen: "আবার শুনি",
    continue: "শুরু করি",
    selected: (label: string) =>
      `দারুণ! তুমি ${label} শ্রেণি বেছে নিয়েছো। এবার শুরু করি বাটনে চাপ দাও।`,
    success: "চমৎকার! চলো শেখা শুরু করি।",
    errorTitle: "Profile তৈরি হয়নি",
    errorMessage: "ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো।",
  },
  en: {
    eyebrow: "NCTB KIDS",
    headline: "Let’s learn,\nplay & grow!",
    question: "Which class are you in?",
    voice:
      "Hello, friend! Which class are you in? Choose one of the classes below.",
    classWord: "Class",
    listen: "Hear again",
    continue: "Get started",
    selected: (label: string) =>
      `Great! You selected Class ${label}. Now tap the Get started button.`,
    success: "Wonderful! Let’s start learning.",
    errorTitle: "Profile was not created",
    errorMessage:
      "Check your internet connection and try again.",
  },
} as const;

export default function StudentSetupScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 780;

  const createStudent = useStudentStore(
    (state) => state.createStudent,
  );

  const [language, setLanguage] =
    useState<Language>("bn");
  const [selectedClass, setSelectedClass] =
    useState<ClassLevel | null>(null);
  const [creating, setCreating] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const guideFloat = useRef(
    new Animated.Value(0),
  ).current;
  const guideEntrance = useRef(
    new Animated.Value(0),
  ).current;
  const cardOneScale = useRef(
    new Animated.Value(1),
  ).current;
  const cardTwoScale = useRef(
    new Animated.Value(1),
  ).current;
  const cardThreeScale = useRef(
    new Animated.Value(1),
  ).current;

  const cardScales = useMemo(
    () => [cardOneScale, cardTwoScale, cardThreeScale],
    [cardOneScale, cardThreeScale, cardTwoScale],
  );

  const copy = TEXT[language];

  const speak = useCallback(
    (message: string, voiceLanguage: Language) => {
      void Speech.stop();

      Speech.speak(message, {
        language:
          voiceLanguage === "bn" ? "bn-BD" : "en-US",
        rate: voiceLanguage === "bn" ? 0.78 : 0.88,
        pitch: 1.05,
        onStart: () => setSpeaking(true),
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    },
    [],
  );

  useEffect(() => {
    Animated.spring(guideEntrance, {
      toValue: 1,
      friction: 7,
      tension: 52,
      useNativeDriver: true,
    }).start();

    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(guideFloat, {
          toValue: -7,
          duration: 950,
          useNativeDriver: true,
        }),
        Animated.timing(guideFloat, {
          toValue: 0,
          duration: 950,
          useNativeDriver: true,
        }),
      ]),
    );

    floating.start();

    return () => {
      floating.stop();
      void Speech.stop();
    };
  }, [guideEntrance, guideFloat]);

  useEffect(() => {
    const timer = setTimeout(() => {
      speak(TEXT[language].voice, language);
    }, 650);

    return () => {
      clearTimeout(timer);
    };
  }, [language, speak]);

  const changeLanguage = (next: Language) => {
    if (creating) {
      return;
    }

    if (next === language) {
      speak(TEXT[next].voice, next);
      return;
    }

    setLanguage(next);
  };

  const chooseClass = (
    option: ClassOption,
    index: number,
  ) => {
    if (creating) {
      return;
    }

    setSelectedClass(option.level);

    Animated.sequence([
      Animated.timing(cardScales[index], {
        toValue: 1.08,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.spring(cardScales[index], {
        toValue: 1,
        friction: 4,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    const label =
      language === "bn"
        ? option.labelBn
        : option.labelEn;

    speak(TEXT[language].selected(label), language);
  };

  const continueSetup = async () => {
    if (!selectedClass || creating) {
      return;
    }

    setCreating(true);
    speak(copy.success, language);

    try {
      await createStudent(selectedClass);
    } catch (error) {
      const technicalMessage =
        error instanceof Error
          ? error.message
          : language === "bn"
            ? "Student profile তৈরি করা যায়নি।"
            : "The student profile could not be created.";

      Alert.alert(
        copy.errorTitle,
        `${technicalMessage}\n\n${copy.errorMessage}`,
      );
    } finally {
      setCreating(false);
    }
  };

  const heroHeight = compact ? 420 : 475;
  const guideSize = compact ? 230 : 275;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View
          style={[
            styles.hero,
            { height: heroHeight },
          ]}
        >
          <View style={styles.purpleOrb} />
          <View style={styles.pinkShape} />
          <View style={styles.yellowShape} />
          <View style={styles.lineCircle} />
          <Text style={styles.sparkleOne}>✦</Text>
          <Text style={styles.sparkleTwo}>✦</Text>
          <Text style={styles.sparkleThree}>●</Text>

          <View style={styles.topBar}>
            <View style={styles.stepDots}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepDot} />
              <View style={styles.stepDot} />
            </View>

            <View style={styles.languageSwitch}>
              <Pressable
                accessibilityRole="button"
                onPress={() => changeLanguage("bn")}
                style={[
                  styles.languageButton,
                  language === "bn" &&
                    styles.languageButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.languageText,
                    language === "bn" &&
                      styles.languageTextActive,
                  ]}
                >
                  বাংলা
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => changeLanguage("en")}
                style={[
                  styles.languageButton,
                  language === "en" &&
                    styles.languageButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.languageText,
                    language === "en" &&
                      styles.languageTextActive,
                  ]}
                >
                  English
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>
              {copy.eyebrow}
            </Text>

            <Text
              style={[
                styles.headline,
                compact && styles.headlineCompact,
              ]}
            >
              {copy.headline}
            </Text>

            <View style={styles.highlightBar} />
          </View>

          <Animated.View
            style={[
              styles.guideWrap,
              {
                width: guideSize,
                height: guideSize,
                opacity: guideEntrance,
                transform: [
                  {
                    translateY: Animated.add(
                      guideFloat,
                      guideEntrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    ),
                  },
                  {
                    scale: guideEntrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.86, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.guideGlow} />
            <Image
              source={require("../../../../assets/images/tiger.png")}
              style={styles.guideImage}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.questionPill}>
            <View style={styles.voiceAvatar}>
              <Text style={styles.voiceAvatarText}>
                {speaking ? "🔊" : "👋"}
              </Text>
            </View>

            <Text
              style={styles.questionText}
              numberOfLines={2}
            >
              {copy.question}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.listen}
              onPress={() =>
                speak(TEXT[language].voice, language)
              }
              style={({ pressed }) => [
                styles.replayButton,
                speaking && styles.replayButtonActive,
                pressed && styles.replayButtonPressed,
              ]}
            >
              <Text style={styles.replayIcon}>▶</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.selectionSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.classRow}>
            {CLASS_OPTIONS.map((option, index) => {
              const selected =
                selectedClass === option.level;

              return (
                <Animated.View
                  key={option.level}
                  style={[
                    styles.classCardOuter,
                    {
                      transform: [
                        { scale: cardScales[index] },
                      ],
                    },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={
                      language === "bn"
                        ? `${option.labelBn} শ্রেণি`
                        : `Class ${option.labelEn}`
                    }
                    disabled={creating}
                    onPress={() =>
                      chooseClass(option, index)
                    }
                    style={({ pressed }) => [
                      styles.classCard,
                      {
                        backgroundColor:
                          option.backgroundColor,
                        borderColor: option.accentColor,
                        shadowColor: option.shadowColor,
                      },
                      selected &&
                        styles.classCardSelected,
                      pressed &&
                        styles.classCardPressed,
                    ]}
                  >
                    <View style={styles.classIconBubble}>
                      <Text style={styles.classIcon}>
                        {option.icon}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.classNumber,
                        { color: option.accentColor },
                      ]}
                    >
                      {language === "bn"
                        ? option.numberBn
                        : option.numberEn}
                    </Text>

                    <Text style={styles.classWord}>
                      {copy.classWord}
                    </Text>

                    {selected ? (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!selectedClass || creating}
            onPress={() => void continueSetup()}
            style={({ pressed }) => [
              styles.cta,
              (!selectedClass || creating) &&
                styles.ctaDisabled,
              pressed &&
                selectedClass &&
                !creating &&
                styles.ctaPressed,
            ]}
          >
            <View style={styles.ctaIconCircle}>
              <Text style={styles.ctaIcon}>📖</Text>
            </View>

            <Text style={styles.ctaText}>
              {copy.continue}
            </Text>

            {creating ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text style={styles.ctaArrows}>›››</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F1F8",
  },

  screen: {
    flex: 1,
    backgroundColor: "#F4F1F8",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 34,
    backgroundColor: "#C8B7F4",
  },

  purpleOrb: {
    position: "absolute",
    top: -80,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#B19AEB",
  },

  pinkShape: {
    position: "absolute",
    left: -55,
    bottom: 70,
    width: 185,
    height: 185,
    borderRadius: 44,
    backgroundColor: "#E7B9F2",
    transform: [{ rotate: "38deg" }],
  },

  yellowShape: {
    position: "absolute",
    right: -18,
    bottom: 24,
    width: 105,
    height: 105,
    borderRadius: 30,
    backgroundColor: "#FFE47F",
    transform: [{ rotate: "-20deg" }],
  },

  lineCircle: {
    position: "absolute",
    right: 26,
    top: 155,
    width: 78,
    height: 78,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 39,
  },

  sparkleOne: {
    position: "absolute",
    top: 112,
    left: 30,
    fontSize: 25,
    color: "#FFFFFF",
  },

  sparkleTwo: {
    position: "absolute",
    top: 205,
    right: 112,
    fontSize: 17,
    color: "#FFE76B",
  },

  sparkleThree: {
    position: "absolute",
    left: 110,
    bottom: 50,
    fontSize: 13,
    color: "#FFFFFF",
  },

  topBar: {
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  stepDots: {
    flexDirection: "row",
    gap: 6,
  },

  stepDot: {
    width: 20,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  stepDotActive: {
    width: 30,
    backgroundColor: "#242026",
  },

  languageSwitch: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.72)",
  },

  languageButton: {
    minWidth: 64,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },

  languageButtonActive: {
    backgroundColor: "#17151A",
  },

  languageText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#69616E",
  },

  languageTextActive: {
    color: "#FFFFFF",
  },

  heroCopy: {
    zIndex: 3,
    width: "63%",
    paddingLeft: 22,
    paddingTop: 24,
  },

  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "900",
    color: "#493A69",
  },

  headline: {
    marginTop: 8,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
    color: "#171419",
  },

  headlineCompact: {
    fontSize: 32,
    lineHeight: 38,
  },

  highlightBar: {
    width: 120,
    height: 13,
    marginTop: -7,
    marginLeft: 18,
    borderRadius: 7,
    backgroundColor: "#FFE66E",
    transform: [{ rotate: "-3deg" }],
    zIndex: -1,
  },

  guideWrap: {
    position: "absolute",
    right: 4,
    bottom: 42,
    zIndex: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  guideGlow: {
    position: "absolute",
    width: "78%",
    height: "78%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.56)",
  },

  guideImage: {
    width: "100%",
    height: "100%",
  },

  questionPill: {
    position: "absolute",
    zIndex: 7,
    left: 20,
    right: 20,
    bottom: 16,
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
    shadowColor: "#6E5C98",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },

  voiceAvatar: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: "#F1D7FF",
  },

  voiceAvatarText: {
    fontSize: 22,
  },

  questionText: {
    flex: 1,
    marginHorizontal: 11,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    color: "#29232E",
  },

  replayButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#E9E1FF",
  },

  replayButtonActive: {
    backgroundColor: "#DCF6D7",
  },

  replayButtonPressed: {
    transform: [{ scale: 0.92 }],
  },

  replayIcon: {
    marginLeft: 2,
    fontSize: 15,
    fontWeight: "900",
    color: "#211D27",
  },

  selectionSheet: {
    flex: 1,
    marginTop: -16,
    paddingHorizontal: 17,
    paddingTop: 25,
    paddingBottom: 18,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: "#FFFFFF",
  },

  sheetHandle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    marginBottom: 18,
    borderRadius: 3,
    backgroundColor: "#DDD7E3",
  },

  classRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  classCardOuter: {
    flex: 1,
  },

  classCard: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: 7,
    borderRadius: 27,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },

  classCardSelected: {
    borderWidth: 4,
    borderBottomWidth: 8,
    transform: [{ translateY: -7 }],
  },

  classCardPressed: {
    opacity: 0.88,
  },

  classIconBubble: {
    width: 48,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.74)",
  },

  classIcon: {
    fontSize: 27,
  },

  classNumber: {
    marginTop: 7,
    fontSize: 45,
    lineHeight: 52,
    fontWeight: "900",
    textShadowColor: "rgba(255,255,255,0.9)",
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 1,
  },

  classWord: {
    marginTop: -2,
    fontSize: 13,
    fontWeight: "900",
    color: "#3F3945",
  },

  checkBadge: {
    position: "absolute",
    top: -10,
    right: -7,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 16,
    backgroundColor: "#17151A",
  },

  checkText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  cta: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 19,
    paddingHorizontal: 8,
    borderRadius: 32,
    backgroundColor: "#17151A",
    shadowColor: "#17151A",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 8,
  },

  ctaDisabled: {
    backgroundColor: "#C8C3CC",
    shadowOpacity: 0,
    elevation: 0,
  },

  ctaPressed: {
    transform: [{ translateY: 3 }],
  },

  ctaIconCircle: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 25,
    backgroundColor: "#C98BFF",
  },

  ctaIcon: {
    fontSize: 23,
  },

  ctaText: {
    flex: 1,
    marginLeft: 17,
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  ctaArrows: {
    marginRight: 16,
    fontSize: 28,
    letterSpacing: -2,
    fontWeight: "400",
    color: "#FFFFFF",
  },
});