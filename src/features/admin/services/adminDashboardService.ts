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
  unavailableMetrics?: string[];
};

type CountFilter = {
  column: string;
  value: string | number | boolean;
};

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase URL অথবা anon key configure করা নেই।");
  }
}

async function countRows(
  table: string,
  filters: CountFilter[] = [],
) {
  let query = adminSupabase
    .from(table)
    .select("*", { count: "exact", head: true });

  for (const filter of filters) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function safeCountRows(
  metricName: string,
  table: string,
  filters: CountFilter[],
  unavailableMetrics: string[],
) {
  try {
    return await countRows(table, filters);
  } catch (error) {
    unavailableMetrics.push(metricName);

    console.warn(
      `[AdminDashboard] ${metricName} unavailable:`,
      error instanceof Error ? error.message : error,
    );

    return 0;
  }
}

export const adminDashboardService = {
  async getAnalytics(): Promise<AdminDashboardAnalytics> {
    ensureConfigured();

    const unavailableMetrics: string[] = [];

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
      safeCountRows("students", "students", [], unavailableMetrics),
      safeCountRows("parents", "profiles", [{ column: "role", value: "parent" }], unavailableMetrics),
      safeCountRows("quizQuestions", "quiz_questions", [], unavailableMetrics),
      safeCountRows("publishedQuizQuestions", "quiz_questions", [{ column: "status", value: "published" }], unavailableMetrics),
      safeCountRows("attempts", "activity_attempts", [], unavailableMetrics),
      safeCountRows("correctAttempts", "activity_attempts", [{ column: "is_correct", value: true }], unavailableMetrics),
      safeCountRows("completedChapters", "chapter_progress", [{ column: "completed", value: true }], unavailableMetrics),
      safeCountRows("pendingParentLinks", "parent_link_requests", [{ column: "status", value: "pending" }], unavailableMetrics),
      safeCountRows("class1", "students", [{ column: "class_level", value: 1 }], unavailableMetrics),
      safeCountRows("class2", "students", [{ column: "class_level", value: 2 }], unavailableMetrics),
      safeCountRows("class3", "students", [{ column: "class_level", value: 3 }], unavailableMetrics),
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
      unavailableMetrics: [...new Set(unavailableMetrics)],
    };
  },
};
