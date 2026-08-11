import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as Speech from "expo-speech";

import MimiCharacter from "./MimiCharacter";

type MissingLetterData = {
  prompt: string;
  wordParts: string[];
  missingIndex: number;
  options: string[];
  answer: string;
  emoji?: string;
  hint?: string;
};

type Props = {
  activity: {
    title?: string;
    instruction?: string;
    data: MissingLetterData;
  };
  onComplete: () => void;
};

function speakBangla(
  text: string,
  onDone?: () => void,
) {
  void Speech.stop();

  Speech.speak(text, {
    language: "bn-BD",
    rate: 0.75,
    pitch: 1.04,
    volume: 1,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export default function MissingLetterActivity({
  activity,
  onComplete,
}: Props) {
  const { width } =
    useWindowDimensions();

  const isSmallPhone =
    width < 360;

  const isTablet =
    width >= 600;

  const { data } =
    activity;

  const entrance = useRef(
    new Animated.Value(0),
  ).current;

  const answerScale = useRef(
    new Animated.Value(1),
  ).current;

  const shake = useRef(
    new Animated.Value(0),
  ).current;

  const rewardY = useRef(
    new Animated.Value(-90),
  ).current;

  const onCompleteRef =
    useRef(onComplete);

  const completedRef =
    useRef(false);

  const [
    selectedOption,
    setSelectedOption,
  ] = useState<
    string | null
  >(null);

  const [
    wrongOptions,
    setWrongOptions,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    attempts,
    setAttempts,
  ] = useState(0);

  const [
    completed,
    setCompleted,
  ] = useState(false);

  const [
    showHint,
    setShowHint,
  ] = useState(false);

  const safeMissingIndex =
    Math.min(
      Math.max(
        data.missingIndex,
        0,
      ),
      Math.max(
        0,
        data.wordParts.length -
          1,
      ),
    );

  const displayParts =
    useMemo(
      () =>
        data.wordParts.map(
          (
            part,
            index,
          ) =>
            index ===
            safeMissingIndex
              ? completed
                ? data.answer
                : null
              : part,
        ),
      [
        completed,
        data.answer,
        data.wordParts,
        safeMissingIndex,
      ],
    );

  const completedWord =
    useMemo(
      () =>
        data.wordParts
          .map(
            (
              part,
              index,
            ) =>
              index ===
              safeMissingIndex
                ? data.answer
                : part,
          )
          .join(""),
      [
        data.answer,
        data.wordParts,
        safeMissingIndex,
      ],
    );

  useEffect(() => {
    onCompleteRef.current =
      onComplete;
  }, [onComplete]);

  useEffect(() => {
    const animation =
      Animated.spring(
        entrance,
        {
          toValue: 1,
          friction: 7,
          tension: 58,
          useNativeDriver:
            true,
        },
      );

    animation.start();

    const timer =
      setTimeout(() => {
        speakBangla(
          data.prompt ||
            "শব্দের হারানো অক্ষরটি খুঁজে বের করো।",
        );
      }, 350);

    return () => {
      clearTimeout(timer);
      animation.stop();
      void Speech.stop();
    };
  }, [
    data.prompt,
    entrance,
  ]);

  const opacity =
    entrance.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

  const translateY =
    entrance.interpolate({
      inputRange: [0, 1],
      outputRange: [22, 0],
    });

  const shakeX =
    shake.interpolate({
      inputRange: [
        -1,
        0,
        1,
      ],
      outputRange: [
        -8,
        0,
        8,
      ],
    });

  const characterSize =
    isTablet
      ? 190
      : isSmallPhone
        ? 122
        : 148;

  const runWrongAnimation =
    () => {
      shake.setValue(0);

      Animated.sequence([
        Animated.timing(
          shake,
          {
            toValue: 1,
            duration: 70,
            useNativeDriver:
              true,
          },
        ),
        Animated.timing(
          shake,
          {
            toValue: -1,
            duration: 70,
            useNativeDriver:
              true,
          },
        ),
        Animated.timing(
          shake,
          {
            toValue: 1,
            duration: 70,
            useNativeDriver:
              true,
          },
        ),
        Animated.timing(
          shake,
          {
            toValue: 0,
            duration: 70,
            useNativeDriver:
              true,
          },
        ),
      ]).start();
    };

  const runSuccessAnimation =
    () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(
            answerScale,
            {
              toValue: 1.12,
              duration: 150,
              useNativeDriver:
                true,
            },
          ),
          Animated.spring(
            answerScale,
            {
              toValue: 1,
              friction: 4,
              useNativeDriver:
                true,
            },
          ),
        ]),
        Animated.sequence([
          Animated.spring(
            rewardY,
            {
              toValue: 14,
              friction: 7,
              tension: 55,
              useNativeDriver:
                true,
            },
          ),
          Animated.delay(1100),
          Animated.timing(
            rewardY,
            {
              toValue: -90,
              duration: 220,
              useNativeDriver:
                true,
            },
          ),
        ]),
      ]).start();
    };

  const chooseOption = (
    option: string,
  ) => {
    if (
      completed ||
      wrongOptions.has(
        option,
      )
    ) {
      return;
    }

    setSelectedOption(
      option,
    );
    setAttempts(
      (value) =>
        value + 1,
    );
    setShowHint(false);

    const correct =
      option === data.answer;

    speakBangla(
      option,
      () => {
        if (correct) {
          if (
            completedRef.current
          ) {
            return;
          }

          completedRef.current =
            true;

          setCompleted(true);
          runSuccessAnimation();

          speakBangla(
            `দারুণ! ${option} সঠিক। পুরো শব্দ ${completedWord}।`,
          );

          onCompleteRef.current();
          return;
        }

        setWrongOptions(
          (current) => {
            const next =
              new Set(current);
            next.add(option);
            return next;
          },
        );

        runWrongAnimation();

        speakBangla(
          "এটি ঠিক হয়নি। আরেকটি অক্ষর চেষ্টা করো।",
        );
      },
    );
  };

  const showHintAndSpeak =
    () => {
      setShowHint(true);

      speakBangla(
        data.hint ||
          `শব্দটি হলো ${completedWord}। হারানো অক্ষরটি খুঁজে দেখো।`,
      );
    };

  const listenWord =
    () => {
      speakBangla(
        completedWord,
      );
    };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [
            { translateY },
          ],
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.rewardToast,
          {
            transform: [
              {
                translateY:
                  rewardY,
              },
            ],
          },
        ]}
      >
        <Text
          style={
            styles.rewardIcon
          }
        >
          ⭐
        </Text>

        <View
          style={
            styles.rewardCopy
          }
        >
          <Text
            style={
              styles.rewardTitle
            }
          >
            দারুণ!
          </Text>

          <Text
            style={
              styles.rewardText
            }
          >
            সঠিক অক্ষর খুঁজে পেয়েছো
          </Text>
        </View>
      </Animated.View>

      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.headerIcon
          }
        >
          <Text
            style={
              styles.headerIconText
            }
          >
            🔎
          </Text>
        </View>

        <View
          style={
            styles.headerCopy
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            MISSING LETTER
          </Text>

          <Text
            style={[
              styles.title,
              isTablet &&
                styles.titleTablet,
            ]}
          >
            {activity.title ??
              "হারানো অক্ষর"}
          </Text>
        </View>

        <View
          style={
            styles.attemptBadge
          }
        >
          <Text
            style={
              styles.attemptLabel
            }
          >
            চেষ্টা
          </Text>

          <Text
            style={
              styles.attemptValue
            }
          >
            {attempts}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.guideCard
        }
      >
        <View
          style={
            styles.guideOrb
          }
        />

        <View
          style={
            styles.mimiWrap
          }
        >
          <MimiCharacter
            emotion={
              completed
                ? "celebrate"
                : wrongOptions.size >
                    0
                  ? "talking"
                  : "happy"
            }
            size={
              characterSize
            }
          />
        </View>

        <View
          style={
            styles.promptCard
          }
        >
          <Text
            style={
              styles.promptLabel
            }
          >
            তোমার puzzle
          </Text>

          <Text
            style={[
              styles.prompt,
              isTablet &&
                styles.promptTablet,
            ]}
          >
            {data.prompt}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="প্রশ্ন শুনি"
            onPress={() =>
              speakBangla(
                data.prompt,
              )
            }
            style={({
              pressed,
            }) => [
              styles.voiceButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Text
              style={
                styles.voiceButtonIcon
              }
            >
              🔊
            </Text>

            <Text
              style={
                styles.voiceButtonText
              }
            >
              প্রশ্ন শুনি
            </Text>
          </Pressable>
        </View>
      </View>

      <Animated.View
        style={[
          styles.wordCard,
          completed &&
            styles.wordCardSuccess,
          wrongOptions.size >
            0 &&
            !completed &&
            styles.wordCardRetry,
          {
            transform: [
              {
                translateX:
                  shakeX,
              },
              {
                scale:
                  answerScale,
              },
            ],
          },
        ]}
      >
        <Text
          style={
            styles.wordLabel
          }
        >
          শব্দটি পূর্ণ করো
        </Text>

        {data.emoji ? (
          <Text
            style={
              styles.wordEmoji
            }
          >
            {data.emoji}
          </Text>
        ) : null}

        <View
          style={
            styles.wordParts
          }
        >
          {displayParts.map(
            (
              part,
              index,
            ) => {
              const missing =
                index ===
                safeMissingIndex;

              return (
                <View
                  key={`part-${index}`}
                  style={[
                    styles.wordPart,
                    missing &&
                      styles.missingPart,
                    missing &&
                      completed &&
                      styles.missingPartCorrect,
                  ]}
                >
                  <Text
                    style={[
                      styles.wordPartText,
                      missing &&
                        !completed &&
                        styles.missingPartText,
                      missing &&
                        completed &&
                        styles.wordPartTextCorrect,
                    ]}
                  >
                    {missing &&
                    !completed
                      ? "?"
                      : part}
                  </Text>
                </View>
              );
            },
          )}
        </View>

        {completed ? (
          <View
            style={
              styles.successFeedback
            }
          >
            <Text
              style={
                styles.successFeedbackIcon
              }
            >
              ✓
            </Text>

            <Text
              style={
                styles.successFeedbackText
              }
            >
              {completedWord} — একদম সঠিক!
            </Text>
          </View>
        ) : wrongOptions.size >
          0 ? (
          <View
            style={
              styles.retryFeedback
            }
          >
            <Text
              style={
                styles.retryFeedbackIcon
              }
            >
              ↻
            </Text>

            <Text
              style={
                styles.retryFeedbackText
              }
            >
              ভুল অক্ষর বাদ হয়েছে—আরেকটি চেষ্টা করো
            </Text>
          </View>
        ) : (
          <Text
            style={
              styles.wordHelp
            }
          >
            নিচের অক্ষর থেকে সঠিকটি বেছে নাও
          </Text>
        )}
      </Animated.View>

      <View
        style={
          styles.toolsRow
        }
      >
        <Pressable
          accessibilityRole="button"
          onPress={
            listenWord
          }
          style={({
            pressed,
          }) => [
            styles.toolButton,
            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={
              styles.toolIcon
            }
          >
            🔊
          </Text>

          <Text
            style={
              styles.toolText
            }
          >
            শব্দ শুনি
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={
            completed
          }
          onPress={
            showHintAndSpeak
          }
          style={({
            pressed,
          }) => [
            styles.toolButton,
            completed &&
              styles.toolButtonDisabled,
            pressed &&
              !completed &&
              styles.pressed,
          ]}
        >
          <Text
            style={
              styles.toolIcon
            }
          >
            💡
          </Text>

          <Text
            style={
              styles.toolText
            }
          >
            Hint
          </Text>
        </Pressable>
      </View>

      {showHint &&
      !completed ? (
        <View
          style={
            styles.hintCard
          }
        >
          <Text
            style={
              styles.hintIcon
            }
          >
            💡
          </Text>

          <Text
            style={
              styles.hintText
            }
          >
            {data.hint ||
              `পুরো শব্দটি ${completedWord}। হারানো অক্ষরটি মনে করো।`}
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.optionsHeader
        }
      >
        <Text
          style={
            styles.optionsEyebrow
          }
        >
          CHOOSE A LETTER
        </Text>

        <Text
          style={
            styles.optionsTitle
          }
        >
          কোন অক্ষরটি বসবে?
        </Text>
      </View>

      <View
        style={
          styles.optionsGrid
        }
      >
        {data.options.map(
          (
            option,
            index,
          ) => {
            const wrong =
              wrongOptions.has(
                option,
              );

            const correct =
              completed &&
              option ===
                data.answer;

            const selected =
              selectedOption ===
              option;

            return (
              <Pressable
                key={`${option}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`${option} অক্ষর`}
                accessibilityState={{
                  disabled:
                    completed ||
                    wrong,
                  selected,
                }}
                disabled={
                  completed ||
                  wrong
                }
                onPress={() =>
                  chooseOption(
                    option,
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.optionTile,
                  wrong &&
                    styles.optionTileWrong,
                  correct &&
                    styles.optionTileCorrect,
                  selected &&
                    !wrong &&
                    !correct &&
                    styles.optionTileSelected,
                  completed &&
                    !correct &&
                    styles.optionTileDimmed,
                  pressed &&
                    !completed &&
                    !wrong &&
                    styles.optionTilePressed,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    wrong &&
                      styles.optionTextWrong,
                    correct &&
                      styles.optionTextCorrect,
                  ]}
                >
                  {option}
                </Text>

                {wrong ? (
                  <Text
                    style={
                      styles.optionMarkWrong
                    }
                  >
                    ×
                  </Text>
                ) : correct ? (
                  <Text
                    style={
                      styles.optionMarkCorrect
                    }
                  >
                    ✓
                  </Text>
                ) : (
                  <Text
                    style={
                      styles.optionListenMark
                    }
                  >
                    🔊
                  </Text>
                )}
              </Pressable>
            );
          },
        )}
      </View>

      {!completed ? (
        <Text
          style={
            styles.footerHint
          }
        >
          অক্ষরে চাপ দিলে আগে অক্ষরটি শোনা যাবে, তারপর উত্তর যাচাই হবে।
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      width: "100%",
      position:
        "relative",
    },

    rewardToast: {
      position:
        "absolute",
      top: 0,
      left: 14,
      right: 14,
      zIndex: 50,
      elevation: 12,
      minHeight: 66,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor:
        "#D7EACF",
      borderRadius: 20,
      backgroundColor:
        "#F0FAEC",
      shadowColor:
        "#274B22",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },

    rewardIcon: {
      fontSize: 27,
    },

    rewardCopy: {
      marginLeft: 10,
    },

    rewardTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: "#3E7D3A",
    },

    rewardText: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: "800",
      color: "#688062",
    },

    header: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    headerIcon: {
      width: 48,
      height: 48,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 16,
      backgroundColor:
        "#EEE8FF",
    },

    headerIconText: {
      fontSize: 23,
    },

    headerCopy: {
      flex: 1,
      marginLeft: 11,
    },

    eyebrow: {
      fontSize: 8,
      letterSpacing: 1.4,
      fontWeight: "900",
      color: "#9A909E",
    },

    title: {
      marginTop: 2,
      fontSize: 19,
      fontWeight: "900",
      color: "#29242B",
    },

    titleTablet: {
      fontSize: 24,
    },

    attemptBadge: {
      minWidth: 54,
      alignItems:
        "center",
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 15,
      backgroundColor:
        "#FFF2CA",
    },

    attemptLabel: {
      fontSize: 7,
      fontWeight: "800",
      color: "#9A7A2B",
    },

    attemptValue: {
      marginTop: 1,
      fontSize: 14,
      fontWeight: "900",
      color: "#8D6300",
    },

    guideCard: {
      position:
        "relative",
      overflow:
        "hidden",
      minHeight: 180,
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 14,
      padding: 12,
      borderRadius: 25,
      backgroundColor:
        "#D9CEF7",
    },

    guideOrb: {
      position:
        "absolute",
      right: -40,
      top: -55,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor:
        "rgba(255,255,255,0.24)",
    },

    mimiWrap: {
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    promptCard: {
      flex: 1,
      marginLeft: 8,
      padding: 13,
      borderRadius: 20,
      backgroundColor:
        "rgba(255,255,255,0.82)",
    },

    promptLabel: {
      fontSize: 8,
      fontWeight: "900",
      color: "#8E7C99",
    },

    prompt: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "900",
      color: "#352F39",
    },

    promptTablet: {
      fontSize: 17,
      lineHeight: 24,
    },

    voiceButton: {
      alignSelf:
        "flex-start",
      minHeight: 35,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      marginTop: 10,
      paddingHorizontal: 10,
      borderRadius: 18,
      backgroundColor:
        "#EAF4FF",
    },

    voiceButtonIcon: {
      fontSize: 14,
    },

    voiceButtonText: {
      fontSize: 9,
      fontWeight: "900",
      color: "#4E6E88",
    },

    pressed: {
      transform: [
        {
          scale: 0.97,
        },
      ],
      opacity: 0.88,
    },

    wordCard: {
      alignItems:
        "center",
      marginTop: 15,
      padding: 16,
      borderWidth: 2,
      borderColor:
        "#E1DCE5",
      borderRadius: 25,
      backgroundColor:
        "#FFFFFF",
    },

    wordCardRetry: {
      borderColor:
        "#E8B071",
      backgroundColor:
        "#FFF9F0",
    },

    wordCardSuccess: {
      borderColor:
        "#75BF6B",
      backgroundColor:
        "#F1FAEF",
    },

    wordLabel: {
      fontSize: 9,
      fontWeight: "900",
      color: "#938A96",
    },

    wordEmoji: {
      marginTop: 8,
      fontSize: 47,
    },

    wordParts: {
      flexDirection:
        "row",
      flexWrap: "wrap",
      justifyContent:
        "center",
      gap: 8,
      marginTop: 11,
    },

    wordPart: {
      minWidth: 54,
      height: 58,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 10,
      borderRadius: 17,
      backgroundColor:
        "#F1EDF4",
    },

    missingPart: {
      borderWidth: 2,
      borderStyle:
        "dashed",
      borderColor:
        "#8F72C4",
      backgroundColor:
        "#F6F1FF",
    },

    missingPartCorrect: {
      borderStyle:
        "solid",
      borderColor:
        "#68B75D",
      backgroundColor:
        "#E9F8E6",
    },

    wordPartText: {
      fontSize: 28,
      fontWeight: "900",
      color: "#302A34",
    },

    missingPartText: {
      color: "#8061B3",
    },

    wordPartTextCorrect: {
      color: "#438D3D",
    },

    wordHelp: {
      marginTop: 12,
      fontSize: 9,
      fontWeight: "800",
      color: "#8A808E",
    },

    retryFeedback: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 14,
      backgroundColor:
        "#FFEBD8",
    },

    retryFeedbackIcon: {
      marginRight: 6,
      fontSize: 16,
      color: "#A86822",
    },

    retryFeedbackText: {
      fontSize: 9,
      fontWeight: "900",
      color: "#98602B",
    },

    successFeedback: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 14,
      backgroundColor:
        "#DDF4D8",
    },

    successFeedbackIcon: {
      marginRight: 6,
      fontSize: 16,
      fontWeight: "900",
      color: "#438D3D",
    },

    successFeedbackText: {
      fontSize: 10,
      fontWeight: "900",
      color: "#438D3D",
    },

    toolsRow: {
      flexDirection:
        "row",
      gap: 8,
      marginTop: 12,
    },

    toolButton: {
      flex: 1,
      minHeight: 43,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 6,
      borderWidth: 1,
      borderColor:
        "#DED8E2",
      borderRadius: 19,
      backgroundColor:
        "#FFFFFF",
    },

    toolButtonDisabled: {
      opacity: 0.4,
    },

    toolIcon: {
      fontSize: 15,
    },

    toolText: {
      fontSize: 9,
      fontWeight: "900",
      color: "#5E5662",
    },

    hintCard: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 9,
      padding: 11,
      borderRadius: 18,
      backgroundColor:
        "#FFF3CE",
    },

    hintIcon: {
      marginRight: 8,
      fontSize: 18,
    },

    hintText: {
      flex: 1,
      fontSize: 9,
      lineHeight: 14,
      fontWeight: "800",
      color: "#806A32",
    },

    optionsHeader: {
      marginTop: 18,
      marginBottom: 9,
    },

    optionsEyebrow: {
      fontSize: 8,
      letterSpacing: 1.2,
      fontWeight: "900",
      color: "#9A909E",
    },

    optionsTitle: {
      marginTop: 2,
      fontSize: 15,
      fontWeight: "900",
      color: "#302B33",
    },

    optionsGrid: {
      flexDirection:
        "row",
      flexWrap: "wrap",
      justifyContent:
        "center",
      gap: 10,
    },

    optionTile: {
      position:
        "relative",
      minWidth: 76,
      minHeight: 76,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 13,
      borderWidth: 2,
      borderColor:
        "#A995C7",
      borderBottomWidth: 5,
      borderRadius: 21,
      backgroundColor:
        "#F4EEFF",
    },

    optionTileSelected: {
      borderColor:
        "#7653BD",
      backgroundColor:
        "#EDE3FF",
    },

    optionTileWrong: {
      borderColor:
        "#D98762",
      backgroundColor:
        "#FFF0E7",
      opacity: 0.65,
    },

    optionTileCorrect: {
      borderColor:
        "#5FAE55",
      backgroundColor:
        "#E6F7E3",
    },

    optionTileDimmed: {
      opacity: 0.42,
    },

    optionTilePressed: {
      transform: [
        {
          translateY: 2,
        },
      ],
    },

    optionText: {
      fontSize: 31,
      fontWeight: "900",
      color: "#503A69",
    },

    optionTextWrong: {
      color: "#A76C4D",
    },

    optionTextCorrect: {
      color: "#438D3D",
    },

    optionMarkWrong: {
      position:
        "absolute",
      right: 6,
      top: 4,
      fontSize: 15,
      fontWeight: "900",
      color: "#C66943",
    },

    optionMarkCorrect: {
      position:
        "absolute",
      right: 6,
      top: 4,
      fontSize: 14,
      fontWeight: "900",
      color: "#438D3D",
    },

    optionListenMark: {
      position:
        "absolute",
      right: 5,
      bottom: 4,
      fontSize: 10,
    },

    footerHint: {
      marginTop: 10,
      fontSize: 8,
      lineHeight: 12,
      fontWeight: "700",
      color: "#8C828F",
      textAlign:
        "center",
    },
  });