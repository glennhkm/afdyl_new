// types/teacher.ts
// Types for Teacher Mode - Hybrid Storage (localStorage + Supabase backup)

// Define types here to avoid circular dependencies
export interface Room {
  id: string;
  pin: string;
  className: string;
  teacherName: string;
  createdAt: string;
  students: Student[];
}

export interface Student {
  id: string;
  name: string;
  joinedAt: string;
  quranProgress: QuranProgress;
  iqraProgress: IqraProgress;
  hijaiyahProgress: HijaiyahProgress;
}

export interface QuranProgress {
  lastSurah: number;
  lastAyah: number;
  completedSurahs: number[];
}

export interface IqraProgress {
  currentJilid: number;
  currentPage: number;
  completedJilids: number[];
}

export interface HijaiyahProgress {
  completedLetters: number[];
}

export interface TeacherSession {
  roomId: string;
  roomPin: string;
  className: string;
  teacherName: string;
}

export const STORAGE_KEYS = {
  SESSION: 'teacher_session',
  ROOMS: 'teacher_rooms',
  CURRENT_STUDENT: 'current_student_id',
} as const;
