-- =====================================================
-- AFDYL Teacher Mode - Supabase Database Schema
-- =====================================================
-- Jalankan SQL ini di Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/owaqlbewctaeidcywrvi/sql
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: rooms (Kelas)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pin VARCHAR(6) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk pencarian PIN (sering digunakan)
CREATE INDEX IF NOT EXISTS idx_rooms_pin ON public.rooms(pin);

-- =====================================================
-- TABLE: students (Siswa)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query siswa per kelas
CREATE INDEX IF NOT EXISTS idx_students_room_id ON public.students(room_id);

-- =====================================================
-- TABLE: quran_progress (Progress Al-Qur'an)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quran_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID UNIQUE NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    last_surah_number INTEGER NOT NULL,
    last_surah_name VARCHAR(100) NOT NULL,
    last_ayah_number INTEGER NOT NULL,
    last_read_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query progress per siswa
CREATE INDEX IF NOT EXISTS idx_quran_progress_student_id ON public.quran_progress(student_id);

-- =====================================================
-- TABLE: iqra_progress (Progress Iqra')
-- =====================================================
CREATE TABLE IF NOT EXISTS public.iqra_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID UNIQUE NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    last_volume_number INTEGER NOT NULL,
    last_page_number INTEGER NOT NULL,
    last_read_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query progress per siswa
CREATE INDEX IF NOT EXISTS idx_iqra_progress_student_id ON public.iqra_progress(student_id);

-- =====================================================
-- TABLE: hijaiyah_progress (Progress Jejak Hijaiyah)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hijaiyah_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID UNIQUE NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    completed_letters INTEGER[] DEFAULT '{}',
    last_traced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query progress per siswa
CREATE INDEX IF NOT EXISTS idx_hijaiyah_progress_student_id ON public.hijaiyah_progress(student_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Untuk aplikasi tanpa auth, kita enable RLS tapi allow semua
-- Ini lebih aman daripada disable RLS sepenuhnya

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iqra_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hijaiyah_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for anon users (no auth required)
-- ROOMS
CREATE POLICY "Allow all for rooms" ON public.rooms
    FOR ALL USING (true) WITH CHECK (true);

-- STUDENTS
CREATE POLICY "Allow all for students" ON public.students
    FOR ALL USING (true) WITH CHECK (true);

-- QURAN PROGRESS
CREATE POLICY "Allow all for quran_progress" ON public.quran_progress
    FOR ALL USING (true) WITH CHECK (true);

-- IQRA PROGRESS
CREATE POLICY "Allow all for iqra_progress" ON public.iqra_progress
    FOR ALL USING (true) WITH CHECK (true);

-- HIJAIYAH PROGRESS
CREATE POLICY "Allow all for hijaiyah_progress" ON public.hijaiyah_progress
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- FUNCTIONS: Helper functions
-- =====================================================

-- Function to update last_accessed_at when room is accessed
CREATE OR REPLACE FUNCTION update_room_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.rooms 
    SET last_accessed_at = NOW() 
    WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update room last_accessed when student is added
CREATE TRIGGER trigger_update_room_on_student_insert
    AFTER INSERT ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION update_room_last_accessed();

-- =====================================================
-- SAMPLE DATA (Optional - untuk testing)
-- =====================================================
-- Uncomment jika ingin insert sample data

-- INSERT INTO public.rooms (pin, name) VALUES 
--     ('123456', 'Kelas 3A SLB Banda Aceh'),
--     ('654321', 'Kelas 4B SLB Banda Aceh');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Jalankan query ini untuk memastikan tables sudah dibuat:

-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('rooms', 'students', 'quran_progress', 'iqra_progress', 'hijaiyah_progress');
