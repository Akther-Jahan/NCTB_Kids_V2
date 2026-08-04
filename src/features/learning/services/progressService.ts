import { supabase } from '../../../config/supabase';

function throwSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export const progressService = {
  async completeChapter(
    studentId: string,
    chapterId: string
  ) {
    const { data, error } = await supabase.rpc(
      'complete_chapter',
      {
        p_student_id: studentId,
        p_chapter_id: chapterId,
      }
    );

    throwSupabaseError(error);

    return data;
  },
};