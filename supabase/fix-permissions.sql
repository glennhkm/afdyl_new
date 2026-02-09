-- =============================================
-- FIX PERMISSIONS FOR AFDYL TEACHER MODE
-- Run this in Supabase SQL Editor AFTER running schema.sql
-- =============================================

-- Step 1: Drop all existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read on rooms" ON rooms;
DROP POLICY IF EXISTS "Allow public insert on rooms" ON rooms;
DROP POLICY IF EXISTS "Allow public update on rooms" ON rooms;
DROP POLICY IF EXISTS "Allow public delete on rooms" ON rooms;

DROP POLICY IF EXISTS "Allow public read on students" ON students;
DROP POLICY IF EXISTS "Allow public insert on students" ON students;
DROP POLICY IF EXISTS "Allow public update on students" ON students;
DROP POLICY IF EXISTS "Allow public delete on students" ON students;

DROP POLICY IF EXISTS "Allow public read on quran_progress" ON quran_progress;
DROP POLICY IF EXISTS "Allow public insert on quran_progress" ON quran_progress;
DROP POLICY IF EXISTS "Allow public update on quran_progress" ON quran_progress;
DROP POLICY IF EXISTS "Allow public delete on quran_progress" ON quran_progress;

DROP POLICY IF EXISTS "Allow public read on iqra_progress" ON iqra_progress;
DROP POLICY IF EXISTS "Allow public insert on iqra_progress" ON iqra_progress;
DROP POLICY IF EXISTS "Allow public update on iqra_progress" ON iqra_progress;
DROP POLICY IF EXISTS "Allow public delete on iqra_progress" ON iqra_progress;

DROP POLICY IF EXISTS "Allow public read on hijaiyah_progress" ON hijaiyah_progress;
DROP POLICY IF EXISTS "Allow public insert on hijaiyah_progress" ON hijaiyah_progress;
DROP POLICY IF EXISTS "Allow public update on hijaiyah_progress" ON hijaiyah_progress;
DROP POLICY IF EXISTS "Allow public delete on hijaiyah_progress" ON hijaiyah_progress;

-- Step 2: Grant table permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 3: Grant specific table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON students TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON quran_progress TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON iqra_progress TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON hijaiyah_progress TO anon;

-- Step 4: Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE quran_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE iqra_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE hijaiyah_progress ENABLE ROW LEVEL SECURITY;

-- Step 5: Create new policies with explicit anon role
-- ROOMS policies
CREATE POLICY "anon_select_rooms" ON rooms FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_rooms" ON rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_rooms" ON rooms FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_rooms" ON rooms FOR DELETE TO anon USING (true);

-- STUDENTS policies
CREATE POLICY "anon_select_students" ON students FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon USING (true);

-- QURAN_PROGRESS policies
CREATE POLICY "anon_select_quran_progress" ON quran_progress FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_quran_progress" ON quran_progress FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_quran_progress" ON quran_progress FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_quran_progress" ON quran_progress FOR DELETE TO anon USING (true);

-- IQRA_PROGRESS policies
CREATE POLICY "anon_select_iqra_progress" ON iqra_progress FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_iqra_progress" ON iqra_progress FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_iqra_progress" ON iqra_progress FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_iqra_progress" ON iqra_progress FOR DELETE TO anon USING (true);

-- HIJAIYAH_PROGRESS policies
CREATE POLICY "anon_select_hijaiyah_progress" ON hijaiyah_progress FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_hijaiyah_progress" ON hijaiyah_progress FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_hijaiyah_progress" ON hijaiyah_progress FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_hijaiyah_progress" ON hijaiyah_progress FOR DELETE TO anon USING (true);

-- Verify the setup
SELECT table_name, is_insertable_into 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('rooms', 'students', 'quran_progress', 'iqra_progress', 'hijaiyah_progress');
