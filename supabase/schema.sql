-- =============================================
-- AFDYL Teacher Mode Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop existing tables if they exist (optional - uncomment if you want to recreate)
-- DROP TABLE IF EXISTS hijaiyah_progress CASCADE;
-- DROP TABLE IF EXISTS iqra_progress CASCADE;
-- DROP TABLE IF EXISTS quran_progress CASCADE;
-- DROP TABLE IF EXISTS students CASCADE;
-- DROP TABLE IF EXISTS rooms CASCADE;

-- =============================================
-- 1. ROOMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  pin TEXT UNIQUE NOT NULL,
  class_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_rooms_pin ON rooms(pin);

-- =============================================    
-- 2. STUDENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster room-based lookups
CREATE INDEX IF NOT EXISTS idx_students_room_id ON students(room_id);

-- =============================================
-- 3. QURAN PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS quran_progress (
  student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  last_surah INTEGER DEFAULT 1,
  last_ayah INTEGER DEFAULT 1,
  completed_surahs INTEGER[] DEFAULT '{}'
);

-- =============================================
-- 4. IQRA PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS iqra_progress (
  student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  current_jilid INTEGER DEFAULT 1,
  current_page INTEGER DEFAULT 1,
  completed_jilids INTEGER[] DEFAULT '{}'
);

-- =============================================
-- 5. HIJAIYAH PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS hijaiyah_progress (
  student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  completed_letters INTEGER[] DEFAULT '{}'
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allow public access (no authentication required)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE quran_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE iqra_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE hijaiyah_progress ENABLE ROW LEVEL SECURITY;

-- ROOMS policies
CREATE POLICY "Allow public read on rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert on rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on rooms" ON rooms FOR DELETE USING (true);

-- STUDENTS policies
CREATE POLICY "Allow public read on students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public insert on students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on students" ON students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on students" ON students FOR DELETE USING (true);

-- QURAN_PROGRESS policies
CREATE POLICY "Allow public read on quran_progress" ON quran_progress FOR SELECT USING (true);
CREATE POLICY "Allow public insert on quran_progress" ON quran_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on quran_progress" ON quran_progress FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on quran_progress" ON quran_progress FOR DELETE USING (true);

-- IQRA_PROGRESS policies
CREATE POLICY "Allow public read on iqra_progress" ON iqra_progress FOR SELECT USING (true);
CREATE POLICY "Allow public insert on iqra_progress" ON iqra_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on iqra_progress" ON iqra_progress FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on iqra_progress" ON iqra_progress FOR DELETE USING (true);

-- HIJAIYAH_PROGRESS policies
CREATE POLICY "Allow public read on hijaiyah_progress" ON hijaiyah_progress FOR SELECT USING (true);
CREATE POLICY "Allow public insert on hijaiyah_progress" ON hijaiyah_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on hijaiyah_progress" ON hijaiyah_progress FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on hijaiyah_progress" ON hijaiyah_progress FOR DELETE USING (true);

-- =============================================
-- VERIFY TABLES CREATED SUCCESSFULLY
-- =============================================
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rooms', 'students', 'quran_progress', 'iqra_progress', 'hijaiyah_progress');
