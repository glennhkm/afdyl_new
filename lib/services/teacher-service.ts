// Teacher Service - Hybrid: localStorage (Primary) + Supabase (Backup & Sync)

import { supabase } from '@/lib/supabase/client';
import type { 
  Room, 
  Student, 
  QuranProgress, 
  IqraProgress, 
  HijaiyahProgress,
  TeacherSession 
} from '@/types/teacher';
import { STORAGE_KEYS } from '@/types/teacher';

// Re-export types and constants for convenience
export type { Room, Student, QuranProgress, IqraProgress, HijaiyahProgress, TeacherSession };
export { STORAGE_KEYS };

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================
// LOCAL STORAGE FUNCTIONS (Primary)
// ============================================

export function getAllRoomsFromLocal(): Room[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
  return data ? JSON.parse(data) : [];
}

export function saveRoomsToLocal(rooms: Room[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
}

export function getRoomByIdFromLocal(roomId: string): Room | null {
  const rooms = getAllRoomsFromLocal();
  return rooms.find(r => r.id === roomId) || null;
}

export function getRoomByPinFromLocal(pin: string): Room | null {
  const rooms = getAllRoomsFromLocal();
  return rooms.find(r => r.pin === pin) || null;
}

export function saveRoomToLocal(room: Room): void {
  const rooms = getAllRoomsFromLocal();
  const existingIndex = rooms.findIndex(r => r.id === room.id);
  if (existingIndex >= 0) {
    rooms[existingIndex] = room;
  } else {
    rooms.push(room);
  }
  saveRoomsToLocal(rooms);
}

export function deleteRoomFromLocal(roomId: string): void {
  const rooms = getAllRoomsFromLocal();
  const filtered = rooms.filter(r => r.id !== roomId);
  saveRoomsToLocal(filtered);
}

// ============================================
// SESSION FUNCTIONS (localStorage only)
// ============================================

export function getSession(): TeacherSession | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.SESSION);
  return data ? JSON.parse(data) : null;
}

export function setSession(session: TeacherSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_STUDENT);
}

export function getCurrentStudentId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT);
}

export function setCurrentStudentId(studentId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, studentId);
}

export function clearCurrentStudent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_STUDENT);
}

// ============================================
// SUPABASE BACKUP FUNCTIONS
// ============================================

async function backupRoomToSupabase(room: Room): Promise<void> {
  try {
    console.log('[backupRoomToSupabase] Starting backup for room:', room.id, room.pin);
    
    // Upsert room
    const { error: roomError } = await supabase.from('rooms').upsert({
      id: room.id,
      pin: room.pin,
      class_name: room.className,
      teacher_name: room.teacherName,
      created_at: room.createdAt,
    }, { onConflict: 'id' });

    if (roomError) {
      console.error('[backupRoomToSupabase] Room upsert failed:', roomError);
      return;
    }
    
    console.log('[backupRoomToSupabase] Room upserted successfully');

    // Backup students
    for (const student of room.students) {
      const { error: studentError } = await supabase.from('students').upsert({
        id: student.id,
        room_id: room.id,
        name: student.name,
        joined_at: student.joinedAt,
      }, { onConflict: 'id' });

      if (studentError) {
        console.error('[backupRoomToSupabase] Student upsert failed:', studentError);
        continue;
      }

      // Backup quran progress
      const { error: quranError } = await supabase.from('quran_progress').upsert({
        student_id: student.id,
        last_surah: student.quranProgress.lastSurah,
        last_ayah: student.quranProgress.lastAyah,
        completed_surahs: student.quranProgress.completedSurahs,
      }, { onConflict: 'student_id' });

      if (quranError) {
        console.error('[backupRoomToSupabase] Quran progress upsert failed:', quranError);
      }

      // Backup iqra progress
      const { error: iqraError } = await supabase.from('iqra_progress').upsert({
        student_id: student.id,
        current_jilid: student.iqraProgress.currentJilid,
        current_page: student.iqraProgress.currentPage,
        completed_jilids: student.iqraProgress.completedJilids,
      }, { onConflict: 'student_id' });

      if (iqraError) {
        console.error('[backupRoomToSupabase] Iqra progress upsert failed:', iqraError);
      }

      // Backup hijaiyah progress
      const { error: hijaiyahError } = await supabase.from('hijaiyah_progress').upsert({
        student_id: student.id,
        completed_letters: student.hijaiyahProgress.completedLetters,
      }, { onConflict: 'student_id' });

      if (hijaiyahError) {
        console.error('[backupRoomToSupabase] Hijaiyah progress upsert failed:', hijaiyahError);
      }
    }
    
    console.log('[backupRoomToSupabase] Backup completed for room:', room.id);
  } catch (error) {
    console.error('[backupRoomToSupabase] Backup to Supabase failed:', error);
    // Don't throw - backup failure shouldn't break the app
  }
}

async function fetchRoomFromSupabase(pin: string): Promise<Room | null> {
  try {
    // Fetch room by PIN
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('pin', pin)
      .single();

    if (roomError || !roomData) return null;

    // Fetch students for this room
    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .eq('room_id', roomData.id);

    const students: Student[] = [];

    if (studentsData) {
      for (const studentRow of studentsData) {
        // Fetch progress for each student
        const { data: quranData } = await supabase
          .from('quran_progress')
          .select('*')
          .eq('student_id', studentRow.id)
          .single();

        const { data: iqraData } = await supabase
          .from('iqra_progress')
          .select('*')
          .eq('student_id', studentRow.id)
          .single();

        const { data: hijaiyahData } = await supabase
          .from('hijaiyah_progress')
          .select('*')
          .eq('student_id', studentRow.id)
          .single();

        students.push({
          id: studentRow.id,
          name: studentRow.name,
          joinedAt: studentRow.joined_at,
          quranProgress: quranData ? {
            lastSurah: quranData.last_surah,
            lastAyah: quranData.last_ayah,
            completedSurahs: quranData.completed_surahs || [],
          } : { lastSurah: 1, lastAyah: 1, completedSurahs: [] },
          iqraProgress: iqraData ? {
            currentJilid: iqraData.current_jilid,
            currentPage: iqraData.current_page,
            completedJilids: iqraData.completed_jilids || [],
          } : { currentJilid: 1, currentPage: 1, completedJilids: [] },
          hijaiyahProgress: hijaiyahData ? {
            completedLetters: hijaiyahData.completed_letters || [],
          } : { completedLetters: [] },
        });
      }
    }

    return {
      id: roomData.id,
      pin: roomData.pin,
      className: roomData.class_name,
      teacherName: roomData.teacher_name,
      createdAt: roomData.created_at,
      students,
    };
  } catch (error) {
    console.error('Fetch from Supabase failed:', error);
    return null;
  }
}

async function deleteRoomFromSupabase(roomId: string): Promise<void> {
  try {
    await supabase.from('rooms').delete().eq('id', roomId);
  } catch (error) {
    console.error('Delete from Supabase failed:', error);
  }
}

/**
 * Sync room from Supabase - used for cross-device sync
 * Fetches latest data from Supabase and updates localStorage
 */
export async function syncRoomFromCloud(roomId: string, pin: string): Promise<Room | null> {
  try {
    console.log('[syncRoomFromCloud] Starting sync for room:', roomId);
    
    // Fetch from Supabase
    const remoteRoom = await fetchRoomFromSupabase(pin);
    
    if (remoteRoom) {
      console.log('[syncRoomFromCloud] Got remote room with', remoteRoom.students.length, 'students');
      
      // Merge with local data - remote takes priority for students
      const localRoom = getRoomByIdFromLocal(roomId);
      
      if (localRoom) {
        // Merge students: keep local students not in remote, add all remote students
        const remoteStudentIds = new Set(remoteRoom.students.map(s => s.id));
        
        // Students that exist only locally (not synced to cloud yet)
        const localOnlyStudents = localRoom.students.filter(s => !remoteStudentIds.has(s.id));
        
        // Combine: all remote students + local-only students
        remoteRoom.students = [...remoteRoom.students, ...localOnlyStudents];
        
        console.log('[syncRoomFromCloud] Merged students count:', remoteRoom.students.length);
      }
      
      // Update localStorage with merged data
      saveRoomToLocal(remoteRoom);
      
      // Also backup merged data to Supabase
      backupRoomToSupabase(remoteRoom);
      
      console.log('[syncRoomFromCloud] Sync completed successfully');
      return remoteRoom;
    }
    
    console.log('[syncRoomFromCloud] No remote room found, returning local');
    return getRoomByIdFromLocal(roomId);
  } catch (error) {
    console.error('[syncRoomFromCloud] Sync failed:', error);
    // Return local data as fallback
    return getRoomByIdFromLocal(roomId);
  }
}

async function deleteStudentFromSupabase(studentId: string): Promise<void> {
  try {
    await supabase.from('students').delete().eq('id', studentId);
  } catch (error) {
    console.error('Delete student from Supabase failed:', error);
  }
}

// ============================================
// MAIN API FUNCTIONS (Hybrid)
// ============================================

/**
 * Get all rooms from localStorage (for room history)
 */
export function getAllRooms(): Room[] {
  return getAllRoomsFromLocal();
}

/**
 * Get room by ID from localStorage
 */
export function getRoomById(roomId: string): Room | null {
  return getRoomByIdFromLocal(roomId);
}

/**
 * Get room by PIN - check localStorage first, then Supabase
 */
export async function getRoomByPin(pin: string): Promise<Room | null> {
  // First check localStorage
  const localRoom = getRoomByPinFromLocal(pin);
  if (localRoom) return localRoom;

  // If not found locally, try Supabase (for cross-device access)
  const remoteRoom = await fetchRoomFromSupabase(pin);
  if (remoteRoom) {
    // Save to localStorage for future access
    saveRoomToLocal(remoteRoom);
    return remoteRoom;
  }

  return null;
}

/**
 * Create a new room - save to localStorage and backup to Supabase
 */
export async function createRoom(className: string, teacherName: string): Promise<Room> {
  const room: Room = {
    id: generateId(),
    pin: generatePin(),
    className,
    teacherName,
    createdAt: new Date().toISOString(),
    students: [],
  };

  // Save to localStorage (primary)
  saveRoomToLocal(room);

  // Backup to Supabase (async, non-blocking)
  backupRoomToSupabase(room);

  return room;
}

/**
 * Delete a room - remove from localStorage and Supabase
 */
export async function deleteRoom(roomId: string): Promise<void> {
  // Delete from localStorage
  deleteRoomFromLocal(roomId);

  // Delete from Supabase
  await deleteRoomFromSupabase(roomId);

  // Clear session if it's the current room
  const session = getSession();
  if (session?.roomId === roomId) {
    clearSession();
  }
}

/**
 * Add student to room - update localStorage and backup to Supabase
 */
export async function addStudent(roomId: string, studentName: string): Promise<Student | null> {
  const room = getRoomByIdFromLocal(roomId);
  if (!room) return null;

  const student: Student = {
    id: generateId(),
    name: studentName,
    joinedAt: new Date().toISOString(),
    quranProgress: { lastSurah: 1, lastAyah: 1, completedSurahs: [] },
    iqraProgress: { currentJilid: 1, currentPage: 1, completedJilids: [] },
    hijaiyahProgress: { completedLetters: [] },
  };

  room.students.push(student);
  saveRoomToLocal(room);

  // Backup to Supabase
  backupRoomToSupabase(room);

  return student;
}

/**
 * Update student name
 */
export async function updateStudentName(roomId: string, studentId: string, newName: string): Promise<boolean> {
  const room = getRoomByIdFromLocal(roomId);
  if (!room) return false;

  const student = room.students.find(s => s.id === studentId);
  if (!student) return false;

  student.name = newName;
  saveRoomToLocal(room);

  // Backup to Supabase
  backupRoomToSupabase(room);

  return true;
}

/**
 * Delete student from room
 */
export async function deleteStudent(roomId: string, studentId: string): Promise<boolean> {
  const room = getRoomByIdFromLocal(roomId);
  if (!room) return false;

  room.students = room.students.filter(s => s.id !== studentId);
  saveRoomToLocal(room);

  // Delete from Supabase
  await deleteStudentFromSupabase(studentId);

  // Clear current student if it's the deleted one
  if (getCurrentStudentId() === studentId) {
    clearCurrentStudent();
  }

  return true;
}

/**
 * Get student by ID
 */
export function getStudent(roomId: string, studentId: string): Student | null {
  const room = getRoomByIdFromLocal(roomId);
  if (!room) return null;
  return room.students.find(s => s.id === studentId) || null;
}

/**
 * Get all students in a room
 */
export function getStudents(roomId: string): Student[] {
  const room = getRoomByIdFromLocal(roomId);
  return room?.students || [];
}

// ============================================
// PROGRESS UPDATE FUNCTIONS
// ============================================

/**
 * Update Quran progress for a student
 */
export async function updateQuranProgress(
  roomId: string,
  studentId: string,
  surahNumber: number,
  ayahNumber: number
): Promise<boolean> {
  const room = getRoomByIdFromLocal(roomId);
  if (!room) return false;

  const student = room.students.find(s => s.id === studentId);
  if (!student) return false;

  student.quranProgress.lastSurah = surahNumber;
  student.quranProgress.lastAyah = ayahNumber;

  saveRoomToLocal(room);
  backupRoomToSupabase(room);

  return true;
}

/**
 * Mark surah as completed
 */
export async function markSurahCompleted(
  roomId: string,
  studentId: string,
  surahNumber: number
): Promise<boolean> {
  const room = getRoomByIdFromLocal(roomId);
  if (!room) return false;

  const student = room.students.find(s => s.id === studentId);
  if (!student) return false;

  if (!student.quranProgress.completedSurahs.includes(surahNumber)) {
    student.quranProgress.completedSurahs.push(surahNumber);
  }

  saveRoomToLocal(room);
  backupRoomToSupabase(room);

  return true;
}

/**
 * Update Iqra progress for a student
 */
export async function updateIqraProgress(
  roomId: string,
  studentId: string,
  jilid: number,
  page: number
): Promise<boolean> {
  const room = getRoomByIdFromLocal(roomId);
  if (!room) return false;

  const student = room.students.find(s => s.id === studentId);
  if (!student) return false;

  student.iqraProgress.currentJilid = jilid;
  student.iqraProgress.currentPage = page;

  saveRoomToLocal(room);
  backupRoomToSupabase(room);

  return true;
}

/**
 * Mark jilid as completed
 */
export async function markJilidCompleted(
  roomId: string,
  studentId: string,
  jilid: number
): Promise<boolean> {
  const room = getRoomByIdFromLocal(roomId);
  if (!room) return false;

  const student = room.students.find(s => s.id === studentId);
  if (!student) return false;

  if (!student.iqraProgress.completedJilids.includes(jilid)) {
    student.iqraProgress.completedJilids.push(jilid);
  }

  saveRoomToLocal(room);
  backupRoomToSupabase(room);

  return true;
}

/**
 * Mark hijaiyah letter as completed
 */
export async function markHijaiyahLetterCompleted(
  roomId: string,
  studentId: string,
  letterIndex: number
): Promise<boolean> {
  const room = getRoomByIdFromLocal(roomId);
  if (!room) return false;

  const student = room.students.find(s => s.id === studentId);
  if (!student) return false;

  if (!student.hijaiyahProgress.completedLetters.includes(letterIndex)) {
    student.hijaiyahProgress.completedLetters.push(letterIndex);
  }

  saveRoomToLocal(room);
  backupRoomToSupabase(room);

  return true;
}

/**
 * Sync local data with Supabase (for manual sync)
 */
export async function syncWithSupabase(): Promise<void> {
  const rooms = getAllRoomsFromLocal();
  for (const room of rooms) {
    await backupRoomToSupabase(room);
  }
}
