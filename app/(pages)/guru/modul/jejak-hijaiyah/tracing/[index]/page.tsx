"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useTeacher } from "@/contexts/TeacherContext";
import Topbar from "@/components/topbar";
import TracingCanvas, { TracingCanvasRef } from "@/components/hijaiyah/TracingCanvas";
import Icon from "@/components/Icon";
import { hijaiyahLetters, audioMapping } from "@/lib/data/hijaiyah-letters";

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

  // Clear feedback timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
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
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(`/audio/${audioFileName}.m4a`);
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
        
        // Mark as completed in teacher progress tracking
        if (!isAlreadyCompleted) {
          await markHijaiyahCompleted(index);
          // Show success modal for first-time completion
          setTimeout(() => setShowSuccessModal(true), 500);
        }
      } else {
        showFeedback("warning", result.message);
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
        <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="RiTrophyFill" className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Hebat! 🎉</h3>
              <p className="text-gray-600">
                <span className="font-semibold text-emerald-600">{currentStudent.name}</span> berhasil menulis huruf
              </p>
              <div className="mt-3 text-6xl font-arabic text-emerald-700">
                {letter}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Progress tersimpan otomatis
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Ulangi
              </button>
              <button
                onClick={handleNextLetter}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                {index < hijaiyahLetters.length - 1 ? (
                  <>
                    Lanjut
                    <Icon name="RiArrowRightLine" className="w-5 h-5" />
                  </>
                ) : (
                  'Selesai'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherHijaiyahTracingDetailPage;
