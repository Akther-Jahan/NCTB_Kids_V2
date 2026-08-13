import { adminSupabase } from "../../../config/adminSupabase";
import { isSupabaseConfigured } from "../../../config/env";

export type AdminDashboardAnalytics = {
  students: number;
  parents: number;
  quizQuestions: number;
  publishedQuizQuestions: number;
  attempts: number;
  correctAttempts: number;
  completedChapters: number;
  pendingParentLinks: number;
  studentsByClass: Record<number, number>;
};

type CountFilter = {
  column: string;
  value: string | number | boolean;
};

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase URL অথবা anon key configure করা নেই।",
    );
  }
}

async function countRows(
  table: string,
  filters: CountFilter[] = [],
) {
  let query = adminSupabase
    .from(table)
    .select("id", { count: "exact", head: true });

  for (const filter of filters) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export const adminDashboardService = {
  async getAnalytics(): Promise<AdminDashboardAnalytics> {
    ensureConfigured();

    const [
      students,
      parents,
      quizQuestions,
      publishedQuizQuestions,
      attempts,
      correctAttempts,
      completedChapters,
      pendingParentLinks,
      class1,
      class2,
      class3,
    ] = await Promise.all([
      countRows("students"),
      countRows("profiles", [
        { column: "role", value: "parent" },
      ]),
      countRows("quiz_questions"),
      countRows("quiz_questions", [
        { column: "status", value: "published" },
      ]),
      countRows("activity_attempts"),
      countRows("activity_attempts", [
        { column: "is_correct", value: true },
      ]),
      countRows("chapter_progress", [
        { column: "completed", value: true },
      ]),
      countRows("parent_link_requests", [
        { column: "status", value: "pending" },
      ]),
      countRows("students", [
        { column: "class_level", value: 1 },
      ]),
      countRows("students", [
        { column: "class_level", value: 2 },
      ]),
      countRows("students", [
        { column: "class_level", value: 3 },
      ]),
    ]);

    return {
      students,
      parents,
      quizQuestions,
      publishedQuizQuestions,
      attempts,
      correctAttempts,
      completedChapters,
      pendingParentLinks,
      studentsByClass: {
        1: class1,
        2: class2,
        3: class3,
      },
    };
  },
};
