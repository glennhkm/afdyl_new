"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Topbar from "@/components/topbar";
import Icon from "@/components/Icon";
import {
  hijaiyahGameLetters,
  HijaiyahGameLetter,
  shuffleArray,
  getRandomIndex,
} from "@/lib/data/hijaiyah-game-data";
import { usePullToRefresh } from "@/contexts/PullToRefreshContext";

// Generate 3 choices: 1 correct + 2 random wrong, shuffled
function generateChoices(correctIndex: number): HijaiyahGameLetter[] {
  const correct = hijaiyahGameLetters[correctIndex];
  const pool = hijaiyahGameLetters.filter((_, i) => i !== correctIndex);
  const wrong = shuffleArray(pool).slice(0, 2);
  return shuffleArray([correct, ...wrong]);
}

const initialAvailableIndices = hijaiyahGameLetters.map((_, i) => i);
const initialAudioIndex = getRandomIndex(initialAvailableIndices);

const TebakHijaiyahPage = () => {
  const { disablePullToRefresh, enablePullToRefresh } = usePullToRefresh();

  useEffect(() => {
    disablePullToRefresh();
    return () => enablePullToRefresh();
  }, [disablePullToRefresh, enablePullToRefresh]);

  // ── Game state ─────────────────────────────────────────────────────────────
  const [currentAudioIndex, setCurrentAudioIndex] = useState(initialAudioIndex);
  const [availableAudioIndices, setAvailableAudioIndices] = useState<number[]>(initialAvailableIndices);
  const [choices, setChoices] = useState<HijaiyahGameLetter[]>(() => generateChoices(initialAudioIndex));
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isGameCompleted, setIsGameCompleted] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [feedback, setFeedback] = useState<{ show: boolean; isCorrect: boolean; message: string }>({
    show: false,
    isCorrect: false,
    message: "",
  });
  // Shown after every answer — hidden once user taps the sound button
  const [showArrowHint, setShowArrowHint] = useState(true);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [isInDropZone, setIsInDropZone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Drag tracking — all via refs to avoid re-renders during drag
  const dragCardIndexRef = useRef<number | null>(null);
  const dragElementRef = useRef<HTMLDivElement | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  // true once direction confirmed as vertical (not horizontal scroll)
  const isDragActiveRef = useRef(false);
  // Prevents double-answer on rapid interaction
  const isAnsweringRef = useRef(false);
  // Always-current validateAnswer accessible from stable global listeners
  const validateAnswerRef = useRef<(choiceIndex: number) => void>(() => {});
  // Always-current checkDropZone
  const checkDropZoneRef = useRef<(y: number) => boolean>(() => false);
  // Fixed-position origin of the dragged card (used to animate it back on release)
  const startFixedPosRef = useRef({ left: 0, top: 0 });

  useEffect(() => {
    document.body.style.overflow = isGameCompleted ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isGameCompleted]);

  // ── Game logic ─────────────────────────────────────────────────────────────
  const initializeGame = useCallback(() => {
    const indices = hijaiyahGameLetters.map((_, i) => i);
    const idx = getRandomIndex(indices);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setAvailableAudioIndices(indices);
    setCurrentAudioIndex(idx);
    setChoices(generateChoices(idx));
    setCorrectAnswers(0);
    setIsGameCompleted(false);
    setFeedback({ show: false, isCorrect: false, message: "" });
    setShowArrowHint(false);
    setHasPlayedOnce(false);
    setIsDragging(false);
    isAnsweringRef.current = false;
    isDragActiveRef.current = false;
    dragCardIndexRef.current = null;
  }, []);

  const playCurrentAudio = useCallback(() => {
    if (isGameCompleted || isPlayingAudio) return;
    setIsPlayingAudio(true);
    setShowArrowHint(false); // user acknowledged hint
    setHasPlayedOnce(true);

    const letter = hijaiyahGameLetters[currentAudioIndex];
    if (!letter) { setIsPlayingAudio(false); return; }

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 0.8;
    }
    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
    audio.src = `/audio/${letter.audio}`;
    audio.load();
    audio.play().catch(() => setIsPlayingAudio(false));
  }, [currentAudioIndex, isPlayingAudio, isGameCompleted]);

  const generateNewQuestion = useCallback((remaining: number[]) => {
    if (remaining.length === 0) { setIsGameCompleted(true); return; }
    const newIdx = getRandomIndex(remaining);
    setCurrentAudioIndex(newIdx);
    setChoices(generateChoices(newIdx));
    setFeedback({ show: false, isCorrect: false, message: "" });
    isAnsweringRef.current = false;
  }, []);

  const validateAnswer = useCallback((choiceIndex: number) => {
    if (isGameCompleted || isAnsweringRef.current) return;
    isAnsweringRef.current = true;

    const selected = choices[choiceIndex];
    const correct = hijaiyahGameLetters[currentAudioIndex];
    const isCorrect = selected.name === correct.name;

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

    setFeedback({ show: true, isCorrect, message: isCorrect ? "Benar! 🎉" : "Salah! Coba lagi" });
    // Arrow hint always shown after answer — prompts user to tap audio again
    setShowArrowHint(true);

    // Play benar/salah feedback using persistent element
    if (!feedbackAudioRef.current) {
      feedbackAudioRef.current = new Audio();
      feedbackAudioRef.current.volume = 0.8;
    }
    feedbackAudioRef.current.pause();
    feedbackAudioRef.current.currentTime = 0;
    feedbackAudioRef.current.src = `/audio/${isCorrect ? "benar" : "salah"}.m4a`;
    feedbackAudioRef.current.load();
    feedbackAudioRef.current.play().catch(console.error);

    if (isCorrect) {
      const newRemaining = availableAudioIndices.filter((i) => i !== currentAudioIndex);
      setAvailableAudioIndices(newRemaining);
      setCorrectAnswers((prev) => prev + 1);
      feedbackTimeoutRef.current = setTimeout(() => generateNewQuestion(newRemaining), 1500);
    } else {
      feedbackTimeoutRef.current = setTimeout(() => {
        // Wrong: clear feedback, reshuffle choices for variety
        setChoices(generateChoices(currentAudioIndex));
        setFeedback({ show: false, isCorrect: false, message: "" });
        isAnsweringRef.current = false;
      }, 1500);
    }
  }, [choices, currentAudioIndex, isGameCompleted, availableAudioIndices, generateNewQuestion]);

  // Keep refs in sync with latest callbacks
  useEffect(() => { validateAnswerRef.current = validateAnswer; }, [validateAnswer]);

  const checkDropZone = useCallback((clientY: number) => {
    if (!dropZoneRef.current) return false;
    const rect = dropZoneRef.current.getBoundingClientRect();
    return clientY >= rect.top && clientY <= rect.bottom;
  }, []);
  useEffect(() => { checkDropZoneRef.current = checkDropZone; }, [checkDropZone]);

  // ── Drag: per-card event handlers ──────────────────────────────────────────
  // Mouse: always activate drag immediately
  const handleMouseDown = useCallback((e: React.MouseEvent, cardIndex: number) => {
    e.preventDefault();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    currentPosRef.current = { x: 0, y: 0 };
    dragCardIndexRef.current = cardIndex;
    isDragActiveRef.current = true;

    const cardEl = cardRefs.current.get(cardIndex);
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      startFixedPosRef.current = { left: rect.left, top: rect.top };
      dragElementRef.current = cardEl;
      cardEl.style.transition = "none";
      cardEl.style.position = "fixed";
      cardEl.style.left = `${rect.left}px`;
      cardEl.style.top = `${rect.top}px`;
      cardEl.style.width = `${rect.width}px`;
      cardEl.style.height = `${rect.height}px`;
      cardEl.style.margin = "0";
      cardEl.style.zIndex = "9999";
      cardEl.style.transform = "scale(1.12)";
    }
    setIsDragging(true);
  }, []);

  // Touch: record start position; direction confirmed lazily in global move
  const handleTouchStart = useCallback((e: React.TouchEvent, cardIndex: number) => {
    const t = e.touches[0];
    startPosRef.current = { x: t.clientX, y: t.clientY };
    currentPosRef.current = { x: 0, y: 0 };
    dragCardIndexRef.current = cardIndex;
    isDragActiveRef.current = false;
  }, []);

  // ── Global move/end — registered once, uses refs for mutable values ────────
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (dragCardIndexRef.current === null) return;

      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const deltaX = clientX - startPosRef.current.x;
      const deltaY = clientY - startPosRef.current.y;

      // Touch: determine drag direction at threshold
      if ("touches" in e && !isDragActiveRef.current) {
        if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
          // Predominantly horizontal → let scroll container handle it
          dragCardIndexRef.current = null;
          return;
        }
        // Vertical → activate drag with fixed positioning (escapes overflow:hidden)
        const cardEl = cardRefs.current.get(dragCardIndexRef.current!);
        if (cardEl) {
          const rect = cardEl.getBoundingClientRect();
          startFixedPosRef.current = { left: rect.left, top: rect.top };
          dragElementRef.current = cardEl;
          cardEl.style.transition = "none";
          cardEl.style.position = "fixed";
          cardEl.style.left = `${rect.left}px`;
          cardEl.style.top = `${rect.top}px`;
          cardEl.style.width = `${rect.width}px`;
          cardEl.style.height = `${rect.height}px`;
          cardEl.style.margin = "0";
          cardEl.style.zIndex = "9999";
          cardEl.style.transform = "scale(1.12)";
        }
        isDragActiveRef.current = true;
        setIsDragging(true);
      }

      if (!isDragActiveRef.current || !dragElementRef.current) return;
      e.preventDefault();

      currentPosRef.current = { x: deltaX, y: deltaY };
      dragElementRef.current.style.left = `${startFixedPosRef.current.left + deltaX}px`;
      dragElementRef.current.style.top = `${startFixedPosRef.current.top + deltaY}px`;
      dragElementRef.current.style.transform = "scale(1.12)";

      const inZone = checkDropZoneRef.current(clientY);
      setIsInDropZone(inZone);
      dragElementRef.current.style.boxShadow = inZone ? "0 0 24px rgba(34,197,94,0.55)" : "";
    };

    const handleEnd = () => {
      if (dragCardIndexRef.current === null) return;

      const cardIndex = dragCardIndexRef.current;
      const finalY = startPosRef.current.y + currentPosRef.current.y;
      const wasInDropZone = isDragActiveRef.current && checkDropZoneRef.current(finalY);

      if (dragElementRef.current) {
        const el = dragElementRef.current;
        el.style.transition = "left 0.2s ease-out, top 0.2s ease-out, transform 0.2s ease-out";
        el.style.left = `${startFixedPosRef.current.left}px`;
        el.style.top = `${startFixedPosRef.current.top}px`;
        el.style.transform = "scale(1)";
        el.style.zIndex = "";
        el.style.boxShadow = "";
        setTimeout(() => {
          if (el) {
            el.style.position = "";
            el.style.left = "";
            el.style.top = "";
            el.style.width = "";
            el.style.height = "";
            el.style.margin = "";
            el.style.transition = "";
          }
        }, 200);
      }

      if (wasInDropZone) validateAnswerRef.current(cardIndex);

      dragCardIndexRef.current = null;
      dragElementRef.current = null;
      isDragActiveRef.current = false;
      currentPosRef.current = { x: 0, y: 0 };
      setIsDragging(false);
      setIsInDropZone(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
    };
  // Registered once — all mutable state accessed through refs
  }, []);

  const progress = correctAnswers / hijaiyahGameLetters.length;

  return (
    <div className="w-full min-h-[76svh] sm:min-h-[80svh] overflow-hidden pb-6 sm:pb-8 md:pt-44 lg:pt-0">
      <Topbar title="Tebak Hijaiyah" />

      <div className="flex flex-col items-center gap-4 sm:gap-6 max-w-3xl mx-auto">

        {/* ── Progress Bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-4 w-full px-1 sm:px-2">
          <span className="text-[#E37100] font-semibold min-w-10 sm:min-w-12.5 text-sm sm:text-base">
            {correctAnswers}/{hijaiyahGameLetters.length}
          </span>
          <div className="flex-1 h-1.5 sm:h-2 bg-gray-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-brown-brand rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className={`p-1.5 sm:p-2 rounded-lg ${progress >= 1 ? "bg-[#E37100]" : ""}`}>
            <span className="text-lg sm:text-xl">🏁</span>
          </div>
        </div>

        {/* ── Drop Zone + Arrow Hint ────────────────────────────────────────── */}
        <div className="relative flex flex-col items-center w-full">

          <div
            ref={dropZoneRef}
            className={`relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 flex items-center justify-center transition-all duration-200 ${
              isInDropZone ? "scale-105" : ""
            }`}
          >
            <div
              className={`absolute inset-0 rounded-xl sm:rounded-2xl border-3 sm:border-4 border-dashed pointer-events-none transition-colors duration-200 ${
                isInDropZone ? "border-green-500 bg-green-50/30" : "border-gray-400"
              }`}
            />

            {/* Arrow hint — inside dropzone, points down toward the sound button */}
            {showArrowHint && (
              <div className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none">
                <span className="text-sm sm:text-base font-bold text-amber-600 whitespace-nowrap drop-shadow-sm">
                  {hasPlayedOnce ? "Dengar lagi!" : "Dengar!"}
                </span>
                <div className="animate-bounce mt-1">
                  <Icon name="RiArrowDownLine" className="w-7 h-7 sm:w-9 sm:h-9 text-amber-500" />
                </div>
              </div>
            )}

            {/* Sound button — pulses with amber ring while hint is shown */}
            <button
              type="button"
              onClick={playCurrentAudio}
              disabled={isGameCompleted}
              className={`relative z-10 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-200
                ${isPlayingAudio ? "bg-foreground scale-110" : "bg-foreground hover:bg-foreground/80 active:scale-95"}
                ${isGameCompleted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${showArrowHint && !isPlayingAudio ? "ring-4 ring-amber-400 ring-offset-2 animate-pulse" : ""}
              `}
            >
              <Icon
                name={isPlayingAudio ? "RiVolumeUpFill" : "RiVolumeUpLine"}
                className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 ${isPlayingAudio ? "text-white" : "text-gray-600"}`}
              />
            </button>

            {!isPlayingAudio && !isGameCompleted && !showArrowHint && (
              <p className="absolute bottom-2 sm:bottom-4 text-xs sm:text-sm text-gray-500 text-center px-2 sm:px-4 pointer-events-none">
                Tap untuk dengar huruf
              </p>
            )}
          </div>
        </div>

        {/* ── 3 Choice Cards — horizontally scrollable & draggable ─────────── */}
        <div className="w-full flex flex-col items-center gap-2 py-3">
          {/* Hide scrollbar */}
          <style>{`.cards-scroll::-webkit-scrollbar{display:none}`}</style>

          <div
            ref={scrollContainerRef}
            className="cards-scroll w-full flex gap-5 sm:gap-7 overflow-x-auto px-8 sm:px-16 pb-6"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              justifyContent: "safe center",
            }}
          >
            {choices.map((letter, index) => (
              <div
                key={`${letter.name}-${index}`}
                className="shrink-0 select-none w-24 h-28 sm:w-28 sm:h-32 md:w-32 md:h-36"
                style={{ scrollSnapAlign: "center", touchAction: "pan-x" }}
                onMouseDown={(e) => handleMouseDown(e, index)}
                onTouchStart={(e) => handleTouchStart(e, index)}
              >
                <div
                  ref={(el) => {
                    if (el) cardRefs.current.set(index, el);
                    else cardRefs.current.delete(index);
                  }}
                  className={`w-24 h-28 sm:w-28 sm:h-32 md:w-32 md:h-36 border rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg bg-background-2 cursor-grab active:cursor-grabbing transition-shadow duration-150 ${
                    isDragging ? "border-black/10" : "border-black/20 hover:shadow-xl"
                  }`}
                >
                  <span className="font-arabic text-4xl sm:text-5xl text-brown-brand font-bold pointer-events-none select-none">
                    {letter.letter}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-tertiary-orange">
            Geser kartu ke atas kotak untuk menjawab
          </p>
        </div>

        {/* ── Feedback modal ──────────────────────────────────────────── */}
        {feedback.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ animation: "tebak-fade-in 0.2s ease-out forwards" }}>
            <div
              className="pointer-events-none"
              style={{ animation: "tebak-bounce-in 0.45s ease-out forwards" }}
            >
              {feedback.isCorrect ? (
                <div className="bg-white rounded-3xl px-10 py-8 text-center shadow-2xl max-w-80">
                  {/* Correct SVG – star with checkmark */}
                  <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto mb-3 drop-shadow-md">
                    <circle cx="60" cy="60" r="52" fill="#D1FAE5" />
                    <circle cx="60" cy="60" r="42" fill="#6EE7B7" />
                    <circle cx="60" cy="60" r="32" fill="#14AE5C" />
                    <polyline points="42,62 55,74 78,48" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                    {/* sparkles */}
                    <circle cx="18" cy="22" r="4" fill="#FBBF24" opacity="0.8" />
                    <circle cx="102" cy="18" r="3" fill="#FBBF24" opacity="0.7" />
                    <circle cx="105" cy="95" r="3.5" fill="#34D399" opacity="0.6" />
                    <circle cx="15" cy="90" r="3" fill="#FBBF24" opacity="0.6" />
                  </svg>
                  <h3 className="text-2xl font-bold text-gray-800">Benar! 🎉</h3>
                  <p className="text-base text-gray-500 mt-1">Hebat sekali!</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl px-10 py-8 text-center shadow-2xl max-w-80">
                  {/* Wrong SVG – sad face */}
                  <svg viewBox="0 0 120 120" className="w-32 h-32 mx-auto mb-3 drop-shadow-md">
                    <circle cx="60" cy="60" r="52" fill="#FEE2E2" />
                    <circle cx="60" cy="60" r="42" fill="#FCA5A5" />
                    <circle cx="60" cy="60" r="32" fill="#E53E3E" />
                    {/* X mark */}
                    <line x1="47" y1="47" x2="73" y2="73" stroke="white" strokeWidth="7" strokeLinecap="round" />
                    <line x1="73" y1="47" x2="47" y2="73" stroke="white" strokeWidth="7" strokeLinecap="round" />
                    {/* tear drops */}
                    <ellipse cx="22" cy="85" rx="4" ry="6" fill="#93C5FD" opacity="0.5" />
                    <ellipse cx="98" cy="88" rx="3" ry="5" fill="#93C5FD" opacity="0.4" />
                  </svg>
                  <h3 className="text-2xl font-bold text-gray-800">Salah!</h3>
                  <p className="text-base text-gray-500 mt-1">Coba lagi yaa</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Game Completed dialog ─────────────────────────────────────────── */}
        {isGameCompleted && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" style={{ animation: "tebak-fade-in 0.25s ease-out forwards" }}>
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-[320px] w-full text-center shadow-2xl" style={{ animation: "tebak-bounce-in 0.5s ease-out forwards" }}>
              {/* Trophy illustration */}
              <svg viewBox="0 0 160 180" className="w-36 h-40 mx-auto drop-shadow-lg">
                {/* Ribbon left */}
                <path d="M52 5 L68 75 L80 65 L72 5 Z" fill="#2DD4BF" />
                {/* Ribbon right */}
                <path d="M108 5 L92 75 L80 65 L88 5 Z" fill="#14B8A6" />
                {/* Medal outer */}
                <circle cx="80" cy="110" r="50" fill="#F59E0B" />
                <circle cx="80" cy="110" r="43" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
                <circle cx="80" cy="110" r="36" fill="#F59E0B" opacity="0.3" />
                {/* Star */}
                <polygon points="80,78 88,98 110,98 92,110 98,130 80,118 62,130 68,110 50,98 72,98" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" />
                {/* Sparkles */}
                <circle cx="35" cy="50" r="4" fill="#FBBF24" opacity="0.8" />
                <circle cx="125" cy="40" r="3" fill="#FBBF24" opacity="0.7" />
                <circle cx="135" cy="90" r="4" fill="#F59E0B" opacity="0.6" />
                <circle cx="25" cy="95" r="3" fill="#FBBF24" opacity="0.7" />
                <circle cx="45" cy="160" r="3" fill="#FBBF24" opacity="0.5" />
                <circle cx="115" cy="165" r="4" fill="#F59E0B" opacity="0.5" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 mt-3">Selamat! 🎉</h2>
              <p className="text-gray-500 mt-1 text-sm">
                Kamu berhasil mengenali semua huruf hijaiyah!
              </p>
              <button
                onClick={initializeGame}
                className="mt-5 w-full bg-[#E37100] text-white py-3 rounded-full font-semibold text-base hover:bg-[#d06800] transition shadow-md"
              >
                Main Lagi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scoped animations */}
      <style jsx global>{`
        @keyframes tebak-bounce-in {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes tebak-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TebakHijaiyahPage;
