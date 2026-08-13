import type { SupabaseActivityType } from "../../learning/types/supabaseCurriculum";

export type VisualField = {
  key: string;
  label: string;
  placeholder?: string;
  kind?: "text" | "number" | "boolean" | "choice";
  multiline?: boolean;
  choices?: Array<{ value: string; label: string }>;
};

export type VisualList = {
  key: string;
  title: string;
  addLabel: string;
  itemLabel: string;
  fields: VisualField[];
};

export type VisualPayloadSchema = {
  fields?: VisualField[];
  lists?: VisualList[];
};

export const payloadSchemas: Partial<
  Record<SupabaseActivityType, VisualPayloadSchema>
> = {
  story_snippet: {
    lists: [
      {
        key: "slides",
        title: "Story slides",
        addLabel: "Add slide",
        itemLabel: "Slide",
        fields: [
          { key: "emoji", label: "Emoji", placeholder: "👧" },
          { key: "text_bn", label: "Story text", multiline: true },
          { key: "speech_bn", label: "Mimi voice text", multiline: true },
          { key: "image_url", label: "Image link (optional)", placeholder: "https://..." },
        ],
      },
    ],
  },
  snippet: {
    fields: [{ key: "imageEmoji", label: "Activity emoji", placeholder: "📖" }],
  },
  letter: {
    fields: [
      { key: "letter", label: "Letter", placeholder: "আ" },
      { key: "sound", label: "Sound / pronunciation", placeholder: "আ" },
    ],
    lists: [
      {
        key: "examples",
        title: "Examples",
        addLabel: "Add example",
        itemLabel: "Example",
        fields: [
          { key: "word_bn", label: "Word", placeholder: "আম" },
          { key: "emoji", label: "Emoji", placeholder: "🥭" },
          { key: "image_url", label: "Image link (optional)" },
          { key: "audio_url", label: "Audio link (optional)" },
        ],
      },
    ],
  },
  tap: {
    fields: [{ key: "prompt", label: "Prompt", multiline: true }],
    lists: [
      {
        key: "items",
        title: "Tappable items",
        addLabel: "Add item",
        itemLabel: "Item",
        fields: [
          { key: "label_bn", label: "Label" },
          { key: "emoji", label: "Emoji" },
          { key: "description_bn", label: "Description / voice", multiline: true },
        ],
      },
    ],
  },
  word_build: {
    fields: [{ key: "answer", label: "Correct word", placeholder: "আম" }],
  },
  picture_choice: {
    fields: [{ key: "question", label: "Question", multiline: true }],
    lists: [
      {
        key: "options",
        title: "Picture options",
        addLabel: "Add option",
        itemLabel: "Option",
        fields: [
          { key: "label_bn", label: "Label" },
          { key: "emoji", label: "Emoji" },
          { key: "image_url", label: "Image link (optional)" },
        ],
      },
    ],
  },
  flashcard: {
    lists: [
      {
        key: "cards",
        title: "Flashcards",
        addLabel: "Add card",
        itemLabel: "Card",
        fields: [
          { key: "word_bn", label: "Word" },
          { key: "emoji", label: "Emoji" },
          { key: "speech_bn", label: "Mimi voice text" },
          { key: "image_url", label: "Image link (optional)" },
        ],
      },
    ],
  },
  matching: {
    lists: [
      {
        key: "pairs",
        title: "Matching pairs",
        addLabel: "Add pair",
        itemLabel: "Pair",
        fields: [
          { key: "word_bn", label: "Word" },
          { key: "emoji", label: "Matching emoji" },
          { key: "image_url", label: "Image link (optional)" },
        ],
      },
    ],
  },
  drag_game: {
    fields: [{ key: "prompt", label: "Prompt", multiline: true }],
    lists: [
      {
        key: "items",
        title: "Sorting items",
        addLabel: "Add item",
        itemLabel: "Item",
        fields: [
          { key: "label_bn", label: "Label" },
          { key: "emoji", label: "Emoji" },
          { key: "target", label: "Correct group" },
        ],
      },
    ],
  },
  audio_lesson: {
    fields: [
      {
        key: "mode",
        label: "Activity mode",
        kind: "choice",
        choices: [
          { value: "listen", label: "Listen" },
          { value: "listen_repeat", label: "Listen & repeat" },
        ],
      },
    ],
    lists: [
      {
        key: "items",
        title: "Audio lines",
        addLabel: "Add line",
        itemLabel: "Line",
        fields: [
          { key: "text_bn", label: "Text", multiline: true },
          { key: "emoji", label: "Emoji" },
          { key: "audio_url", label: "Audio link (optional)" },
          { key: "image_url", label: "Image link (optional)" },
        ],
      },
    ],
  },
  image_lesson: {
    fields: [
      { key: "image_url", label: "Image link" },
      { key: "source_label", label: "Source label", placeholder: "NCTB" },
      { key: "allow_zoom", label: "Allow zoom", kind: "boolean" },
    ],
  },
  video_lesson: {
    fields: [
      { key: "video_url", label: "Video link" },
      { key: "poster_url", label: "Poster image link (optional)" },
      { key: "captions_bn", label: "Bangla captions (optional)", multiline: true },
      { key: "autoplay", label: "Autoplay", kind: "boolean" },
    ],
  },
  multiple_choice: {
    fields: [
      { key: "pass_score_percent", label: "Pass score (%)", kind: "number" },
      { key: "shuffle_questions", label: "Shuffle questions", kind: "boolean" },
    ],
  },
};
