'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Room,
  Student,
  TeacherSession,
  getSession,
  setSession as saveSession,
  clearSession as clearStoredSession,
  getAllRooms,
  getRoomById,
  getRoomByPin,
  createRoom as createRoomService,
  deleteRoom as deleteRoomService,
  addStudent as addStudentService,
  updateStudentName as updateStudentNameService,
  deleteStudent as deleteStudentService,
  getStudent,
  getCurrentStudentId,
  setCurrentStudentId,
  clearCurrentStudent,
  updateQuranProgress,
  markSurahCompleted,
  updateIqraProgress,
  markJilidCompleted,
  markHijaiyahLetterCompleted,
} from '@/lib/services/teacher-service';

// ============================================
// CONTEXT TYPE
// ============================================

interface TeacherContextValue {
  // State
  session: TeacherSession | null;
  currentRoom: Room | null;
  currentStudent: Student | null;
  rooms: Room[];
  isLoading: boolean;

  // Room operations
  createRoom: (className: string, teacherName: string) => Promise<Room | null>;
  joinRoom: (pin: string) => Promise<Room | null>;
  leaveRoom: () => void;
  deleteRoom: (roomId: string) => Promise<void>;
  refreshRooms: () => void;

  // Student operations
  selectStudent: (studentId: string) => void;
  clearStudent: () => void;
  addStudent: (name: string) => Promise<Student | null>;
  updateStudent: (studentId: string, name: string) => Promise<boolean>;
  removeStudent: (studentId: string) => Promise<boolean>;

  // Progress operations
  markQuranProgress: (surahNumber: number, ayahNumber: number) => Promise<void>;
  markSurahDone: (surahNumber: number) => Promise<void>;
  markIqraProgress: (jilid: number, page: number) => Promise<void>;
  markJilidDone: (jilid: number) => Promise<void>;
  markHijaiyahCompleted: (letterIndex: number) => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const TeacherContext = createContext<TeacherContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<TeacherSession | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use refs to avoid infinite loops in callbacks
  const sessionRef = useRef(session);
  const currentStudentRef = useRef(currentStudent);
  const currentRoomRef = useRef(currentRoom);

  // Keep refs in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    currentStudentRef.current = currentStudent;
  }, [currentStudent]);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Load initial state from localStorage
  useEffect(() => {
    const storedSession = getSession();
    if (storedSession) {
      setSessionState(storedSession);
      const room = getRoomById(storedSession.roomId);
      setCurrentRoom(room);

      const studentId = getCurrentStudentId();
      if (studentId && room) {
        const student = getStudent(room.id, studentId);
        setCurrentStudent(student);
      }
    }

    // Load all rooms for history
    setRooms(getAllRooms());
    setIsLoading(false);
  }, []);

  // Refresh rooms list - now stable (no dependencies that change frequently)
  const refreshRooms = useCallback(() => {
    setRooms(getAllRooms());
    // Also refresh current room if exists - using refs to avoid dependency issues
    const currentSession = sessionRef.current;
    const currentStudentValue = currentStudentRef.current;
    
    if (currentSession) {
      const room = getRoomById(currentSession.roomId);
      setCurrentRoom(room);
      if (currentStudentValue && room) {
        const student = getStudent(room.id, currentStudentValue.id);
        setCurrentStudent(student);
      }
    }
  }, []); // Empty dependency array - now stable!

  // Create room
  const createRoom = useCallback(async (className: string, teacherName: string): Promise<Room | null> => {
    setIsLoading(true);
    try {
      const room = await createRoomService(className, teacherName);
      
      const newSession: TeacherSession = {
        roomId: room.id,
        roomPin: room.pin,
        className: room.className,
        teacherName: room.teacherName,
      };
      
      saveSession(newSession);
      setSessionState(newSession);
      setCurrentRoom(room);
      setRooms(getAllRooms());
      
      return room;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Join room by PIN
  const joinRoom = useCallback(async (pin: string): Promise<Room | null> => {
    setIsLoading(true);
    try {
      // This will check localStorage first, then Supabase
      const room = await getRoomByPin(pin);
      if (!room) return null;

      const newSession: TeacherSession = {
        roomId: room.id,
        roomPin: room.pin,
        className: room.className,
        teacherName: room.teacherName,
      };

      saveSession(newSession);
      setSessionState(newSession);
      setCurrentRoom(room);
      setRooms(getAllRooms());

      return room;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Leave room (just clear session, don't delete room)
  const leaveRoom = useCallback(() => {
    clearStoredSession();
    setSessionState(null);
    setCurrentRoom(null);
    setCurrentStudent(null);
  }, []);

  // Delete room
  const deleteRoomHandler = useCallback(async (roomId: string) => {
    await deleteRoomService(roomId);
    setRooms(getAllRooms());
    
    if (sessionRef.current?.roomId === roomId) {
      clearStoredSession();
      setSessionState(null);
      setCurrentRoom(null);
      setCurrentStudent(null);
    }
  }, []);

  // Select student
  const selectStudent = useCallback((studentId: string) => {
    const room = currentRoomRef.current;
    if (!room) return;
    
    const student = getStudent(room.id, studentId);
    if (student) {
      setCurrentStudentId(studentId);
      setCurrentStudent(student);
    }
  }, []);

  // Clear student selection
  const clearStudentHandler = useCallback(() => {
    clearCurrentStudent();
    setCurrentStudent(null);
  }, []);

  // Add student
  const addStudentHandler = useCallback(async (name: string): Promise<Student | null> => {
    const room = currentRoomRef.current;
    if (!room) return null;

    const student = await addStudentService(room.id, name);
    if (student) {
      refreshRooms();
    }
    return student;
  }, [refreshRooms]);

  // Update student name
  const updateStudent = useCallback(async (studentId: string, name: string): Promise<boolean> => {
    const room = currentRoomRef.current;
    if (!room) return false;

    const success = await updateStudentNameService(room.id, studentId, name);
    if (success) {
      refreshRooms();
    }
    return success;
  }, [refreshRooms]);

  // Remove student
  const removeStudent = useCallback(async (studentId: string): Promise<boolean> => {
    const room = currentRoomRef.current;
    if (!room) return false;

    const success = await deleteStudentService(room.id, studentId);
    if (success) {
      if (currentStudentRef.current?.id === studentId) {
        setCurrentStudent(null);
      }
      refreshRooms();
    }
    return success;
  }, [refreshRooms]);

  // Mark Quran progress
  const markQuranProgress = useCallback(async (surahNumber: number, ayahNumber: number) => {
    const room = currentRoomRef.current;
    const student = currentStudentRef.current;
    if (!room || !student) return;

    await updateQuranProgress(room.id, student.id, surahNumber, ayahNumber);
    refreshRooms();
  }, [refreshRooms]);

  // Mark surah done
  const markSurahDone = useCallback(async (surahNumber: number) => {
    const room = currentRoomRef.current;
    const student = currentStudentRef.current;
    if (!room || !student) return;

    await markSurahCompleted(room.id, student.id, surahNumber);
    refreshRooms();
  }, [refreshRooms]);

  // Mark Iqra progress
  const markIqraProgress = useCallback(async (jilid: number, page: number) => {
    const room = currentRoomRef.current;
    const student = currentStudentRef.current;
    if (!room || !student) return;

    await updateIqraProgress(room.id, student.id, jilid, page);
    refreshRooms();
  }, [refreshRooms]);

  // Mark jilid done
  const markJilidDone = useCallback(async (jilid: number) => {
    const room = currentRoomRef.current;
    const student = currentStudentRef.current;
    if (!room || !student) return;

    await markJilidCompleted(room.id, student.id, jilid);
    refreshRooms();
  }, [refreshRooms]);

  // Mark hijaiyah completed
  const markHijaiyahCompleted = useCallback(async (letterIndex: number) => {
    const room = currentRoomRef.current;
    const student = currentStudentRef.current;
    if (!room || !student) return;

    await markHijaiyahLetterCompleted(room.id, student.id, letterIndex);
    refreshRooms();
  }, [refreshRooms]);

  const value: TeacherContextValue = {
    session,
    currentRoom,
    currentStudent,
    rooms,
    isLoading,
    createRoom,
    joinRoom,
    leaveRoom,
    deleteRoom: deleteRoomHandler,
    refreshRooms,
    selectStudent,
    clearStudent: clearStudentHandler,
    addStudent: addStudentHandler,
    updateStudent,
    removeStudent,
    markQuranProgress,
    markSurahDone,
    markIqraProgress,
    markJilidDone,
    markHijaiyahCompleted,
  };

  return (
    <TeacherContext.Provider value={value}>
      {children}
    </TeacherContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useTeacher() {
  const context = useContext(TeacherContext);
  if (!context) {
    throw new Error('useTeacher must be used within a TeacherProvider');
  }
  return context;
}
