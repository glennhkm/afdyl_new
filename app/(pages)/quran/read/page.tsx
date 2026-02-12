"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { Ayah, AyahTiming } from "@/types/quran";
import {
  fetchAyahs,
  fetchTimings,
  getAyahTimings,
  getArabicNumber,
} from "@/lib/services/quran-service";
import Topbar from "@/components/topbar";
import Icon from "@/components/Icon";
import { QuranReadSkeleton } from "@/components/ui/Skeleton";
import { useStudentProgress } from "@/contexts/StudentProgressContext";
import { usePullToRefresh } from "@/contexts/PullToRefreshContext";

// Loading component for Suspense
const ReadingPageLoading = () => <QuranReadSkeleton />;

// Optimized Settings Modal with local state for smooth slider performance
const SettingsModal = React.memo(({ 
  fontSize: initialFontSize, 
  wordSpacing: initialWordSpacing, 
  onFontSizeChange, 
  onWordSpacingChange, 
  onClose 
}: {
  fontSize: number;
  wordSpacing: number;
  onFontSizeChange: (value: number) => void;
  onWordSpacingChange: (value: number) => void;
  onClose: () => void;
}) => {
  // Local state for immediate UI feedback
  const [localFontSize, setLocalFontSize] = useState(initialFontSize);
  const [localWordSpacing, setLocalWordSpacing] = useState(initialWordSpacing);
  
  // Refs to track if we need to sync on close
  const fontSizeRef = useRef(initialFontSize);
  const wordSpacingRef = useRef(initialWordSpacing);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Debounced sync to parent - only updates main state after user stops sliding
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fontSizeRef.current !== localFontSize) {
        onFontSizeChange(localFontSize);
        fontSizeRef.current = localFontSize;
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [localFontSize, onFontSizeChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (wordSpacingRef.current !== localWordSpacing) {
        onWordSpacingChange(localWordSpacing);
        wordSpacingRef.current = localWordSpacing;
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [localWordSpacing, onWordSpacingChange]);

  return (
    <div className="fixed inset-0 bg-black/50 z-200 flex items-end lg:items-center justify-center h-screen">
      <div className="bg-white w-full lg:w-125 lg:rounded-2xl rounded-t-3xl max-h-[80vh] sm:max-h-[75vh] overflow-auto pb-10 lg:pb-0">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-base sm:text-lg font-semibold text-black">
            Pengaturan Bacaan
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 bg-red-100 rounded-full flex items-center justify-center"
          >
            <Icon name="RiCloseLine" className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 sm:space-y-6">
          {/* Font Size */}
          <div>
            <label className="block text-black font-medium mb-2 sm:mb-3 text-sm sm:text-base">
              Ukuran teks Arab
            </label>
            <div className="bg-gray-100 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 overflow-hidden">
              <p
                className="font-arabic text-black text-center transition-all duration-100 ease-out will-change-[font-size]"
                style={{ fontSize: `${localFontSize}px` }}
              >
                بِسْمِ
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-arabic text-gray-400 text-xs sm:text-sm">
                بِسْمِ
              </span>
              <input
                type="range"
                min="16"
                max="60"
                value={localFontSize}
                onChange={(e) => setLocalFontSize(Number(e.target.value))}
                className="flex-1 accent-[#E37100] cursor-pointer"
              />
              <span className="font-arabic text-gray-400 text-xl sm:text-2xl">
                بِسْمِ
              </span>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">{localFontSize}px</p>
          </div>

          {/* Word Spacing */}
          <div>
            <label className="block text-black font-medium mb-2 sm:mb-3 text-sm sm:text-base">
              Jarak antar kata
            </label>
            <div className="bg-gray-100 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 overflow-hidden">
              <p
                className="font-arabic text-black text-center transition-all duration-100 ease-out will-change-[word-spacing]"
                style={{ wordSpacing: `${localWordSpacing}px`, fontSize: "24px" }}
              >
                بِسْمِ اللَّهِ
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-gray-400 text-xs sm:text-sm">Rapat</span>
              <input
                type="range"
                min="10"
                max="70"
                value={localWordSpacing}
                onChange={(e) => setLocalWordSpacing(Number(e.target.value))}
                className="flex-1 accent-[#E37100] cursor-pointer"
              />
              <span className="text-gray-400 text-xs sm:text-sm">Lebar</span>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">{localWordSpacing}px</p>
          </div>
        </div>
      </div>
    </div>
  );
});

SettingsModal.displayName = 'SettingsModal';

// Main content component
const ReadingContent = () => {
  const searchParams = useSearchParams();
  const { quranProgress, markQuranProgress } = useStudentProgress();
  const { disablePullToRefresh, enablePullToRefresh } = usePullToRefresh();

  // Disable pull-to-refresh when component mounts (reading page with scroll)
  useEffect(() => {
    disablePullToRefresh();
    return () => {
      enablePullToRefresh();
    };
  }, [disablePullToRefresh, enablePullToRefresh]);

  // URL params
  const type = (searchParams.get("type") as "surah" | "juz") || "surah";
  const number = parseInt(searchParams.get("number") || "1");
  const name = searchParams.get("name") || "";

  // State
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [timings, setTimings] = useState<AyahTiming[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showMeaning, setShowMeaning] = useState(false);
  const [fontSize, setFontSize] = useState(32);
  const [wordSpacing, setWordSpacing] = useState(40);
  const [currentActiveAyah, setCurrentActiveAyah] = useState(0);
  const [currentActiveWord, setCurrentActiveWord] = useState(0);
  const [autoHighlight, setAutoHighlight] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMarkConfirm, setShowMarkConfirm] = useState(false);
  const [markedSuccess, setMarkedSuccess] = useState(false);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showMarkConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMarkConfirm]);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Computed values
  const ayahNumberSize = useMemo(
    () => Math.max(14, Math.min(32, fontSize * 0.65)),
    [fontSize]
  );
  const wordPadding = useMemo(
    () => Math.max(6, Math.min(18, fontSize * 0.35)),
    [fontSize]
  );

  // Load ayahs
  const loadAyahs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [ayahData, timingData] = await Promise.all([
        fetchAyahs(type, number),
        fetchTimings(),
      ]);

      setAyahs(ayahData);
      setTimings(timingData);
      ayahRefs.current = ayahData.map(() => null);
    } catch (error) {
      setErrorMessage(`Gagal memuat ayat: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [type, number]);

  useEffect(() => {
    loadAyahs();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [loadAyahs]);

  // Set initial active ayah based on saved progress
  useEffect(() => {
    if (quranProgress.lastSurah === number && ayahs.length > 0) {
      const savedAyahIndex = ayahs.findIndex(a => a.number === quranProgress.lastAyah);
      if (savedAyahIndex !== -1) {
        setCurrentActiveAyah(savedAyahIndex);
        // Scroll to saved position after a short delay
        setTimeout(() => {
          ayahRefs.current[savedAyahIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 500);
      }
    }
  }, [quranProgress.lastSurah, quranProgress.lastAyah, number, ayahs]);

  // Mark current position as progress
  const handleMarkProgress = useCallback(() => {
    if (ayahs.length === 0) return;
    
    const currentAyah = ayahs[currentActiveAyah];
    markQuranProgress(number, name, currentAyah.number);
    
    setShowMarkConfirm(false);
    setMarkedSuccess(true);
    setTimeout(() => setMarkedSuccess(false), 3000);
  }, [ayahs, currentActiveAyah, number, name, markQuranProgress]);

  // Scroll to ayah
  const scrollToAyah = useCallback((index: number) => {
    const ayahElement = ayahRefs.current[index];
    if (ayahElement) {
      ayahElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  // Stop auto highlight - defined before playAyahAudio to avoid dependency issues
  const stopAutoHighlight = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setAutoHighlight(false);
  }, []);

  // Play ayah audio
  const playAyahAudio = useCallback(
    (ayahIndex: number) => {
      if (ayahs.length === 0 || ayahIndex >= ayahs.length) return;

      const ayah = ayahs[ayahIndex];
      const audioUrl = ayah.audio;

      if (!audioUrl) {
        setErrorMessage("Audio tidak tersedia untuk ayat ini");
        return;
      }

      // If same ayah is playing, pause it
      if (currentActiveAyah === ayahIndex && autoHighlight) {
        stopAutoHighlight();
        return;
      }

      setCurrentActiveAyah(ayahIndex);
      setCurrentActiveWord(0);
      setAutoHighlight(true);

      scrollToAyah(ayahIndex);

      // Create and play audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener("timeupdate", () => {
        const ms = audio.currentTime * 1000;
        const segments = getAyahTimings(timings, number, ayah.number);
        const words = ayah.words || [];

        if (segments.length > 0 && words.length > 0) {
          for (const segment of segments) {
            if (segment.length >= 4) {
              const startMs = segment[2];
              const endMs = segment[3];
              const idx1Based = segment[0];
              const wordIndex = idx1Based - 1;

              if (
                ms >= startMs &&
                ms < endMs &&
                wordIndex >= 0 &&
                wordIndex < words.length
              ) {
                setCurrentActiveWord(wordIndex);
                break;
              }
            }
          }
        }
      });

      audio.addEventListener("ended", () => {
        // Move to next ayah - use recursive pattern via setTimeout
        if (ayahIndex < ayahs.length - 1) {
          setTimeout(() => {
            // Re-trigger play for next ayah
            const nextAyah = ayahs[ayahIndex + 1];
            if (nextAyah?.audio) {
              setCurrentActiveAyah(ayahIndex + 1);
              setCurrentActiveWord(0);
              
              const nextAudio = new Audio(nextAyah.audio);
              if (audioRef.current) {
                audioRef.current.pause();
              }
              audioRef.current = nextAudio;
              nextAudio.play().catch(console.error);
            }
          }, 100);
        } else {
          stopAutoHighlight();
        }
      });

      audio.play().catch((err) => {
        console.error("Audio play failed:", err);
        setErrorMessage("Gagal memutar audio");
      });
    },
    [ayahs, currentActiveAyah, autoHighlight, scrollToAyah, timings, number, stopAutoHighlight]
  );

  // Handle ayah click
  const handleAyahClick = useCallback(
    (ayahIndex: number) => {
      setCurrentActiveAyah(ayahIndex);
      setCurrentActiveWord(0);
      scrollToAyah(ayahIndex);
    },
    [scrollToAyah]
  );

  // Handle word click
  const handleWordClick = useCallback(
    (ayahIndex: number, wordIndex: number) => {
      if (!autoHighlight) {
        setCurrentActiveAyah(ayahIndex);
        setCurrentActiveWord(wordIndex);
        scrollToAyah(ayahIndex);
      }
    },
    [autoHighlight, scrollToAyah]
  );

  // Render word
  const renderWord = useCallback(
    (
      word: { text: string; translation: string },
      ayahIndex: number,
      wordIndex: number,
      isActiveAyah: boolean
    ) => {
      const isActiveWord = isActiveAyah && wordIndex === currentActiveWord;
      const isReadWord =
        ayahIndex < currentActiveAyah ||
        (isActiveAyah && wordIndex < currentActiveWord);

      let bgColor = "bg-gray-100/5";
      let textColor = "text-black/5";

      if (isActiveWord) {
        bgColor = "bg-yellow-200";
        textColor = "text-black";
      } else if (isReadWord) {
        bgColor = "bg-green-50";
        textColor = "text-black/60";
      } else if (isActiveAyah) {
        bgColor = "bg-white";
        textColor = "text-black";
      }

      return (
        <button
          key={wordIndex}
          onClick={() => handleWordClick(ayahIndex, wordIndex)}
          className={`inline-block rounded-lg transition-all duration-200 ${bgColor} ${
            isActiveWord ? "ring-2 ring-[#D4A574] shadow-md" : ""
          }`}
          style={{
            padding: `${wordPadding * 0.7}px ${wordPadding}px`,
            marginLeft: `${wordSpacing * 0.3}px`,
          }}
        >
          <span
            className={`font-arabic ${textColor}`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.4,
            }}
          >
            {word.text}
          </span>
        </button>
      );
    },
    [
      currentActiveWord,
      currentActiveAyah,
      handleWordClick,
      wordPadding,
      wordSpacing,
      fontSize,
    ]
  );

  // Render ayah number badge
  const renderAyahNumber = useCallback(
    (ayahNumber: number) => (
      <span
        className="inline-flex items-center justify-center bg-foreground-2 text-black rounded-xl"
        style={{
          padding: `${wordPadding * 0.28}px ${wordPadding * 0.45}px`,
          marginRight: `${wordSpacing * 0.5}px`,
          fontSize: `${ayahNumberSize}px`,
        }}
      >
        {getArabicNumber(ayahNumber)}
      </span>
    ),
    [wordPadding, wordSpacing, ayahNumberSize]
  );

  // Render ayah
  const renderAyah = useCallback(
    (ayah: Ayah, index: number) => {
      const isActiveAyah = index === currentActiveAyah;
      const words = ayah.words || [];
      const isMarkedAyah = quranProgress.lastAyah === ayah.number && quranProgress.lastSurah === number;

      return (
        <div
          key={ayah.number}
          ref={(el) => {
            ayahRefs.current[index] = el;
          }}
          onClick={() => handleAyahClick(index)}
          className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 transition-all duration-300 cursor-pointer ring-1 ${
            isActiveAyah
              ? "bg-foreground-2 shadow-lg opacity-100 ring-black/10"
              : isMarkedAyah
              ? "bg-emerald-50 opacity-80 ring-emerald-300 ring-2"
              : "opacity-40 hover:opacity-80 ring-black/10"
          }`}
        >
          {/* Top Bar with Play Button and Mark Indicator */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                playAyahAudio(index);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 bg-foreground rounded-full flex items-center justify-center hover:bg-foreground/60 transition"
            >
              <Icon
                name={
                  currentActiveAyah === index && autoHighlight
                    ? "RiPauseFill"
                    : "RiPlayFill"
                }
                className="w-4 h-4 sm:w-5 sm:h-5 text-black"
              />
            </button>
            
            {isMarkedAyah && (
              <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs">
                <Icon name="RiBookmarkFill" className="w-3 h-3" />
                <span>Terakhir dibaca</span>
              </div>
            )}
          </div>

          {/* Arabic Text */}
          <div className="text-right" dir="rtl">
            {words.length > 0 ? (
              <div className="flex flex-wrap justify-start gap-1">
                {words.map((word, wordIndex) =>
                  renderWord(word, index, wordIndex, isActiveAyah)
                )}
                {renderAyahNumber(ayah.number)}
              </div>
            ) : (
              <p
                className="font-arabic text-black leading-loose"
                style={{
                  fontSize: `${fontSize}px`,
                  wordSpacing: `${wordSpacing}px`,
                }}
              >
                {ayah.text}{" "}
                {renderAyahNumber(ayah.number)}
              </p>
            )}
          </div>

          {/* Translation */}
          {showMeaning && (
            <div className="mt-4 pt-4 border-t border-[#D4A574]/30">
              {words.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-end" dir="rtl">
                  {words.map((word, wordIndex) => {
                    const isActiveWord =
                      isActiveAyah && wordIndex === currentActiveWord;
                    return (
                      <div
                        key={wordIndex}
                        className={`px-2 py-1 rounded-lg border border-black/10 max-w-30 ${
                          isActiveWord ? "bg-amber-100" : "bg-white"
                        }`}
                      >
                        <p className="text-sm text-black/80 text-center truncate">
                          {word.translation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-black/80 text-base leading-relaxed">
                  {ayah.translation}
                </p>
              )}
            </div>
          )}
        </div>
      );
    },
    [
      currentActiveAyah,
      autoHighlight,
      showMeaning,
      currentActiveWord,
      handleAyahClick,
      playAyahAudio,
      renderWord,
      renderAyahNumber,
      fontSize,
      wordSpacing,
      quranProgress.lastAyah,
      quranProgress.lastSurah,
      number,
    ]
  );

  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden">
      <Topbar
        title={name || `${type === "surah" ? "Surah" : "Juz"} ${number}`}
        actionButton={
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 sm:p-2 lg:p-3 flex items-center justify-center rounded-full bg-brown-brand cursor-pointer hover:opacity-90 duration-200 shadow-lg"
          >
            <Icon
              name="RiSettings3Line"
              color="white"
              className="w-5 sm:w-6 lg:w-8 h-5 sm:h-6 lg:h-8"
            />
          </button>
        }
      />

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border-2 border-gray-100 p-4">
              <div className="h-10 bg-[#E37100]/10 rounded mb-3" />
              <div className="h-6 bg-gray-100 rounded mb-2" />
              <div className="h-4 bg-gray-50 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && errorMessage && (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4">
          <Icon name="RiErrorWarningLine" className="w-12 h-12 sm:w-16 sm:h-16 text-red-500" />
          <p className="mt-3 sm:mt-4 text-black text-base sm:text-lg text-center">
            {errorMessage}
          </p>
          <button
            onClick={loadAyahs}
            className="mt-4 sm:mt-6 px-6 py-2 bg-[#D4C785] rounded-full text-black font-medium hover:opacity-90 transition text-sm sm:text-base"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Ayahs List */}
      {!isLoading && !errorMessage && ayahs.length > 0 && (
        <div ref={containerRef} className="pb-24 sm:pb-32">
          {/* Bismillah Header (except for Surah 1 and 9) */}
          {type === "surah" && number !== 1 && number !== 9 && (
            <div className="text-center py-6 mb-4">
              <p
                className="font-arabic text-black"
                style={{ fontSize: `${fontSize * 0.9}px` }}
              >
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              {showMeaning && (
                <p className="text-black/70 mt-2">
                  Dengan nama Allah Yang Maha Pengasih, Maha Penyayang
                </p>
              )}
            </div>
          )}

          {ayahs.map((ayah, index) => renderAyah(ayah, index))}
        </div>
      )}

      {/* Floating Controls */}
      {!isLoading && ayahs.length > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 bg-white rounded-full shadow-xl px-3 sm:px-4 py-2">
          <button
            onClick={() => setShowMeaning(!showMeaning)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition ${
              showMeaning
                ? "bg-[#E37100] text-white"
                : "bg-gray-100 text-black"
            }`}
          >
            {showMeaning ? "Sembunyikan" : "Tampilkan"}
          </button>
          <button
            onClick={() =>
              autoHighlight ? stopAutoHighlight() : playAyahAudio(currentActiveAyah)
            }
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition flex items-center gap-1.5 sm:gap-2 ${
              autoHighlight
                ? "bg-red-500 text-white"
                : "bg-[#E37100] text-white"
            }`}
          >
            <Icon
              name={autoHighlight ? "RiStopFill" : "RiPlayFill"}
              className="w-3 h-3 sm:w-4 sm:h-4"
            />
            {autoHighlight ? "Stop" : "Putar"}
          </button>
          <button
            onClick={() => setShowMarkConfirm(true)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition bg-emerald-500 text-white flex items-center gap-1.5 sm:gap-2"
          >
            <Icon name="RiBookmarkLine" className="w-3 h-3 sm:w-4 sm:h-4" />
            Tandai
          </button>
        </div>
      )}

      {/* Mark Progress Confirmation Modal */}
      {showMarkConfirm && (
        <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="RiBookmarkLine" className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Tandai Progress?
              </h3>
              <p className="text-gray-600 mb-6">
                Tandai posisi bacaan saat ini di Ayat {ayahs[currentActiveAyah]?.number || 1}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMarkConfirm(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleMarkProgress}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
                >
                  Tandai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {markedSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Icon name="RiCheckLine" className="w-5 h-5" />
          <span>Progress berhasil ditandai!</span>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          fontSize={fontSize}
          wordSpacing={wordSpacing}
          onFontSizeChange={setFontSize}
          onWordSpacingChange={setWordSpacing}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

// Main component with Suspense wrapper
const ReadingPage = () => {
  return (
    <Suspense fallback={<ReadingPageLoading />}>
      <ReadingContent />
    </Suspense>
  );
};

export default ReadingPage;
