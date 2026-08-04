import { isSupabaseConfigured, supabase } from '../../../config/supabase';

let realtimeChannelSequence = 0;

function nextRealtimeChannelName(prefix: string) {
  realtimeChannelSequence += 1;
  return `${prefix}-${Date.now()}-${realtimeChannelSequence}`;
}

export type StudentRow = {
  id: string;
  student_code: string;
  display_name: string;
  class_level: number;
  avatar_key: string;
  total_points: number;
};

export type PendingParentLinkRequest = {
  id: string;
  createdAt: string;
  expiresAt: string;
};

function throwSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export const studentService = {
  async ensureSession() {
    if (!isSupabaseConfigured) {
      throw new Error('Cloud sync is not configured.');
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    throwSupabaseError(sessionError);

    if (sessionData.session?.user) {
      return sessionData.session.user;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    throwSupabaseError(error);

    if (!data.user) {
      throw new Error('Anonymous student account could not be created.');
    }

    return data.user;
  },

  async createStudent(classLevel: number, nickname = 'তুমি') {
    await this.ensureSession();

    const { data, error } = await supabase
      .rpc('create_student_profile', {
        p_display_name: nickname,
        p_class_level: classLevel,
        p_avatar_key: 'tiger-1',
      })
      .single();

    throwSupabaseError(error);

    if (!data) {
      throw new Error('Student profile could not be created.');
    }

    return data as StudentRow;
  },

  async restoreStudent(recoveryCode: string) {
  await this.ensureSession();

  const { data, error } = await supabase.rpc(
    "restore_student_by_recovery_code",
    {
      p_recovery_code: recoveryCode,
    }
  );

  throwSupabaseError(error);

  if (!data) {
    throw new Error("Student not found.");
  }

  return this.getStudent(data as string);
},

  async getStudent(studentId: string) {
    const { data, error } = await supabase
      .from('students')
      .select(
        'id, student_code, display_name, class_level, avatar_key, total_points'
      )
      .eq('id', studentId)
      .maybeSingle();

    throwSupabaseError(error);
    return (data as StudentRow | null) ?? null;
  },
  

  async findChildDeviceStudent(userId: string) {
    const { data: access, error: accessError } = await supabase
      .from('student_access')
      .select('student_id')
      .eq('user_id', userId)
      .eq('access_type', 'child_device')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    throwSupabaseError(accessError);

    if (!access?.student_id) {
      return null;
    }

    return this.getStudent(access.student_id as string);
  },

  async hasParentLink(studentId: string) {
    if (!isSupabaseConfigured || studentId.startsWith('local-')) return false;

    const { data, error } = await supabase
      .from('student_access')
      .select('user_id')
      .eq('student_id', studentId)
      .eq('access_type', 'parent')
      .limit(1)
      .maybeSingle();

    throwSupabaseError(error);
    return Boolean(data);
  },

  async getPendingParentLinkRequest(studentId: string) {
    if (!isSupabaseConfigured || studentId.startsWith('local-')) return null;

    const { data, error } = await supabase
      .from('parent_link_requests')
      .select('id, created_at, expires_at')
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    throwSupabaseError(error);

    if (!data) {
      return null;
    }

    return {
      id: data.id as string,
      createdAt: data.created_at as string,
      expiresAt: data.expires_at as string,
    } satisfies PendingParentLinkRequest;
  },

  async respondToParentLink(requestId: string, accept: boolean) {
    if (!isSupabaseConfigured) throw new Error('Cloud sync is not configured.');

    const { data, error } = await supabase.rpc('respond_parent_link', {
      p_request_id: requestId,
      p_accept: accept,
    });

    throwSupabaseError(error);
    return data;
  },

  subscribeToParentLinkRequests(studentId: string, onChange: () => void) {
    if (!isSupabaseConfigured || studentId.startsWith('local-')) return () => undefined;

    const channel = supabase
      .channel(nextRealtimeChannelName(`child-parent-link-${studentId}`))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parent_link_requests',
          filter: `student_id=eq.${studentId}`,
        },
        onChange
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};