"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  StudentQuranProgress,
  StudentIqraProgress,
  StudentHijaiyahProgress,
  getStudentProgress,
  updateQuranProgress as updateQuranProgressService,
  markSurahCompleted as markSurahCompletedService,
  updateIqraProgress as updateIqraProgressService,
  markJilidCompleted as markJilidCompletedService,
  markHijaiyahLetterCompleted as markHijaiyahLetterCompletedService,
} from '@/lib/services/student-progress-service';

interface StudentProgressContextValue {
  // Progress data
  quranProgress: StudentQuranProgress;
  iqraProgress: StudentIqraProgress;
  hijaiyahProgress: StudentHijaiyahProgress;
  
  // Loading state
  isLoading: boolean;
  
  // Helper functions to check if there's any progress
  hasQuranProgress: boolean;
  hasIqraProgress: boolean;
  hasHijaiyahProgress: boolean;
  
  // Update functions
  markQuranProgress: (surahNumber: number, surahName: string, ayahNumber: number) => void;
  markSurahDone: (surahNumber: number) => void;
  markIqraProgress: (jilid: number, page: number) => void;
  markJilidDone: (jilid: number) => void;
  markHijaiyahCompleted: (letterIndex: number) => void;
  
  // Refresh function
  refresh: () => void;
}

const defaultQuranProgress: StudentQuranProgress = {
  lastSurah: 1,
  lastSurahName: 'Al-Fatihah',
  lastAyah: 1,
  completedSurahs: [],
  lastReadAt: '',
};

const defaultIqraProgress: StudentIqraProgress = {
  currentJilid: 1,
  currentPage: 1,
  completedJilids: [],
  lastReadAt: '',
};

const defaultHijaiyahProgress: StudentHijaiyahProgress = {
  completedLetters: [],
  lastTracedAt: '',
};

const StudentProgressContext = createContext<StudentProgressContextValue | undefined>(undefined);

export function useStudentProgress() {
  const context = useContext(StudentProgressContext);
  if (!context) {
    throw new Error('useStudentProgress must be used within a StudentProgressProvider');
  }
  return context;
}

export function StudentProgressProvider({ children }: { children: React.ReactNode }) {
  const [quranProgress, setQuranProgress] = useState<StudentQuranProgress>(defaultQuranProgress);
  const [iqraProgress, setIqraProgress] = useState<StudentIqraProgress>(defaultIqraProgress);
  const [hijaiyahProgress, setHijaiyahProgress] = useState<StudentHijaiyahProgress>(defaultHijaiyahProgress);
  const [isLoading, setIsLoading] = useState(true);

  // Load progress from localStorage on mount
  const loadProgress = useCallback(() => {
    setIsLoading(true);
    try {
      const progress = getStudentProgress();
      setQuranProgress(progress.quran);
      setIqraProgress(progress.iqra);
      setHijaiyahProgress(progress.hijaiyah);
    } catch (error) {
      console.error('Error loading student progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Check if there's any progress
  const hasQuranProgress = quranProgress.lastSurah > 1 || quranProgress.lastAyah > 1 || quranProgress.completedSurahs.length > 0;
  const hasIqraProgress = iqraProgress.currentJilid > 1 || iqraProgress.currentPage > 1 || iqraProgress.completedJilids.length > 0;
  const hasHijaiyahProgress = hijaiyahProgress.completedLetters.length > 0;

  // Update functions
  const markQuranProgress = useCallback((surahNumber: number, surahName: string, ayahNumber: number) => {
    const updated = updateQuranProgressService(surahNumber, surahName, ayahNumber);
    setQuranProgress(updated);
  }, []);

  const markSurahDone = useCallback((surahNumber: number) => {
    const updated = markSurahCompletedService(surahNumber);
    setQuranProgress(updated);
  }, []);

  const markIqraProgress = useCallback((jilid: number, page: number) => {
    const updated = updateIqraProgressService(jilid, page);
    setIqraProgress(updated);
  }, []);

  const markJilidDone = useCallback((jilid: number) => {
    const updated = markJilidCompletedService(jilid);
    setIqraProgress(updated);
  }, []);

  const markHijaiyahCompleted = useCallback((letterIndex: number) => {
    const updated = markHijaiyahLetterCompletedService(letterIndex);
    setHijaiyahProgress(updated);
  }, []);

  const value: StudentProgressContextValue = {
    quranProgress,
    iqraProgress,
    hijaiyahProgress,
    isLoading,
    hasQuranProgress,
    hasIqraProgress,
    hasHijaiyahProgress,
    markQuranProgress,
    markSurahDone,
    markIqraProgress,
    markJilidDone,
    markHijaiyahCompleted,
    refresh: loadProgress,
  };

  return (
    <StudentProgressContext.Provider value={value}>
      {children}
    </StudentProgressContext.Provider>
  );
}
