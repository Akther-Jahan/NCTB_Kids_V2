import type { SupabaseActivityType } from "../../learning/types/supabaseCurriculum";

export const teacherActivityTypes: SupabaseActivityType[] = [
  "story_snippet",
  "snippet",
  "letter",
  "tap",
  "word_build",
  "picture_choice",
  "flashcard",
  "matching",
  "drag_game",
  "audio_lesson",
  "image_lesson",
  "video_lesson",
  "multiple_choice",
  "puzzle",
];

export const activityLabel = (type: SupabaseActivityType) =>
  ({
    story_snippet: "Story",
    snippet: "Reading Lines",
    letter: "Letter Learning",
    tap: "Tap & Discover",
    word_build: "Word Builder",
    picture_choice: "Picture Choice",
    flashcard: "Flashcards",
    matching: "Matching",
    drag_game: "Category / Drag Game",
    audio_lesson: "Listen & Repeat",
    image_lesson: "Image Lesson",
    video_lesson: "Video Lesson",
    multiple_choice: "Quiz",
    puzzle: "Puzzle",
  })[type] ?? type.replace(/_/g, " ");

export function activityTemplate(
  type: SupabaseActivityType,
): Record<string, unknown> {
  const base = { schema_version: 1, reward_xp: 10 };

  switch (type) {
    case "story_snippet":
      return {
        ...base,
        kind: "guided_story",
        slides: [{ id: "slide-1", emoji: "📖", text_bn: "", speech_bn: "" }],
      };
    case "snippet":
      return { ...base, imageEmoji: "📖", lines: [""] };
    case "letter":
      return { ...base, letter: "", sound: "", examples: [] };
    case "tap":
      return { ...base, prompt: "", items: [] };
    case "word_build":
      return { ...base, letters: [""], answer: "" };
    case "picture_choice":
      return {
        ...base,
        question: "",
        options: [
          { id: "option-1", label_bn: "", emoji: "" },
          { id: "option-2", label_bn: "", emoji: "" },
        ],
        answer: 0,
      };
    case "flashcard":
      return { ...base, audio_source: "device_tts", locale: "bn-BD", cards: [] };
    case "matching":
      return { ...base, shuffle: true, pairs: [] };
    case "drag_game":
      return { ...base, prompt: "", items: [] };
    case "audio_lesson":
      return {
        ...base,
        mode: "listen_repeat",
        audio_source: "device_tts",
        locale: "bn-BD",
        items: [],
      };
    case "image_lesson":
      return { ...base, image_url: "", source_label: "NCTB", allow_zoom: true };
    case "video_lesson":
      return { ...base, video_url: "", poster_url: "", autoplay: false };
    case "multiple_choice":
      return {
        ...base,
        question_source: "quiz_questions",
        shuffle_questions: false,
        pass_score_percent: 60,
      };
    case "puzzle":
      return {
        ...base,
        mode: "missing_letter",
        prompt: "",
        voice_text: "",
        hint: "",
        pattern: "",
        options: ["", ""],
        correct_answer: "",
      };
    default:
      return base;
  }
}
