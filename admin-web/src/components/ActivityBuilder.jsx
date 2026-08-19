import React, { useEffect, useMemo, useState } from "react";
import { adminService } from "../services/adminService.js";
import FileUpload from "./FileUpload.jsx";

const TYPES = [
  ["story_snippet", "Story / Guided Lesson"],
  ["letter", "Letter / Symbol"],
  ["snippet", "Reading / Explanation"],
  ["word_build", "Word Builder"],
  ["picture_choice", "Picture Choice"],
  ["flashcard", "Flashcards"],
  ["matching", "Matching"],
  ["tap", "Tap & Learn"],
  ["drag_game", "Drag / Sort"],
  ["audio_lesson", "Listen & Repeat"],
  ["image_lesson", "Image Lesson"],
  ["video_lesson", "Video Lesson"],
  ["multiple_choice", "Quiz"],
  ["puzzle", "Interactive Puzzle"],
];

const PUZZLE_MODES = [
  ["missing_letter", "Missing Letter"],
  ["word_order", "Word / Tile Order"],
  ["category_sort", "Category Sort"],
  ["numeric_answer", "Numeric Answer"],
  ["equation", "Equation / Calculation"],
  ["missing_number", "Missing Number"],
  ["number_sequence", "Number Sequence"],
  ["fill_blank", "Fill in the Blank"],
  ["counting", "Counting"],
  ["ordering", "Ordering"],
  ["true_false", "True / False"],
];

const ATTEMPT_ACTIVITY_TYPES = new Set([
  "word_build",
  "picture_choice",
  "matching",
  "multiple_choice",
  "puzzle",
]);

const VOICE_ACTIVITY_TYPES = new Set([
  "story_snippet",
  "letter",
  "snippet",
  "word_build",
  "picture_choice",
  "flashcard",
  "matching",
  "tap",
  "drag_game",
  "audio_lesson",
  "multiple_choice",
  "puzzle",
]);

function usesAttemptPolicy(type) {
  return ATTEMPT_ACTIVITY_TYPES.has(type);
}

function usesVoiceLocale(type) {
  return VOICE_ACTIVITY_TYPES.has(type);
}

const SUBJECT_NAMES = {
  bangla: "Bangla",
  english: "English",
  math: "Mathematics",
};

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function localeForSubject(subjectId) {
  return subjectId === "english" ? "en-US" : "bn-BD";
}

function normalizeCsv(value) {
  return String(value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function template(type, subjectId = "bangla") {
  const base = {
    schema_version: 1,
    content_engine: "universal_v1",
    reward_xp: 10,
    max_attempts: 3,
    locale: localeForSubject(subjectId),
  };

  switch (type) {
    case "story_snippet":
      return {
        ...base,
        kind: "guided_story",
        slides: [{ id: uid("slide"), emoji: "📖", text: "", text_bn: "", speech: "", speech_bn: "", image_url: "" }],
      };
    case "letter":
      return {
        ...base,
        letter: "",
        sound: "",
        examples: [{ id: uid("example"), emoji: "", word: "", word_bn: "", image_url: "" }],
      };
    case "snippet":
      return { ...base, imageEmoji: "📖", lines: [""] };
    case "word_build":
      return { ...base, letters: ["", ""], answer: "" };
    case "picture_choice":
      return {
        ...base,
        question: "",
        options: [
          { id: uid("choice"), emoji: "", label: "", label_bn: "", image_url: "" },
          { id: uid("choice"), emoji: "", label: "", label_bn: "", image_url: "" },
        ],
        answer: 0,
      };
    case "flashcard":
      return {
        ...base,
        audio_source: "device_tts",
        locale: localeForSubject(subjectId),
        cards: [{ id: uid("card"), text: "", word_bn: "", emoji: "", speech: "", speech_bn: "", image_url: "" }],
      };
    case "matching":
      return {
        ...base,
        shuffle: true,
        pairs: [
          { id: uid("pair"), left_text: "", right_text: "", word_bn: "", emoji: "", image_url: "", left_image_url: "", right_image_url: "" },
          { id: uid("pair"), left_text: "", right_text: "", word_bn: "", emoji: "", image_url: "", left_image_url: "", right_image_url: "" },
        ],
      };
    case "tap":
      return {
        ...base,
        prompt: "",
        items: [{ id: uid("item"), emoji: "", label: "", label_bn: "", description: "", description_bn: "", image_url: "" }],
      };
    case "drag_game":
      return {
        ...base,
        prompt: "",
        items: [
          { id: uid("drag"), emoji: "", label: "", label_bn: "", target: "", image_url: "" },
          { id: uid("drag"), emoji: "", label: "", label_bn: "", target: "", image_url: "" },
        ],
      };
    case "audio_lesson":
      return {
        ...base,
        mode: "listen_repeat",
        audio_source: "device_tts",
        locale: localeForSubject(subjectId),
        items: [{ id: uid("audio"), text: "", text_bn: "", emoji: "", image_url: "" }],
      };
    case "image_lesson":
      return { ...base, image_url: "", allow_zoom: true, source_label: "NCTB" };
    case "video_lesson":
      return { ...base, video_url: "", autoplay: false };
    case "multiple_choice":
      return { ...base, question_source: "quiz_questions", shuffle_questions: false, pass_score_percent: 60 };
    case "puzzle":
      return {
        ...base,
        mode: subjectId === "math" ? "equation" : "missing_letter",
        prompt: "",
        voice_text: "",
        hint: "",
        pattern: "",
        expression: "",
        statement: "",
        sequence_text: "",
        options: ["", ""],
        correct_answer: "",
        accepted_answers: [],
        unit: "",
        words: ["", ""],
        correct_order: ["", ""],
        ordering_direction: "ascending",
        categories: ["", ""],
        items: [
          { id: uid("sort"), emoji: "", label: "", label_bn: "", target: "", category: "", image_url: "" },
          { id: uid("sort"), emoji: "", label: "", label_bn: "", target: "", category: "", image_url: "" },
        ],
        count_item: { emoji: "⭐", image_url: "", label: "" },
        quantity: 5,
      };
    default:
      return base;
  }
}

function makeForm(order = 1, subjectId = "bangla") {
  const defaultType = subjectId === "math" ? "puzzle" : "story_snippet";
  return {
    id: undefined,
    orderIndex: order,
    activityType: defaultType,
    titleBn: "",
    instructionBn: "",
    status: "draft",
    payload: template(defaultType, subjectId),
  };
}

function quickTemplates(subjectId) {
  if (subjectId === "math") {
    return [
      { key: "addition", label: "➕ Addition", type: "puzzle", mode: "equation" },
      { key: "missing_number", label: "🔢 Missing Number", type: "puzzle", mode: "missing_number" },
      { key: "sequence", label: "➡️ Number Sequence", type: "puzzle", mode: "number_sequence" },
      { key: "counting", label: "⭐ Counting", type: "puzzle", mode: "counting" },
      { key: "ordering", label: "↕️ Number Ordering", type: "puzzle", mode: "ordering" },
      { key: "even_odd", label: "🧺 Even / Odd Sort", type: "puzzle", mode: "category_sort" },
      { key: "picture", label: "🖼️ Picture Choice", type: "picture_choice" },
      { key: "quiz", label: "✅ Quiz", type: "multiple_choice" },
    ];
  }

  if (subjectId === "english") {
    return [
      { key: "listen", label: "🔊 Listen & Repeat", type: "audio_lesson" },
      { key: "flashcards", label: "🃏 Vocabulary", type: "flashcard" },
      { key: "word_build", label: "🔤 Word Builder", type: "word_build" },
      { key: "missing_letter", label: "✏️ Missing Letter", type: "puzzle", mode: "missing_letter" },
      { key: "word_order", label: "↔️ Word Order", type: "puzzle", mode: "word_order" },
      { key: "matching", label: "🔗 Matching", type: "matching" },
      { key: "picture", label: "🖼️ Picture Choice", type: "picture_choice" },
      { key: "quiz", label: "✅ Quiz", type: "multiple_choice" },
    ];
  }

  return [
    { key: "listen", label: "🔊 Listen & Repeat", type: "audio_lesson" },
    { key: "flashcards", label: "🃏 Flashcards", type: "flashcard" },
    { key: "word_build", label: "🔤 Word Builder", type: "word_build" },
    { key: "missing_letter", label: "✏️ Missing Letter", type: "puzzle", mode: "missing_letter" },
    { key: "word_order", label: "↔️ Word Order", type: "puzzle", mode: "word_order" },
    { key: "category_sort", label: "🧺 Category Sort", type: "puzzle", mode: "category_sort" },
    { key: "matching", label: "🔗 Matching", type: "matching" },
    { key: "quiz", label: "✅ Quiz", type: "multiple_choice" },
  ];
}

function buildQuickTemplate(subjectId, key, type, mode) {
  const payload = template(type, subjectId);
  let titleBn = "";
  let instructionBn = "";

  if (subjectId === "math") {
    if (key === "addition") {
      titleBn = "Addition Practice";
      instructionBn = "Solve the equation.";
      return { type, titleBn, instructionBn, payload: { ...payload, mode, prompt: "Solve the equation.", expression: "2 + 3 = ?", correct_answer: "5" } };
    }
    if (key === "missing_number") {
      titleBn = "Missing Number";
      instructionBn = "Find the missing number.";
      return { type, titleBn, instructionBn, payload: { ...payload, mode, prompt: "Find the missing number.", pattern: "2, 4, __, 8", correct_answer: "6", options: ["5", "6", "7"] } };
    }
    if (key === "sequence") {
      titleBn = "Number Sequence";
      instructionBn = "Complete the number sequence.";
      return { type, titleBn, instructionBn, payload: { ...payload, mode, prompt: "Complete the sequence.", sequence_text: "1, 2, 3, __, 5", correct_answer: "4" } };
    }
    if (key === "counting") {
      titleBn = "Counting Practice";
      instructionBn = "Count the objects and write the answer.";
      return { type, titleBn, instructionBn, payload: { ...payload, mode, prompt: "How many stars are there?", quantity: 5, correct_answer: "5", count_item: { emoji: "⭐", image_url: "", label: "star" } } };
    }
    if (key === "ordering") {
      titleBn = "Number Ordering";
      instructionBn = "Arrange the numbers from smallest to largest.";
      return { type, titleBn, instructionBn, payload: { ...payload, mode, prompt: "Arrange from smallest to largest.", words: ["7", "2", "5", "1"], correct_order: ["1", "2", "5", "7"], ordering_direction: "ascending" } };
    }
    if (key === "even_odd") {
      titleBn = "Even and Odd Numbers";
      instructionBn = "Sort each number into the correct group.";
      return {
        type,
        titleBn,
        instructionBn,
        payload: {
          ...payload,
          mode,
          prompt: "Sort the numbers into Even and Odd groups.",
          categories: ["Even Numbers", "Odd Numbers"],
          items: [
            { id: uid("sort"), emoji: "", label: "2", label_bn: "2", target: "Even Numbers", category: "Even Numbers", image_url: "" },
            { id: uid("sort"), emoji: "", label: "3", label_bn: "3", target: "Odd Numbers", category: "Odd Numbers", image_url: "" },
          ],
        },
      };
    }
    if (key === "picture") {
      titleBn = "Choose the Correct Answer";
      instructionBn = "Look at the picture and choose the correct answer.";
    }
    if (key === "quiz") {
      titleBn = "Math Quiz";
      instructionBn = "Choose the correct answer.";
    }
  } else if (subjectId === "english") {
    if (key === "listen") {
      titleBn = "Listen and Repeat";
      instructionBn = "Listen carefully and repeat each sentence.";
    }
    if (key === "flashcards") {
      titleBn = "Learn the Words";
      instructionBn = "Tap each card and say the word aloud.";
    }
    if (key === "word_build") {
      titleBn = "Build the Word";
      instructionBn = "Arrange the letters to make the correct word.";
    }
    if (key === "missing_letter") {
      titleBn = "Missing Letter";
      instructionBn = "Choose the missing letter.";
      return { type, titleBn, instructionBn, payload: { ...payload, mode, prompt: "Choose the missing letter.", pattern: "c_t", options: ["a", "e", "o"], correct_answer: "a" } };
    }
    if (key === "word_order") {
      titleBn = "Make a Sentence";
      instructionBn = "Arrange the words in the correct order.";
      return { type, titleBn, instructionBn, payload: { ...payload, mode, prompt: "Arrange the words.", words: ["I", "am", "fine"], correct_order: ["I", "am", "fine"] } };
    }
    if (key === "matching") {
      titleBn = "Match the Words";
      instructionBn = "Match each item with the correct pair.";
    }
    if (key === "picture") {
      titleBn = "Picture Choice";
      instructionBn = "Look at the picture and choose the correct answer.";
    }
    if (key === "quiz") {
      titleBn = "Quick Quiz";
      instructionBn = "Choose the correct answer.";
    }
  } else {
    if (key === "listen") {
      titleBn = "শুনে বলি";
      instructionBn = "শুনে শুদ্ধভাবে বলো।";
    }
    if (key === "flashcards") {
      titleBn = "শব্দ শিখি";
      instructionBn = "কার্ডে চাপ দিয়ে শব্দটি বলো।";
    }
    if (key === "word_build") {
      titleBn = "শব্দ গঠন";
      instructionBn = "বর্ণ সাজিয়ে সঠিক শব্দ তৈরি করো।";
    }
    if (key === "missing_letter") {
      titleBn = "শূন্যস্থান পূরণ";
      instructionBn = "সঠিক বর্ণটি বেছে নাও।";
      return { type, titleBn, instructionBn, payload: { ...payload, mode, prompt: "সঠিক বর্ণটি বেছে নাও।", pattern: "আ_", options: ["ম", "ন", "ল"], correct_answer: "ম" } };
    }
    if (key === "word_order") {
      titleBn = "শব্দ সাজাই";
      instructionBn = "শব্দগুলো সঠিক ক্রমে সাজাও।";
      return { type, titleBn, instructionBn, payload: { ...payload, mode, prompt: "শব্দগুলো সাজাও।", words: ["আমি", "ভালো", "আছি"], correct_order: ["আমি", "ভালো", "আছি"] } };
    }
    if (key === "category_sort") {
      titleBn = "দলে সাজাই";
      instructionBn = "প্রতিটি জিনিস সঠিক দলে রাখো।";
      return {
        type,
        titleBn,
        instructionBn,
        payload: {
          ...payload,
          mode,
          prompt: "সঠিক দলে সাজাও।",
          categories: ["ফল", "প্রাণী"],
          items: [
            { id: uid("sort"), emoji: "🥭", label: "আম", label_bn: "আম", target: "ফল", category: "ফল", image_url: "" },
            { id: uid("sort"), emoji: "🐄", label: "গরু", label_bn: "গরু", target: "প্রাণী", category: "প্রাণী", image_url: "" },
          ],
        },
      };
    }
    if (key === "matching") {
      titleBn = "মিল করি";
      instructionBn = "সঠিক জোড়া মিলাও।";
    }
    if (key === "quiz") {
      titleBn = "ঝটপট কুইজ";
      instructionBn = "সঠিক উত্তরটি বেছে নাও।";
    }
  }

  return { type, titleBn, instructionBn, payload };
}

function ListEditor({ items, setItems, renderItem, createItem, addLabel = "Add item", min = 1, max = 12 }) {
  return (
    <div className="list-editor">
      {items.map((item, index) => (
        <div key={item?.id ?? `${index}-${String(item)}`} className="sub-card">
          <div className="sub-card-head">
            <strong>#{index + 1}</strong>
            <button
              type="button"
              className="text-danger"
              disabled={items.length <= min}
              onClick={() => setItems(items.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          {renderItem(item, index, (next) =>
            setItems(items.map((current, i) => (i === index ? next : current))),
          )}
        </div>
      ))}
      <button
        type="button"
        className="secondary-btn"
        disabled={items.length >= max}
        onClick={() => setItems([...items, createItem()])}
      >
        ＋ {addLabel}
      </button>
    </div>
  );
}

function categoryLabel(category) {
  if (typeof category === "string") return category;
  return category?.label_bn ?? category?.label ?? category?.name ?? "";
}

function normalizedCategories(payload) {
  const values = Array.isArray(payload?.categories) ? payload.categories.map(categoryLabel) : [];
  return values.length >= 2 ? values : ["", ""];
}

function normalizedSortItems(payload) {
  const values = Array.isArray(payload?.items) ? payload.items : [];
  if (values.length >= 2) return values;
  return [
    { id: uid("sort"), emoji: "", label: "", label_bn: "", target: "", category: "", image_url: "" },
    { id: uid("sort"), emoji: "", label: "", label_bn: "", target: "", category: "", image_url: "" },
  ];
}

function normalizePair(pair) {
  return {
    ...pair,
    left_text: pair?.left_text ?? pair?.word_bn ?? "",
    right_text: pair?.right_text ?? "",
    word_bn: pair?.word_bn ?? pair?.left_text ?? "",
    left_image_url: pair?.left_image_url ?? "",
    right_image_url: pair?.right_image_url ?? pair?.image_url ?? "",
    image_url: pair?.image_url ?? pair?.right_image_url ?? "",
    emoji: pair?.emoji ?? "",
  };
}

function sameItems(a, b) {
  const left = [...a].map(String).sort();
  const right = [...b].map(String).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validatePuzzlePayload(payload) {
  const mode = payload?.mode ?? "missing_letter";
  const correct = String(payload?.correct_answer ?? "").trim();

  if (mode === "missing_letter") {
    const pattern = String(payload?.pattern ?? "").trim();
    const options = (Array.isArray(payload?.options) ? payload.options : []).map((x) => String(x ?? "").trim()).filter(Boolean);
    if (!pattern) return "Missing Letter: add the word/pattern before publishing.";
    if (!correct) return "Missing Letter: add the correct answer before publishing.";
    if (options.length < 2) return "Missing Letter: add at least 2 answer options.";
    if (!options.includes(correct)) return "Missing Letter: the correct answer must also be one of the options.";
    return "";
  }

  if (mode === "word_order" || mode === "ordering") {
    const words = (Array.isArray(payload?.words) ? payload.words : []).map((x) => String(x ?? "").trim()).filter(Boolean);
    const correctOrder = (Array.isArray(payload?.correct_order) ? payload.correct_order : []).map((x) => String(x ?? "").trim()).filter(Boolean);
    const label = mode === "ordering" ? "Ordering" : "Word Order";
    if (words.length < 2) return `${label}: add at least 2 tiles.`;
    if (correctOrder.length !== words.length) return `${label}: Correct order must contain the same number of items.`;
    if (!sameItems(words, correctOrder)) return `${label}: Correct order must use the same items as the tiles.`;
    return "";
  }

  if (mode === "category_sort") {
    const categories = normalizedCategories(payload).map((value) => value.trim()).filter(Boolean);
    const uniqueCategories = new Set(categories.map((value) => value.toLowerCase()));
    const items = normalizedSortItems(payload);
    if (categories.length < 2) return "Category Sort: add at least 2 categories.";
    if (uniqueCategories.size !== categories.length) return "Category Sort: category names must be unique.";
    if (items.length < 2) return "Category Sort: add at least 2 sortable items.";
    for (const [index, item] of items.entries()) {
      const label = String(item?.label ?? item?.label_bn ?? "").trim();
      const target = String(item?.target ?? item?.category ?? "").trim();
      if (!label && !item?.image_url && !item?.emoji) return `Category Sort: Item ${index + 1} needs text, emoji, or image.`;
      if (!target) return `Category Sort: choose a target category for Item ${index + 1}.`;
      if (!categories.includes(target)) return `Category Sort: Item ${index + 1} points to a category that no longer exists.`;
    }
    return "";
  }

  if (mode === "numeric_answer") {
    if (!String(payload?.prompt ?? "").trim()) return "Numeric Answer: add the question.";
    if (!correct) return "Numeric Answer: add the correct number.";
    if (!Number.isFinite(Number(correct))) return "Numeric Answer: the correct answer must be a number.";
    return "";
  }

  if (mode === "equation") {
    if (!String(payload?.expression ?? "").trim()) return "Equation: add the math expression.";
    if (!correct) return "Equation: add the correct answer.";
    return "";
  }

  if (mode === "missing_number") {
    if (!String(payload?.pattern ?? "").trim()) return "Missing Number: add the number pattern.";
    if (!correct) return "Missing Number: add the correct answer.";
    return "";
  }

  if (mode === "number_sequence") {
    if (!String(payload?.sequence_text ?? "").trim()) return "Number Sequence: add the sequence.";
    if (!correct) return "Number Sequence: add the missing/next number.";
    return "";
  }

  if (mode === "fill_blank") {
    if (!String(payload?.pattern ?? "").trim()) return "Fill in the Blank: add the sentence or expression with a blank.";
    if (!correct) return "Fill in the Blank: add the correct answer.";
    return "";
  }

  if (mode === "counting") {
    const quantity = Number(payload?.quantity ?? 0);
    if (!String(payload?.prompt ?? "").trim()) return "Counting: add the question.";
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) return "Counting: quantity must be between 1 and 50.";
    if (!correct) return "Counting: add the correct answer.";
    return "";
  }

  if (mode === "true_false") {
    if (!String(payload?.statement ?? "").trim()) return "True / False: add the statement.";
    if (payload?.correct_answer !== "true" && payload?.correct_answer !== "false") return "True / False: choose the correct answer.";
    return "";
  }

  return "Unknown puzzle mode.";
}

function validateActivityForPublish(activityType, payload, title) {
  if (!String(title ?? "").trim()) return "Add an activity title before publishing.";
  if (activityType === "puzzle") return validatePuzzlePayload(payload);

  if (activityType === "story_snippet") {
    const slides = Array.isArray(payload?.slides) ? payload.slides : [];
    const usableSlides = slides.filter((slide) =>
      Boolean(
        String(slide?.text ?? slide?.text_bn ?? "").trim() ||
          String(slide?.speech ?? slide?.speech_bn ?? "").trim() ||
          String(slide?.image_url ?? "").trim(),
      ),
    );
    if (!usableSlides.length) return "Story / Guided Lesson: add at least one slide with text, voice text, or an image.";
  }

  if (activityType === "letter") {
    if (!String(payload?.letter ?? "").trim()) return "Letter / Symbol: add the letter or symbol before publishing.";
  }

  if (activityType === "snippet") {
    const lines = Array.isArray(payload?.lines) ? payload.lines : [];
    if (!lines.some((line) => String(line ?? "").trim())) return "Reading / Explanation: add at least one line.";
  }

  if (activityType === "word_build") {
    const letters = (Array.isArray(payload?.letters) ? payload.letters : [])
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    if (!String(payload?.answer ?? "").trim()) return "Word Builder: add the correct word / answer.";
    if (letters.length < 2) return "Word Builder: add at least 2 letter or character tiles.";
  }

  if (activityType === "picture_choice") {
    const options = Array.isArray(payload?.options) ? payload.options : [];
    if (!String(payload?.question ?? "").trim()) return "Picture Choice: add the question.";
    if (options.length < 2) return "Picture Choice: add at least 2 options.";
    if (options.some((item) => !String(item?.label ?? item?.label_bn ?? "").trim() && !item?.image_url && !item?.emoji)) {
      return "Picture Choice: every option needs text, emoji, or image.";
    }
    const answer = Number(payload?.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return "Picture Choice: choose a valid correct answer.";
  }

  if (activityType === "audio_lesson") {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!items.some((item) => String(item?.text ?? item?.text_bn ?? "").trim())) return "Listen & Repeat: add at least one sentence.";
  }

  if (activityType === "flashcard") {
    const cards = Array.isArray(payload?.cards) ? payload.cards : [];
    if (!cards.some((card) => String(card?.text ?? card?.word_bn ?? "").trim() || card?.image_url || card?.emoji)) return "Flashcards: add at least one card.";
  }

  if (activityType === "matching") {
    const pairs = Array.isArray(payload?.pairs) ? payload.pairs : [];
    if (pairs.length < 2) return "Matching: add at least 2 pairs.";
    for (const [index, pair] of pairs.entries()) {
      const leftReady = Boolean(String(pair?.left_text ?? pair?.word_bn ?? "").trim() || pair?.left_image_url);
      const rightReady = Boolean(String(pair?.right_text ?? "").trim() || pair?.right_image_url || pair?.image_url || pair?.emoji);
      if (!leftReady || !rightReady) return `Matching: Pair ${index + 1} needs content on both the left and right side.`;
    }
  }

  if (activityType === "tap") {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!String(payload?.prompt ?? "").trim()) return "Tap & Learn: add the prompt.";
    if (!items.length) return "Tap & Learn: add at least one tappable item.";
    if (items.some((item) => !String(item?.label ?? item?.label_bn ?? "").trim() && !item?.image_url && !item?.emoji)) {
      return "Tap & Learn: every item needs text, emoji, or image.";
    }
  }

  if (activityType === "drag_game") {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!String(payload?.prompt ?? "").trim()) return "Drag / Sort: add the prompt.";
    if (items.length < 2) return "Drag / Sort: add at least 2 items.";
    for (const [index, item] of items.entries()) {
      const visual = String(item?.label ?? item?.label_bn ?? "").trim() || item?.image_url || item?.emoji;
      if (!visual) return `Drag / Sort: Item ${index + 1} needs text, emoji, or image.`;
      if (!String(item?.target ?? "").trim()) return `Drag / Sort: Item ${index + 1} needs a target / group.`;
    }
  }

  if (activityType === "image_lesson" && !String(payload?.image_url ?? "").trim()) {
    return "Image Lesson: upload or add an image before publishing.";
  }

  if (activityType === "video_lesson" && !String(payload?.video_url ?? "").trim()) {
    return "Video Lesson: add the video URL before publishing.";
  }

  return "";
}

function TextListEditor({ values, onChange, label, placeholder = "Item", min = 2, max = 20 }) {
  const items = values?.length ? values : Array.from({ length: min }, () => "");
  return (
    <div>
      <h4>{label}</h4>
      <ListEditor
        items={items}
        setItems={onChange}
        createItem={() => ""}
        min={min}
        max={max}
        addLabel={`Add ${placeholder.toLowerCase()}`}
        renderItem={(value, index, update) => (
          <label>
            {placeholder} {index + 1}
            <input value={value ?? ""} onChange={(e) => update(e.target.value)} />
          </label>
        )}
      />
    </div>
  );
}

function PuzzleFields({ payload, onChange }) {
  const set = (key, value) => onChange({ ...payload, [key]: value });
  const categories = normalizedCategories(payload);
  const sortItems = normalizedSortItems(payload);

  function changeMode(nextMode) {
    const defaults = template("puzzle");
    const next = { ...defaults, ...payload, mode: nextMode };
    if (nextMode === "category_sort") {
      next.categories = normalizedCategories(next);
      next.items = normalizedSortItems(next);
    }
    if (nextMode === "word_order" || nextMode === "ordering") {
      if (!Array.isArray(next.words) || next.words.length < 2) next.words = ["", ""];
      if (!Array.isArray(next.correct_order) || next.correct_order.length < 2) next.correct_order = ["", ""];
    }
    if (nextMode === "counting" && !next.correct_answer) {
      next.correct_answer = String(next.quantity || 5);
    }
    onChange(next);
  }

  function setCategories(nextCategories) {
    const allowed = nextCategories.map((value) => String(value ?? "").trim()).filter(Boolean);
    const nextItems = sortItems.map((item) => {
      const target = String(item?.target ?? item?.category ?? "");
      return allowed.includes(target) ? item : { ...item, target: "", category: "" };
    });
    onChange({ ...payload, categories: nextCategories, items: nextItems });
  }

  return (
    <>
      <div className="grid-2">
        <label>
          Puzzle / interaction type
          <select value={payload.mode ?? "missing_letter"} onChange={(e) => changeMode(e.target.value)}>
            {PUZZLE_MODES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>
          Student prompt
          <input value={payload.prompt ?? ""} placeholder="What should the student do?" onChange={(e) => set("prompt", e.target.value)} />
        </label>
        <label>
          Voice text <span className="optional">(optional)</span>
          <input value={payload.voice_text ?? ""} onChange={(e) => set("voice_text", e.target.value)} />
        </label>
        <label>
          Hint <span className="optional">(optional)</span>
          <input value={payload.hint ?? ""} onChange={(e) => set("hint", e.target.value)} />
        </label>
      </div>

      {payload.mode === "missing_letter" ? (
        <div className="grid-2">
          <label>Word / pattern<input value={payload.pattern ?? ""} placeholder="c_t or আ_" onChange={(e) => set("pattern", e.target.value)} /></label>
          <label>Correct answer<input value={payload.correct_answer ?? ""} onChange={(e) => set("correct_answer", e.target.value)} /></label>
          <label className="span-2">Answer options (comma separated)<input value={(payload.options ?? []).join(", ")} onChange={(e) => set("options", normalizeCsv(e.target.value))} /></label>
        </div>
      ) : null}

      {payload.mode === "word_order" ? (
        <div className="grid-2">
          <label>Word / tiles (comma separated)<input value={(payload.words ?? []).join(", ")} onChange={(e) => set("words", normalizeCsv(e.target.value))} /></label>
          <label>Correct order (comma separated)<input value={(payload.correct_order ?? []).join(", ")} onChange={(e) => set("correct_order", normalizeCsv(e.target.value))} /></label>
        </div>
      ) : null}

      {payload.mode === "category_sort" ? (
        <>
          <div className="sub-card">
            <div className="sub-card-head">
              <strong>Categories</strong>
              <span className="muted">These are the groups students will sort into.</span>
            </div>
            <ListEditor
              items={categories}
              setItems={setCategories}
              createItem={() => ""}
              min={2}
              max={6}
              addLabel="Add category"
              renderItem={(category, index) => (
                <label>
                  Category {index + 1}
                  <input
                    value={category}
                    placeholder={index === 0 ? "Group 1" : index === 1 ? "Group 2" : "Category name"}
                    onChange={(e) => {
                      const oldValue = category;
                      const nextValue = e.target.value;
                      const nextCategories = categories.map((value, i) => (i === index ? nextValue : value));
                      const nextItems = sortItems.map((item) => {
                        const target = String(item?.target ?? item?.category ?? "");
                        return target === oldValue ? { ...item, target: nextValue, category: nextValue } : item;
                      });
                      onChange({ ...payload, categories: nextCategories, items: nextItems });
                    }}
                  />
                </label>
              )}
            />
          </div>

          <div className="sub-card">
            <div className="sub-card-head">
              <strong>Sortable items</strong>
              <span className="muted">Text, number, emoji, or image can be used.</span>
            </div>
            <ListEditor
              items={sortItems}
              setItems={(items) => set("items", items)}
              createItem={() => ({ id: uid("sort"), emoji: "", label: "", label_bn: "", target: "", category: "", image_url: "" })}
              min={2}
              max={20}
              addLabel="Add sortable item"
              renderItem={(item, _, update) => {
                const label = item?.label ?? item?.label_bn ?? "";
                const target = item?.target ?? item?.category ?? "";
                return (
                  <div className="grid-3">
                    <label>Text / number<input value={label} placeholder="Mango or 12" onChange={(e) => update({ ...item, label: e.target.value, label_bn: e.target.value })} /></label>
                    <label>Emoji <span className="optional">(optional)</span><input value={item?.emoji ?? ""} onChange={(e) => update({ ...item, emoji: e.target.value })} /></label>
                    <label>Correct category<select value={target} onChange={(e) => update({ ...item, target: e.target.value, category: e.target.value })}><option value="">Select category</option>{categories.map((value) => String(value ?? "").trim()).filter(Boolean).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                    <div className="span-2"><FileUpload value={item?.image_url ?? ""} onChange={(image_url) => update({ ...item, image_url })} label="Item image (optional)" /></div>
                  </div>
                );
              }}
            />
          </div>
        </>
      ) : null}

      {payload.mode === "numeric_answer" ? (
        <div className="grid-2">
          <label>Question<input value={payload.prompt ?? ""} placeholder="How many are left?" onChange={(e) => set("prompt", e.target.value)} /></label>
          <label>Correct number<input type="number" value={payload.correct_answer ?? ""} onChange={(e) => set("correct_answer", e.target.value)} /></label>
          <label>Unit <span className="optional">(optional)</span><input value={payload.unit ?? ""} placeholder="cm, kg, taka..." onChange={(e) => set("unit", e.target.value)} /></label>
          <label>Other accepted answers <span className="optional">(comma separated)</span><input value={(payload.accepted_answers ?? []).join(", ")} onChange={(e) => set("accepted_answers", normalizeCsv(e.target.value))} /></label>
        </div>
      ) : null}

      {payload.mode === "equation" ? (
        <div className="grid-2">
          <label className="span-2">Math expression<input value={payload.expression ?? ""} placeholder="7 + 5 = ?" onChange={(e) => set("expression", e.target.value)} /></label>
          <label>Correct answer<input value={payload.correct_answer ?? ""} placeholder="12" onChange={(e) => set("correct_answer", e.target.value)} /></label>
          <label>Other accepted answers <span className="optional">(optional)</span><input value={(payload.accepted_answers ?? []).join(", ")} onChange={(e) => set("accepted_answers", normalizeCsv(e.target.value))} /></label>
        </div>
      ) : null}

      {payload.mode === "missing_number" ? (
        <div className="grid-2">
          <label>Number pattern<input value={payload.pattern ?? ""} placeholder="2, 4, __, 8" onChange={(e) => set("pattern", e.target.value)} /></label>
          <label>Correct answer<input value={payload.correct_answer ?? ""} placeholder="6" onChange={(e) => set("correct_answer", e.target.value)} /></label>
          <label className="span-2">Choices <span className="optional">(optional, comma separated)</span><input value={(payload.options ?? []).join(", ")} onChange={(e) => set("options", normalizeCsv(e.target.value))} /></label>
        </div>
      ) : null}

      {payload.mode === "number_sequence" ? (
        <div className="grid-2">
          <label>Sequence<input value={payload.sequence_text ?? ""} placeholder="1, 2, 3, __, 5" onChange={(e) => set("sequence_text", e.target.value)} /></label>
          <label>Missing / next number<input value={payload.correct_answer ?? ""} placeholder="4" onChange={(e) => set("correct_answer", e.target.value)} /></label>
          <label className="span-2">Choices <span className="optional">(optional, comma separated)</span><input value={(payload.options ?? []).join(", ")} onChange={(e) => set("options", normalizeCsv(e.target.value))} /></label>
        </div>
      ) : null}

      {payload.mode === "fill_blank" ? (
        <div className="grid-2">
          <label className="span-2">Sentence / expression with blank<input value={payload.pattern ?? ""} placeholder="The sun is ___. or 5 + __ = 9" onChange={(e) => set("pattern", e.target.value)} /></label>
          <label>Correct answer<input value={payload.correct_answer ?? ""} onChange={(e) => set("correct_answer", e.target.value)} /></label>
          <label>Choices <span className="optional">(optional)</span><input value={(payload.options ?? []).join(", ")} onChange={(e) => set("options", normalizeCsv(e.target.value))} /></label>
        </div>
      ) : null}

      {payload.mode === "counting" ? (
        <div className="grid-2">
          <label>Question<input value={payload.prompt ?? ""} placeholder="How many stars are there?" onChange={(e) => set("prompt", e.target.value)} /></label>
          <label>Quantity<input type="number" min="1" max="50" value={payload.quantity ?? 1} onChange={(e) => { const quantity = Number(e.target.value); onChange({ ...payload, quantity, correct_answer: String(quantity || "") }); }} /></label>
          <label>Emoji / symbol<input value={payload.count_item?.emoji ?? ""} placeholder="⭐" onChange={(e) => set("count_item", { ...(payload.count_item ?? {}), emoji: e.target.value })} /></label>
          <label>Correct answer<input value={payload.correct_answer ?? ""} onChange={(e) => set("correct_answer", e.target.value)} /></label>
          <div className="span-2"><FileUpload value={payload.count_item?.image_url ?? ""} onChange={(image_url) => set("count_item", { ...(payload.count_item ?? {}), image_url })} label="Counting image (optional)" /></div>
          <div className="span-2 count-preview" aria-label="Counting preview">{Array.from({ length: Math.min(Number(payload.quantity) || 0, 20) }, (_, index) => <span key={index}>{payload.count_item?.emoji || "●"}</span>)}</div>
        </div>
      ) : null}

      {payload.mode === "ordering" ? (
        <>
          <div className="grid-2">
            <label>Direction<select value={payload.ordering_direction ?? "ascending"} onChange={(e) => set("ordering_direction", e.target.value)}><option value="ascending">Smallest → largest / first → last</option><option value="descending">Largest → smallest / last → first</option><option value="custom">Custom order</option></select></label>
          </div>
          <div className="grid-2">
            <label>Items / tiles (comma separated)<input value={(payload.words ?? []).join(", ")} onChange={(e) => set("words", normalizeCsv(e.target.value))} /></label>
            <label>Correct order (comma separated)<input value={(payload.correct_order ?? []).join(", ")} onChange={(e) => set("correct_order", normalizeCsv(e.target.value))} /></label>
          </div>
        </>
      ) : null}

      {payload.mode === "true_false" ? (
        <div className="grid-2">
          <label className="span-2">Statement<input value={payload.statement ?? ""} placeholder="5 + 3 = 8" onChange={(e) => set("statement", e.target.value)} /></label>
          <label>Correct answer<select value={payload.correct_answer ?? ""} onChange={(e) => set("correct_answer", e.target.value)}><option value="">Choose answer</option><option value="true">True</option><option value="false">False</option></select></label>
        </div>
      ) : null}
    </>
  );
}

function PayloadFields({ type, payload, onChange, onOpenQuiz, subjectId }) {
  const set = (key, value) => onChange({ ...payload, [key]: value });

  if (type === "story_snippet") {
    return (
      <>
        <h4>Lesson slides</h4>
        <ListEditor
          items={payload.slides ?? []}
          setItems={(slides) => set("slides", slides)}
          createItem={() => ({ id: uid("slide"), emoji: "📖", text: "", text_bn: "", speech: "", speech_bn: "", image_url: "" })}
          addLabel="Add slide"
          renderItem={(slide, _, update) => {
            const text = slide.text ?? slide.text_bn ?? "";
            const speech = slide.speech ?? slide.speech_bn ?? "";
            return (
              <div className="grid-2">
                <label>Emoji <span className="optional">(optional)</span><input value={slide.emoji ?? ""} onChange={(e) => update({ ...slide, emoji: e.target.value })} /></label>
                <label>Voice text <span className="optional">(optional)</span><input value={speech} onChange={(e) => update({ ...slide, speech: e.target.value, speech_bn: e.target.value })} /></label>
                <label className="span-2">Slide text<textarea rows="2" value={text} onChange={(e) => update({ ...slide, text: e.target.value, text_bn: e.target.value })} /></label>
                <div className="span-2"><FileUpload value={slide.image_url ?? ""} onChange={(image_url) => update({ ...slide, image_url })} label="Slide image (optional)" /></div>
              </div>
            );
          }}
        />
      </>
    );
  }

  if (type === "letter") {
    const examples = Array.isArray(payload.examples) && payload.examples.length ? payload.examples : [{ id: uid("example"), emoji: "", word: "", word_bn: "", image_url: "" }];
    return (
      <>
        <div className="grid-2">
          <label>Letter / symbol<input value={payload.letter ?? ""} onChange={(e) => set("letter", e.target.value)} /></label>
          <label>Sound / voice<input value={payload.sound ?? ""} onChange={(e) => set("sound", e.target.value)} /></label>
        </div>
        <h4>Examples</h4>
        <ListEditor
          items={examples}
          setItems={(items) => set("examples", items)}
          createItem={() => ({ id: uid("example"), emoji: "", word: "", word_bn: "", image_url: "" })}
          addLabel="Add example"
          renderItem={(item, _, update) => {
            const word = item.word ?? item.word_bn ?? "";
            return (
              <div className="grid-2">
                <label>Word / example<input value={word} onChange={(e) => update({ ...item, word: e.target.value, word_bn: e.target.value })} /></label>
                <label>Emoji <span className="optional">(optional)</span><input value={item.emoji ?? ""} onChange={(e) => update({ ...item, emoji: e.target.value })} /></label>
                <div className="span-2"><FileUpload value={item.image_url ?? ""} onChange={(image_url) => update({ ...item, image_url })} label="Example image (optional)" /></div>
              </div>
            );
          }}
        />
      </>
    );
  }

  if (type === "snippet") {
    return (
      <>
        <label>Emoji <span className="optional">(optional)</span><input value={payload.imageEmoji ?? ""} onChange={(e) => set("imageEmoji", e.target.value)} /></label>
        <label>Reading / explanation lines (one per row)<textarea rows="6" value={(payload.lines ?? []).join("\n")} onChange={(e) => set("lines", e.target.value.split("\n"))} /></label>
      </>
    );
  }

  if (type === "word_build") {
    return (
      <div className="grid-2">
        <label>Correct word<input value={payload.answer ?? ""} onChange={(e) => set("answer", e.target.value)} /></label>
        <label>Letter / character tiles (comma separated)<input value={(payload.letters ?? []).join(", ")} onChange={(e) => set("letters", normalizeCsv(e.target.value))} /></label>
      </div>
    );
  }

  if (type === "picture_choice") {
    return (
      <>
        <label>Question<input value={payload.question ?? ""} onChange={(e) => set("question", e.target.value)} /></label>
        <ListEditor
          items={payload.options ?? []}
          setItems={(options) => set("options", options)}
          createItem={() => ({ id: uid("choice"), emoji: "", label: "", label_bn: "", image_url: "" })}
          min={2}
          max={6}
          addLabel="Add option"
          renderItem={(option, index, update) => {
            const label = option.label ?? option.label_bn ?? "";
            return (
              <div className="grid-2">
                <label>Text / number<input value={label} onChange={(e) => update({ ...option, label: e.target.value, label_bn: e.target.value })} /></label>
                <label>Emoji <span className="optional">(optional)</span><input value={option.emoji ?? ""} onChange={(e) => update({ ...option, emoji: e.target.value })} /></label>
                <div className="span-2"><FileUpload value={option.image_url ?? ""} onChange={(image_url) => update({ ...option, image_url })} label="Option image (optional)" /></div>
                <label className="radio-line span-2"><input type="radio" checked={payload.answer === index} onChange={() => set("answer", index)} />Correct answer</label>
              </div>
            );
          }}
        />
      </>
    );
  }

  if (type === "flashcard") {
    return (
      <>
        <ListEditor
          items={payload.cards ?? []}
          setItems={(cards) => set("cards", cards)}
          createItem={() => ({ id: uid("card"), text: "", word_bn: "", emoji: "", speech: "", speech_bn: "", image_url: "" })}
          addLabel="Add card"
          renderItem={(card, _, update) => {
            const text = card.text ?? card.word_bn ?? "";
            const speech = card.speech ?? card.speech_bn ?? "";
            return (
              <div className="grid-2">
                <label>Text / word / number<input value={text} onChange={(e) => update({ ...card, text: e.target.value, word_bn: e.target.value })} /></label>
                <label>Emoji <span className="optional">(optional)</span><input value={card.emoji ?? ""} onChange={(e) => update({ ...card, emoji: e.target.value })} /></label>
                <label className="span-2">Voice text <span className="optional">(optional)</span><input value={speech} onChange={(e) => update({ ...card, speech: e.target.value, speech_bn: e.target.value })} /></label>
                <div className="span-2"><FileUpload value={card.image_url ?? ""} onChange={(image_url) => update({ ...card, image_url })} label="Card image (optional)" /></div>
              </div>
            );
          }}
        />
      </>
    );
  }

  if (type === "matching") {
    const pairs = (payload.pairs ?? []).map(normalizePair);
    return (
      <>
        <div className="info-box">Create each left ↔ right pair. Either side can use text, a number, emoji, or an image.</div>
        <ListEditor
          items={pairs}
          setItems={(nextPairs) => set("pairs", nextPairs)}
          createItem={() => normalizePair({ id: uid("pair") })}
          min={2}
          max={12}
          addLabel="Add pair"
          renderItem={(pair, _, update) => (
            <div className="matching-pair-grid">
              <div className="pair-side">
                <strong>Left side</strong>
                <label>Text / number<input value={pair.left_text ?? ""} onChange={(e) => update({ ...pair, left_text: e.target.value, word_bn: e.target.value })} /></label>
                <FileUpload value={pair.left_image_url ?? ""} onChange={(left_image_url) => update({ ...pair, left_image_url })} label="Left image (optional)" />
              </div>
              <div className="pair-arrow">↔</div>
              <div className="pair-side">
                <strong>Right side</strong>
                <label>Text / number<input value={pair.right_text ?? ""} onChange={(e) => update({ ...pair, right_text: e.target.value })} /></label>
                <label>Emoji <span className="optional">(optional)</span><input value={pair.emoji ?? ""} onChange={(e) => update({ ...pair, emoji: e.target.value })} /></label>
                <FileUpload value={pair.right_image_url ?? pair.image_url ?? ""} onChange={(right_image_url) => update({ ...pair, right_image_url, image_url: right_image_url })} label="Right image (optional)" />
              </div>
            </div>
          )}
        />
      </>
    );
  }

  if (type === "tap") {
    return (
      <>
        <label>Prompt<input value={payload.prompt ?? ""} onChange={(e) => set("prompt", e.target.value)} /></label>
        <ListEditor
          items={payload.items ?? []}
          setItems={(items) => set("items", items)}
          createItem={() => ({ id: uid("item"), emoji: "", label: "", label_bn: "", description: "", description_bn: "", image_url: "" })}
          addLabel="Add tappable item"
          renderItem={(item, _, update) => {
            const label = item.label ?? item.label_bn ?? "";
            const description = item.description ?? item.description_bn ?? "";
            return (
              <div className="grid-2">
                <label>Text / number<input value={label} onChange={(e) => update({ ...item, label: e.target.value, label_bn: e.target.value })} /></label>
                <label>Emoji <span className="optional">(optional)</span><input value={item.emoji ?? ""} onChange={(e) => update({ ...item, emoji: e.target.value })} /></label>
                <label className="span-2">Description<input value={description} onChange={(e) => update({ ...item, description: e.target.value, description_bn: e.target.value })} /></label>
                <div className="span-2"><FileUpload value={item.image_url ?? ""} onChange={(image_url) => update({ ...item, image_url })} label="Item image (optional)" /></div>
              </div>
            );
          }}
        />
      </>
    );
  }

  if (type === "drag_game") {
    return (
      <>
        <label>Prompt<input value={payload.prompt ?? ""} onChange={(e) => set("prompt", e.target.value)} /></label>
        <ListEditor
          items={payload.items ?? []}
          setItems={(items) => set("items", items)}
          createItem={() => ({ id: uid("drag"), emoji: "", label: "", label_bn: "", target: "", image_url: "" })}
          min={2}
          addLabel="Add draggable item"
          renderItem={(item, _, update) => {
            const label = item.label ?? item.label_bn ?? "";
            return (
              <div className="grid-3">
                <label>Text / number<input value={label} onChange={(e) => update({ ...item, label: e.target.value, label_bn: e.target.value })} /></label>
                <label>Emoji <span className="optional">(optional)</span><input value={item.emoji ?? ""} onChange={(e) => update({ ...item, emoji: e.target.value })} /></label>
                <label>Target / group<input value={item.target ?? ""} onChange={(e) => update({ ...item, target: e.target.value })} /></label>
                <div className="span-2"><FileUpload value={item.image_url ?? ""} onChange={(image_url) => update({ ...item, image_url })} label="Item image (optional)" /></div>
              </div>
            );
          }}
        />
      </>
    );
  }

  if (type === "audio_lesson") {
    return (
      <>
        <ListEditor
          items={payload.items ?? []}
          setItems={(items) => set("items", items)}
          createItem={() => ({ id: uid("audio"), text: "", text_bn: "", emoji: "", image_url: "" })}
          addLabel="Add sentence"
          renderItem={(item, _, update) => {
            const text = item.text ?? item.text_bn ?? "";
            return (
              <div className="grid-2">
                <label className="span-2">Sentence / expression<input value={text} onChange={(e) => update({ ...item, text: e.target.value, text_bn: e.target.value })} /></label>
                <label>Emoji <span className="optional">(optional)</span><input value={item.emoji ?? ""} onChange={(e) => update({ ...item, emoji: e.target.value })} /></label>
                <div className="span-2"><FileUpload value={item.image_url ?? ""} onChange={(image_url) => update({ ...item, image_url })} label="Sentence image (optional)" /></div>
              </div>
            );
          }}
        />
      </>
    );
  }

  if (type === "image_lesson") {
    return <FileUpload value={payload.image_url ?? ""} onChange={(image_url) => set("image_url", image_url)} label="Lesson image" />;
  }

  if (type === "video_lesson") {
    return (
      <div className="grid-2">
        <label className="span-2">Video URL<input value={payload.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} /></label>
        <label className="radio-line"><input type="checkbox" checked={Boolean(payload.autoplay)} onChange={(e) => set("autoplay", e.target.checked)} />Autoplay</label>
      </div>
    );
  }

  if (type === "multiple_choice") {
    return (
      <div className="info-box">
        Quiz questions and answer options are managed in the visual Quiz Builder. No JSON is needed.
        <button type="button" className="secondary-btn inline-btn" onClick={onOpenQuiz}>Open Quiz Builder</button>
      </div>
    );
  }

  if (type === "puzzle") {
    return <PuzzleFields payload={payload} onChange={onChange} />;
  }

  return null;
}

function ActivitySummary({ form, subjectId }) {
  const typeName = TYPES.find(([id]) => id === form.activityType)?.[1] ?? form.activityType;
  const puzzleName = form.activityType === "puzzle"
    ? PUZZLE_MODES.find(([id]) => id === form.payload?.mode)?.[1]
    : null;
  return (
    <div className="activity-summary">
      <span>{SUBJECT_NAMES[subjectId] ?? subjectId}</span>
      <span>{typeName}</span>
      {puzzleName ? <span>{puzzleName}</span> : null}
      {usesAttemptPolicy(form.activityType) ? <span>Max tries: {form.payload?.max_attempts ?? 3}</span> : null}
      <span>{form.status === "published" ? "Ready to publish" : "Draft allowed"}</span>
    </div>
  );
}

export default function ActivityBuilder({ chapter, onOpenQuiz }) {
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(makeForm(1, chapter.subject_id));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setActivities(await adminService.listActivities(chapter.id));
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message));
  }, [chapter.id]);

  const nextOrder = useMemo(
    () => (activities.length ? Math.max(...activities.map((a) => a.order_index)) + 1 : 1),
    [activities],
  );

  const presets = useMemo(() => quickTemplates(chapter.subject_id), [chapter.subject_id]);

  function openNew() {
    setForm(makeForm(nextOrder, chapter.subject_id));
    setEditing(true);
    setError("");
  }

  function openEdit(activity) {
    setForm({
      id: activity.id,
      orderIndex: activity.order_index,
      activityType: activity.activity_type,
      titleBn: activity.title_bn ?? "",
      instructionBn: activity.instruction_bn ?? "",
      status: activity.status,
      payload: activity.payload ?? template(activity.activity_type, chapter.subject_id),
    });
    setEditing(true);
    setError("");
  }

  function changeType(type) {
    setForm((current) => ({
      ...current,
      activityType: type,
      payload: template(type, chapter.subject_id),
    }));
  }

  function applyPreset(preset) {
    const built = buildQuickTemplate(chapter.subject_id, preset.key, preset.type, preset.mode);
    setForm((current) => ({
      ...current,
      activityType: built.type,
      titleBn: built.titleBn,
      instructionBn: built.instructionBn,
      payload: built.payload,
    }));
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (form.status === "published") {
        const publishError = validateActivityForPublish(form.activityType, form.payload, form.titleBn);
        if (publishError) throw new Error(publishError);
      }

      await adminService.saveActivity({ ...form, chapterId: chapter.id, subjectId: chapter.subject_id });
      setEditing(false);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(activity) {
    try {
      if (activity.status !== "published") {
        const publishError = validateActivityForPublish(
          activity.activity_type,
          activity.payload ?? {},
          activity.title_bn ?? "",
        );
        if (publishError) throw new Error(publishError);
      }

      await adminService.setActivityStatus(
        activity.id,
        activity.status === "published" ? "draft" : "published",
      );
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Status update failed.");
    }
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <p className="eyebrow">UNIVERSAL NO-CODE CONTENT</p>
          <h2>Activities</h2>
          <p className="muted">{SUBJECT_NAMES[chapter.subject_id] ?? chapter.subject_id} · Choose any activity format. The editor adapts automatically.</p>
        </div>
        <button className="primary-btn" onClick={openNew}>＋ New Activity</button>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      <div className="card-list">
        {activities.map((activity) => {
          const typeLabel = TYPES.find(([id]) => id === activity.activity_type)?.[1] || activity.activity_type;
          const modeLabel = activity.activity_type === "puzzle"
            ? PUZZLE_MODES.find(([id]) => id === activity.payload?.mode)?.[1]
            : null;
          return (
            <article className="content-card" key={activity.id}>
              <div>
                <span className={`status ${activity.status}`}>{activity.status}</span>
                <h3>{activity.title_bn || typeLabel}</h3>
                <p className="muted">Order {activity.order_index} · {typeLabel}{modeLabel ? ` · ${modeLabel}` : ""}{usesAttemptPolicy(activity.activity_type) ? ` · Max tries ${activity.payload?.max_attempts ?? 3}` : ""}</p>
              </div>
              <div className="row-actions">
                <button className="ghost-btn" onClick={() => openEdit(activity)}>Edit</button>
                {activity.activity_type === "multiple_choice" ? <button className="ghost-btn" onClick={onOpenQuiz}>Quiz Questions</button> : null}
                <button className="ghost-btn" onClick={() => toggle(activity)}>{activity.status === "published" ? "Unpublish" : "Publish"}</button>
              </div>
            </article>
          );
        })}
      </div>

      {editing ? (
        <div className="modal-backdrop">
          <div className="modal-card modal-wide universal-modal">
            <div className="modal-head">
              <div>
                <p className="eyebrow">UNIVERSAL CONTENT BUILDER V1</p>
                <h2>{form.id ? "Edit Activity" : "New Activity"}</h2>
                <p className="muted">{SUBJECT_NAMES[chapter.subject_id] ?? chapter.subject_id} · No JSON or code required.</p>
              </div>
              <button className="icon-btn" onClick={() => setEditing(false)}>×</button>
            </div>

            <form className="form-stack" onSubmit={save}>
              <div className="quick-template-zone">
                <div className="sub-card-head">
                  <div>
                    <strong>Quick templates</strong>
                    <div className="muted tiny-copy">Start with a ready-made activity, then edit anything.</div>
                  </div>
                </div>
                <div className="template-grid">
                  {presets.map((preset) => (
                    <button key={preset.key} type="button" className="template-btn" onClick={() => applyPreset(preset)}>{preset.label}</button>
                  ))}
                </div>
              </div>

              <ActivitySummary form={form} subjectId={chapter.subject_id} />

              <div className="grid-2">
                <label>
                  Activity format
                  <select value={form.activityType} onChange={(e) => changeType(e.target.value)}>
                    {TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                <label>Order<input type="number" min="1" value={form.orderIndex} onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })} /></label>
                {usesAttemptPolicy(form.activityType) ? (
                  <label>
                    Maximum attempts
                    <select
                      value={form.payload?.max_attempts ?? 3}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          payload: {
                            ...form.payload,
                            max_attempts: Math.max(1, Math.min(5, Number(e.target.value) || 3)),
                          },
                        })
                      }
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>{value} {value === 1 ? "try" : "tries"}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {usesVoiceLocale(form.activityType) ? (
                  <label>
                    Voice language
                    <select
                      value={form.payload?.locale ?? localeForSubject(chapter.subject_id)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          payload: {
                            ...form.payload,
                            locale: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="bn-BD">Bangla</option>
                      <option value="en-US">English</option>
                    </select>
                  </label>
                ) : null}
                <label>Activity title<input value={form.titleBn} placeholder="What will the teacher/student see?" onChange={(e) => setForm({ ...form, titleBn: e.target.value })} /></label>
                <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
                <label className="span-2">Instruction<textarea rows="2" value={form.instructionBn} placeholder="Tell the student what to do." onChange={(e) => setForm({ ...form, instructionBn: e.target.value })} /></label>
              </div>

              {usesAttemptPolicy(form.activityType) ? (
                <div className="attempt-policy-note">
                  After the maximum attempts, the student can continue to the next activity even if the answer is still wrong. The activity remains available for more practice.
                </div>
              ) : null}

              <div className="builder-zone">
                <PayloadFields
                  type={form.activityType}
                  payload={form.payload}
                  onChange={(payload) => setForm({ ...form, payload })}
                  onOpenQuiz={onOpenQuiz}
                  subjectId={chapter.subject_id}
                />
              </div>

              {error ? <div className="error-box">{error}</div> : null}

              <div className="draft-note">Draft can be saved with incomplete fields. Publish runs validation so students do not receive broken activities.</div>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancel</button>
                <button className="primary-btn" disabled={busy}>{busy ? "Saving..." : "Save Activity"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
