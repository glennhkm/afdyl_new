"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTeacher } from "@/contexts/TeacherContext";
import Icon from "@/components/Icon";
import Topbar from "@/components/topbar";
import { StudentDashboardSkeleton } from "@/components/ui/Skeleton";
import { surahNames } from "@/lib/data/surah-names";

// Game module IDs that should be highlighted on break redirect
const GAME_MODULE_IDS = new Set(["tebak-hijaiyah", "tangkap-hijaiyah", "jejak-hijaiyah", "lafal-hijaiyah"]);

const StudentDashboardContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentRoom,
    currentStudent,
    isLoading,
    clearStudent,
  } = useTeacher();

  // Detect ?highlight=games from break reminder redirect
  const shouldHighlightGames = searchParams.get("highlight") === "games";
  const [highlightGames, setHighlightGames] = useState(() => shouldHighlightGames);

  // Auto-fade highlight after 8 seconds & clean up URL
  useEffect(() => {
    if (!highlightGames) return;
    // Clean up the URL param without navigation
    window.history.replaceState(null, "", "/guru/siswa");
    // scroll to bottom to show the games
    window.scrollTo({ top: document.body.scrollHeight - 500, behavior: "smooth" });
    const timer = setTimeout(() => setHighlightGames(false), 10000);
    return () => clearTimeout(timer);
  }, [highlightGames]);

  // Redirect if no room or student is selected
  useEffect(() => {
    if (isLoading) return;
    
    if (!currentRoom) {
      router.push("/guru");
      return;
    }
    if (!currentStudent) {
      router.push("/guru/kelas");
    }
  }, [isLoading, currentRoom, currentStudent, router]);

  if (isLoading || !currentRoom || !currentStudent) {
    return <StudentDashboardSkeleton />;
  }

  const handleBackToClass = () => {
    clearStudent();
    router.push("/guru/kelas");
  };

  // Get progress data directly from currentStudent
  const quranProgress = currentStudent.quranProgress;
  const iqraProgress = currentStudent.iqraProgress;
  const hijaiyahProgress = currentStudent.hijaiyahProgress;

  // Check if there's any quran progress
  const hasQuranProgress = quranProgress.lastSurah > 1 || quranProgress.lastAyah > 1 || quranProgress.completedSurahs.length > 0;
  
  // Check if there's any iqra progress
  const hasIqraProgress = iqraProgress.currentJilid > 1 || iqraProgress.currentPage > 1 || iqraProgress.completedJilids.length > 0;

  const quranSurahName = surahNames[quranProgress.lastSurah] || `Surah ${quranProgress.lastSurah}`;

  const modules = [
    {
      id: "quran",
      title: "Al-Qur'an",
      icon: "RiBookOpenLine",
      url: "/guru/modul/quran",
      progress: hasQuranProgress
        ? `Terakhir: ${quranSurahName} Ayat ${quranProgress.lastAyah}`
        : null,
      continueUrl: hasQuranProgress
        ? `/guru/modul/quran/read?type=surah&number=${quranProgress.lastSurah}&name=${encodeURIComponent(quranSurahName)}`
        : null,
    },
    {
      id: "iqra",
      title: "Iqra'",
      icon: "RiFileTextLine",
      url: "/guru/modul/iqra",
      progress: hasIqraProgress
        ? `Terakhir: Jilid ${iqraProgress.currentJilid} Hal. ${iqraProgress.currentPage}`
        : null,
      continueUrl: hasIqraProgress
        ? `/guru/modul/iqra/read?volume=${iqraProgress.currentJilid}`
        : null,
    },
    {
      id: "jejak-hijaiyah",
      title: "Jejak Hijaiyah",
      icon: "RiEditLine",
      url: "/guru/modul/jejak-hijaiyah",
      progress: hijaiyahProgress.completedLetters.length > 0
        ? `${hijaiyahProgress.completedLetters.length}/29 huruf selesai`
        : null,
      continueUrl: null,
    },
    {
      id: "tebak-hijaiyah",
      title: "Tebak Hijaiyah",
      icon: "RiGamepadLine",
      url: "/tebak-hijaiyah",
      progress: null,
      continueUrl: null,
    },
    {
      id: "tangkap-hijaiyah",
      title: "Tangkap Hijaiyah",
      url: "/tangkap-hijaiyah",
      icon: "RiCameraLine",
      progress: null,
      continueUrl: null,
    },
    {
      id: "lafal-hijaiyah",
      title: "Latihan Lafal",
      icon: "RiMicLine",
      url: "/lafal-hijaiyah",
      progress: null,
      continueUrl: null,
    },
  ];

  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden pb-8">
      <Topbar title="Pilih Modul" onBackClick={handleBackToClass} />

      {/* Student Info Card */}
      <div className="bg-[#E37100]/10 border-2 border-[#E37100]/30 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#E37100]/20 rounded-full flex items-center justify-center">
            <Icon name="RiUserLine" className="w-7 h-7 text-[#E37100]" />
          </div>
          <div className="flex-1">
            <p className="text-[#E37100]/70 text-xs">Siswa Aktif</p>
            <h2 className="text-xl font-bold text-[#E37100]">{currentStudent.name}</h2>
            <p className="text-[#E37100]/70 text-xs">
              Kelas: {currentRoom.className}
            </p>
          </div>
          <button
            onClick={handleBackToClass}
            className="p-2.5 bg-[#E37100]/20 rounded-xl hover:bg-[#E37100]/30 transition-colors"
            title="Ganti Siswa"
          >
            <Icon name="RiUserSettingsLine" className="w-5 h-5 text-[#E37100]" />
          </button>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-background-2 rounded-xl p-3 text-center">
          <Icon name="RiBookOpenLine" className="w-5 h-5 text-brown-brand mx-auto mb-1" />
          <p className="text-xs text-gray-600 font-medium">Qur&apos;an</p>
          <p className="text-sm text-gray-800 font-bold">
            {hasQuranProgress ? "✓" : "-"}
          </p>
        </div>
        <div className="bg-background-2 rounded-xl p-3 text-center">
          <Icon name="RiFileTextLine" className="w-5 h-5 text-brown-brand mx-auto mb-1" />
          <p className="text-xs text-gray-600 font-medium">Iqra&apos;</p>
          <p className="text-sm text-gray-800 font-bold">
            {hasIqraProgress ? `Jilid ${iqraProgress.currentJilid}` : "-"}
          </p>
        </div>
        <div className="bg-background-2 rounded-xl p-3 text-center">
          <Icon name="RiEditLine" className="w-5 h-5 text-brown-brand mx-auto mb-1" />
          <p className="text-xs text-gray-600 font-medium">Hijaiyah</p>
          <p className="text-sm text-gray-800 font-bold">
            {hijaiyahProgress.completedLetters.length}/29
          </p>
        </div>
      </div>

      {/* Module List */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 px-4">
        {modules.map((module) => {
          const isGameModule = GAME_MODULE_IDS.has(module.id);
          const isHighlighted = highlightGames && isGameModule;

          return (
            <div
              key={module.id}
              onClick={() => router.push(module.url)}
              className={`
                relative h-36 sm:h-44 md:h-48 lg:h-52 rounded-3xl shadow cursor-pointer 
                flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 
                hover:-translate-y-1 duration-200 group transition-all
                ${isHighlighted
                  ? "bg-amber-50 border-2 border-amber-400 shadow-lg shadow-amber-400/20"
                  : "bg-background-2 border-2 border-brown-brand/50 hover:border-brown-brand"
                }
              `}
              style={isHighlighted ? { animation: "game-highlight-pulse 1.5s ease-in-out infinite" } : undefined}
            >
              {/* Recommended badge for highlighted games */}
              {isHighlighted && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-bold shadow-md whitespace-nowrap flex items-center gap-1 z-10">
                  <span>🎮</span> Rekomendasi
                </div>
              )}
            {/* Progress Badge */}
            {module.progress && (
              <div className="absolute top-2 right-2 text-[10px] sm:text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Icon name="RiCheckboxCircleFill" className="w-3 h-3" />
                <span className="hidden sm:inline">{module.progress}</span>
                <span className="sm:hidden">✓</span>
              </div>
            )}
            <Icon
              name={module.icon as keyof typeof import('@remixicon/react')}
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-brown-brand group-hover:scale-110 transition-transform"
            />
            <h2 className="text-base sm:text-lg md:text-xl lg:text-3xl font-semibold text-gray-800 text-center leading-tight">
              {module.title}
            </h2>
            {/* Progress text on mobile */}
            {module.progress && (
              <p className="sm:hidden text-[10px] text-emerald-600 text-center px-1">
                {module.progress}
              </p>
            )}
            {/* Lanjutkan button */}
            {/* {module.continueUrl && (
              <button
                onClick={(e) => { e.stopPropagation(); router.push(module.continueUrl!); }}
                className="absolute bottom-3 text-[10px] sm:text-xs text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors flex items-center gap-1"
              >
                <Icon name="RiPlayCircleLine" className="w-3 h-3" />
                Lanjutkan
              </button>
            )} */}
          </div>
          );
        })}
      </div>

      {/* Break banner when games are highlighted */}
      {highlightGames && (
        <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center gap-3">
          <span className="text-2xl">🎮</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Waktunya istirahat!
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Coba mainkan salah satu permainan yang direkomendasikan di atas untuk selingan belajar.
            </p>
          </div>
        </div>
      )}

      {/* Highlight animation */}
      {highlightGames && (
        <style jsx global>{`
          @keyframes game-highlight-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3), 0 4px 15px rgba(245, 158, 11, 0.15); }
            50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.1), 0 4px 20px rgba(245, 158, 11, 0.25); }
          }
        `}</style>
      )}
    </div>
  );
};

// Suspense wrapper for useSearchParams
const StudentDashboardPage = () => {
  return (
    <Suspense fallback={<StudentDashboardSkeleton />}>
      <StudentDashboardContent />
    </Suspense>
  );
};

export default StudentDashboardPage;
