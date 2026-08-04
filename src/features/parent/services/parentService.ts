import { parentSupabase } from '../../../config/parentSupabase';

let realtimeChannelSequence = 0;

function nextRealtimeChannelName(prefix: string) {
  realtimeChannelSequence += 1;
  return `${prefix}-${Date.now()}-${realtimeChannelSequence}`;
}

export type SubjectProgress = {
  subjectId: string;
  titleBn: string;
  titleEn: string;
  completedChapters: number;
  totalChapters: number;
  percentage: number;
};

export type ParentChild = {
  id: string;
  studentCode: string;
  displayName: string;
  classLevel: number;
  avatarKey: string;
  totalPoints: number;
  totalProgress: number;
  totalStars: number;
  subjectProgress: SubjectProgress[];
};

export type ParentLinkRequest = {
  id: string;
  studentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  expiresAt: string;
  createdAt: string;
};

type StudentRow = {
  id: string;
  student_code: string;
  display_name: string;
  class_level: number;
  avatar_key: string;
  total_points: number;
};

type StudentReportRow = {
  student_id: string;
  display_name: string;
  class_level: number;
  total_progress: number | string;
  total_points: number;
  total_stars: number | string;
  subject_progress: Array<{
    subject_id: string;
    title_bn: string;
    title_en: string;
    completed_chapters: number;
    total_chapters: number;
    percentage: number | string;
  }>;
};

function throwSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

async function getParentUserId() {
  const { data, error } = await parentSupabase.auth.getSession();
  throwSupabaseError(error);

  const userId = data.session?.user.id;

  if (!userId) {
    throw new Error('Parent login is required.');
  }

  return userId;
}

function mapReport(student: StudentRow, report: StudentReportRow): ParentChild {
  return {
    id: student.id,
    studentCode: student.student_code,
    displayName: student.display_name,
    classLevel: student.class_level,
    avatarKey: student.avatar_key,
    totalPoints: Number(report.total_points ?? student.total_points),
    totalProgress: Number(report.total_progress ?? 0),
    totalStars: Number(report.total_stars ?? 0),
    subjectProgress: (report.subject_progress ?? []).map((subject) => ({
      subjectId: subject.subject_id,
      titleBn: subject.title_bn,
      titleEn: subject.title_en,
      completedChapters: Number(subject.completed_chapters),
      totalChapters: Number(subject.total_chapters),
      percentage: Number(subject.percentage),
    })),
  };
}

export const parentService = {
  async requestLink(studentCode: string) {
    const { data, error } = await parentSupabase.rpc('request_parent_link', {
      p_student_code: studentCode.trim().toUpperCase(),
    });

    throwSupabaseError(error);

    if (!data) {
      throw new Error('Link request could not be created.');
    }

    return data as string;
  },

  async getChildren() {
    const parentUserId = await getParentUserId();
    const { data: accessRows, error: accessError } = await parentSupabase
      .from('student_access')
      .select('student_id')
      .eq('user_id', parentUserId)
      .eq('access_type', 'parent');

    throwSupabaseError(accessError);

    const studentIds = (accessRows ?? []).map((row) => row.student_id as string);

    if (studentIds.length === 0) {
      return [] as ParentChild[];
    }

    const { data: studentRows, error: studentError } = await parentSupabase
      .from('students')
      .select(
        'id, student_code, display_name, class_level, avatar_key, total_points'
      )
      .in('id', studentIds)
      .order('created_at', { ascending: true });

    throwSupabaseError(studentError);

    const children = await Promise.all(
      ((studentRows ?? []) as StudentRow[]).map(async (student) => {
        const { data, error } = await parentSupabase
          .rpc('get_student_report', {
            p_student_id: student.id,
          })
          .single();

        throwSupabaseError(error);
        return mapReport(student, data as StudentReportRow);
      })
    );

    return children;
  },

  async getLinkRequests() {
    const parentUserId = await getParentUserId();
    const { data, error } = await parentSupabase
      .from('parent_link_requests')
      .select('id, student_id, status, expires_at, created_at')
      .eq('parent_user_id', parentUserId)
      .order('created_at', { ascending: false })
      .limit(10);

    throwSupabaseError(error);

    return (data ?? []).map((row) => ({
      id: row.id as string,
      studentId: row.student_id as string,
      status: row.status as ParentLinkRequest['status'],
      expiresAt: row.expires_at as string,
      createdAt: row.created_at as string,
    }));
  },

  async subscribeToLinkChanges(onChange: () => void) {
    const parentUserId = await getParentUserId();
    const channel = parentSupabase
      .channel(nextRealtimeChannelName(`parent-link-dashboard-${parentUserId}`))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parent_link_requests',
          filter: `parent_user_id=eq.${parentUserId}`,
        },
        onChange
      )
      .subscribe();

    return () => {
      void parentSupabase.removeChannel(channel);
    };
  },
};