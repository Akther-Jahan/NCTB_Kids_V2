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
  allowedQuestionIds?: string[],
) {
  if (
    allowedQuestionIds !== undefined &&
    allowedQuestionIds.length === 0
  ) {
    return;
  }

  let questionQuery = supabase
    .from("quiz_questions")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("status", "published");

  if (allowedQuestionIds) {
    questionQuery = questionQuery.in(
      "id",
      allowedQuestionIds,
    );
  }

  const {
    data: questionData,
    error: questionError,
  } = await questionQuery.order(
    "order_index",
    { ascending: true },
  );

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
      if (__DEV__) console.log(
        "Skipping cloud quiz sync because the published question has fewer than two options:",
        question.id,
      );
      continue;
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

    const missingSelections =
      localHistory.slice(savedAttemptCount);

    for (const selectedOptionIndex of missingSelections) {
      const selectedOption =
        questionOptions[selectedOptionIndex];

      if (!selectedOption) {
        if (__DEV__) console.log(
          "Skipping one cloud quiz attempt because the saved option index no longer matches published options:",
          question.id,
          selectedOptionIndex,
        );
        continue;
      }

      try {
        await submitQuizAnswer(
          studentId,
          question.id,
          selectedOption.id,
        );
      } catch (error) {
        if (__DEV__) console.log(
          "Cloud quiz attempt will be retried later:",
          question.id,
          error,
        );
      }
    }
  }
}

export const progressService = {
  async syncQuizAttempts(
    studentId: string,
    chapterId: string,
    allowedQuestionIds?: string[],
  ) {
    await syncQuizAttempts(
      studentId,
      chapterId,
      allowedQuestionIds,
    );
  },

  async completeChapter(
    studentId: string,
    chapterId: string,
    allowedQuestionIds?: string[],
  ) {
    await syncQuizAttempts(
      studentId,
      chapterId,
      allowedQuestionIds,
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
