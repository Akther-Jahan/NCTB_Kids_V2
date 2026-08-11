import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as Speech from "expo-speech";

import MimiCharacter from "./MimiCharacter";

type SlotValue = number | null;

type WordOrderData = {
  prompt: string;
  words: string[];
  answer: string[];
  hint?: string;
};

type Props = {
  activity: {
    title?: string;
    instruction?: string;
    data: WordOrderData;
  };
  onComplete: () => void;
};

type SlotRect = {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type DropSource =
  | {
      kind: "bank";
      wordIndex: number;
    }
  | {
      kind: "slot";
      wordIndex: number;
      slotIndex: number;
    };

type DraggableWordProps = {
  word: string;
  compact?: boolean;
  disabled?: boolean;
  selected?: boolean;
  wrong?: boolean;
  correct?: boolean;
  onSpeak: () => void;
  onTap: () => void;
  onDrop: (
    pageX: number,
    pageY: number,
  ) => void;
};

function speakBangla(
  text: string,
) {
  void Speech.stop();

  Speech.speak(text, {
    language: "bn-BD",
    rate: 0.76,
    pitch: 1.03,
    volume: 1,
  });
}

function sameSlots(
  a: SlotValue[],
  b: SlotValue[],
) {
  return (
    a.length === b.length &&
    a.every(
      (value, index) =>
        value === b[index],
    )
  );
}

function DraggableWord({
  word,
  compact = false,
  disabled = false,
  selected = false,
  wrong = false,
  correct = false,
  onSpeak,
  onTap,
  onDrop,
}: DraggableWordProps) {
  const pan = useRef(
    new Animated.ValueXY(),
  ).current;

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const panResponder =
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder:
            () => !disabled,

          onMoveShouldSetPanResponder:
            (_, gesture) =>
              !disabled &&
              (Math.abs(
                gesture.dx,
              ) > 4 ||
                Math.abs(
                  gesture.dy,
                ) > 4),

          onPanResponderGrant: () => {
            if (disabled) {
              return;
            }

            setDragging(true);
            onSpeak();
          },

          onPanResponderMove:
            Animated.event(
              [
                null,
                {
                  dx: pan.x,
                  dy: pan.y,
                },
              ],
              {
                useNativeDriver:
                  false,
              },
            ),

          onPanResponderRelease:
            (_, gesture) => {
              if (disabled) {
                return;
              }

              const moved =
                Math.abs(
                  gesture.dx,
                ) > 6 ||
                Math.abs(
                  gesture.dy,
                ) > 6;

              setDragging(false);

              Animated.spring(
                pan,
                {
                  toValue: {
                    x: 0,
                    y: 0,
                  },
                  friction: 7,
                  tension: 80,
                  useNativeDriver:
                    true,
                },
              ).start();

              if (moved) {
                onDrop(
                  gesture.moveX,
                  gesture.moveY,
                );
              } else {
                onTap();
              }
            },

          onPanResponderTerminate:
            () => {
              setDragging(false);

              Animated.spring(
                pan,
                {
                  toValue: {
                    x: 0,
                    y: 0,
                  },
                  useNativeDriver:
                    true,
                },
              ).start();
            },
        }),
      [
        disabled,
        onDrop,
        onSpeak,
        onTap,
        pan,
      ],
    );

  return (
    <Animated.View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${word} শব্দ`}
      accessibilityState={{
        disabled,
        selected,
      }}
      onAccessibilityTap={
        disabled
          ? undefined
          : onTap
      }
      {...panResponder.panHandlers}
      style={[
        styles.wordTile,
        compact &&
          styles.wordTileCompact,
        selected &&
          styles.wordTileSelected,
        wrong &&
          styles.wordTileWrong,
        correct &&
          styles.wordTileCorrect,
        disabled &&
          styles.wordTileDisabled,
        dragging &&
          styles.wordTileDragging,
        {
          transform: [
            {
              translateX:
                pan.x,
            },
            {
              translateY:
                pan.y,
            },
            {
              scale: dragging
                ? 1.06
                : 1,
            },
          ],
        },
      ]}
    >
      <Text
        style={[
          styles.wordTileText,
          compact &&
            styles.wordTileTextCompact,
          selected &&
            styles.wordTileTextSelected,
          correct &&
            styles.wordTileTextCorrect,
        ]}
      >
        {word}
      </Text>

      {!compact ? (
        <Text
          style={
            styles.dragDots
          }
        >
          ⋮⋮
        </Text>
      ) : null}
    </Animated.View>
  );
}

export default function WordOrderActivity({
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

  const answerLength =
    data.answer.length;

  const slotCount =
    Math.max(
      answerLength,
      data.words.length,
    );

  const initialSlots =
    useMemo<SlotValue[]>(
      () =>
        Array<SlotValue>(
          slotCount,
        ).fill(null),
      [slotCount],
    );

  const entrance = useRef(
    new Animated.Value(0),
  ).current;

  const shake = useRef(
    new Animated.Value(0),
  ).current;

  const successScale =
    useRef(
      new Animated.Value(1),
    ).current;

  const rewardY = useRef(
    new Animated.Value(-90),
  ).current;

  const completedRef =
    useRef(false);

  const onCompleteRef =
    useRef(onComplete);

  const slotRefs = useRef<
    Array<
      React.ElementRef<
        typeof View
      > | null
    >
  >([]);

  const [
    slots,
    setSlots,
  ] = useState<SlotValue[]>(
    initialSlots,
  );

  const [
    history,
    setHistory,
  ] = useState<SlotValue[][]>(
    [],
  );

  const [
    checked,
    setChecked,
  ] = useState(false);

  const [
    wrongSlots,
    setWrongSlots,
  ] = useState<Set<number>>(
    new Set(),
  );

  const [
    completed,
    setCompleted,
  ] = useState(false);

  const [
    showHint,
    setShowHint,
  ] = useState(false);

  useEffect(() => {
    onCompleteRef.current =
      onComplete;
  }, [onComplete]);

  useEffect(() => {
    setSlots(
      initialSlots,
    );
    setHistory([]);
    setChecked(false);
    setWrongSlots(
      new Set(),
    );
    setCompleted(false);
    setShowHint(false);
    completedRef.current =
      false;
  }, [initialSlots]);

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
            "শব্দগুলো সঠিক ক্রমে সাজিয়ে বাক্য তৈরি করো।",
        );
      }, 350);

    if (
      slotCount === 0 &&
      !completedRef.current
    ) {
      completedRef.current =
        true;
      setCompleted(true);
      onCompleteRef.current();
    }

    return () => {
      clearTimeout(timer);
      animation.stop();
      void Speech.stop();
    };
  }, [
    data.prompt,
    entrance,
    slotCount,
  ]);

  const opacity =
    entrance.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

  const translateY =
    entrance.interpolate({
      inputRange: [0, 1],
      outputRange: [24, 0],
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

  const selectedCount =
    slots.filter(
      (value) =>
        value !== null,
    ).length;

  const usedWordIndices =
    useMemo(
      () =>
        new Set(
          slots.filter(
            (
              value,
            ): value is number =>
              value !== null,
          ),
        ),
      [slots],
    );

  const sentenceWords =
    slots.map(
      (value) =>
        value === null
          ? ""
          : data.words[
              value
            ],
    );

  const currentSentence =
    sentenceWords
      .filter(Boolean)
      .join(" ");

  const targetSentence =
    data.answer.join(" ");

  const characterSize =
    isTablet
      ? 190
      : isSmallPhone
        ? 122
        : 150;

  const pushHistory = (
    previous: SlotValue[],
  ) => {
    setHistory(
      (current) => [
        ...current,
        [...previous],
      ].slice(-20),
    );
  };

  const clearFeedback =
    () => {
      setChecked(false);
      setWrongSlots(
        new Set(),
      );
      setShowHint(false);
    };

  const updateSlots = (
    updater: (
      current: SlotValue[],
    ) => SlotValue[],
  ) => {
    if (completed) {
      return;
    }

    setSlots(
      (current) => {
        const next =
          updater(current);

        if (
          sameSlots(
            current,
            next,
          )
        ) {
          return current;
        }

        pushHistory(
          current,
        );
        clearFeedback();

        return next;
      },
    );
  };

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
            successScale,
            {
              toValue: 1.07,
              duration: 140,
              useNativeDriver:
                true,
            },
          ),
          Animated.spring(
            successScale,
            {
              toValue: 1,
              friction: 5,
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

  const isSlotLocked = (
    slotIndex: number,
  ) => {
    if (completed) {
      return true;
    }

    if (
      checked &&
      wrongSlots.size > 0
    ) {
      return !wrongSlots.has(
        slotIndex,
      );
    }

    return false;
  };

  const measureSlots =
    async (): Promise<
      SlotRect[]
    > => {
      const measurements =
        slotRefs.current.map(
          (
            view,
            index,
          ) =>
            new Promise<
              SlotRect | null
            >(
              (resolve) => {
                if (!view) {
                  resolve(
                    null,
                  );
                  return;
                }

                view.measureInWindow(
                  (
                    x,
                    y,
                    widthValue,
                    heightValue,
                  ) => {
                    resolve({
                      index,
                      x,
                      y,
                      width:
                        widthValue,
                      height:
                        heightValue,
                    });
                  },
                );
              },
            ),
        );

      const values =
        await Promise.all(
          measurements,
        );

      return values.filter(
        (
          value,
        ): value is SlotRect =>
          value !== null,
      );
    };

  const findTargetSlot =
    async (
      pageX: number,
      pageY: number,
    ) => {
      const rects =
        await measureSlots();

      const direct =
        rects.find(
          (rect) =>
            pageX >= rect.x &&
            pageX <=
              rect.x +
                rect.width &&
            pageY >= rect.y &&
            pageY <=
              rect.y +
                rect.height,
        );

      if (direct) {
        return direct.index;
      }

      let nearest:
        | {
            index: number;
            distance: number;
          }
        | undefined;

      for (const rect of rects) {
        const centerX =
          rect.x +
          rect.width / 2;

        const centerY =
          rect.y +
          rect.height / 2;

        const distance =
          Math.hypot(
            pageX -
              centerX,
            pageY -
              centerY,
          );

        const snapRadius =
          Math.max(
            rect.width,
            rect.height,
          ) * 0.7;

        if (
          distance <=
            snapRadius &&
          (!nearest ||
            distance <
              nearest.distance)
        ) {
          nearest = {
            index:
              rect.index,
            distance,
          };
        }
      }

      return (
        nearest?.index ??
        null
      );
    };

  const applyDrop = (
    source: DropSource,
    targetSlot:
      | number
      | null,
  ) => {
    if (completed) {
      return;
    }

    if (
      targetSlot !== null &&
      isSlotLocked(
        targetSlot,
      )
    ) {
      speakBangla(
        "এই শব্দটি সঠিক জায়গায় আছে। ভুল জায়গাগুলো ঠিক করো।",
      );
      return;
    }

    updateSlots(
      (current) => {
        const next =
          [...current];

        if (
          source.kind ===
          "bank"
        ) {
          if (
            targetSlot ===
            null
          ) {
            return current;
          }

          next[targetSlot] =
            source.wordIndex;

          return next;
        }

        const sourceSlot =
          source.slotIndex;

        if (
          isSlotLocked(
            sourceSlot,
          )
        ) {
          return current;
        }

        if (
          targetSlot ===
          null
        ) {
          next[sourceSlot] =
            null;
          return next;
        }

        if (
          targetSlot ===
          sourceSlot
        ) {
          return current;
        }

        const targetValue =
          next[targetSlot];

        next[targetSlot] =
          source.wordIndex;

        next[sourceSlot] =
          targetValue;

        return next;
      },
    );
  };

  const handleDrop =
    async (
      source: DropSource,
      pageX: number,
      pageY: number,
    ) => {
      const targetSlot =
        await findTargetSlot(
          pageX,
          pageY,
        );

      applyDrop(
        source,
        targetSlot,
      );
    };

  const firstEditableSlot =
    () => {
      if (
        checked &&
        wrongSlots.size > 0
      ) {
        const wrong =
          [...wrongSlots].sort(
            (a, b) =>
              a - b,
          );

        return (
          wrong[0] ??
          null
        );
      }

      const emptyIndex =
        slots.findIndex(
          (value) =>
            value === null,
        );

      return emptyIndex >= 0
        ? emptyIndex
        : null;
    };

  const tapBankWord = (
    wordIndex: number,
  ) => {
    if (
      completed ||
      usedWordIndices.has(
        wordIndex,
      )
    ) {
      return;
    }

    const target =
      firstEditableSlot();

    if (target === null) {
      speakBangla(
        "সব ঘর পূর্ণ হয়েছে। চাইলে কোনো শব্দ সরিয়ে আবার বসাও।",
      );
      return;
    }

    speakBangla(
      data.words[
        wordIndex
      ],
    );

    applyDrop(
      {
        kind: "bank",
        wordIndex,
      },
      target,
    );
  };

  const removeFromSlot = (
    slotIndex: number,
  ) => {
    if (
      completed ||
      isSlotLocked(
        slotIndex,
      )
    ) {
      return;
    }

    const wordIndex =
      slots[slotIndex];

    if (
      wordIndex ===
      null
    ) {
      return;
    }

    speakBangla(
      data.words[
        wordIndex
      ],
    );

    updateSlots(
      (current) => {
        const next =
          [...current];

        next[slotIndex] =
          null;

        return next;
      },
    );
  };

  const undo = () => {
    if (
      completed ||
      history.length ===
        0
    ) {
      return;
    }

    const previous =
      history[
        history.length - 1
      ];

    setSlots(
      [...previous],
    );

    setHistory(
      (current) =>
        current.slice(
          0,
          -1,
        ),
    );

    clearFeedback();

    speakBangla(
      "এক ধাপ পেছনে গেলাম।",
    );
  };

  const reset = () => {
    if (
      completed ||
      sameSlots(
        slots,
        initialSlots,
      )
    ) {
      return;
    }

    pushHistory(
      slots,
    );

    setSlots(
      [...initialSlots],
    );

    clearFeedback();

    speakBangla(
      "আবার শুরু করি। শব্দগুলো সঠিক ক্রমে সাজাও।",
    );
  };

  const listenSentence =
    () => {
      speakBangla(
        targetSentence,
      );
    };

  const showHintAndSpeak =
    () => {
      setShowHint(true);

      speakBangla(
        data.hint ||
          `সঠিক বাক্যটি হলো ${targetSentence}`,
      );
    };

  const checkAnswer =
    () => {
      if (
        completed ||
        selectedCount !==
          slotCount
      ) {
        speakBangla(
          "সব ঘরে শব্দ বসাও, তারপর যাচাই করো।",
        );
        return;
      }

      const actualWords =
        slots.map(
          (value) =>
            value === null
              ? ""
              : data.words[
                  value
                ],
        );

      const correct =
        actualWords.length ===
          data.answer.length &&
        actualWords.every(
          (word, index) =>
            word ===
            data.answer[index],
        );

      if (correct) {
        if (
          completedRef.current
        ) {
          return;
        }

        completedRef.current =
          true;

        setChecked(true);
        setWrongSlots(
          new Set(),
        );
        setCompleted(true);

        runSuccessAnimation();

        setTimeout(() => {
          speakBangla(
            `দারুণ! বাক্যটি সঠিক। ${targetSentence}`,
          );
        }, 150);

        onCompleteRef.current();
        return;
      }

      const wrong =
        new Set<number>();

      actualWords.forEach(
        (
          word,
          index,
        ) => {
          if (
            word !==
            data.answer[
              index
            ]
          ) {
            wrong.add(
              index,
            );
          }
        },
      );

      setChecked(true);
      setWrongSlots(
        wrong,
      );

      runWrongAnimation();

      setTimeout(() => {
        speakBangla(
          wrong.size === 1
            ? "একটি শব্দ ভুল জায়গায় আছে। শুধু ওই জায়গাটি ঠিক করো।"
            : `${wrong.size}টি শব্দ ভুল জায়গায় আছে। শুধু ভুল জায়গাগুলো ঠিক করো।`,
        );
      }, 140);
    };

  const correctLockedCount =
    checked &&
    wrongSlots.size > 0
      ? slotCount -
        wrongSlots.size
      : 0;

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

        <View>
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
            বাক্যটি সঠিক হয়েছে
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
            🧠
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
            WORD ORDER
          </Text>

          <Text
            style={[
              styles.title,
              isTablet &&
                styles.titleTablet,
            ]}
          >
            {activity.title ??
              "বাক্য সাজাই"}
          </Text>
        </View>

        <View
          style={
            styles.counterBadge
          }
        >
          <Text
            style={
              styles.counterText
            }
          >
            {selectedCount}/
            {slotCount}
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

        <MimiCharacter
          emotion={
            completed
              ? "celebrate"
              : checked &&
                  wrongSlots.size >
                    0
                ? "talking"
                : "happy"
          }
          size={
            characterSize
          }
        />

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
            accessibilityLabel="নির্দেশনা শুনি"
            onPress={() =>
              speakBangla(
                data.prompt,
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
            <Text>
              🔊
            </Text>

            <Text
              style={
                styles.listenButtonText
              }
            >
              শুনি
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={
          styles.sectionHeader
        }
      >
        <View>
          <Text
            style={
              styles.sectionEyebrow
            }
          >
            SENTENCE SLOTS
          </Text>

          <Text
            style={
              styles.sectionTitle
            }
          >
            শব্দগুলো সঠিক জায়গায় বসাও
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.sentenceCard,
          checked &&
            wrongSlots.size >
              0 &&
            styles.sentenceCardWrong,
          completed &&
            styles.sentenceCardCorrect,
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
            styles.slotsWrap
          }
        >
          {slots.map(
            (
              wordIndex,
              slotIndex,
            ) => {
              const filledWordIndex =
                wordIndex;

              const word =
                filledWordIndex ===
                null
                  ? null
                  : data.words[
                      filledWordIndex
                    ];

              const slotWrong =
                checked &&
                wrongSlots.has(
                  slotIndex,
                );

              const slotCorrect =
                completed ||
                (checked &&
                  wrongSlots.size >
                    0 &&
                  !slotWrong &&
                  word !==
                    null);

              return (
                <View
                  key={`sentence-slot-${slotIndex}`}
                  ref={(view) => {
                    slotRefs.current[
                      slotIndex
                    ] = view;
                  }}
                  style={[
                    styles.slot,
                    word !== null &&
                      styles.slotFilled,
                    slotWrong &&
                      styles.slotWrong,
                    slotCorrect &&
                      styles.slotCorrect,
                  ]}
                >
                  {filledWordIndex !==
                    null &&
                  word !== null ? (
                    <DraggableWord
                      word={word}
                      compact
                      wrong={
                        slotWrong
                      }
                      correct={
                        slotCorrect
                      }
                      disabled={
                        isSlotLocked(
                          slotIndex,
                        )
                      }
                      onSpeak={() =>
                        speakBangla(
                          word,
                        )
                      }
                      onTap={() =>
                        removeFromSlot(
                          slotIndex,
                        )
                      }
                      onDrop={(
                        pageX,
                        pageY,
                      ) =>
                        void handleDrop(
                          {
                            kind: "slot",
                            wordIndex:
                              filledWordIndex,
                            slotIndex,
                          },
                          pageX,
                          pageY,
                        )
                      }
                    />
                  ) : (
                    <View
                      style={
                        styles.emptySlot
                      }
                    >
                      <Text
                        style={
                          styles.emptySlotNumber
                        }
                      >
                        {slotIndex +
                          1}
                      </Text>

                      <Text
                        style={
                          styles.emptySlotText
                        }
                      >
                        শব্দ
                      </Text>
                    </View>
                  )}
                </View>
              );
            },
          )}
        </View>

        <Text
          style={[
            styles.sentencePreview,
            checked &&
              wrongSlots.size >
                0 &&
              styles.sentencePreviewWrong,
            completed &&
              styles.sentencePreviewCorrect,
          ]}
        >
          {currentSentence ||
            "এখানে তোমার বাক্য তৈরি হবে"}
        </Text>

        {completed ? (
          <View
            style={
              styles.feedbackSuccess
            }
          >
            <Text
              style={
                styles.feedbackIcon
              }
            >
              ✓
            </Text>

            <Text
              style={
                styles.feedbackSuccessText
              }
            >
              একদম সঠিক বাক্য!
            </Text>
          </View>
        ) : checked &&
          wrongSlots.size >
            0 ? (
          <View
            style={
              styles.feedbackWrong
            }
          >
            <Text
              style={
                styles.feedbackIcon
              }
            >
              🔧
            </Text>

            <View
              style={
                styles.feedbackCopy
              }
            >
              <Text
                style={
                  styles.feedbackWrongText
                }
              >
                {wrongSlots.size}টি জায়গা ঠিক করো
              </Text>

              <Text
                style={
                  styles.feedbackWrongSubtext
                }
              >
                {correctLockedCount}টি সঠিক জায়গা lock আছে
              </Text>
            </View>
          </View>
        ) : (
          <Text
            style={
              styles.helperText
            }
          >
            word tile টেনে slot-এ ফেলো, অথবা tile-এ চাপ দাও
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
          disabled={
            history.length ===
              0 ||
            completed
          }
          onPress={undo}
          style={({
            pressed,
          }) => [
            styles.toolButton,
            (history.length ===
              0 ||
              completed) &&
              styles.toolButtonDisabled,
            pressed &&
              history.length >
                0 &&
              !completed &&
              styles.pressed,
          ]}
        >
          <Text
            style={
              styles.toolIcon
            }
          >
            ↶
          </Text>

          {!isSmallPhone ? (
            <Text
              style={
                styles.toolText
              }
            >
              Undo
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={
            selectedCount ===
              0 ||
            completed
          }
          onPress={reset}
          style={({
            pressed,
          }) => [
            styles.toolButton,
            (selectedCount ===
              0 ||
              completed) &&
              styles.toolButtonDisabled,
            pressed &&
              selectedCount >
                0 &&
              !completed &&
              styles.pressed,
          ]}
        >
          <Text
            style={
              styles.toolIcon
            }
          >
            ↻
          </Text>

          {!isSmallPhone ? (
            <Text
              style={
                styles.toolText
              }
            >
              Reset
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={
            listenSentence
          }
          style={({
            pressed,
          }) => [
            styles.toolButton,
            styles.toolButtonListen,
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

          {!isSmallPhone ? (
            <Text
              style={
                styles.toolText
              }
            >
              বাক্য শুনি
            </Text>
          ) : null}
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

          {!isSmallPhone ? (
            <Text
              style={
                styles.toolText
              }
            >
              Hint
            </Text>
          ) : null}
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
              `সঠিক বাক্যটি শুনে শব্দগুলোর ক্রম মনে করো।`}
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.wordBankHeader
        }
      >
        <View>
          <Text
            style={
              styles.sectionEyebrow
            }
          >
            WORD BANK
          </Text>

          <Text
            style={
              styles.wordBankTitle
            }
          >
            শব্দগুলো
          </Text>
        </View>

        <Text
          style={
            styles.dragLabel
          }
        >
          Drag & Drop
        </Text>
      </View>

      <View
        style={
          styles.wordBank
        }
      >
        {data.words.map(
          (
            word,
            index,
          ) => {
            const selected =
              usedWordIndices.has(
                index,
              );

            return (
              <DraggableWord
                key={`${word}-${index}`}
                word={word}
                selected={
                  selected
                }
                disabled={
                  selected ||
                  completed
                }
                onSpeak={() =>
                  speakBangla(
                    word,
                  )
                }
                onTap={() =>
                  tapBankWord(
                    index,
                  )
                }
                onDrop={(
                  pageX,
                  pageY,
                ) =>
                  void handleDrop(
                    {
                      kind: "bank",
                      wordIndex:
                        index,
                    },
                    pageX,
                    pageY,
                  )
                }
              />
            );
          },
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          disabled:
            selectedCount !==
              slotCount ||
            completed,
        }}
        disabled={
          selectedCount !==
            slotCount ||
          completed
        }
        onPress={
          checkAnswer
        }
        style={({
          pressed,
        }) => [
          styles.checkButton,
          selectedCount !==
              slotCount &&
            styles.checkButtonDisabled,
          completed &&
            styles.checkButtonCorrect,
          pressed &&
            selectedCount ===
              slotCount &&
            !completed &&
            styles.checkButtonPressed,
        ]}
      >
        <Text
          style={
            styles.checkIcon
          }
        >
          {completed
            ? "✓"
            : "🔎"}
        </Text>

        <Text
          style={
            styles.checkText
          }
        >
          {completed
            ? "বাক্যটি সঠিক"
            : "বাক্য যাচাই করি"}
        </Text>
      </Pressable>

      {!completed ? (
        <Text
          style={
            styles.footerHint
          }
        >
          slot-এর শব্দে চাপ দিলে সেটি আবার word bank-এ ফিরে যাবে। এক slot থেকে অন্য slot-এ টানলে swap হবে।
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
      minHeight: 64,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor:
        "#D8EACF",
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

    rewardTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: "#3F7C39",
    },

    rewardText: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: "800",
      color: "#678161",
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

    counterBadge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 15,
      backgroundColor:
        "#EEE8F8",
    },

    counterText: {
      fontSize: 9,
      fontWeight: "900",
      color: "#7653BD",
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
        "#D8CDF7",
    },

    guideOrb: {
      position:
        "absolute",
      right: -45,
      top: -55,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor:
        "rgba(255,255,255,0.24)",
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
      color: "#8D7A98",
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

    listenButton: {
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

    listenButtonText: {
      fontSize: 9,
      fontWeight: "900",
      color: "#4F7088",
    },

    pressed: {
      transform: [
        {
          scale: 0.97,
        },
      ],
      opacity: 0.88,
    },

    sectionHeader: {
      marginTop: 18,
      marginBottom: 9,
    },

    sectionEyebrow: {
      fontSize: 8,
      letterSpacing: 1.2,
      fontWeight: "900",
      color: "#9A909E",
    },

    sectionTitle: {
      marginTop: 2,
      fontSize: 15,
      fontWeight: "900",
      color: "#302B33",
    },

    sentenceCard: {
      alignItems:
        "center",
      padding: 14,
      borderWidth: 2,
      borderColor:
        "#E1DCE5",
      borderRadius: 24,
      backgroundColor:
        "#FFFFFF",
    },

    sentenceCardWrong: {
      borderColor:
        "#E6A365",
      backgroundColor:
        "#FFF8EF",
    },

    sentenceCardCorrect: {
      borderColor:
        "#6DBB63",
      backgroundColor:
        "#F0FAEE",
    },

    slotsWrap: {
      width: "100%",
      flexDirection:
        "row",
      flexWrap: "wrap",
      justifyContent:
        "center",
      gap: 8,
    },

    slot: {
      minWidth: 82,
      minHeight: 62,
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 4,
      borderWidth: 2,
      borderStyle:
        "dashed",
      borderColor:
        "#CBC3D0",
      borderRadius: 17,
      backgroundColor:
        "#FAF9FB",
    },

    slotFilled: {
      borderStyle:
        "solid",
      borderColor:
        "#AA98C7",
      backgroundColor:
        "#F7F2FF",
    },

    slotWrong: {
      borderStyle:
        "solid",
      borderColor:
        "#DE8059",
      backgroundColor:
        "#FFF0E8",
    },

    slotCorrect: {
      borderStyle:
        "solid",
      borderColor:
        "#65B85C",
      backgroundColor:
        "#EAF8E7",
    },

    emptySlot: {
      alignItems:
        "center",
    },

    emptySlotNumber: {
      fontSize: 14,
      fontWeight: "900",
      color: "#A79EAC",
    },

    emptySlotText: {
      marginTop: 2,
      fontSize: 7,
      fontWeight: "800",
      color: "#B0A8B4",
    },

    sentencePreview: {
      marginTop: 13,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: "900",
      color: "#645B69",
      textAlign:
        "center",
    },

    sentencePreviewWrong: {
      color: "#A76734",
    },

    sentencePreviewCorrect: {
      color: "#438E3E",
    },

    helperText: {
      marginTop: 10,
      fontSize: 9,
      lineHeight: 13,
      fontWeight: "800",
      color: "#8B818E",
      textAlign:
        "center",
    },

    feedbackWrong: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 11,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 15,
      backgroundColor:
        "#FFE8D6",
    },

    feedbackSuccess: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 11,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 15,
      backgroundColor:
        "#DDF4D9",
    },

    feedbackIcon: {
      marginRight: 7,
      fontSize: 17,
    },

    feedbackCopy: {
      flex: 1,
    },

    feedbackWrongText: {
      fontSize: 10,
      fontWeight: "900",
      color: "#9B572B",
    },

    feedbackWrongSubtext: {
      marginTop: 2,
      fontSize: 8,
      fontWeight: "700",
      color: "#A77758",
    },

    feedbackSuccessText: {
      fontSize: 10,
      fontWeight: "900",
      color: "#438E3E",
    },

    toolsRow: {
      flexDirection:
        "row",
      gap: 7,
      marginTop: 11,
    },

    toolButton: {
      flex: 1,
      minHeight: 42,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 4,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor:
        "#DDD6E2",
      borderRadius: 18,
      backgroundColor:
        "#FFFFFF",
    },

    toolButtonListen: {
      backgroundColor:
        "#EAF5FF",
      borderColor:
        "#CFE7F7",
    },

    toolButtonDisabled: {
      opacity: 0.42,
    },

    toolIcon: {
      fontSize: 15,
    },

    toolText: {
      fontSize: 8,
      fontWeight: "900",
      color: "#5F5664",
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

    wordBankHeader: {
      flexDirection:
        "row",
      alignItems:
        "flex-end",
      justifyContent:
        "space-between",
      marginTop: 18,
      marginBottom: 9,
    },

    wordBankTitle: {
      marginTop: 2,
      fontSize: 15,
      fontWeight: "900",
      color: "#302B33",
    },

    dragLabel: {
      fontSize: 8,
      fontWeight: "900",
      color: "#8D8192",
    },

    wordBank: {
      flexDirection:
        "row",
      flexWrap: "wrap",
      justifyContent:
        "center",
      gap: 9,
      minHeight: 70,
    },

    wordTile: {
      position:
        "relative",
      zIndex: 2,
      minWidth: 86,
      minHeight: 58,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderWidth: 2,
      borderColor:
        "#A995C7",
      borderBottomWidth: 5,
      borderRadius: 18,
      backgroundColor:
        "#F4EEFF",
      shadowColor:
        "#5C4A74",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },

    wordTileCompact: {
      width: "100%",
      minWidth: 0,
      minHeight: 52,
      borderWidth: 0,
      borderBottomWidth: 0,
      borderRadius: 13,
      backgroundColor:
        "transparent",
      shadowOpacity: 0,
      elevation: 0,
    },

    wordTileSelected: {
      opacity: 0.28,
      borderColor:
        "#D8D0DE",
      backgroundColor:
        "#F0EDF2",
    },

    wordTileWrong: {
      borderColor:
        "#DE8059",
      backgroundColor:
        "#FFE8DA",
    },

    wordTileCorrect: {
      borderColor:
        "#65B85C",
      backgroundColor:
        "#E6F7E3",
    },

    wordTileDisabled: {
      shadowOpacity: 0,
      elevation: 0,
    },

    wordTileDragging: {
      zIndex: 100,
      elevation: 12,
      shadowOpacity: 0.22,
    },

    wordTileText: {
      fontSize: 18,
      fontWeight: "900",
      color: "#503A69",
      textAlign:
        "center",
    },

    wordTileTextCompact: {
      fontSize: 16,
    },

    wordTileTextSelected: {
      color: "#A69EAA",
    },

    wordTileTextCorrect: {
      color: "#438D3D",
    },

    dragDots: {
      position:
        "absolute",
      right: 6,
      bottom: 3,
      fontSize: 10,
      letterSpacing: -2,
      fontWeight: "900",
      color: "#A998B8",
    },

    checkButton: {
      minHeight: 56,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
      marginTop: 15,
      borderRadius: 28,
      backgroundColor:
        "#1A171C",
      shadowColor:
        "#1A171C",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.18,
      shadowRadius: 7,
      elevation: 5,
    },

    checkButtonDisabled: {
      backgroundColor:
        "#C9C4CC",
      shadowOpacity: 0,
      elevation: 0,
    },

    checkButtonCorrect: {
      backgroundColor:
        "#4F9E48",
      shadowOpacity: 0,
      elevation: 0,
    },

    checkButtonPressed: {
      transform: [
        {
          translateY: 2,
        },
      ],
    },

    checkIcon: {
      fontSize: 18,
    },

    checkText: {
      fontSize: 13,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    footerHint: {
      marginTop: 9,
      fontSize: 8,
      lineHeight: 12,
      fontWeight: "700",
      color: "#8B818E",
      textAlign:
        "center",
    },
  });