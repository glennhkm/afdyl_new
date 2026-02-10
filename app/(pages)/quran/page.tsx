"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Surah, Juz } from "@/types/quran";
import {
  fetchSurahs,
  generateJuzList,
  getStaticSurahs,
  getArabicSurahName,
} from "@/lib/services/quran-service";
import Topbar from "@/components/topbar";
import Icon from "@/components/Icon";
import { QuranPageSkeleton } from "@/components/ui/Skeleton";
import { useStudentProgress } from "@/contexts/StudentProgressContext";

type TabType = "surah" | "juz";

const QuranPage = () => {
  const router = useRouter();
  const { quranProgress, hasQuranProgress } = useStudentProgress();
  const [activeTab, setActiveTab] = useState<TabType>("surah");
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [juzs, setJuzs] = useState<Juz[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Load surahs from API
  const loadSurahs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await fetchSurahs();
      setSurahs(data);
    } catch (error) {
      setErrorMessage(`Gagal memuat data surah: ${error}`);
      setSurahs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load juzs (static data)
  const loadJuzs = useCallback(() => {
    setJuzs(generateJuzList());
  }, []);

  // Initial load
  useEffect(() => {
    loadSurahs();
    loadJuzs();
  }, [loadSurahs, loadJuzs]);

  // Filtered lists based on search
  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahs;

    const query = searchQuery.toLowerCase().trim();
    return surahs.filter((surah) => {
      const englishName = surah.englishName?.toLowerCase() || "";
      const arabicName = getArabicSurahName(surah.number) || "";
      const number = surah.number.toString();

      return (
        englishName.includes(query) ||
        arabicName.includes(query) ||
        number.includes(query)
      );
    });
  }, [surahs, searchQuery]);

  const filteredJuzs = useMemo(() => {
    if (!searchQuery.trim()) return juzs;

    const query = searchQuery.toLowerCase().trim();
    return juzs.filter((juz) => {
      const name = juz.name?.toLowerCase() || "";
      const arabicName = juz.arabicName || "";
      const number = juz.number.toString();

      return (
        name.includes(query) ||
        arabicName.includes(query) ||
        number.includes(query)
      );
    });
  }, [juzs, searchQuery]);

  const currentList = activeTab === "surah" ? filteredSurahs : filteredJuzs;

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Use offline mode
  const useOfflineMode = () => {
    setErrorMessage("");
    setSurahs(getStaticSurahs());
  };

  // Handle item click
  const handleItemClick = (item: Surah | Juz, index: number) => {
    const isSurah = activeTab === "surah";
    const itemName = isSurah
      ? (item as Surah).englishName || `Surah ${index + 1}`
      : (item as Juz).name || `Juz ${index + 1}`;
    const number = item.number || index + 1;

    router.push(
      `/quran/read?type=${activeTab}&number=${number}&name=${encodeURIComponent(
        itemName
      )}`
    );
  };

  // Highlight search matches
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;

    const query = searchQuery.toLowerCase();
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(query);

    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <span className="bg-yellow-200 font-bold">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  };

  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden">
      <Topbar title="Al-Qur'an" />

      {/* Progress Banner */}
      {hasQuranProgress && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="RiBookmarkFill" className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-700 font-medium text-sm sm:text-base">
              Terakhir: {quranProgress.lastSurahName} Ayat {quranProgress.lastAyah}
            </span>
          </div>
          <button
            onClick={() => router.push(`/quran/read?type=surah&number=${quranProgress.lastSurah}&name=${encodeURIComponent(quranProgress.lastSurahName)}`)}
            className="text-xs sm:text-sm text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors"
          >
            Lanjutkan
          </button>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => {
            setActiveTab("surah");
            clearSearch();
          }}
          className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-full font-semibold text-sm sm:text-lg transition-all duration-200 ${
            activeTab === "surah"
              ? "bg-foreground text-black shadow-md border-none"
              : "bg-transparent border-2 border-foreground text-black/70 hover:bg-black/5"
          }`}
        >
          Surah
        </button>
        <button
          onClick={() => {
            setActiveTab("juz");
            clearSearch();
          }}
          className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-full font-semibold text-sm sm:text-lg transition-all duration-200 ${
            activeTab === "juz"
              ? "bg-foreground text-black shadow-md border-none"
              : "bg-transparent border-2 border-foreground text-black/70 hover:bg-foreground/25"
          }`}
        >
          Juz
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="relative bg-white rounded-full shadow-md">
          <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon name="RiSearchLine" className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "surah" ? "Cari surah..." : "Cari juz..."
            }
            className="w-full py-3 sm:py-4 px-10 sm:px-12 rounded-full text-sm sm:text-base text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E37100]/30"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Icon name="RiCloseLine" className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="rounded-t-3xl min-h-[60vh]">
        {/* Loading State */}
        {isLoading && <QuranPageSkeleton />}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20">
            <Icon name="RiCloudOffLine" className="w-12 h-12 sm:w-16 sm:h-16 text-red-500" />
            <h3 className="mt-3 sm:mt-4 text-lg sm:text-xl font-semibold text-black text-center">
              Tidak dapat terhubung ke server
            </h3>
            <p className="mt-2 text-sm sm:text-base text-black/70 text-center px-4 sm:px-8">{errorMessage}</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 sm:mt-6 w-full px-4 sm:w-auto">
              <button
                onClick={loadSurahs}
                className="px-6 py-2.5 bg-[#D4C785] rounded-full text-black font-medium hover:opacity-90 transition text-sm sm:text-base"
              >
                Coba Lagi
              </button>
              <button
                onClick={useOfflineMode}
                className="px-6 py-2.5 bg-[#B8D4B8] rounded-full text-black font-medium hover:opacity-90 transition text-sm sm:text-base"
              >
                Mode Offline
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && currentList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20">
            <Icon
              name={searchQuery ? "RiSearchLine" : "RiInboxLine"}
              className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400"
            />
            <p className="mt-3 sm:mt-4 text-black text-base sm:text-lg text-center px-4">
              {searchQuery
                ? `Tidak ditemukan hasil untuk "${searchQuery}"`
                : "Tidak ada data"}
            </p>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="mt-3 sm:mt-4 text-[#E37100] underline hover:opacity-80 text-sm sm:text-base"
              >
                Hapus pencarian
              </button>
            )}
          </div>
        )}

        {/* Search Results Count */}
        {!isLoading && !errorMessage && searchQuery && currentList.length > 0 && (
          <div className="mb-3 sm:mb-4 px-3 sm:px-4 py-2 bg-[#D4C785]/30 rounded-lg">
            <p className="text-sm sm:text-base text-black/70 italic">
              {currentList.length} hasil ditemukan untuk &quot;{searchQuery}&quot;
            </p>
          </div>
        )}

        {/* List Items */}
        {!isLoading && !errorMessage && currentList.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {currentList.map((item, index) => {
              const isSurah = activeTab === "surah";
              const title = isSurah
                ? (item as Surah).englishName || `Surah ${index + 1}`
                : (item as Juz).name || `Juz ${index + 1}`;
              const surahItem = item as Surah;

              return (
                <button
                  key={item.number}
                  onClick={() => handleItemClick(item, index)}
                  className="w-full bg-white border border-[#D9D9D9] rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 flex items-center justify-between hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Number Badge */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-foreground-2 rounded-full flex items-center justify-center text-black font-bold text-xs sm:text-sm lg:text-base shrink-0">
                      {item.number}
                    </div>
                    
                    <div className="text-left">
                      <h3 className="text-black font-semibold text-base sm:text-lg lg:text-xl">
                        {highlightText(title)}
                      </h3>
                      {isSurah && surahItem.numberOfAyahs > 0 && (
                        <p className="text-black/60 text-xs sm:text-sm">
                          {surahItem.numberOfAyahs} Ayat •{" "}
                          {surahItem.revelationType === "Meccan"
                            ? "Makkiyah"
                            : "Madaniyah"}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuranPage;
