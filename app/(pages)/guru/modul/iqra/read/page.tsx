"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTeacher } from "@/contexts/TeacherContext";
import Topbar from "@/components/topbar";
import Icon from "@/components/Icon";
import {
  getVolumeDetails,
  getPageFromVolume,
  getVolumeTotalPages,
  playLetterAudio,
  stopAudio,
  IqraLetter,
  IqraPage,
} from "@/lib/services/iqra-service";

// Loading component - Skeleton version
const LoadingSpinner = () => (
  <div className="w-full min-h-[82svh] pt-20 px-4 overflow-x-hidden">
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-2xl p-4">
        <div className="h-8 w-32 bg-[#E37100]/10 rounded mb-4" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4">
        <div className="h-8 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Letter Modal Component
interface LetterModalProps {
  letter: IqraLetter | null;
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onPlayAudio: () => void;
}

const LetterModal: React.FC<LetterModalProps> = ({
  letter,
  isOpen,
  onClose,
  isPlaying,
  onPlayAudio,
}) => {
  if (!isOpen || !letter) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl transform transition-all relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Audio Button */}
        <button
          onClick={onPlayAudio}
          className={`
            absolute top-4 left-4 p-2 rounded-full 
            transition-all duration-200
            ${isPlaying 
              ? 'bg-brown-brand text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <Icon 
            name={isPlaying ? "RiVolumeUpFill" : "RiVolumeUpLine"} 
            className="w-6 h-6" 
          />
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <Icon name="RiCloseLine" className="w-6 h-6" />
        </button>

        {/* Arabic Letter */}
        <div className="text-center mt-8 mb-6">
          <div className="text-8xl font-arabic text-black leading-none">
            {letter.arabic}
          </div>
          
          {/* Decorative Diamond */}
          <div className="flex justify-center mt-4">
            <div className="w-3 h-3 bg-black transform rotate-45" />
          </div>
        </div>

        {/* Transliteration */}
        <div className="text-center">
          <span className="text-2xl font-semibold text-gray-800">
            ({letter.transliteration})
          </span>
        </div>
      </div>
    </div>
  );
};

// Main Reading Content Component
const TeacherIqraReadingContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { 
    currentRoom, 
    currentStudent, 
    markIqraProgress,
  } = useTeacher();
  
  const volumeNumber = parseInt(searchParams.get("volume") || "1");
  
  // Get progress directly from currentStudent
  const iqraProgress = currentStudent?.iqraProgress;

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageData, setPageData] = useState<IqraPage | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [volumeTitle, setVolumeTitle] = useState("");
  const [highlightsOn, setHighlightsOn] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<IqraLetter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMarkConfirm, setShowMarkConfirm] = useState(false);
  const [markedSuccess, setMarkedSuccess] = useState(false);

  // Redirect if no student
  useEffect(() => {
    if (!currentRoom || !currentStudent) {
      router.push("/guru");
    }
  }, [currentRoom, currentStudent, router]);

  // Load volume data
  useEffect(() => {
    const volume = getVolumeDetails(volumeNumber);
    if (volume) {
      setVolumeTitle(volume.title);
      setTotalPages(getVolumeTotalPages(volumeNumber));
    }
  }, [volumeNumber]);

  // Set initial page based on saved progress
  useEffect(() => {
    if (iqraProgress && iqraProgress.currentJilid === volumeNumber) {
      setCurrentPage(iqraProgress.currentPage);
    }
  }, [iqraProgress, volumeNumber]);

  // Load page data
  useEffect(() => {
    setIsLoading(true);
    const page = getPageFromVolume(volumeNumber, currentPage);
    if (page) {
      setPageData(page);
    }
    setIsLoading(false);
  }, [volumeNumber, currentPage]);

  // Handle letter click
  const handleLetterClick = useCallback((letter: IqraLetter) => {
    setSelectedLetter(letter);
    setIsModalOpen(true);
  }, []);

  // Handle play audio
  const handlePlayAudio = useCallback(async () => {
    if (!selectedLetter) return;

    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      try {
        await playLetterAudio(selectedLetter);
      } catch (error) {
        console.error("Error playing audio:", error);
      } finally {
        setIsPlaying(false);
      }
    }
  }, [selectedLetter, isPlaying]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    stopAudio();
    setIsPlaying(false);
    setIsModalOpen(false);
    setSelectedLetter(null);
  }, []);

  // Handle page navigation
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  // Toggle highlights
  const toggleHighlights = useCallback(() => {
    setHighlightsOn((prev) => !prev);
  }, []);

  // Mark current page as progress
  const handleMarkProgress = useCallback(async () => {
    await markIqraProgress(volumeNumber, currentPage);
    setShowMarkConfirm(false);
    setMarkedSuccess(true);
    setTimeout(() => setMarkedSuccess(false), 3000);
  }, [volumeNumber, currentPage, markIqraProgress]);

  // Check if current page is the marked page
  const isMarkedPage = iqraProgress?.currentJilid === volumeNumber && 
                       iqraProgress?.currentPage === currentPage;

  if (!currentStudent) {
    return null;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full min-h-[82svh]">
      <Topbar 
        title={volumeTitle} 
        onBackClick={() => router.push("/guru/modul/iqra")}
        actionButton={
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 lg:p-3 flex items-center justify-center rounded-full bg-brown-brand cursor-pointer hover:opacity-90 duration-200 shadow-lg"
          >
            <Icon name="RiSettings3Line" color="white" className="w-6 lg:w-8 h-6 lg:h-8" />
          </button>
        }
      />

      {/* Student Banner */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="RiUserLine" className="w-5 h-5 text-emerald-600" />
          <span className="text-emerald-700 font-medium">{currentStudent.name}</span>
        </div>
        <button
          onClick={() => setShowMarkConfirm(true)}
          className="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1"
        >
          <Icon name="RiBookmarkLine" className="w-4 h-4" />
          Tandai
        </button>
      </div>

      {/* Marked Page Indicator */}
      {isMarkedPage && (
        <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-3 mb-4 flex items-center gap-2">
          <Icon name="RiBookmarkFill" className="w-5 h-5 text-emerald-600" />
          <span className="text-emerald-700 text-sm">Halaman ini ditandai sebagai progress terakhir</span>
        </div>
      )}

      {/* Success Message */}
      {markedSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Icon name="RiCheckLine" className="w-5 h-5" />
          <span>Progress berhasil ditandai!</span>
        </div>
      )}

      {/* Highlights Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-gray-800 font-semibold">
          Highlights {highlightsOn ? "On" : "Off"}
        </span>
        <button
          onClick={toggleHighlights}
          className={`
            relative w-14 h-8 rounded-full transition-colors duration-200
            ${highlightsOn ? 'bg-brown-brand' : 'bg-gray-300'}
          `}
        >
          <div
            className={`
              absolute top-1 w-6 h-6 bg-white rounded-full shadow-md
              transition-transform duration-200
              ${highlightsOn ? 'translate-x-7' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Letters Grid */}
      {pageData && (
        <div className="bg-[#D4D4AA] rounded-3xl p-4 lg:p-6 shadow-lg">
          <div className="grid grid-cols-6 gap-2 lg:gap-4">
            {pageData.letters.map((letter, index) => {
              const isFirstRow = index < 6;
              const isHighlighted = highlightsOn && pageData.highlightIndices?.includes(index);
              const rowIndex = Math.floor(index / 6);
              
              return (
                <React.Fragment key={index}>
                  {index > 0 && index % 6 === 0 && rowIndex > 0 && (
                    <div className="col-span-6 border-t border-[#B8B888] my-1" />
                  )}
                  
                  <button
                    onClick={() => handleLetterClick(letter)}
                    className={`
                      aspect-square flex items-center justify-center
                      rounded-xl transition-all duration-200
                      hover:bg-white/30 hover:scale-105 active:scale-95
                      ${isFirstRow ? 'border-b-2 border-[#B8B888]' : ''}
                    `}
                  >
                    <span
                      className={`
                        text-3xl lg:text-5xl font-arabic leading-none
                        transition-colors duration-200
                        ${isHighlighted ? 'text-brown-brand' : 'text-gray-700'}
                      `}
                    >
                      {letter.arabic}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={goToPreviousPage}
          disabled={currentPage === 1}
          className={`
            p-3 rounded-full transition-all duration-200
            ${currentPage === 1
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-brown-brand text-white hover:opacity-90 shadow-md'
            }
          `}
        >
          <Icon name="RiArrowLeftSLine" className="w-6 h-6" />
        </button>

        <div className="text-gray-700 font-semibold text-lg">
          Halaman {currentPage}
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className={`
            p-3 rounded-full transition-all duration-200
            ${currentPage === totalPages
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-brown-brand text-white hover:opacity-90 shadow-md'
            }
          `}
        >
          <Icon name="RiArrowRightSLine" className="w-6 h-6" />
        </button>
      </div>

      {/* Page Progress */}
      <div className="flex justify-center mt-4">
        <div className="flex gap-2 flex-wrap justify-center">
          {Array.from({ length: totalPages }, (_, i) => {
            const isCurrentPageMarked = iqraProgress?.currentJilid === volumeNumber && 
                                        iqraProgress?.currentPage === i + 1;
            return (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`
                  w-2.5 h-2.5 rounded-full transition-all duration-200
                  ${currentPage === i + 1 
                    ? 'bg-brown-brand w-6' 
                    : isCurrentPageMarked
                    ? 'bg-emerald-500'
                    : 'bg-gray-300 hover:bg-gray-400'
                  }
                `}
              />
            );
          })}
        </div>
      </div>

      {/* Floating Mark Button */}
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2">
        <button
          onClick={() => setShowMarkConfirm(true)}
          className="px-6 py-3 rounded-full bg-emerald-500 text-white font-semibold shadow-xl hover:bg-emerald-600 transition-colors flex items-center gap-2"
        >
          <Icon name="RiBookmarkLine" className="w-5 h-5" />
          Tandai Halaman {currentPage}
        </button>
      </div>

      {/* Mark Confirmation Modal */}
      {showMarkConfirm && (
        <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="RiBookmarkLine" className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Tandai Progress</h3>
              <p className="text-gray-600 text-sm">
                Tandai bacaan {currentStudent.name} sampai:
              </p>
              <div className="mt-3 p-3 bg-emerald-50 rounded-xl">
                <p className="text-emerald-800 font-semibold">{volumeTitle}</p>
                <p className="text-emerald-600 text-sm">
                  Halaman {currentPage}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMarkConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleMarkProgress}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                Tandai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Letter Modal */}
      <LetterModal
        letter={selectedLetter}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isPlaying={isPlaying}
        onPlayAudio={handlePlayAudio}
      />

      {/* Settings Panel */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/30 flex items-start justify-end z-40 pt-32"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl m-4 p-6 w-72"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Pengaturan</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Sorotan Baris Pertama</span>
                <button
                  onClick={toggleHighlights}
                  className={`
                    relative w-14 h-8 rounded-full transition-colors duration-200
                    ${highlightsOn ? 'bg-brown-brand' : 'bg-gray-300'}
                  `}
                >
                  <div
                    className={`
                      absolute top-1 w-6 h-6 bg-white rounded-full shadow-md
                      transition-transform duration-200
                      ${highlightsOn ? 'translate-x-7' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Page Component with Suspense
const TeacherIqraReadPage = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TeacherIqraReadingContent />
    </Suspense>
  );
};

export default TeacherIqraReadPage;
