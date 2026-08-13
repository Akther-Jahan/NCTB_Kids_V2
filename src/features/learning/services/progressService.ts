import { supabase } from "../../../config/supabase";
import { useLessonSessionStore } from "../store/lessonSessionStore";
import { normalizeQuestionResult } from "../types/questionResults";

type QuizQuestionRow = {
  id: string;
};

type QuizOptionRow = {
  id: string;
  question_id: string;
  option_order: number;
};

type ExistingAttemptRow = {
  question_id: string;
};

function throwSupabaseError(
  error: { message: string } | null,
) {
  if (error) {
    throw new Error(error.message);
  }
}

async function submitQuizAnswer(
  studentId: string,
  questionId: string,
  selectedOptionId: string,
) {
  const { error } = await supabase.rpc(
    "submit_quiz_answer",
    {
      p_student_id: studentId,
      p_question_id: questionId,
      p_selected_option_id: selectedOptionId,
    },
  );

  throwSupabaseError(error);
}

async function syncQuizAttempts(
  studentId: string,
  chapterId: string,
) {
  const {
    data: questionData,
    error: questionError,
  } = await supabase
    .from("quiz_questions")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("status", "published")
    .order("order_index", {
      ascending: true,
    });

  throwSupabaseError(questionError);

  const questions =
    (questionData ?? []) as unknown as QuizQuestionRow[];

  if (questions.length === 0) {
    return;
  }

  const questionIds = questions.map(
    (question) => question.id,
  );

  const [optionResult, attemptResult] =
    await Promise.all([
      supabase
        .from("quiz_options")
        .select(
          "id, question_id, option_order",
        )
        .in("question_id", questionIds)
        .order("option_order", {
          ascending: true,
        }),

      supabase
        .from("activity_attempts")
        .select("question_id")
        .eq("student_id", studentId)
        .in("question_id", questionIds),
    ]);

  throwSupabaseError(optionResult.error);
  throwSupabaseError(attemptResult.error);

  const options =
    (optionResult.data ?? []) as unknown as QuizOptionRow[];

  const existingAttempts =
    (attemptResult.data ?? []) as unknown as ExistingAttemptRow[];

  const questionResults =
    useLessonSessionStore.getState().sessions[
      chapterId
    ]?.questionResults ?? {};

  for (const question of questions) {
    const questionOptions = options
      .filter(
        (option) =>
          option.question_id === question.id,
      )
      .sort(
        (a, b) =>
          a.option_order - b.option_order,
      );

    if (questionOptions.length < 2) {
      throw new Error(
        "Published quiz question-এর options পাওয়া যায়নি।",
      );
    }

    const localResult = normalizeQuestionResult(
      questionResults[question.id],
    );
    const localHistory =
      localResult.selectedOptionHistory;

    if (localHistory.length === 0) {
      continue;
    }

    const savedAttemptCount =
      existingAttempts.filter(
        (attempt) =>
          attempt.question_id === question.id,
      ).length;

    // Only send attempts that the server has not stored yet.
    // Crucially, we never invent a correct answer here. The server receives
    // the exact option order the child actually submitted on-device.
    const missingSelections =
      localHistory.slice(savedAttemptCount);

    for (const selectedOptionIndex of missingSelections) {
      const selectedOption =
        questionOptions[selectedOptionIndex];

      if (!selectedOption) {
        throw new Error(
          "Quiz option sync করা যায়নি: saved option index আর published options মিলছে না।",
        );
      }

      await submitQuizAnswer(
        studentId,
        question.id,
        selectedOption.id,
      );
    }
  }
}

export const progressService = {
  async syncQuizAttempts(
    studentId: string,
    chapterId: string,
  ) {
    await syncQuizAttempts(
      studentId,
      chapterId,
    );
  },

  async completeChapter(
    studentId: string,
    chapterId: string,
  ) {
    await syncQuizAttempts(
      studentId,
      chapterId,
    );

    const { data, error } = await supabase.rpc(
      "complete_chapter",
      {
        p_student_id: studentId,
        p_chapter_id: chapterId,
      },
    );

    throwSupabaseError(error);

    return data;
  },
};
