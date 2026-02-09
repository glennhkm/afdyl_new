"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { IqraReadSkeleton } from "@/components/ui/Skeleton";

// Loading component
const LoadingSpinner = () => <IqraReadSkeleton />;

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
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl transform transition-all"
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

// Settings Panel Component
interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  highlightsOn: boolean;
  onToggleHighlights: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  highlightsOn,
  onToggleHighlights,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-start justify-end z-40 pt-32"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl m-4 p-6 w-72"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Pengaturan</h3>
        
        <div className="space-y-4">
          {/* Highlights Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Sorotan Baris Pertama</span>
            <button
              onClick={onToggleHighlights}
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
  );
};

// Main Reading Content Component
const IqraReadingContent = () => {
  const searchParams = useSearchParams();
  const volumeNumber = parseInt(searchParams.get("volume") || "1");

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

  // Load volume data
  useEffect(() => {
    const volume = getVolumeDetails(volumeNumber);
    if (volume) {
      setVolumeTitle(volume.title);
      setTotalPages(getVolumeTotalPages(volumeNumber));
    }
  }, [volumeNumber]);

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

  // Settings button for topbar
  const settingsButton = (
    <button
      onClick={() => setShowSettings(true)}
      className="p-2 lg:p-3 flex items-center justify-center rounded-full bg-brown-brand cursor-pointer hover:opacity-90 duration-200 shadow-lg"
    >
      <Icon name="RiSettings3Line" color="white" className="w-6 lg:w-8 h-6 lg:h-8" />
    </button>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full min-h-[82svh]">
      <Topbar title={volumeTitle} actionButton={settingsButton} />

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
          {/* Grid Container - 6 columns x 5 rows */}
          <div className="grid grid-cols-6 gap-2 lg:gap-4">
            {pageData.letters.map((letter, index) => {
              const isFirstRow = index < 6;
              const isHighlighted = highlightsOn && pageData.highlightIndices?.includes(index);
              const rowIndex = Math.floor(index / 6);
              
              return (
                <React.Fragment key={index}>
                  {/* Add row separator after each row except the last */}
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

          {/* Divider lines between rows */}
          <style jsx>{`
            .grid > button:nth-child(n+7):nth-child(-n+12) {
              border-top: 1px solid #B8B888;
            }
          `}</style>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 mt-8">
        {/* Previous Button */}
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

        {/* Page Indicator */}
        <div className="text-gray-700 font-semibold text-lg">
          Halaman {currentPage}
        </div>

        {/* Next Button */}
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
        <div className="flex gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`
                w-2.5 h-2.5 rounded-full transition-all duration-200
                ${currentPage === i + 1 
                  ? 'bg-brown-brand w-6' 
                  : 'bg-gray-300 hover:bg-gray-400'
                }
              `}
            />
          ))}
        </div>
      </div>

      {/* Letter Modal */}
      <LetterModal
        letter={selectedLetter}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isPlaying={isPlaying}
        onPlayAudio={handlePlayAudio}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        highlightsOn={highlightsOn}
        onToggleHighlights={toggleHighlights}
      />
    </div>
  );
};

// Main Page Component with Suspense
const IqraReadPage = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <IqraReadingContent />
    </Suspense>
  );
};

export default IqraReadPage;
