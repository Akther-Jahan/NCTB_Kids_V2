import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as Speech from "expo-speech";

import MimiCharacter from "./MimiCharacter";

type QuestionStatus =
  | "unanswered"
  | "correct"
  | "incorrect";

type NextReason =
  | "correct"
  | "max_attempts";

type Props = {
  prompt: string;
  options: string[];
  answer: number;
  hint: string;

  /**
   * IMPORTANT:
   * Pass attempts from ONE source only.
   *
   * After LessonPlayerScreen is updated, this should be
   * questionResult.runAttempts, not lifetime attempts.
   */
  attempts: number;

  /**
   * Keeps the current repo compatible until LessonPlayerScreen
   * is replaced in the next step.
   */
  onAttempt?: (correct: boolean) => void;

  /**
   * New callback for the question-level store.
   * LessonPlayerScreen will use this in the next step.
   */
  onAnswer?: (
    selectedOption: number,
    correct: boolean,
  ) => void;

  /**
   * Lets LessonPlayer know that its external Next button
   * may be enabled. Next enabled does NOT mean correct.
   */
  onNextAvailable?: (
    reason: NextReason,
  ) => void;

  /**
   * Default is 3 until the Admin Quiz Builder provides
   * a per-question value.
   */
  maxAttempts?: number;

  /**
   * Allows retry/result state to restore correctly.
   */
  status?: QuestionStatus;
};

const DEFAULT_MAX_ATTEMPTS = 3;

const SPEECH_BASE = {
  language: "bn-BD",
  rate: 0.74,
  pitch: 1.05,
};

async function speakBangla(
  text: string,
) {
  await Speech.stop();

  Speech.speak(text, {
    ...SPEECH_BASE,
  });
}

async function speakOptionThenFeedback(
  optionText: string,
  feedbackText: string,
  onFinished: () => void,
) {
  await Speech.stop();

  Speech.speak(optionText, {
    ...SPEECH_BASE,
    onDone: () => {
      Speech.speak(
        feedbackText,
        {
          ...SPEECH_BASE,
          onDone: onFinished,
          onError: onFinished,
          onStopped: onFinished,
        },
      );
    },
    onError: onFinished,
    onStopped: onFinished,
  });
}

export default function QuizBattleActivity({
  prompt,
  options,
  answer,
  hint,
  attempts,
  onAttempt,
  onAnswer,
  onNextAvailable,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  status = "unanswered",
}: Props) {
  const { width } =
    useWindowDimensions();

  const isSmallPhone =
    width < 360;
  const isTablet =
    width >= 600;

  const safeMaxAttempts =
    Math.max(
      1,
      maxAttempts,
    );

  const entrance = useRef(
    new Animated.Value(0),
  ).current;

  const shake = useRef(
    new Animated.Value(0),
  ).current;

  const successScale = useRef(
    new Animated.Value(1),
  ).current;

  const rewardTranslateY =
    useRef(
      new Animated.Value(-140),
    ).current;

  const rewardOpacity =
    useRef(
      new Animated.Value(0),
    ).current;

  const rewardTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const nextNotifiedRef =
    useRef(false);

  const [selected, setSelected] =
    useState<number | null>(
      null,
    );

  const [
    wrongOptions,
    setWrongOptions,
  ] = useState<number[]>(
    [],
  );

  const [
    correct,
    setCorrect,
  ] = useState(
    status === "correct",
  );

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    nextUnlocked,
    setNextUnlocked,
  ] = useState(
    status === "correct" ||
      attempts >=
        safeMaxAttempts,
  );

  const [
    rewardVisible,
    setRewardVisible,
  ] = useState(false);

  /**
   * Reset local presentation state only when the question itself
   * changes (or a restored final status changes).
   *
   * IMPORTANT: attempts is intentionally NOT a dependency here.
   * The parent Zustand store updates attempts after every tap;
   * resetting on attempts would erase the just-selected option
   * and wrong-answer feedback.
   */
  useEffect(() => {
    setSelected(null);
    setWrongOptions([]);
    setCorrect(
      status === "correct",
    );
    setProcessing(false);

    const unlocked =
      status === "correct" ||
      attempts >=
        safeMaxAttempts;

    setNextUnlocked(
      unlocked,
    );

    nextNotifiedRef.current =
      unlocked;
    // attempts is read only to initialize a newly mounted/restored
    // question. It must not reset UI after every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    prompt,
    status,
    safeMaxAttempts,
  ]);

  /**
   * Attempts may change after each answer. Reflect only the
   * external Next-unlock state without clearing local feedback.
   */
  useEffect(() => {
    if (
      status === "correct"
    ) {
      setCorrect(true);
      setNextUnlocked(true);
      return;
    }

    if (
      attempts >=
      safeMaxAttempts
    ) {
      setNextUnlocked(true);
    }
  }, [
    attempts,
    status,
    safeMaxAttempts,
  ]);

  useEffect(() => {
    Animated.spring(
      entrance,
      {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      },
    ).start();

    const timer =
      setTimeout(() => {
        void speakBangla(
          prompt,
        );
      }, 350);

    return () => {
      clearTimeout(timer);

      if (
        rewardTimerRef.current
      ) {
        clearTimeout(
          rewardTimerRef.current,
        );
      }

      void Speech.stop();
    };
  }, [
    entrance,
    prompt,
  ]);

  const opacity =
    entrance.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

  const translateY =
    entrance.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    });

  const shakeX =
    shake.interpolate({
      inputRange: [
        -1,
        0,
        1,
      ],
      outputRange: [
        -10,
        0,
        10,
      ],
    });

  const characterSize =
    isTablet
      ? 205
      : isSmallPhone
        ? 125
        : 155;

  /**
   * No localAttempts state.
   * `attempts` is the single attempt source.
   *
   * During a tap we use attempts + 1 only to calculate
   * the immediate result before the parent rerenders.
   */
  const displayedAttempt =
    correct ||
    nextUnlocked
      ? Math.min(
          Math.max(
            1,
            attempts,
          ),
          safeMaxAttempts,
        )
      : Math.min(
          attempts + 1,
          safeMaxAttempts,
        );

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
      Animated.sequence([
        Animated.timing(
          successScale,
          {
            toValue: 1.1,
            duration: 150,
            useNativeDriver:
              true,
          },
        ),
        Animated.spring(
          successScale,
          {
            toValue: 1,
            friction: 4,
            useNativeDriver:
              true,
          },
        ),
      ]).start();
    };

  const showRewardToast =
    () => {
      if (
        rewardTimerRef.current
      ) {
        clearTimeout(
          rewardTimerRef.current,
        );
      }

      setRewardVisible(
        true,
      );

      rewardTranslateY.setValue(
        -140,
      );
      rewardOpacity.setValue(
        0,
      );

      Animated.parallel([
        Animated.spring(
          rewardTranslateY,
          {
            toValue: 0,
            friction: 7,
            tension: 60,
            useNativeDriver:
              true,
          },
        ),
        Animated.timing(
          rewardOpacity,
          {
            toValue: 1,
            duration: 180,
            useNativeDriver:
              true,
          },
        ),
      ]).start();

      rewardTimerRef.current =
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(
              rewardTranslateY,
              {
                toValue:
                  -140,
                duration:
                  220,
                useNativeDriver:
                  true,
              },
            ),
            Animated.timing(
              rewardOpacity,
              {
                toValue: 0,
                duration:
                  180,
                useNativeDriver:
                  true,
              },
            ),
          ]).start(() => {
            setRewardVisible(
              false,
            );
          });
        }, 1700);
    };

  const notifyNext =
    (reason: NextReason) => {
      setNextUnlocked(
        true,
      );

      if (
        nextNotifiedRef.current
      ) {
        return;
      }

      nextNotifiedRef.current =
        true;

      onNextAvailable?.(
        reason,
      );
    };

  const reportAnswer = (
    index: number,
    result: boolean,
  ) => {
    if (onAnswer) {
      onAnswer(
        index,
        result,
      );
      return;
    }

    // Backward compatibility with the current LessonPlayerScreen.
    onAttempt?.(
      result,
    );
  };

  const choose = (
    index: number,
  ) => {
    if (
      correct ||
      processing ||
      wrongOptions.includes(
        index,
      )
    ) {
      return;
    }

    const optionText =
      options[index] ??
      "";

    const result =
      index === answer;

    const nextAttemptCount =
      attempts + 1;

    const maxReached =
      !result &&
      nextAttemptCount >=
        safeMaxAttempts;

    setSelected(index);
    setProcessing(true);

    reportAnswer(
      index,
      result,
    );

    if (result) {
      setCorrect(true);
      runSuccessAnimation();
      showRewardToast();
      notifyNext(
        "correct",
      );

      void speakOptionThenFeedback(
        optionText,
        "সঠিক উত্তর! দারুণ করেছো। একটি তারা পেয়েছো।",
        () => {
          setProcessing(
            false,
          );
        },
      );

      return;
    }

    setWrongOptions(
      (current) =>
        current.includes(
          index,
        )
          ? current
          : [
              ...current,
              index,
            ],
    );

    runWrongAnimation();

    if (maxReached) {
      notifyNext(
        "max_attempts",
      );
    }

    const feedback =
      maxReached
        ? "উত্তরটি ঠিক হয়নি। চাইলে আবার চেষ্টা করো, অথবা পরের প্রশ্নে যাও।"
        : "উত্তরটি ঠিক হয়নি। ইঙ্গিত দেখে আবার চেষ্টা করো।";

    void speakOptionThenFeedback(
      optionText,
      feedback,
      () => {
        setProcessing(
          false,
        );
      },
    );
  };

  return (
    <>
      <Modal
        visible={
          rewardVisible
        }
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() =>
          setRewardVisible(
            false,
          )
        }
      >
        <View
          pointerEvents="none"
          style={
            styles.rewardOverlay
          }
        >
          <Animated.View
            style={[
              styles.rewardToast,
              {
                opacity:
                  rewardOpacity,
                transform: [
                  {
                    translateY:
                      rewardTranslateY,
                  },
                ],
              },
            ]}
          >
            <View
              style={
                styles.rewardStarCircle
              }
            >
              <Text
                style={
                  styles.rewardStar
                }
              >
                ⭐
              </Text>
            </View>

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
                সঠিক উত্তর
              </Text>
            </View>

            <View
              style={
                styles.rewardPoints
              }
            >
              <Text
                style={
                  styles.rewardPointsText
                }
              >
                +1 Star
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Animated.View
        style={[
          styles.container,
          {
            opacity,
            transform: [
              {
                translateY,
              },
            ],
          },
        ]}
      >
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
              ⚔️
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
              QUIZ BATTLE
            </Text>

            <Text
              style={[
                styles.title,
                isTablet &&
                  styles.titleTablet,
              ]}
            >
              সঠিক উত্তর খুঁজে নাও
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
              TRY
            </Text>

            <Text
              style={
                styles.attemptValue
              }
            >
              {displayedAttempt}/
              {safeMaxAttempts}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.progressTrack
          }
        >
          <View
            style={[
              styles.progressFill,
              {
                width: correct
                  ? "100%"
                  : attempts ===
                        0 &&
                      selected ===
                        null
                    ? "20%"
                    : nextUnlocked
                      ? "85%"
                      : "60%",
              },
            ]}
          />
        </View>

        <View
          style={
            styles.stage
          }
        >
          <View
            style={
              styles.orbOne
            }
          />
          <View
            style={
              styles.orbTwo
            }
          />

          <MimiCharacter
            emotion={
              correct
                ? "celebrate"
                : selected !==
                    null
                  ? "talking"
                  : "happy"
            }
            size={
              characterSize
            }
          />

          <View
            style={
              styles.guideBadge
            }
          >
            <Text
              style={
                styles.guideDot
              }
            >
              ●
            </Text>

            <Text
              style={
                styles.guideText
              }
            >
              QUIZ COACH
            </Text>
          </View>

          <Animated.View
            style={[
              styles.questionCard,
              correct &&
                styles.questionCardCorrect,
              {
                transform: [
                  {
                    translateX:
                      shakeX,
                  },
                  {
                    scale:
                      successScale,
                  },
                ],
              },
            ]}
          >
            <View
              style={
                styles.questionTop
              }
            >
              <View
                style={
                  styles.questionIcon
                }
              >
                <Text
                  style={
                    styles.questionIconText
                  }
                >
                  ❓
                </Text>
              </View>

              <View
                style={
                  styles.questionCopy
                }
              >
                <Text
                  style={
                    styles.questionLabel
                  }
                >
                  BATTLE QUESTION
                </Text>

                <Text
                  style={
                    styles.questionHelper
                  }
                >
                  উত্তর বেছে নাও
                </Text>
              </View>

              <Pressable
                disabled={
                  processing
                }
                onPress={() =>
                  void speakBangla(
                    prompt,
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.listenButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={
                    styles.listenIcon
                  }
                >
                  🔊
                </Text>

                {!isSmallPhone ? (
                  <Text
                    style={
                      styles.listenText
                    }
                  >
                    শুনি
                  </Text>
                ) : null}
              </Pressable>
            </View>

            <Text
              style={[
                styles.question,
                isTablet &&
                  styles.questionTablet,
              ]}
            >
              {prompt}
            </Text>
          </Animated.View>
        </View>

        <View
          style={
            styles.answerHeader
          }
        >
          <View>
            <Text
              style={
                styles.eyebrow
              }
            >
              CHOOSE ONE
            </Text>

            <Text
              style={
                styles.answerTitle
              }
            >
              তোমার উত্তর
            </Text>
          </View>

          <View
            style={
              styles.optionCount
            }
          >
            <Text
              style={
                styles.optionCountText
              }
            >
              {options.length} OPTIONS
            </Text>
          </View>
        </View>

        <View
          style={
            styles.optionList
          }
        >
          {options.map(
            (
              option,
              index,
            ) => {
              const isWrong =
                wrongOptions.includes(
                  index,
                );

              const isCorrect =
                correct &&
                index ===
                  answer;

              const disabled =
                correct ||
                processing ||
                isWrong;

              return (
                <Pressable
                  key={`${option}-${index}`}
                  disabled={
                    disabled
                  }
                  onPress={() =>
                    choose(
                      index,
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.option,
                    isWrong &&
                      styles.optionWrong,
                    isCorrect &&
                      styles.optionCorrect,
                    pressed &&
                      !disabled &&
                      styles.optionPressed,
                    processing &&
                      !isCorrect &&
                      styles.optionProcessing,
                  ]}
                >
                  <View
                    style={[
                      styles.optionLetter,
                      isWrong &&
                        styles.optionLetterWrong,
                      isCorrect &&
                        styles.optionLetterCorrect,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLetterText,
                        (isWrong ||
                          isCorrect) &&
                          styles.optionLetterActive,
                      ]}
                    >
                      {isCorrect
                        ? "✓"
                        : isWrong
                          ? "×"
                          : String.fromCharCode(
                              65 +
                                index,
                            )}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.optionText,
                      isWrong &&
                        styles.optionTextWrong,
                      isCorrect &&
                        styles.optionTextCorrect,
                    ]}
                  >
                    {option}
                  </Text>

                  <Text
                    style={[
                      styles.status,
                      isWrong &&
                        styles.statusWrong,
                      isCorrect &&
                        styles.statusCorrect,
                    ]}
                  >
                    {isCorrect
                      ? "সঠিক"
                      : isWrong
                        ? "আবার"
                        : selected ===
                              index &&
                            processing
                          ? "শুনছি"
                          : "বেছে নাও"}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        {selected !==
          null &&
        !correct ? (
          <View
            style={
              styles.hintCard
            }
          >
            <View
              style={
                styles.hintIcon
              }
            >
              <Text
                style={
                  styles.hintEmoji
                }
              >
                💡
              </Text>
            </View>

            <View
              style={
                styles.hintCopy
              }
            >
              <Text
                style={
                  styles.hintLabel
                }
              >
                MIMI'S HINT
              </Text>

              <Text
                style={
                  styles.hintText
                }
              >
                {hint ||
                  "প্রশ্নটি মন দিয়ে পড়ে আবার চেষ্টা করো।"}
              </Text>
            </View>

            <Pressable
              disabled={
                processing
              }
              onPress={() =>
                void speakBangla(
                  hint ||
                    "প্রশ্নটি মন দিয়ে পড়ে আবার চেষ্টা করো।",
                )
              }
              style={
                styles.hintListen
              }
            >
              <Text>
                🔊
              </Text>
            </Pressable>
          </View>
        ) : null}

        {correct ? (
          <View
            style={
              styles.successCard
            }
          >
            <View
              style={
                styles.successIcon
              }
            >
              <Text
                style={
                  styles.successEmoji
                }
              >
                🏆
              </Text>
            </View>

            <View
              style={
                styles.successCopy
              }
            >
              <Text
                style={
                  styles.successLabel
                }
              >
                BATTLE WON
              </Text>

              <Text
                style={
                  styles.successTitle
                }
              >
                সঠিক উত্তর!
              </Text>

              <Text
                style={
                  styles.successText
                }
              >
                {Math.max(
                  1,
                  attempts,
                )}{" "}
                বার চেষ্টা করে শেষ করেছো
              </Text>
            </View>

            <Text
              style={
                styles.successStar
              }
            >
              ⭐
            </Text>
          </View>
        ) : nextUnlocked ? (
          <View
            style={
              styles.nextReadyCard
            }
          >
            <Text
              style={
                styles.nextReadyIcon
              }
            >
              🌱
            </Text>

            <View
              style={
                styles.nextReadyCopy
              }
            >
              <Text
                style={
                  styles.nextReadyTitle
                }
              >
                ভালো চেষ্টা!
              </Text>

              <Text
                style={
                  styles.nextReadyText
                }
              >
                চাইলে আবার চেষ্টা করো, অথবা পরের প্রশ্নে যাও।
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={
              styles.footerHint
            }
          >
            <Text
              style={
                styles.footerIcon
              }
            >
              🎯
            </Text>

            <Text
              style={
                styles.footerText
              }
            >
              সঠিক উত্তর খুঁজে দেখো—{safeMaxAttempts} বার চেষ্টা হলে পরের প্রশ্নে যেতে পারবে
            </Text>
          </View>
        )}
      </Animated.View>
    </>
  );
}

const styles =
  StyleSheet.create({
    container: {
      width: "100%",
      alignItems:
        "center",
    },

    rewardOverlay: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "flex-start",
      paddingTop: 44,
      paddingHorizontal:
        16,
    },

    rewardToast: {
      width: "100%",
      maxWidth: 520,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        14,
      paddingVertical: 12,
      borderRadius: 22,
      backgroundColor:
        "#FFFFFF",
      shadowColor:
        "#3F315A",
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity:
        0.2,
      shadowRadius: 18,
      elevation: 12,
    },

    rewardStarCircle: {
      width: 48,
      height: 48,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 16,
      backgroundColor:
        "#FFF3C4",
    },

    rewardStar: {
      fontSize: 25,
    },

    rewardCopy: {
      flex: 1,
      marginLeft: 11,
    },

    rewardTitle: {
      fontSize: 16,
      fontWeight:
        "900",
      color: "#2F2268",
    },

    rewardText: {
      marginTop: 2,
      fontSize: 11,
      fontWeight:
        "800",
      color: "#71677B",
    },

    rewardPoints: {
      paddingHorizontal:
        10,
      paddingVertical: 7,
      borderRadius: 14,
      backgroundColor:
        "#EAF8E7",
    },

    rewardPointsText: {
      fontSize: 10,
      fontWeight:
        "900",
      color: "#4B8E46",
    },

    header: {
      width: "100%",
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    headerIcon: {
      width: 46,
      height: 46,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 16,
      backgroundColor:
        "#7653BD",
    },

    headerIconText: {
      fontSize: 22,
    },

    headerCopy: {
      flex: 1,
      marginLeft: 11,
    },

    eyebrow: {
      fontSize: 8,
      letterSpacing: 1.2,
      fontWeight:
        "900",
      color: "#958A9A",
    },

    title: {
      marginTop: 3,
      fontSize: 18,
      fontWeight:
        "900",
      color: "#2B252F",
    },

    titleTablet: {
      fontSize: 22,
    },

    attemptBadge: {
      minWidth: 58,
      alignItems:
        "center",
      paddingVertical: 6,
      paddingHorizontal: 6,
      borderRadius: 15,
      backgroundColor:
        "#EEE8F8",
    },

    attemptLabel: {
      fontSize: 7,
      fontWeight:
        "900",
      color: "#94889A",
    },

    attemptValue: {
      marginTop: 1,
      fontSize: 14,
      fontWeight:
        "900",
      color: "#7653BD",
    },

    progressTrack: {
      width: "100%",
      height: 8,
      overflow:
        "hidden",
      marginTop: 12,
      borderRadius: 4,
      backgroundColor:
        "#E7E1EA",
    },

    progressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor:
        "#7653BD",
    },

    stage: {
      position:
        "relative",
      width: "100%",
      alignItems:
        "center",
      overflow:
        "hidden",
      marginTop: 13,
      paddingTop: 7,
      paddingBottom: 16,
      borderRadius: 29,
      backgroundColor:
        "#E5DBFA",
    },

    orbOne: {
      position:
        "absolute",
      top: -40,
      right: -35,
      width: 145,
      height: 145,
      borderRadius: 73,
      backgroundColor:
        "rgba(255,255,255,0.34)",
    },

    orbTwo: {
      position:
        "absolute",
      left: -55,
      bottom: -70,
      width: 190,
      height: 190,
      borderRadius: 95,
      backgroundColor:
        "rgba(255,255,255,0.23)",
    },

    guideBadge: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: -13,
      paddingHorizontal:
        10,
      paddingVertical: 5,
      borderRadius: 13,
      backgroundColor:
        "rgba(35,29,39,0.84)",
    },

    guideDot: {
      marginRight: 5,
      fontSize: 8,
      color: "#6FE16A",
    },

    guideText: {
      fontSize: 8,
      letterSpacing: 0.9,
      fontWeight:
        "900",
      color: "#FFFFFF",
    },

    questionCard: {
      width: "92%",
      marginTop: 11,
      padding: 15,
      borderWidth: 2,
      borderColor:
        "#E2DCE6",
      borderRadius: 24,
      backgroundColor:
        "#FFFFFF",
    },

    questionCardCorrect: {
      borderColor:
        "#63BD78",
      backgroundColor:
        "#F2FBF4",
    },

    questionTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    questionIcon: {
      width: 40,
      height: 40,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 14,
      backgroundColor:
        "#FFF0C5",
    },

    questionIconText: {
      fontSize: 19,
    },

    questionCopy: {
      flex: 1,
      marginLeft: 10,
    },

    questionLabel: {
      fontSize: 8,
      letterSpacing: 1,
      fontWeight:
        "900",
      color: "#7653BD",
    },

    questionHelper: {
      marginTop: 2,
      fontSize: 9,
      fontWeight:
        "800",
      color: "#978D9C",
    },

    listenButton: {
      minHeight: 37,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        10,
      borderRadius: 19,
      backgroundColor:
        "#E6F4FF",
    },

    listenIcon: {
      fontSize: 16,
    },

    listenText: {
      marginLeft: 5,
      fontSize: 9,
      fontWeight:
        "900",
      color: "#277AA5",
    },

    question: {
      marginTop: 16,
      fontSize: 20,
      lineHeight: 30,
      fontWeight:
        "900",
      textAlign:
        "center",
      color: "#29232D",
    },

    questionTablet: {
      fontSize: 25,
      lineHeight: 37,
    },

    answerHeader: {
      width: "100%",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginTop: 16,
    },

    answerTitle: {
      marginTop: 3,
      fontSize: 17,
      fontWeight:
        "900",
      color: "#2C2630",
    },

    optionCount: {
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 14,
      backgroundColor:
        "#EEE8F8",
    },

    optionCountText: {
      fontSize: 8,
      fontWeight:
        "900",
      color: "#7653BD",
    },

    optionList: {
      width: "100%",
      marginTop: 11,
    },

    option: {
      minHeight: 66,
      flexDirection:
        "row",
      alignItems:
        "center",
      marginBottom: 10,
      padding: 9,
      borderWidth: 2,
      borderColor:
        "#E4DDE7",
      borderRadius: 22,
      backgroundColor:
        "#FFFFFF",
    },

    optionWrong: {
      borderColor:
        "#E58B8B",
      backgroundColor:
        "#FFF1F1",
    },

    optionCorrect: {
      borderColor:
        "#63BD78",
      backgroundColor:
        "#ECF9EF",
    },

    optionPressed: {
      transform: [
        {
          translateY: 3,
        },
      ],
    },

    optionProcessing: {
      opacity: 0.72,
    },

    optionLetter: {
      width: 46,
      height: 46,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 16,
      backgroundColor:
        "#EEE8F8",
    },

    optionLetterWrong: {
      backgroundColor:
        "#E8A5A5",
    },

    optionLetterCorrect: {
      backgroundColor:
        "#70C984",
    },

    optionLetterText: {
      fontSize: 16,
      fontWeight:
        "900",
      color: "#7653BD",
    },

    optionLetterActive: {
      color: "#FFFFFF",
    },

    optionText: {
      flex: 1,
      marginHorizontal:
        12,
      fontSize: 15,
      lineHeight: 21,
      fontWeight:
        "900",
      color: "#342D38",
    },

    optionTextWrong: {
      color: "#974747",
    },

    optionTextCorrect: {
      color: "#326641",
    },

    status: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor:
        "#F4F0F6",
      fontSize: 7,
      fontWeight:
        "900",
      color: "#8B808F",
    },

    statusWrong: {
      backgroundColor:
        "#F1C5C5",
      color: "#934747",
    },

    statusCorrect: {
      backgroundColor:
        "#C7EBCF",
      color: "#326641",
    },

    hintCard: {
      width: "100%",
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 4,
      padding: 13,
      borderRadius: 20,
      backgroundColor:
        "#FFF4D1",
    },

    hintIcon: {
      width: 42,
      height: 42,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 14,
      backgroundColor:
        "#FFFFFF",
    },

    hintEmoji: {
      fontSize: 20,
    },

    hintCopy: {
      flex: 1,
      marginLeft: 10,
    },

    hintLabel: {
      fontSize: 8,
      letterSpacing: 0.9,
      fontWeight:
        "900",
      color: "#947B32",
    },

    hintText: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 17,
      fontWeight:
        "800",
      color: "#615431",
    },

    hintListen: {
      width: 36,
      height: 36,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 18,
      backgroundColor:
        "#FFFFFF",
    },

    successCard: {
      width: "100%",
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 4,
      padding: 13,
      borderRadius: 21,
      backgroundColor:
        "#E4F7E8",
    },

    successIcon: {
      width: 48,
      height: 48,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 16,
      backgroundColor:
        "#FFFFFF",
    },

    successEmoji: {
      fontSize: 24,
    },

    successCopy: {
      flex: 1,
      marginLeft: 10,
    },

    successLabel: {
      fontSize: 8,
      letterSpacing: 1,
      fontWeight:
        "900",
      color: "#548160",
    },

    successTitle: {
      marginTop: 2,
      fontSize: 15,
      fontWeight:
        "900",
      color: "#2E623B",
    },

    successText: {
      marginTop: 2,
      fontSize: 9,
      fontWeight:
        "800",
      color: "#5F7A66",
    },

    successStar: {
      fontSize: 25,
    },

    nextReadyCard: {
      width: "100%",
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 4,
      padding: 13,
      borderRadius: 21,
      backgroundColor:
        "#EEF5FF",
    },

    nextReadyIcon: {
      fontSize: 25,
    },

    nextReadyCopy: {
      flex: 1,
      marginLeft: 10,
    },

    nextReadyTitle: {
      fontSize: 14,
      fontWeight:
        "900",
      color: "#35547D",
    },

    nextReadyText: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 16,
      fontWeight:
        "800",
      color: "#60758F",
    },

    footerHint: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 3,
    },

    footerIcon: {
      marginRight: 6,
      fontSize: 14,
    },

    footerText: {
      flex: 1,
      fontSize: 9,
      fontWeight:
        "800",
      color: "#887E8D",
    },

    pressed: {
      opacity: 0.82,
      transform: [
        {
          scale: 0.96,
        },
      ],
    },
  });