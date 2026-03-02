"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useTeacher } from "@/contexts/TeacherContext";
import Topbar from "@/components/topbar";
import TracingCanvas, { TracingCanvasRef } from "@/components/hijaiyah/TracingCanvas";
import Icon from "@/components/Icon";
import { hijaiyahLetters, audioMapping } from "@/lib/data/hijaiyah-letters";
import { playCorrectSFX, playWrongSFX, cleanupSFX } from "@/lib/services/game-sfx";

interface FeedbackState {
  type: "success" | "error" | "warning" | null;
  message: string;
}

const TeacherHijaiyahTracingDetailPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { 
    currentRoom, 
    currentStudent, 
    markHijaiyahCompleted,
  } = useTeacher();
  
  const index = parseInt(params.index as string) || 0;
  const letterData = hijaiyahLetters[index] || hijaiyahLetters[0];
  const letter = searchParams.get("letter") || letterData.arabic;
  const pronunciation = searchParams.get("pronunciation") || letterData.latin;

  // Get progress directly from currentStudent
  const completedLetters = currentStudent?.hijaiyahProgress?.completedLetters || [];
  const isAlreadyCompleted = completedLetters.includes(index);

  const canvasRef = useRef<TracingCanvasRef>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isCompleted, setIsCompleted] = useState(isAlreadyCompleted);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: null, message: "" });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorResult, setErrorResult] = useState<{ message: string; coverage: number } | null>(null);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showSuccessModal || showErrorModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSuccessModal, showErrorModal]);

  // Redirect if no student
  useEffect(() => {
    if (!currentRoom || !currentStudent) {
      router.push("/guru");
    }
  }, [currentRoom, currentStudent, router]);

  // Handle reset
  const handleReset = useCallback(() => {
    canvasRef.current?.resetTracing();
    setIsCompleted(isAlreadyCompleted);
    setFeedback({ type: null, message: "" });
  }, [isAlreadyCompleted]);

  // Clear feedback timer and SFX on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      cleanupSFX();
    };
  }, []);

  // Handle Ctrl+Z keyboard shortcut for reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReset]);

  // Show feedback with auto-hide (except for success)
  const showFeedback = useCallback((type: FeedbackState["type"], message: string) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }

    setFeedback({ type, message });

    // Auto-hide feedback after 3 seconds (except for success)
    if (type !== "success") {
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback({ type: null, message: "" });
      }, 3000);
    }
  }, []);

  // Handle sound play
  const handlePlaySound = () => {
    const audioFileName = audioMapping[letter];
    if (audioFileName) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.volume = 0.8;
      }
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = `/audio/${audioFileName}.m4a`;
      audioRef.current.load();
      audioRef.current.play().catch(console.error);
    }
  };

  // Handle validation
  const handleValidate = async () => {
    const result = canvasRef.current?.validateTracing();
    if (result) {
      if (result.isValid) {
        setIsCompleted(true);
        showFeedback("success", `Luar Biasa! 🎉 Huruf ${letter} selesai!`);
        handlePlaySound();
        playCorrectSFX();
        
        // Mark as completed in teacher progress tracking
        if (!isAlreadyCompleted) {
          await markHijaiyahCompleted(index);
          // Show success modal for first-time completion
          setTimeout(() => setShowSuccessModal(true), 500);
        }
      } else {
        playWrongSFX();
        setErrorResult({ message: result.message, coverage: result.coverage });
        setShowErrorModal(true);
      }
    }
  };

  // Navigate to next letter
  const handleNextLetter = () => {
    if (index < hijaiyahLetters.length - 1) {
      const nextLetter = hijaiyahLetters[index + 1];
      router.push(
        `/guru/modul/jejak-hijaiyah/tracing/${index + 1}?letter=${encodeURIComponent(nextLetter.arabic)}&pronunciation=${encodeURIComponent(nextLetter.latin)}`
      );
    } else {
      router.push("/guru/modul/jejak-hijaiyah");
    }
    setShowSuccessModal(false);
  };

  // Navigate to previous letter
  const handlePrevLetter = () => {
    if (index > 0) {
      const prevLetter = hijaiyahLetters[index - 1];
      router.push(
        `/guru/modul/jejak-hijaiyah/tracing/${index - 1}?letter=${encodeURIComponent(prevLetter.arabic)}&pronunciation=${encodeURIComponent(prevLetter.latin)}`
      );
    }
  };

  if (!currentStudent) {
    return null;
  }

  return (
    <div className="w-full min-h-[82svh] pb-6 sm:pb-8 pt-20 md:pt-44 lg:pt-0 overflow-x-hidden px-2">
      <Topbar 
        title="Jejak Hijaiyah" 
        onBackClick={() => router.push("/guru/modul/jejak-hijaiyah")}
      />

      {/* Student Banner */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="RiUserLine" className="w-5 h-5 text-emerald-600" />
          <span className="text-emerald-700 font-medium">{currentStudent.name}</span>
        </div>
        {isAlreadyCompleted && (
          <div className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full flex items-center gap-1">
            <Icon name="RiCheckboxCircleFill" className="w-4 h-4" />
            Sudah selesai
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 sm:gap-5 max-w-3xl mx-auto">
        {/* Navigation between letters */}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={handlePrevLetter}
            disabled={index === 0}
            className={`p-2 rounded-full transition-all ${
              index === 0 
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                : 'bg-brown-brand text-white hover:opacity-90'
            }`}
          >
            <Icon name="RiArrowLeftSLine" className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <span className="text-gray-500 text-sm">Huruf {index + 1} dari {hijaiyahLetters.length}</span>
          </div>
          
          <button
            onClick={handleNextLetter}
            disabled={index === hijaiyahLetters.length - 1}
            className={`p-2 rounded-full transition-all ${
              index === hijaiyahLetters.length - 1 
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                : 'bg-brown-brand text-white hover:opacity-90'
            }`}
          >
            <Icon name="RiArrowRightSLine" className="w-6 h-6" />
          </button>
        </div>

        {/* Action Buttons - Ulang and Bunyikan */}
        <div className="flex gap-3 sm:gap-4 w-full">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-full font-semibold text-sm sm:text-base lg:text-lg transition-all duration-200 bg-foreground text-black shadow-md hover:opacity-90 active:scale-[0.98]"
          >
            Ulang
          </button>
          <button
            onClick={handlePlaySound}
            className="flex-1 py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-full font-semibold text-sm sm:text-base lg:text-lg transition-all duration-200 bg-foreground text-black shadow-md hover:opacity-90 active:scale-[0.98]"
          >
            Bunyikan
          </button>
        </div>

        {/* Tracing Canvas */}
        <div className="w-full">
          <TracingCanvas
            ref={canvasRef}
            letter={letter}
            isCompleted={isCompleted}
            onTracingUpdate={(data) => {
              if (data.isComplete && !isCompleted) {
                // Auto-complete if 100% coverage reached
              }
            }}
          />
        </div>

        {/* Bottom Section - Sound Icon, Pronunciation, and Check Button */}
        <div className="flex items-center justify-between w-full gap-2 sm:gap-3 mt-1">
          {/* Sound Button */}
          <button
            onClick={handlePlaySound}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-all duration-200 active:scale-95 shrink-0"
          >
            <Icon name="RiVolumeUpFill" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-gray-600" />
          </button>

          {/* Pronunciation Display */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-1">
            <span className="text-base sm:text-lg md:text-xl text-black font-medium">
              ({pronunciation})
            </span>
            {isCompleted && (
              <Icon name="RiCheckboxCircleFill" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
            )}
          </div>

          {/* Check Button */}
          <button
            onClick={handleValidate}
            className="py-2.5 sm:py-3 px-5 sm:px-6 md:px-8 rounded-full font-semibold text-sm sm:text-base lg:text-lg transition-all duration-200 bg-success text-white shadow-md hover:opacity-90 active:scale-[0.98] shrink-0"
          >
            Cek
          </button>
        </div>

        {/* Feedback Message */}
        {feedback.type && (
          <div
            className={`w-full p-3 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
              feedback.type === "success"
                ? "bg-green-50 border-2 border-green-300"
                : feedback.type === "warning"
                ? "bg-orange-50 border-2 border-orange-300"
                : "bg-red-50 border-2 border-red-300"
            }`}
          >
            <Icon
              name={
                feedback.type === "success"
                  ? "RiEmotionHappyFill"
                  : feedback.type === "warning"
                  ? "RiRefreshLine"
                  : "RiErrorWarningFill"
              }
              className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 shrink-0 ${
                feedback.type === "success"
                  ? "text-green-600"
                  : feedback.type === "warning"
                  ? "text-orange-600"
                  : "text-red-600"
              }`}
            />
            <span
              className={`font-medium text-xs sm:text-sm md:text-base ${
                feedback.type === "success"
                  ? "text-green-700"
                  : feedback.type === "warning"
                  ? "text-orange-700"
                  : "text-red-700"
              }`}
            >
              {feedback.message}
            </span>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/30 z-100 flex items-center justify-center px-4" style={{ animation: "jejak-fade-in 0.25s ease-out forwards" }}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-[320px] w-full text-center shadow-2xl" style={{ animation: "jejak-bounce-in 0.5s ease-out forwards" }}>
            {/* Star + Checkmark Celebration Illustration */}
            <svg viewBox="0 0 160 180" className="w-36 h-44 mx-auto drop-shadow-lg">
              {/* Star burst */}
              <polygon points="80,8 94,58 148,58 104,88 118,140 80,108 42,140 56,88 12,58 66,58" fill="#D1FAE5" />
              {/* Inner circles */}
              <circle cx="80" cy="86" r="38" fill="#6EE7B7" />
              <circle cx="80" cy="86" r="30" fill="#14AE5C" />
              {/* Checkmark */}
              <polyline points="65,88 75,98 96,74" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              {/* Pencil */}
              <g transform="translate(128,148) rotate(-15)">
                <rect x="-4" y="-26" width="8" height="20" rx="1.5" fill="#FBBF24" />
                <rect x="-5" y="-6" width="10" height="3" rx="1" fill="#78716C" />
                <polygon points="-3,-3 3,-3 0,6" fill="#F5D0A9" />
                <rect x="-4" y="-30" width="8" height="4" rx="1.5" fill="#F87171" />
              </g>
              {/* Sparkles */}
              <circle cx="18" cy="35" r="4" fill="#FBBF24" opacity="0.8" />
              <circle cx="142" cy="28" r="3" fill="#FBBF24" opacity="0.7" />
              <circle cx="148" cy="105" r="3.5" fill="#34D399" opacity="0.6" />
              <circle cx="12" cy="112" r="3" fill="#FBBF24" opacity="0.6" />
              <circle cx="38" cy="165" r="3" fill="#34D399" opacity="0.5" />
              <circle cx="115" cy="168" r="4" fill="#FBBF24" opacity="0.5" />
              {/* Confetti */}
              <rect x="32" y="18" width="6" height="3" rx="1" fill="#EC4899" opacity="0.6" transform="rotate(30 35 19.5)" />
              <rect x="122" y="12" width="5" height="3" rx="1" fill="#8B5CF6" opacity="0.5" transform="rotate(-20 124.5 13.5)" />
              <rect x="15" y="145" width="5" height="3" rx="1" fill="#3B82F6" opacity="0.5" transform="rotate(15 17.5 146.5)" />
            </svg>

            {/* Letter display */}
            <div className="mt-2 text-6xl font-arabic text-emerald-700 leading-tight">
              {letter}
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mt-2">Hebat! 🎉</h2>
            <p className="text-gray-500 mt-1 text-sm">
              <span className="font-semibold text-emerald-600">{currentStudent.name}</span> berhasil menulis huruf <span className="font-semibold text-emerald-600">({pronunciation})</span>
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-full font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="RiRefreshLine" className="w-4 h-4" />
                Ulangi
              </button>
              <button
                onClick={handleNextLetter}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-full font-semibold hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                {index < hijaiyahLetters.length - 1 ? (
                  <>
                    Lanjut
                    <Icon name="RiArrowRightLine" className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <Icon name="RiCheckLine" className="w-5 h-5" />
                    Selesai
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error / Incomplete Tracing Modal */}
      {showErrorModal && errorResult && (
        <div className="fixed inset-0 bg-black/30 z-100 flex items-center justify-center px-4" style={{ animation: "jejak-fade-in 0.25s ease-out forwards" }}>
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-[320px] w-full text-center shadow-2xl" style={{ animation: "jejak-bounce-in 0.5s ease-out forwards" }}>
            {/* Pencil + Try Again Illustration */}
            <svg viewBox="0 0 160 160" className="w-32 h-32 mx-auto drop-shadow-lg">
              {/* Background circles */}
              <circle cx="80" cy="80" r="60" fill="#FEF3C7" />
              <circle cx="80" cy="80" r="48" fill="#FDE68A" />
              {/* Pencil body */}
              <g transform="translate(80,82) rotate(-30)">
                <rect x="-5" y="-36" width="10" height="42" rx="2" fill="#F59E0B" />
                <polygon points="-5,6 5,6 0,16" fill="#D97706" />
                <rect x="-5" y="-40" width="10" height="4" rx="2" fill="#F87171" />
                <rect x="-5" y="-36" width="10" height="5" fill="#FBBF24" opacity="0.5" />
              </g>
              {/* Circular arrow (try again) */}
              <path d="M 118 80 A 38 38 0 1 0 80 42" fill="none" stroke="#F97316" strokeWidth="4" strokeLinecap="round" strokeDasharray="4 3" />
              <polygon points="80,34 80,50 68,42" fill="#F97316" />
              {/* Sparkles */}
              <circle cx="28" cy="32" r="3" fill="#FBBF24" opacity="0.6" />
              <circle cx="132" cy="28" r="3.5" fill="#F59E0B" opacity="0.5" />
              <circle cx="138" cy="115" r="3" fill="#FBBF24" opacity="0.5" />
              <circle cx="22" cy="120" r="3" fill="#F59E0B" opacity="0.6" />
            </svg>

            {/* Coverage circle */}
            <div className="relative w-20 h-20 mx-auto mt-2 mb-1">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#FEE2E2" strokeWidth="7" />
                <circle
                  cx="40" cy="40" r="34" fill="none" stroke="#F97316" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - Math.min(errorResult.coverage, 0.99))}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-orange-500">{Math.round(errorResult.coverage * 100)}%</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mt-1">Belum Selesai</h2>
            <p className="text-gray-500 mt-1 text-sm">{errorResult.message}</p>

            {/* Tips */}
            <div className={`rounded-xl p-3 mt-4 flex items-start gap-2 text-left ${
              errorResult.coverage < 0.3
                ? "bg-red-50 border border-red-200"
                : errorResult.coverage < 0.7
                  ? "bg-orange-50 border border-orange-200"
                  : "bg-yellow-50 border border-yellow-200"
            }`}>
              <Icon
                name={errorResult.coverage < 0.3 ? "RiLightbulbLine" : "RiInformationLine"}
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  errorResult.coverage < 0.3
                    ? "text-red-500"
                    : errorResult.coverage < 0.7
                      ? "text-orange-500"
                      : "text-yellow-600"
                }`}
              />
              <p className={`text-xs font-medium ${
                errorResult.coverage < 0.3
                  ? "text-red-700"
                  : errorResult.coverage < 0.7
                    ? "text-orange-700"
                    : "text-yellow-700"
              }`}>
                {errorResult.coverage < 0.3
                  ? "Trace semua bagian huruf, termasuk titik-titiknya ya!"
                  : errorResult.coverage < 0.7
                    ? "Hampir! Pastikan semua garis huruf ter-trace dengan baik."
                    : "Sedikit lagi! Periksa bagian kecil yang mungkin terlewat."}
              </p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  handleReset();
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-full font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="RiRefreshLine" className="w-4 h-4" />
                Ulangi
              </button>
              <button
                onClick={() => setShowErrorModal(false)}
                className="flex-1 py-3 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <Icon name="RiPencilLine" className="w-4 h-4" />
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped animations */}
      <style jsx global>{`
        @keyframes jejak-bounce-in {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes jejak-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TeacherHijaiyahTracingDetailPage;
