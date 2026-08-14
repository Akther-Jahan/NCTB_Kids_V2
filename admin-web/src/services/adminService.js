import { isConfigured, storageBucket, supabase } from "../lib/supabase.js";

function ensureConfigured() {
  if (!isConfigured) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env and add the same Supabase URL and anon key used by the mobile app.",
    );
  }
}

function fail(error) {
  if (error) throw new Error(error.message);
}

async function getAdminProfile(user) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", user.id)
    .single();

  fail(error);

  if (data.role !== "admin" && data.role !== "content_creator") {
    throw new Error("This account does not have Admin CMS access.");
  }

  return {
    id: data.id,
    email: user.email ?? "",
    name: data.display_name || user.email?.split("@")[0] || "Admin",
    role: data.role,
  };
}

async function resolveQuizActivityId(
  chapterId,
  requestedActivityId,
) {
  if (requestedActivityId) {
    return requestedActivityId;
  }

  const { data, error } = await supabase
    .from("lesson_activities")
    .select("id, activity_type, order_index")
    .eq("chapter_id", chapterId)
    .eq("activity_type", "multiple_choice")
    .order("order_index");

  fail(error);

  const rows = data ?? [];

  if (rows.length === 1) {
    return rows[0].id;
  }

  if (rows.length === 0) {
    throw new Error(
      "Create a Quiz activity before saving quiz questions.",
    );
  }

  throw new Error(
    "This chapter has more than one Quiz activity. Choose the correct Quiz activity.",
  );
}

export const adminService = {
  async login(email, password) {
    ensureConfigured();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    fail(error);

    if (!data.user) throw new Error("Login session was not created.");

    try {
      return await getAdminProfile(data.user);
    } catch (error) {
      await supabase.auth.signOut();
      throw error;
    }
  },

  async currentAdmin() {
    if (!isConfigured) return null;

    const { data, error } = await supabase.auth.getSession();
    fail(error);

    const user = data.session?.user;
    if (!user) return null;

    try {
      return await getAdminProfile(user);
    } catch {
      await supabase.auth.signOut();
      return null;
    }
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    fail(error);
  },

  async listChapters() {
    ensureConfigured();

    const [chapterResult, activityResult] = await Promise.all([
      supabase
        .from("chapters")
        .select(
          "id,class_level,subject_id,chapter_number,title_bn,title_en,summary_bn,summary_en,cover_url,status",
        )
        .order("class_level")
        .order("subject_id")
        .order("chapter_number"),
      supabase
        .from("lesson_activities")
        .select("chapter_id,status"),
    ]);

    fail(chapterResult.error);
    fail(activityResult.error);

    const counts = new Map();

    for (const row of activityResult.data ?? []) {
      const current = counts.get(row.chapter_id) ?? { total: 0, published: 0 };
      current.total += 1;
      if (row.status === "published") current.published += 1;
      counts.set(row.chapter_id, current);
    }

    return (chapterResult.data ?? []).map((chapter) => {
      const count = counts.get(chapter.id) ?? { total: 0, published: 0 };
      return {
        ...chapter,
        activity_count: count.total,
        published_activity_count: count.published,
      };
    });
  },

  async saveChapter(input) {
    ensureConfigured();

    const payload = {
      class_level: Number(input.classLevel),
      subject_id: input.subjectId,
      chapter_number: Number(input.chapterNumber),
      title_bn: input.titleBn.trim(),
      title_en: input.titleEn?.trim() || null,
      summary_bn: input.summaryBn?.trim() || null,
      summary_en: null,
      cover_url: input.coverUrl?.trim() || null,
      status: input.status,
    };

    if (input.id) {
      const { error } = await supabase
        .from("chapters")
        .update(payload)
        .eq("id", input.id);
      fail(error);
      return;
    }

    const { error } = await supabase.from("chapters").insert(payload);
    fail(error);
  },

  async archiveChapter(chapterId) {
    const { error } = await supabase
      .from("chapters")
      .update({ status: "archived" })
      .eq("id", chapterId);
    fail(error);
  },

  async listActivities(chapterId) {
    const { data, error } = await supabase
      .from("lesson_activities")
      .select(
        "id,chapter_id,order_index,activity_type,title_bn,title_en,instruction_bn,instruction_en,payload,status",
      )
      .eq("chapter_id", chapterId)
      .order("order_index");
    fail(error);
    return data ?? [];
  },

  async saveActivity(input) {
    const primaryTitle = input.titleBn?.trim() || null;
    const primaryInstruction = input.instructionBn?.trim() || null;
    const isEnglish = input.subjectId === "english";

    const payload = {
      chapter_id: input.chapterId,
      order_index: Number(input.orderIndex),
      activity_type: input.activityType,
      // Keep the existing primary fields populated for current mobile compatibility.
      // English chapters also mirror the same content into the English columns.
      title_bn: primaryTitle,
      title_en: isEnglish ? primaryTitle : null,
      instruction_bn: primaryInstruction,
      instruction_en: isEnglish ? primaryInstruction : null,
      payload: input.payload,
      status: input.status,
    };

    if (input.id) {
      const { error } = await supabase
        .from("lesson_activities")
        .update(payload)
        .eq("id", input.id);
      fail(error);
      return;
    }

    const { error } = await supabase.from("lesson_activities").insert(payload);
    fail(error);
  },

  async setActivityStatus(activityId, status) {
    const { error } = await supabase
      .from("lesson_activities")
      .update({ status })
      .eq("id", activityId);
    fail(error);
  },

  async listQuizQuestions(chapterId) {
    const { data: questions, error: questionError } = await supabase
      .from("quiz_questions")
      .select(
        "id,chapter_id,activity_id,order_index,question_bn,question_en,explanation_bn,explanation_en,image_url,status",
      )
      .eq("chapter_id", chapterId)
      .order("order_index");

    fail(questionError);

    const ids = (questions ?? []).map((q) => q.id);
    let options = [];

    if (ids.length) {
      const result = await supabase
        .from("quiz_options")
        .select(
          "id,question_id,option_order,label_bn,label_en,image_url,is_correct",
        )
        .in("question_id", ids)
        .order("option_order");

      fail(result.error);
      options = result.data ?? [];
    }

    return (questions ?? []).map((q) => ({
      ...q,
      options: options
        .filter((o) => o.question_id === q.id)
        .map((o) => ({
          id: o.id,
          optionOrder: o.option_order,
          labelBn: o.label_bn ?? "",
          labelEn: o.label_en ?? "",
          imageUrl: o.image_url ?? "",
          isCorrect: Boolean(o.is_correct),
        })),
    }));
  },

  async saveQuizQuestion(input) {
    const activityId = await resolveQuizActivityId(
      input.chapterId,
      input.activityId,
    );

    const questionPayload = {
      chapter_id: input.chapterId,
      activity_id: activityId,
      order_index: Number(input.orderIndex),
      question_bn: input.questionBn.trim(),
      question_en: null,
      explanation_bn: input.explanationBn?.trim() || null,
      explanation_en: null,
      image_url: input.imageUrl?.trim() || null,
      status: input.status,
    };

    let questionId = input.id;

    if (questionId) {
      const { error } = await supabase
        .from("quiz_questions")
        .update(questionPayload)
        .eq("id", questionId);
      fail(error);
    } else {
      const { data, error } = await supabase
        .from("quiz_questions")
        .insert(questionPayload)
        .select("id")
        .single();
      fail(error);
      questionId = data?.id;
    }

    if (!questionId) throw new Error("Question ID was not created.");

    const { data: existingRows, error: existingError } = await supabase
      .from("quiz_options")
      .select("id")
      .eq("question_id", questionId);
    fail(existingError);

    const existingIds = new Set((existingRows ?? []).map((row) => row.id));
    const retainedIds = new Set(
      input.options.map((option) => option.id).filter((id) => id && existingIds.has(id)),
    );

    const removedIds = [...existingIds].filter((id) => !retainedIds.has(id));

    if (removedIds.length) {
      const { error } = await supabase
        .from("quiz_options")
        .delete()
        .in("id", removedIds)
        .eq("question_id", questionId);

      if (error) {
        if (error.message.includes("activity_attempts_selected_option_id_fkey")) {
          throw new Error(
            "One removed option already has learner attempt history. Edit that option instead of deleting it.",
          );
        }
        fail(error);
      }
    }

    for (const [index, option] of input.options.entries()) {
      const optionPayload = {
        question_id: questionId,
        option_order: index + 1,
        label_bn: option.labelBn.trim(),
        label_en: null,
        image_url: option.imageUrl?.trim() || null,
        is_correct: option.isCorrect,
      };

      if (option.id && existingIds.has(option.id)) {
        const { error } = await supabase
          .from("quiz_options")
          .update(optionPayload)
          .eq("id", option.id)
          .eq("question_id", questionId);
        fail(error);
      } else {
        const { error } = await supabase
          .from("quiz_options")
          .insert(optionPayload);
        fail(error);
      }
    }
  },

  async uploadFile(file) {
    ensureConfigured();

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `admin/${Date.now()}-${cleanName}`;

    const { error } = await supabase.storage
      .from(storageBucket)
      .upload(path, file, { upsert: false });

    fail(error);

    const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
    return data.publicUrl;
  },
};
