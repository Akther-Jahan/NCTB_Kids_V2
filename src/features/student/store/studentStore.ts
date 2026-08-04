import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { isSupabaseConfigured } from '../../../config/supabase';
import {
  studentService,
  type StudentRow,
} from '../services/studentService';

const STORAGE_KEY = 'nctb_student_v2';

export type StudentProfile = {
  id: string;
  studentCode: string;
  classLevel: number;
  nickname: string;
  avatar: string;
  parentLinked: boolean;
  accountType: 'guest' | 'parent';
  totalPoints: number;
};

type StudentStore = {
  student: StudentProfile | null;
  createStudent: (classLevel: number) => Promise<StudentProfile>;
  loadStudent: () => Promise<void>;
  restoreStudent: (recoveryCode: string) => Promise<StudentProfile>;
  linkParent: () => Promise<void>;
  clearStudent: () => Promise<void>;
};

function validStudent(value: unknown): value is StudentProfile {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<StudentProfile>;
  return typeof item.id === 'string' && typeof item.studentCode === 'string' &&
    Number.isInteger(item.classLevel) && Number(item.classLevel) >= 1 && Number(item.classLevel) <= 3;
}

function mapStudentRow(
  row: StudentRow,
  parentLinked: boolean
): StudentProfile {
  return {
    id: row.id,
    studentCode: row.student_code,
    classLevel: row.class_level,
    nickname: row.display_name,
    avatar:
  row.avatar_key === 'tiger-1'
    ? '🐯'
    : row.avatar_key === 'lion-1'
    ? '🦁'
    : '🐼',
    parentLinked,
    accountType: parentLinked ? 'parent' : 'guest',
    totalPoints: row.total_points,
  };
}


function createLocalStudent(classLevel: number): StudentProfile {
  const random = Math.floor(10000 + Math.random() * 90000);

  return {
    id: `local-${Date.now()}-${random}`,
    studentCode: `NCTB-C${classLevel}-${random}`,
    classLevel,
    nickname: 'তুমি',
    avatar: '🐯',
    parentLinked: false,
    accountType: 'guest',
    totalPoints: 0,
  };
}

async function saveStudent(profile: StudentProfile) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

async function readCachedStudent() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!validStudent(parsed)) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      ...parsed,
      nickname: parsed.nickname ?? 'তুমি',
      avatar: parsed.avatar ?? '🐯',
      parentLinked: parsed.parentLinked ?? false,
      accountType: parsed.accountType ?? 'guest',
      totalPoints: parsed.totalPoints ?? 0,
    };
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export const useStudentStore = create<StudentStore>((set, get) => ({
  student: null,
    createStudent: async (classLevel) => {
  const existing = get().student;

  if (existing) {
    return existing;
  }

  let profile: StudentProfile;

  if (isSupabaseConfigured) {
    try {
      const user = await studentService.ensureSession();

      const existingStudent =
        await studentService.findChildDeviceStudent(user.id);

      if (existingStudent) {
        const parentLinked =
          await studentService.hasParentLink(existingStudent.id);

        profile = mapStudentRow(existingStudent, parentLinked);

      } else {

        const row =
          await studentService.createStudent(classLevel);

        profile = mapStudentRow(row, false);
      }

    } catch (error) {
      console.warn(
        'Cloud student creation failed; using local mode.',
        error
      );

      profile = createLocalStudent(classLevel);
    }

  } else {

    profile = createLocalStudent(classLevel);

  }

  await saveStudent(profile);
  set({ student: profile });

  return profile;
},



  loadStudent: async () => {
    const cached = await readCachedStudent();

    if (cached) {
      set({ student: cached });
    }

    if (!isSupabaseConfigured || cached?.id.startsWith('local-')) {
      return;
    }

    try {
      const user = await studentService.ensureSession();
      let row = cached
        ? await studentService.getStudent(cached.id)
        : null;

      if (!row) {
        row = await studentService.findChildDeviceStudent(user.id);
      }

      if (!row) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        set({ student: null });
        return;
      }

      const parentLinked = await studentService.hasParentLink(row.id);
      const profile = mapStudentRow(row, parentLinked);

      await saveStudent(profile);
      set({ student: profile });
    } catch (error) {
      if (cached) {
        return;
      }

      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ student: null });
      throw error;
    }
  },
  restoreStudent: async (recoveryCode: string) => {
  if (!isSupabaseConfigured) {
    throw new Error("Cloud sync is not configured.");
  }

  const row = await studentService.restoreStudent(recoveryCode);

  if (!row) {
    throw new Error("Student not found.");
  }

  const parentLinked = await studentService.hasParentLink(row.id);

  const profile = mapStudentRow(row, parentLinked);

  await saveStudent(profile);

  set({
    student: profile,
  });

  return profile;
},

  linkParent: async () => {
    const student = get().student;

    if (!student) {
      return;
    }

    const parentLinked = await studentService.hasParentLink(student.id);
    const next = { ...student, parentLinked };

    await saveStudent(next);
    set({ student: next });
  },

  clearStudent: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ student: null });
  },
}));