export type PublicationStatus =
  | "draft"
  | "published"
  | "archived";

export type SupabaseActivityType =
  | "story_snippet"
  | "image_lesson"
  | "audio_lesson"
  | "video_lesson"
  | "flashcard"
  | "matching"
  | "multiple_choice"
  | "tap"
  | "snippet"
  | "letter"
  | "word_build"
  | "picture_choice"
  | "drag_game"
  | "puzzle";

export type LessonActivityType = SupabaseActivityType;

export type BasePayload = {
  schema_version: number;
  reward_xp?: number;
  max_attempts?: number;
};

export type StorySnippetPayload = BasePayload & {
  kind: "guided_story";
  locale?: string;
  slides: Array<{
    id: string;
    emoji?: string;
    text?: string;
    text_bn?: string;
    speech?: string;
    speech_bn?: string;
    image_url?: string;
  }>;
};

export type ImageLessonPayload = BasePayload & {
  asset_key?: string;
  image_url?: string;
  page_start?: number;
  page_end?: number;
  allow_zoom?: boolean;
  source_label?: string;
  hotspots?: Array<{
    id: string;
    x: number;
    y: number;
    label_bn: string;
    speech_bn?: string;
  }>;
};

export type AudioLessonPayload = BasePayload & {
  mode: "listen" | "listen_repeat";
  audio_source: "device_tts" | "remote_url";
  locale?: string;
  items: Array<{
    id: string;
    text?: string;
    text_bn?: string;
    audio_url?: string;
    image_url?: string;
    emoji?: string;
  }>;
};

export type VideoLessonPayload = BasePayload & {
  video_url: string;
  poster_url?: string;
  captions_bn?: string;
  autoplay?: boolean;
};

export type FlashcardPayload = BasePayload & {
  audio_source?: "device_tts" | "remote_url";
  locale?: string;
  cards: Array<{
    id: string;
    text?: string;
    word_bn?: string;
    emoji?: string;
    image_url?: string;
    audio_url?: string;
    speech?: string;
    speech_bn?: string;
  }>;
};

export type MatchingPayload = BasePayload & {
  shuffle?: boolean;
  pairs: Array<{
    id: string;
    word_bn?: string;
    left_text?: string;
    right_text?: string;
    emoji?: string;
    image_url?: string;
    left_image_url?: string;
    right_image_url?: string;
    audio_url?: string;
  }>;
};

export type MultipleChoicePayload = BasePayload & {
  question_source: "quiz_questions";
  shuffle_questions?: boolean;
  pass_score_percent?: number;
};

export type SnippetPayload = BasePayload & {
  locale?: string;
  imageEmoji?: string;
  lines: string[];
};

export type TapPayload = BasePayload & {
  prompt: string;
  locale?: string;
  items: Array<{
    id: string;
    emoji?: string;
    label?: string;
    label_bn?: string;
    description?: string;
    description_bn?: string;
    image_url?: string;
  }>;
};

export type LetterPayload = BasePayload & {
  letter: string;
  sound?: string;
  locale?: string;
  examples?: Array<{
    id?: string;
    emoji?: string;
    word?: string;
    word_bn?: string;
    image_url?: string;
    audio_url?: string;
  }>;
};

export type WordBuildPayload = BasePayload & {
  locale?: string;
  letters: string[];
  answer: string;
};

export type PictureChoicePayload = BasePayload & {
  question: string;
  locale?: string;
  options: Array<{
    emoji?: string;
    label?: string;
    label_bn?: string;
    image_url?: string;
  }>;
  answer: number;
};

export type DragGamePayload = BasePayload & {
  prompt: string;
  locale?: string;
  items: Array<{
    id?: string;
    emoji?: string;
    label?: string;
    label_bn?: string;
    target: string;
    image_url?: string;
  }>;
};

export type PuzzleMode =
  | "missing_letter"
  | "word_order"
  | "category_sort"
  | "numeric_answer"
  | "equation"
  | "missing_number"
  | "number_sequence"
  | "fill_blank"
  | "counting"
  | "ordering"
  | "true_false"
  | "image_jigsaw";

export type PuzzleCategory = {
  id: string;
  label_bn: string;
};

export type PuzzleItem = {
  id: string;
  label_bn?: string;
  label?: string;
  emoji?: string;
  target?: string;
  category?: string;
  image_url?: string;
};

export type PuzzlePayload = BasePayload & {
  mode: PuzzleMode;
  locale?: string;
  prompt: string;
  voice_text?: string;
  hint?: string;

  // Missing Letter
  pattern?: string;
  options?: string[];
  correct_answer?: string;

  // Word Order
  words?: string[];
  correct_order?: string[];

  // Category Sort
  categories?: Array<PuzzleCategory | string>;
  items?: PuzzleItem[];

  // Universal answer modes
  expression?: string;
  statement?: string;
  sequence_text?: string;
  accepted_answers?: string[];
  unit?: string;
  ordering_direction?: "ascending" | "descending" | "custom";
  count_item?: {
    emoji?: string;
    image_url?: string;
    label?: string;
  };
  quantity?: number;

  // Reserved for the later jigsaw phase.
  image_url?: string;
  piece_count?: 4 | 6 | 9;
};

export type ActivityPayloadMap = {
  story_snippet: StorySnippetPayload;
  image_lesson: ImageLessonPayload;
  audio_lesson: AudioLessonPayload;
  video_lesson: VideoLessonPayload;
  flashcard: FlashcardPayload;
  matching: MatchingPayload;
  multiple_choice: MultipleChoicePayload;
  tap: TapPayload;
  snippet: SnippetPayload;
  letter: LetterPayload;
  word_build: WordBuildPayload;
  picture_choice: PictureChoicePayload;
  drag_game: DragGamePayload;
  puzzle: PuzzlePayload;
};

type LessonActivityBase = {
  id: string;
  chapter_id: string;
  order_index: number;
  title_bn: string | null;
  title_en: string | null;
  instruction_bn: string | null;
  instruction_en: string | null;
  status: PublicationStatus;
};

export type SupabaseLessonActivity = {
  [Type in LessonActivityType]: LessonActivityBase & {
    activity_type: Type;
    payload: ActivityPayloadMap[Type];
  };
}[LessonActivityType];

export type SupabaseQuizOption = {
  id: string;
  question_id: string;
  option_order: number;
  label_bn: string | null;
  label_en: string | null;
  image_url: string | null;
  is_correct: boolean;
};

export type SupabaseQuizQuestion = {
  id: string;
  chapter_id: string;
  activity_id: string | null;
  order_index: number;
  question_bn: string;
  question_en: string | null;
  explanation_bn: string | null;
  explanation_en: string | null;
  image_url: string | null;
  status: PublicationStatus;
  quiz_options: SupabaseQuizOption[];
};

export type SupabaseCurriculumChapter = {
  id: string;
  class_level: number;
  subject_id: string;
  chapter_number: number;
  title_bn: string;
  title_en: string | null;
  summary_bn: string | null;
  summary_en: string | null;
  cover_url: string | null;
  status: PublicationStatus;
  lesson_activities: SupabaseLessonActivity[];
  quiz_questions: SupabaseQuizQuestion[];
};
