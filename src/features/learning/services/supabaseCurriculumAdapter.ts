import type {
  Activity,
  CurriculumChapter,
} from "../data/curriculum";

import type {
  SupabaseCurriculumChapter,
  SupabaseLessonActivity,
  SupabaseQuizQuestion,
} from "../types/supabaseCurriculum";

type AdapterOptions = {
  nextChapterId?: string;
  chapterIcon?: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(
  value: unknown,
): UnknownRecord {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as UnknownRecord;
  }

  return {};
}

function asArray(
  value: unknown,
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function asText(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function firstText(
  ...values: unknown[]
): string {
  for (const value of values) {
    const text = asText(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function asTextArray(
  value: unknown,
): string[] {
  return asArray(value)
    .map(asText)
    .filter(Boolean);
}

function asNumber(
  value: unknown,
  fallback = 0,
): number {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : fallback;
}

function optionalNumber(
  value: unknown,
): number | undefined {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : undefined;
}

function payloadOf(
  activity: SupabaseLessonActivity,
): UnknownRecord {
  return asRecord(
    activity.payload,
  );
}

function activityTitle(
  activity: SupabaseLessonActivity,
  payload: UnknownRecord,
) {
  return (
    firstText(
      activity.title_bn,
      payload.title_bn,
      payload.title,
      activity.title_en,
    ) || "শেখার কাজ"
  );
}

function activityInstruction(
  activity: SupabaseLessonActivity,
  payload: UnknownRecord,
  title: string,
) {
  return (
    firstText(
      activity.instruction_bn,
      payload.prompt,
      payload.instruction_bn,
      payload.instruction,
      activity.instruction_en,
    ) || title
  );
}

function warnSkipped(
  activity: SupabaseLessonActivity,
  reason: string,
) {
  console.warn(
    `[curriculum] Activity "${activity.id}" (${activity.activity_type}) skipped: ${reason}`,
  );
}

export function adaptSupabaseChapter(
  chapter: SupabaseCurriculumChapter,
  options: AdapterOptions = {},
): CurriculumChapter {
  const orderedActivities = [
    ...(chapter.lesson_activities ?? []),
  ].sort(
    (a, b) =>
      a.order_index -
      b.order_index,
  );

  const activities =
    orderedActivities.flatMap(
      (activity) => {
        try {
          return adaptActivity(
            chapter,
            activity,
          );
        } catch (error) {
          console.error(
            `[curriculum] Failed to adapt activity "${activity.id}" (${activity.activity_type})`,
            error,
          );

          return [];
        }
      },
    );

  return {
    id: chapter.id,
    title:
      chapter.title_bn,
    subtitle:
      chapter.summary_bn ??
      `পাঠ ${chapter.chapter_number}`,
    icon:
      options.chapterIcon ??
      "📘",
    nextChapterId:
      options.nextChapterId,
    activities,
  };
}

function adaptActivity(
  chapter: SupabaseCurriculumChapter,
  activity: SupabaseLessonActivity,
): Activity[] {
  const payload =
    payloadOf(activity);

  const title =
    activityTitle(
      activity,
      payload,
    );

  const instruction =
    activityInstruction(
      activity,
      payload,
      title,
    );

  switch (
    activity.activity_type
  ) {
    case "story_snippet": {
      const slides =
        asArray(
          payload.slides,
        );

      const adaptedSlides =
        slides.flatMap(
          (
            rawSlide,
            index,
          ): Activity[] => {
            const slide =
              asRecord(
                rawSlide,
              );

            const text =
              firstText(
                slide.text_bn,
                slide.speech_bn,
                slide.text,
              );

            if (!text) {
              return [];
            }

            return [
              {
                id: `${activity.id}-${
                  firstText(
                    slide.id,
                  ) ||
                  index + 1
                }`,
                type: "snippet",
                title:
                  firstText(
                    slide.title_bn,
                    title,
                  ) ||
                  title,
                imageEmoji:
                  firstText(
                    slide.emoji,
                    payload.imageEmoji,
                  ) ||
                  "📖",
                lines: [text],
              },
            ];
          },
        );

      if (
        adaptedSlides.length >
        0
      ) {
        return adaptedSlides;
      }

      const fallbackText =
        firstText(
          payload.text_bn,
          payload.speech_bn,
          payload.text,
          instruction,
        );

      if (
        !fallbackText
      ) {
        warnSkipped(
          activity,
          "no story text found",
        );
        return [];
      }

      return [
        {
          id: activity.id,
          type: "snippet",
          title,
          imageEmoji:
            firstText(
              payload.imageEmoji,
              payload.emoji,
            ) || "📖",
          lines: [
            fallbackText,
          ],
        },
      ];
    }

    case "image_lesson": {
      const imageUrl =
        firstText(
          payload.image_url,
          payload.imageUrl,
          payload.url,
        );

      const sourceLabel =
        firstText(
          payload.source_label,
          payload.sourceLabel,
        ) ||
        "NCTB পাঠ্যবই";

      const description =
        firstText(
          payload.description_bn,
          payload.caption_bn,
          payload.prompt,
          instruction,
          title,
        );

      return [
        {
          id: activity.id,
          type: "image_lesson",
          title,
          instruction:
            description,
          imageUrl:
            imageUrl ||
            undefined,
          pageStart:
            optionalNumber(
              payload.page_start,
            ),
          pageEnd:
            optionalNumber(
              payload.page_end,
            ),
          sourceLabel,
        },
      ];
    }

    case "audio_lesson": {
      const items =
        asArray(
          payload.items,
        );

      const adaptedItems =
        items.flatMap(
          (
            rawItem,
            index,
          ): Activity[] => {
            const item =
              asRecord(
                rawItem,
              );

            const text =
              firstText(
                item.text_bn,
                item.speech_bn,
                item.text,
                item.word_bn,
              );

            if (!text) {
              return [];
            }

            return [
              {
                id: `${activity.id}-${
                  firstText(
                    item.id,
                  ) ||
                  index + 1
                }`,
                type: "voice",
                prompt:
                  firstText(
                    item.prompt,
                    instruction,
                    title,
                  ) ||
                  title,
                word: text,
                emoji:
                  firstText(
                    item.emoji,
                  ) ||
                  "🎤",
              },
            ];
          },
        );

      if (
        adaptedItems.length >
        0
      ) {
        return adaptedItems;
      }

      const fallbackText =
        firstText(
          payload.text_bn,
          payload.speech_bn,
          payload.text,
        );

      if (
        !fallbackText
      ) {
        warnSkipped(
          activity,
          "no audio lesson text found",
        );
        return [];
      }

      return [
        {
          id: activity.id,
          type: "voice",
          prompt:
            instruction,
          word:
            fallbackText,
          emoji:
            firstText(
              payload.emoji,
            ) || "🎤",
        },
      ];
    }

    case "video_lesson": {
      const videoUrl =
        firstText(
          payload.video_url,
          payload.videoUrl,
          payload.url,
        );

      if (!videoUrl) {
        warnSkipped(
          activity,
          "video_url is empty",
        );
        return [];
      }

      return [
        {
          id: activity.id,
          type: "video",
          title,
          url: videoUrl,
        },
      ];
    }

    case "flashcard": {
      const cards =
        asArray(
          payload.cards,
        )
          .map(
            (
              rawCard,
            ) => {
              const card =
                asRecord(
                  rawCard,
                );

              return {
                emoji:
                  firstText(
                    card.emoji,
                  ) ||
                  "🖼️",
                word:
                  firstText(
                    card.word_bn,
                    card.word,
                    card.label_bn,
                    card.text_bn,
                  ),
              };
            },
          )
          .filter(
            (card) =>
              card.word.length >
              0,
          );

      return [
        {
          id: activity.id,
          type: "flashcard",
          prompt:
            firstText(
              payload.prompt,
              instruction,
              title,
            ) ||
            title,
          cards,
        },
      ];
    }

    case "matching": {
      const pairs =
        asArray(
          payload.pairs,
        )
          .map(
            (
              rawPair,
            ) => {
              const pair =
                asRecord(
                  rawPair,
                );

              return {
                emoji:
                  firstText(
                    pair.emoji,
                  ) ||
                  "🖼️",
                word:
                  firstText(
                    pair.word_bn,
                    pair.word,
                    pair.label_bn,
                    pair.text_bn,
                  ),
              };
            },
          )
          .filter(
            (pair) =>
              pair.word.length >
              0,
          );

      return [
        {
          id: activity.id,
          type: "matching",
          prompt:
            firstText(
              payload.prompt,
              instruction,
              title,
            ) ||
            title,
          pairs,
        },
      ];
    }

    case "multiple_choice": {
      const quizzes =
        adaptQuizQuestions(
          chapter.quiz_questions ??
            [],
          activity.id,
        );

      if (
        quizzes.length === 0
      ) {
        warnSkipped(
          activity,
          "no published quiz question with a correct option found",
        );
      }

      return quizzes;
    }

    case "tap": {
      const items =
        asArray(
          payload.items,
        )
          .map(
            (
              rawItem,
              index,
            ) => {
              const item =
                asRecord(
                  rawItem,
                );

              const label =
                firstText(
                  item.label_bn,
                  item.label,
                  item.word_bn,
                  item.text_bn,
                );

              return {
                id:
                  firstText(
                    item.id,
                  ) ||
                  `${activity.id}-item-${index + 1}`,
                emoji:
                  firstText(
                    item.emoji,
                  ) ||
                  "🖼️",
                label,
                description:
                  firstText(
                    item.description_bn,
                    item.description,
                    item.speech_bn,
                    label,
                  ) ||
                  label,
              };
            },
          )
          .filter(
            (item) =>
              item.label.length >
              0,
          );

      return [
        {
          id: activity.id,
          type: "tap",
          prompt:
            firstText(
              payload.prompt,
              instruction,
              title,
            ) ||
            title,
          items,
        },
      ];
    }

    case "snippet": {
      const lines =
        asTextArray(
          payload.lines,
        );

      const fallbackLine =
        firstText(
          payload.text_bn,
          payload.text,
          payload.speech_bn,
          instruction,
        );

      const safeLines =
        lines.length > 0
          ? lines
          : fallbackLine
            ? [
                fallbackLine,
              ]
            : [];

      if (
        safeLines.length ===
        0
      ) {
        warnSkipped(
          activity,
          "no snippet lines found",
        );
        return [];
      }

      return [
        {
          id: activity.id,
          type: "snippet",
          title,
          imageEmoji:
            firstText(
              payload.imageEmoji,
              payload.image_emoji,
              payload.emoji,
            ) ||
            "📖",
          lines:
            safeLines,
        },
      ];
    }

    case "letter": {
      const letter =
        firstText(
          payload.letter,
          payload.character,
          title,
        );

      const examples =
        asArray(
          payload.examples,
        )
          .map(
            (
              rawItem,
            ) => {
              const item =
                asRecord(
                  rawItem,
                );

              return {
                emoji:
                  firstText(
                    item.emoji,
                  ) ||
                  "🖼️",
                word:
                  firstText(
                    item.word_bn,
                    item.word,
                    item.label_bn,
                  ),
              };
            },
          )
          .filter(
            (item) =>
              item.word.length >
              0,
          );

      return [
        {
          id: activity.id,
          type: "letter",
          letter,
          sound:
            firstText(
              payload.sound,
              payload.speech_bn,
              letter,
            ) ||
            letter,
          examples,
        },
      ];
    }

    case "word_build": {
      const letters =
        asTextArray(
          payload.letters,
        );

      const answer =
        firstText(
          payload.answer,
          payload.word,
          payload.answer_bn,
        );

      if (
        letters.length ===
          0 ||
        !answer
      ) {
        warnSkipped(
          activity,
          "letters or answer missing",
        );
      }

      return [
        {
          id: activity.id,
          type: "word_build",
          prompt:
            firstText(
              payload.prompt,
              payload.instruction_bn,
              instruction,
              title,
            ) ||
            title,
          letters,
          answer,
        },
      ];
    }

    case "picture_choice": {
      const options =
        asArray(
          payload.options,
        )
          .map(
            (
              rawItem,
            ) => {
              const item =
                asRecord(
                  rawItem,
                );

              return {
                emoji:
                  firstText(
                    item.emoji,
                  ) ||
                  "🖼️",
                label:
                  firstText(
                    item.label_bn,
                    item.label,
                    item.word_bn,
                    item.text_bn,
                  ),
              };
            },
          )
          .filter(
            (item) =>
              item.label.length >
              0,
          );

      const rawAnswer =
        asNumber(
          payload.answer,
          0,
        );

      const safeAnswer =
        options.length > 0
          ? Math.min(
              Math.max(
                Math.trunc(
                  rawAnswer,
                ),
                0,
              ),
              options.length -
                1,
            )
          : 0;

      return [
        {
          id: activity.id,
          type: "picture_choice",
          question:
            firstText(
              payload.question,
              payload.prompt,
              instruction,
              title,
            ) ||
            title,
          options,
          answer:
            safeAnswer,
        },
      ];
    }

    case "drag_game": {
      const items =
        asArray(
          payload.items,
        )
          .map(
            (
              rawItem,
            ) => {
              const item =
                asRecord(
                  rawItem,
                );

              return {
                emoji:
                  firstText(
                    item.emoji,
                  ) ||
                  "🖼️",
                target:
                  firstText(
                    item.target,
                    item.target_bn,
                    item.category,
                  ),
              };
            },
          )
          .filter(
            (item) =>
              item.target.length >
              0,
          );

      return [
        {
          id: activity.id,
          type: "drag_game",
          prompt:
            firstText(
              payload.prompt,
              instruction,
              title,
            ) ||
            title,
          items,
        },
      ];
    }

    default:
      warnSkipped(
        activity,
        "unsupported activity type",
      );
      return [];
  }
}

function adaptQuizQuestions(
  questions: SupabaseQuizQuestion[],
  activityId: string,
): Activity[] {
  const linkedQuestions =
    questions.filter(
      (question) =>
        question.activity_id ===
        activityId,
    );

  const compatibleQuestions =
    linkedQuestions.length > 0
      ? linkedQuestions
      : questions.filter(
          (question) =>
            question.activity_id ===
            null,
        );

  return [
    ...compatibleQuestions,
  ]
    .sort(
      (a, b) =>
        a.order_index -
        b.order_index,
    )
    .flatMap(
      (
        question,
      ): Activity[] => {
        const options = [
          ...(question.quiz_options ??
            []),
        ].sort(
          (a, b) =>
            a.option_order -
            b.option_order,
        );

        const correctAnswer =
          options.findIndex(
            (option) =>
              option.is_correct,
          );

        if (
          correctAnswer <
            0 ||
          options.length <
            2
        ) {
          return [];
        }

        return [
          {
            id:
              question.id,
            type: "quiz",
            question:
              question.question_bn,
            options:
              options.map(
                (option) =>
                  option.label_bn ??
                  option.label_en ??
                  "",
              ),
            answer:
              correctAnswer,
            hint:
              question.explanation_bn ??
              question.explanation_en ??
              "আবার চেষ্টা করো।",
          },
        ];
      },
    );
}