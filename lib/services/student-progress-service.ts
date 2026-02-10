// Student Progress Service - LocalStorage only (no database operations)
// This is separate from teacher mode and stores progress locally

export interface StudentQuranProgress {
  lastSurah: number;
  lastSurahName: string;
  lastAyah: number;
  completedSurahs: number[];
  lastReadAt: string;
}

export interface StudentIqraProgress {
  currentJilid: number;
  currentPage: number;
  completedJilids: number[];
  lastReadAt: string;
}

export interface StudentHijaiyahProgress {
  completedLetters: number[];
  lastTracedAt: string;
}

export interface StudentProgress {
  quran: StudentQuranProgress;
  iqra: StudentIqraProgress;
  hijaiyah: StudentHijaiyahProgress;
}

const STORAGE_KEY = 'student_progress';

// Default progress values
const defaultProgress: StudentProgress = {
  quran: {
    lastSurah: 1,
    lastSurahName: 'Al-Fatihah',
    lastAyah: 1,
    completedSurahs: [],
    lastReadAt: '',
  },
  iqra: {
    currentJilid: 1,
    currentPage: 1,
    completedJilids: [],
    lastReadAt: '',
  },
  hijaiyah: {
    completedLetters: [],
    lastTracedAt: '',
  },
};

// ============================================
// LOCAL STORAGE FUNCTIONS
// ============================================

export function getStudentProgress(): StudentProgress {
  if (typeof window === 'undefined') return defaultProgress;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with default to ensure all fields exist
      return {
        quran: { ...defaultProgress.quran, ...parsed.quran },
        iqra: { ...defaultProgress.iqra, ...parsed.iqra },
        hijaiyah: { ...defaultProgress.hijaiyah, ...parsed.hijaiyah },
      };
    }
  } catch (error) {
    console.error('Error reading student progress:', error);
  }
  
  return defaultProgress;
}

export function saveStudentProgress(progress: StudentProgress): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving student progress:', error);
  }
}

// ============================================
// QURAN PROGRESS FUNCTIONS
// ============================================

export function updateQuranProgress(
  surahNumber: number,
  surahName: string,
  ayahNumber: number
): StudentQuranProgress {
  const progress = getStudentProgress();
  
  progress.quran = {
    ...progress.quran,
    lastSurah: surahNumber,
    lastSurahName: surahName,
    lastAyah: ayahNumber,
    lastReadAt: new Date().toISOString(),
  };
  
  saveStudentProgress(progress);
  return progress.quran;
}

export function markSurahCompleted(surahNumber: number): StudentQuranProgress {
  const progress = getStudentProgress();
  
  if (!progress.quran.completedSurahs.includes(surahNumber)) {
    progress.quran.completedSurahs = [...progress.quran.completedSurahs, surahNumber].sort((a, b) => a - b);
    progress.quran.lastReadAt = new Date().toISOString();
  }
  
  saveStudentProgress(progress);
  return progress.quran;
}

export function getQuranProgress(): StudentQuranProgress {
  return getStudentProgress().quran;
}

// ============================================
// IQRA PROGRESS FUNCTIONS
// ============================================

export function updateIqraProgress(
  jilid: number,
  page: number
): StudentIqraProgress {
  const progress = getStudentProgress();
  
  progress.iqra = {
    ...progress.iqra,
    currentJilid: jilid,
    currentPage: page,
    lastReadAt: new Date().toISOString(),
  };
  
  saveStudentProgress(progress);
  return progress.iqra;
}

export function markJilidCompleted(jilid: number): StudentIqraProgress {
  const progress = getStudentProgress();
  
  if (!progress.iqra.completedJilids.includes(jilid)) {
    progress.iqra.completedJilids = [...progress.iqra.completedJilids, jilid].sort((a, b) => a - b);
    progress.iqra.lastReadAt = new Date().toISOString();
  }
  
  saveStudentProgress(progress);
  return progress.iqra;
}

export function getIqraProgress(): StudentIqraProgress {
  return getStudentProgress().iqra;
}

// ============================================
// HIJAIYAH PROGRESS FUNCTIONS
// ============================================

export function markHijaiyahLetterCompleted(letterIndex: number): StudentHijaiyahProgress {
  const progress = getStudentProgress();
  
  if (!progress.hijaiyah.completedLetters.includes(letterIndex)) {
    progress.hijaiyah.completedLetters = [...progress.hijaiyah.completedLetters, letterIndex].sort((a, b) => a - b);
    progress.hijaiyah.lastTracedAt = new Date().toISOString();
  }
  
  saveStudentProgress(progress);
  return progress.hijaiyah;
}

export function getHijaiyahProgress(): StudentHijaiyahProgress {
  return getStudentProgress().hijaiyah;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function hasQuranProgress(): boolean {
  const progress = getQuranProgress();
  return progress.lastSurah > 1 || progress.lastAyah > 1 || progress.completedSurahs.length > 0;
}

export function hasIqraProgress(): boolean {
  const progress = getIqraProgress();
  return progress.currentJilid > 1 || progress.currentPage > 1 || progress.completedJilids.length > 0;
}

export function hasHijaiyahProgress(): boolean {
  const progress = getHijaiyahProgress();
  return progress.completedLetters.length > 0;
}

export function clearAllProgress(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
