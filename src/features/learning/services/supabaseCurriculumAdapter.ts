import type {
  Activity,
  CurriculumChapter,
} from "../data/curriculum";
import type {
  PuzzlePayload,
  SupabaseCurriculumChapter,
  SupabaseLessonActivity,
  SupabaseQuizQuestion,
} from "../types/supabaseCurriculum";

type AdapterOptions = {
  nextChapterId?: string;
  chapterIcon?: string;
};

export function adaptSupabaseChapter(
  chapter: SupabaseCurriculumChapter,
  options: AdapterOptions = {},
): CurriculumChapter {
  const orderedActivities = [
    ...chapter.lesson_activities,
  ].sort((a, b) => a.order_index - b.order_index);

  const activities = orderedActivities.flatMap((activity) =>
    adaptActivity(chapter, activity),
  );

  return {
    id: chapter.id,
    title: chapter.title_bn,
    subtitle: chapter.summary_bn ?? `পাঠ ${chapter.chapter_number}`,
    icon: options.chapterIcon ?? "📘",
    nextChapterId: options.nextChapterId,
    activities,
  };
}

function adaptActivity(
  chapter: SupabaseCurriculumChapter,
  activity: SupabaseLessonActivity,
): Activity[] {
  const title =
    activity.title_bn ?? activity.title_en ?? "শেখার কাজ";
  const instruction =
    activity.instruction_bn ?? activity.instruction_en ?? "";

  switch (activity.activity_type) {
    case "story_snippet":
      return activity.payload.slides.flatMap(
        (slide, index): Activity[] => {
          const text = (
            slide.text_bn || slide.speech_bn || ""
          ).trim();
          if (!text) return [];

          return [
            {
              id: `${activity.id}-${slide.id || index + 1}`,
              type: "snippet",
              title,
              imageEmoji: slide.emoji ?? "📖",
              lines: [text],
            },
          ];
        },
      );

    case "image_lesson":
      return [
        {
          id: activity.id,
          type: "image_lesson",
          title,
          instruction,
          imageUrl: activity.payload.image_url,
          pageStart: activity.payload.page_start,
          pageEnd: activity.payload.page_end,
          sourceLabel:
            activity.payload.source_label ?? "NCTB পাঠ্যবই",
        },
      ];

    case "audio_lesson":
      return activity.payload.items.flatMap(
        (item, index): Activity[] => {
          const text = item.text_bn.trim();
          if (!text) return [];

          return [
            {
              id: `${activity.id}-${item.id || index + 1}`,
              type: "voice",
              prompt: instruction || title,
              word: text,
              emoji: item.emoji ?? "🎤",
            },
          ];
        },
      );

    case "video_lesson":
      return activity.payload.video_url
        ? [
            {
              id: activity.id,
              type: "video",
              title,
              url: activity.payload.video_url,
            },
          ]
        : [];

    case "flashcard": {
      const cards = activity.payload.cards
        .map((card) => ({
          emoji: card.emoji ?? "🖼️",
          word: card.word_bn,
          imageUrl: card.image_url,
        }))
        .filter((card) => card.word.trim().length > 0);

      return cards.length
        ? [
            {
              id: activity.id,
              type: "flashcard",
              prompt: instruction || title,
              cards,
            },
          ]
        : [];
    }

    case "matching": {
      const hasUniversalSides = activity.payload.pairs.some((pair) =>
        Boolean(
          pair.left_text ||
            pair.right_text ||
            pair.left_image_url ||
            pair.right_image_url,
        ),
      );

      if (hasUniversalSides) {
        const pairs = activity.payload.pairs
          .map((pair, index) => ({
            id: pair.id || `${activity.id}-pair-${index + 1}`,
            leftText: (pair.left_text ?? pair.word_bn ?? "").trim() || undefined,
            rightText: (pair.right_text ?? "").trim() || undefined,
            leftImageUrl: pair.left_image_url || undefined,
            rightImageUrl: pair.right_image_url ?? pair.image_url ?? undefined,
            rightEmoji: pair.emoji || undefined,
          }))
          .filter((pair) =>
            Boolean(
              (pair.leftText || pair.leftImageUrl) &&
                (pair.rightText || pair.rightImageUrl || pair.rightEmoji),
            ),
          );

        return pairs.length
          ? [
              {
                id: activity.id,
                type: "universal_matching",
                prompt: instruction || title,
                pairs,
                maxAttempts: activity.payload.max_attempts,
              },
            ]
          : [];
      }

      const pairs = activity.payload.pairs
        .map((pair) => ({
          emoji: pair.emoji ?? "🖼️",
          word: pair.word_bn ?? pair.left_text ?? "",
        }))
        .filter((pair) => pair.word.trim().length > 0);

      return pairs.length
        ? [
            {
              id: activity.id,
              type: "matching",
              prompt: instruction || title,
              pairs,
              maxAttempts: activity.payload.max_attempts,
            },
          ]
        : [];
    }

    case "multiple_choice":
      return adaptQuizQuestions(
        chapter.quiz_questions,
        activity.id,
        activity.payload.max_attempts,
      );

    case "tap": {
      const items = activity.payload.items
        .map((item, index) => ({
          id: item.id || `${activity.id}-item-${index + 1}`,
          emoji: item.emoji ?? "🖼️",
          label: item.label_bn,
          description: item.description_bn ?? item.label_bn,
          imageUrl: item.image_url,
        }))
        .filter((item) => item.label.trim().length > 0);

      return items.length
        ? [
            {
              id: activity.id,
              type: "tap",
              prompt:
                activity.payload.prompt || instruction || title,
              items,
            },
          ]
        : [];
    }

    case "snippet": {
      const lines = activity.payload.lines.filter(
        (line) => line.trim().length > 0,
      );

      return lines.length
        ? [
            {
              id: activity.id,
              type: "snippet",
              title,
              imageEmoji: activity.payload.imageEmoji ?? "📖",
              lines,
            },
          ]
        : [];
    }

    case "letter":
      return [
        {
          id: activity.id,
          type: "letter",
          letter: activity.payload.letter,
          sound:
            activity.payload.sound ?? activity.payload.letter,
          examples: (activity.payload.examples ?? []).map(
            (item) => ({
              emoji: item.emoji ?? "🖼️",
              word: item.word_bn,
            }),
          ),
        },
      ];

    case "word_build":
      return [
        {
          id: activity.id,
          type: "word_build",
          prompt: instruction || title,
          letters: activity.payload.letters,
          answer: activity.payload.answer,
          maxAttempts: activity.payload.max_attempts,
        },
      ];

    case "picture_choice":
      return [
        {
          id: activity.id,
          type: "picture_choice",
          question: activity.payload.question,
          options: activity.payload.options.map((item) => ({
            emoji: item.emoji ?? "🖼️",
            label: item.label_bn,
            imageUrl: item.image_url,
          })),
          answer: activity.payload.answer,
          maxAttempts: activity.payload.max_attempts,
        },
      ];

    case "drag_game":
      return [
        {
          id: activity.id,
          type: "drag_game",
          prompt:
            activity.payload.prompt || instruction || title,
          items: activity.payload.items.map((item) => ({
            emoji: item.emoji ?? item.label_bn ?? "🖼️",
            target: item.target,
          })),
        },
      ];

    case "puzzle":
      return adaptPuzzle(activity.id, activity.payload, instruction || title);

    default:
      return [];
  }
}

function adaptPuzzle(
  activityId: string,
  payload: PuzzlePayload,
  fallbackPrompt: string,
): Activity[] {
  const prompt = payload.prompt || fallbackPrompt;

  switch (payload.mode) {
    case "missing_letter": {
      const options = payload.options ?? [];
      const answer = options.findIndex(
        (option) => option === payload.correct_answer,
      );

      if (options.length < 2 || answer < 0) return [];

      return [
        {
          id: activityId,
          type: "choice",
          prompt: [prompt, payload.pattern]
            .filter(Boolean)
            .join("\n"),
          options,
          answer,
          hint: payload.hint ?? "খালি জায়গার অক্ষরটি আবার দেখো।",
          maxAttempts: payload.max_attempts,
        },
      ];
    }

    case "word_order": {
      const words = payload.words ?? [];
      const correctOrder = payload.correct_order ?? [];

      if (!words.length || correctOrder.length !== words.length) {
        return [];
      }

      return [
        {
          id: activityId,
          type: "word_build",
          prompt,
          letters: words.map((word) => `${word} `),
          answer: correctOrder.map((word) => `${word} `).join(""),
          maxAttempts: payload.max_attempts,
        },
      ];
    }

    case "category_sort": {
      const categories = (payload.categories ?? [])
        .map((category) =>
          typeof category === "string"
            ? category
            : category.label_bn,
        )
        .map((value) => value.trim())
        .filter(Boolean);

      const items = (payload.items ?? [])
        .map((item, index) => ({
          id: item.id || `${activityId}-sort-${index + 1}`,
          label: (item.label ?? item.label_bn ?? "").trim(),
          emoji: item.emoji,
          imageUrl: item.image_url,
          target: (item.target ?? item.category ?? "").trim(),
        }))
        .filter((item) =>
          Boolean(item.target && (item.label || item.emoji || item.imageUrl)),
        );

      if (categories.length < 2 || items.length < 2) return [];

      return [
        {
          id: activityId,
          type: "universal_puzzle",
          mode: "category_sort",
          prompt,
          voiceText: payload.voice_text,
          hint: payload.hint,
          maxAttempts: payload.max_attempts,
          categories,
          items,
        },
      ];
    }

    case "numeric_answer":
    case "equation":
    case "missing_number":
    case "number_sequence":
    case "fill_blank":
    case "counting":
    case "ordering":
    case "true_false": {
      const words = payload.words ?? [];
      const correctOrder = payload.correct_order ?? [];

      if (
        payload.mode === "ordering" &&
        (!words.length || correctOrder.length !== words.length)
      ) {
        return [];
      }

      const categories = (payload.categories ?? [])
        .map((category) =>
          typeof category === "string"
            ? category
            : category.label_bn,
        )
        .filter(Boolean);

      return [
        {
          id: activityId,
          type: "universal_puzzle",
          mode: payload.mode,
          prompt,
          voiceText: payload.voice_text,
          hint: payload.hint,
          maxAttempts: payload.max_attempts,
          expression: payload.expression,
          pattern: payload.pattern,
          sequenceText: payload.sequence_text,
          statement: payload.statement,
          options: payload.options,
          correctAnswer: payload.correct_answer,
          acceptedAnswers: payload.accepted_answers,
          unit: payload.unit,
          words,
          correctOrder,
          orderingDirection: payload.ordering_direction,
          categories,
          countItem: payload.count_item
            ? {
                emoji: payload.count_item.emoji,
                imageUrl: payload.count_item.image_url,
                label: payload.count_item.label,
              }
            : undefined,
          quantity: payload.quantity,
        },
      ];
    }

    case "image_jigsaw":
      return [];
  }
}

function adaptQuizQuestions(
  questions: SupabaseQuizQuestion[],
  activityId: string,
  maxAttempts?: number,
): Activity[] {
  const linkedQuestions = questions.filter(
    (question) => question.activity_id === activityId,
  );

  return [...linkedQuestions]
    .sort((a, b) => a.order_index - b.order_index)
    .flatMap((question): Activity[] => {
      const options = [...question.quiz_options].sort(
        (a, b) => a.option_order - b.option_order,
      );
      const correctAnswer = options.findIndex(
        (option) => option.is_correct,
      );

      if (correctAnswer < 0 || options.length < 2) {
        return [];
      }

      return [
        {
          id: question.id,
          type: "quiz",
          question: question.question_bn,
          options: options.map(
            (option) =>
              option.label_bn ?? option.label_en ?? "",
          ),
          answer: correctAnswer,
          hint:
            question.explanation_bn ?? "আবার চেষ্টা করো।",
          maxAttempts,
        },
      ];
    });
}
