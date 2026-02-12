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

// Initial values computed once
const initialShuffledLetters = shuffleArray([...hijaiyahGameLetters]);
const initialAudioIndices = hijaiyahGameLetters.map((_, i) => i);
const initialAudioIndex = getRandomIndex([...initialAudioIndices]);

const TebakHijaiyahPage = () => {
  const { disablePullToRefresh, enablePullToRefresh } = usePullToRefresh();

  // Disable pull-to-refresh when component mounts (game page)
  useEffect(() => {
    disablePullToRefresh();
    return () => {
      enablePullToRefresh();
    };
  }, [disablePullToRefresh, enablePullToRefresh]);

  // Game state
  const [shuffledLetters, setShuffledLetters] = useState<HijaiyahGameLetter[]>(initialShuffledLetters);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(initialAudioIndex);
  const [availableAudioIndices, setAvailableAudioIndices] = useState<number[]>(initialAudioIndices);
  const [correctAnswers, setCorrectAnswers] = useState<Set<string>>(new Set());
  const [isGameCompleted, setIsGameCompleted] = useState(false);
  const [centerCardIndex, setCenterCardIndex] = useState(2);
  
  // UI state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [feedback, setFeedback] = useState<{ show: boolean; isCorrect: boolean; message: string }>({
    show: false,
    isCorrect: false,
    message: "",
  });
  const [isInDropZone, setIsInDropZone] = useState(false);
  
  // Drag state - use refs for smooth performance (no re-renders during drag)
  const [isDragging, setIsDragging] = useState(false);
  const dragCardIndexRef = useRef<number | null>(null);
  const dragElementRef = useRef<HTMLDivElement | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Initialize game (for reset)
  const initializeGame = useCallback(() => {
    const shuffled = shuffleArray([...hijaiyahGameLetters]);
    setShuffledLetters(shuffled);
    const indices = hijaiyahGameLetters.map((_, i) => i);
    setAvailableAudioIndices(indices);
    setCorrectAnswers(new Set());
    setIsGameCompleted(false);
    setCenterCardIndex(2);
    setFeedback({ show: false, isCorrect: false, message: "" });
    
    // Set initial audio index
    const randomIndex = getRandomIndex(indices);
    setCurrentAudioIndex(randomIndex);
  }, []);

  // Play audio for current letter
  const playCurrentAudio = useCallback(() => {
    if (isGameCompleted) return;
    
    // Prevent double plays
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    
    const letter = hijaiyahGameLetters[currentAudioIndex];
    if (!letter) {
      setIsPlayingAudio(false);
      return;
    }
    
    // Stop previous audio if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    const audio = new Audio(`/audio/${letter.audio}`);
    audioRef.current = audio;
    
    audio.onended = () => {
      setIsPlayingAudio(false);
    };
    
    audio.onerror = () => {
      console.error("Audio error:", letter.audio);
      setIsPlayingAudio(false);
    };
    
    audio.play().catch((err) => {
      console.error("Play error:", err);
      setIsPlayingAudio(false);
    });
  }, [currentAudioIndex, isPlayingAudio, isGameCompleted]);

  // Generate new question
  const generateNewQuestion = useCallback(() => {
    if (availableAudioIndices.length === 0) {
      setIsGameCompleted(true);
      return;
    }
    
    const newIndex = getRandomIndex(availableAudioIndices);
    setCurrentAudioIndex(newIndex);
    setFeedback({ show: false, isCorrect: false, message: "" });
  }, [availableAudioIndices]);

  // Validate answer
  const validateAnswer = useCallback((cardIndex: number) => {
    if (isGameCompleted) return;
    
    const selectedLetter = shuffledLetters[cardIndex];
    const correctLetter = hijaiyahGameLetters[currentAudioIndex];
    const isCorrect = selectedLetter.name === correctLetter.name;
    
    // Clear previous timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    
    setFeedback({
      show: true,
      isCorrect,
      message: isCorrect ? "Benar! 🎉" : "Salah! Coba lagi",
    });
    
    // Play feedback audio
    const feedbackAudio = new Audio(`/audio/${isCorrect ? "benar" : "salah"}.m4a`);
    feedbackAudio.play().catch(console.error);
    
    if (isCorrect) {
      // Update correct answers
      setCorrectAnswers((prev) => new Set([...prev, correctLetter.name]));
      
      // Remove from available indices
      setAvailableAudioIndices((prev) => prev.filter((i) => i !== currentAudioIndex));
      
      // Remove card from shuffled letters
      setTimeout(() => {
        setShuffledLetters((prev) => {
          const newLetters = prev.filter((_, i) => i !== cardIndex);
          // Adjust center index
          if (centerCardIndex >= newLetters.length && newLetters.length > 0) {
            setCenterCardIndex(newLetters.length - 1);
          }
          return newLetters;
        });
      }, 500);
      
      // Check if game completed
      if (correctAnswers.size + 1 === hijaiyahGameLetters.length) {
        setIsGameCompleted(true);
      }
    }
    
    // Generate new question after delay
    feedbackTimeoutRef.current = setTimeout(() => {
      generateNewQuestion();
    }, 1500);
  }, [shuffledLetters, currentAudioIndex, isGameCompleted, correctAnswers, centerCardIndex, generateNewQuestion]);

  // Handle card navigation
  const navigateCards = (direction: "left" | "right") => {
    setCenterCardIndex((prev) => {
      if (direction === "left") {
        return prev > 0 ? prev - 1 : prev;
      } else {
        return prev < shuffledLetters.length - 1 ? prev + 1 : prev;
      }
    });
  };

  // Shuffle cards
  const shuffleCards = () => {
    setShuffledLetters((prev) => shuffleArray([...prev]));
    setCenterCardIndex(Math.min(2, shuffledLetters.length - 1));
  };

  // Check if position is in drop zone
  const checkDropZone = useCallback((clientY: number): boolean => {
    if (!dropZoneRef.current) return false;
    const rect = dropZoneRef.current.getBoundingClientRect();
    return clientY >= rect.top && clientY <= rect.bottom;
  }, []);

  // Mouse/Touch handlers for dragging - optimized for smooth performance
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, cardIndex: number) => {
    if (cardIndex !== centerCardIndex) return;
    
    // Prevent default to avoid text selection and scrolling
    e.preventDefault();
    
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    // Store refs for smooth updates
    dragCardIndexRef.current = cardIndex;
    startPosRef.current = { x: clientX, y: clientY };
    currentPosRef.current = { x: 0, y: 0 };
    
    // Get the card element
    const cardElement = cardRefs.current.get(cardIndex);
    if (cardElement) {
      dragElementRef.current = cardElement;
      // Apply initial drag styles immediately
      cardElement.style.transition = 'none';
      cardElement.style.zIndex = '100';
      cardElement.style.transform = 'scale(1.1)';
      cardElement.style.opacity = '1';
    }
    
    setIsDragging(true);
  }, [centerCardIndex]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (dragCardIndexRef.current === null || !dragElementRef.current) return;
    
    // Prevent scrolling on touch devices
    e.preventDefault();
    
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - startPosRef.current.x;
    const deltaY = clientY - startPosRef.current.y;
    
    currentPosRef.current = { x: deltaX, y: deltaY };
    
    // Direct DOM manipulation for instant response (no React re-render)
    dragElementRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
    
    // Check drop zone
    const inDropZone = checkDropZone(clientY);
    setIsInDropZone(inDropZone);
    
    // Visual feedback for drop zone
    if (inDropZone) {
      dragElementRef.current.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.5)';
    } else {
      dragElementRef.current.style.boxShadow = '';
    }
  }, [checkDropZone]);

  const handleDragEnd = useCallback(() => {
    if (dragCardIndexRef.current === null) return;
    
    const cardIndex = dragCardIndexRef.current;
    const element = dragElementRef.current;
    const wasInDropZone = checkDropZone(startPosRef.current.y + currentPosRef.current.y);
    
    // Animate back to original position
    if (element) {
      element.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      element.style.transform = 'scale(1)';
      element.style.zIndex = '10';
      element.style.boxShadow = '';
      
      // Reset opacity based on position
      setTimeout(() => {
        if (element) {
          element.style.transition = '';
          element.style.opacity = '';
        }
      }, 200);
    }
    
    // Validate answer if dropped in zone
    if (wasInDropZone) {
      validateAnswer(cardIndex);
    }
    
    // Reset refs
    dragCardIndexRef.current = null;
    dragElementRef.current = null;
    currentPosRef.current = { x: 0, y: 0 };
    
    setIsDragging(false);
    setIsInDropZone(false);
  }, [checkDropZone, validateAnswer]);

  // Add global mouse/touch listeners for drag
  useEffect(() => {
    if (isDragging) {
      const moveHandler = (e: MouseEvent | TouchEvent) => handleDragMove(e);
      const endHandler = () => handleDragEnd();
      
      // Use passive: false to allow preventDefault
      window.addEventListener("mousemove", moveHandler);
      window.addEventListener("mouseup", endHandler);
      window.addEventListener("touchmove", moveHandler, { passive: false });
      window.addEventListener("touchend", endHandler);
      window.addEventListener("touchcancel", endHandler);
      
      return () => {
        window.removeEventListener("mousemove", moveHandler);
        window.removeEventListener("mouseup", endHandler);
        window.removeEventListener("touchmove", moveHandler);
        window.removeEventListener("touchend", endHandler);
        window.removeEventListener("touchcancel", endHandler);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Progress calculation
  const progress = correctAnswers.size / hijaiyahGameLetters.length;

  // Get visible cards (5 cards centered around centerCardIndex)
  const getVisibleCards = () => {
    const cards: { letter: HijaiyahGameLetter; index: number; position: number }[] = [];
    
    for (let i = -2; i <= 2; i++) {
      const index = centerCardIndex + i;
      if (index >= 0 && index < shuffledLetters.length) {
        cards.push({
          letter: shuffledLetters[index],
          index,
          position: i,
        });
      }
    }
    
    return cards;
  };

  const visibleCards = getVisibleCards();

  return (
    <div className="w-full min-h-[76svh] sm:min-h-[80svh] overflow-hidden pb-6 sm:pb-8 md:pt-44 lg:pt-0">
      <Topbar title="Tebak Hijaiyah" />

      <div className="flex flex-col items-center gap-4 sm:gap-6 max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="flex items-center gap-2 sm:gap-4 w-full px-1 sm:px-2">
          <span className="text-[#E37100] font-semibold min-w-10 sm:min-w-12.5 text-sm sm:text-base">
            {correctAnswers.size}/{hijaiyahGameLetters.length}
          </span>
          <div className="flex-1 h-1.5 sm:h-2 bg-gray-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-brown-brand rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div
            className={`p-1.5 sm:p-2 rounded-lg ${
              progress >= 1 ? "bg-[#E37100]" : "bg-gray-300"
            }`}
          >
            <span className="text-base sm:text-lg">🏁</span>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          ref={dropZoneRef}
          className={`relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 flex items-center justify-center transition-all duration-200 ${
            isInDropZone ? "scale-105" : ""
          }`}
        >
          {/* Dashed Border */}
          <div
            className={`absolute inset-0 rounded-xl sm:rounded-2xl border-3 sm:border-4 border-dashed pointer-events-none transition-colors duration-200 ${
              isInDropZone ? "border-green-500 bg-green-50/30" : "border-gray-400"
            }`}
          />
          
          {/* Sound Button */}
          <button
            type="button"
            onClick={playCurrentAudio}
            disabled={isGameCompleted}
            className={`relative z-10 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
              isPlayingAudio
                ? "bg-foreground scale-110"
                : "bg-foreground hover:bg-foreground/80 active:scale-95"
            } ${isGameCompleted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <Icon
              name={isPlayingAudio ? "RiVolumeUpFill" : "RiVolumeUpLine"}
              className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 ${
                isPlayingAudio ? "text-white" : "text-gray-600"
              }`}
            />
          </button>

          {/* Hint text */}
          {!isPlayingAudio && !isGameCompleted && (
            <p className="absolute bottom-2 sm:bottom-4 text-xs sm:text-sm text-gray-500 text-center px-2 sm:px-4 pointer-events-none">
              Tap untuk dengar huruf
            </p>
          )}
        </div>

        {/* Flashcards */}
        <div 
          ref={cardsContainerRef}
          className="relative w-full flex justify-center items-end gap-1.5 sm:gap-2 md:gap-3 min-h-32 sm:min-h-40 px-2 sm:px-4 -mt-2 sm:-mt-4"
        >
          {visibleCards.map(({ letter, index, position }) => {
            const isCenter = position === 0;
            const scale = isCenter ? 1 : 0.8;
            const opacity = isCenter ? 1 : 0.5;
            
            return (
              <div
                key={`${letter.name}-${index}`}
                ref={(el) => {
                  if (el) cardRefs.current.set(index, el);
                  else cardRefs.current.delete(index);
                }}
                className={`relative select-none ${isCenter ? "z-10" : "z-0"}`}
                style={{
                  transform: `scale(${scale})`,
                  opacity: opacity,
                  cursor: isCenter ? "grab" : "default",
                  touchAction: isCenter ? "none" : "auto",
                  willChange: isCenter ? "transform" : "auto",
                }}
                onMouseDown={(e) => handleDragStart(e, index)}
                onTouchStart={(e) => handleDragStart(e, index)}
              >
                <div
                  className={`w-20 h-24 sm:w-24 sm:h-28 md:w-28 md:h-32 border border-black/20 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center shadow-lg bg-background-2 ${
                    isCenter ? "shadow-xl" : "shadow-md"
                  }`}
                >
                  <span className="font-arabic text-3xl sm:text-4xl md:text-5xl text-brown-brand font-bold pointer-events-none">
                    {letter.letter}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Dots */}
        {/* <div className="flex gap-2 mt-2">
          {shuffledLetters.slice(0, Math.min(5, shuffledLetters.length)).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                i === Math.min(centerCardIndex, 4) ? "bg-foreground w-4" : "bg-gray-300"
              }`}
            />
          ))}
        </div> */}

        {/* Navigation & Shuffle Buttons */}
        <div className="flex items-center gap-2 sm:gap-4 mt-4 lg:mt-0">
          <button
            onClick={() => navigateCards("left")}
            disabled={centerCardIndex === 0}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-foreground flex items-center justify-center disabled:opacity-30"
          >
            <Icon name="RiArrowLeftSLine" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
          </button>
          
          <button
            onClick={shuffleCards}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-foreground-2 text-black font-medium flex items-center gap-1.5 sm:gap-2 hover:bg-foreground-2/60 duration-200 text-sm sm:text-base"
          >
            <Icon name="RiShuffleLine" className="w-4 h-4 sm:w-5 sm:h-5" />
            Acak
          </button>
          
          <button
            onClick={() => navigateCards("right")}
            disabled={centerCardIndex >= shuffledLetters.length - 1}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-foreground flex items-center justify-center disabled:opacity-30"
          >
            <Icon name="RiArrowRightSLine" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
          </button>
        </div>

        {/* Feedback Message */}
        {feedback.show && (
          <div
            className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl z-50 animate-bounce ${
              feedback.isCorrect ? "bg-green-500" : "bg-red-500"
            }`}
          >
            <span className="text-white text-lg sm:text-2xl font-bold">{feedback.message}</span>
          </div>
        )}

        {/* Game Completed Dialog */}
        {isGameCompleted && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-2">Selamat!</h2>
              <p className="text-sm sm:text-base text-black/70 mb-4 sm:mb-6">
                Kamu berhasil mengenali semua huruf hijaiyah!
              </p>
              <div className="flex gap-3 sm:gap-4">
                <button
                  onClick={initializeGame}
                  className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-full bg-[#E37100] text-white font-semibold hover:opacity-90 transition-opacity text-sm sm:text-base"
                >
                  Main Lagi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TebakHijaiyahPage;
