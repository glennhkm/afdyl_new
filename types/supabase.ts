// types/supabase.ts
// Database types for Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          pin: string;
          name: string;
          created_at: string;
          last_accessed_at: string;
        };
        Insert: {
          id?: string;
          pin: string;
          name: string;
          created_at?: string;
          last_accessed_at?: string;
        };
        Update: {
          id?: string;
          pin?: string;
          name?: string;
          created_at?: string;
          last_accessed_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          room_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      quran_progress: {
        Row: {
          id: string;
          student_id: string;
          last_surah_number: number;
          last_surah_name: string;
          last_ayah_number: number;
          last_read_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          last_surah_number: number;
          last_surah_name: string;
          last_ayah_number: number;
          last_read_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          last_surah_number?: number;
          last_surah_name?: string;
          last_ayah_number?: number;
          last_read_at?: string;
        };
      };
      iqra_progress: {
        Row: {
          id: string;
          student_id: string;
          last_volume_number: number;
          last_page_number: number;
          last_read_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          last_volume_number: number;
          last_page_number: number;
          last_read_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          last_volume_number?: number;
          last_page_number?: number;
          last_read_at?: string;
        };
      };
      hijaiyah_progress: {
        Row: {
          id: string;
          student_id: string;
          completed_letters: number[];
          last_traced_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          completed_letters?: number[];
          last_traced_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          completed_letters?: number[];
          last_traced_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier use
export type Room = Database['public']['Tables']['rooms']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type QuranProgress = Database['public']['Tables']['quran_progress']['Row'];
export type IqraProgress = Database['public']['Tables']['iqra_progress']['Row'];
export type HijaiyahProgress = Database['public']['Tables']['hijaiyah_progress']['Row'];
