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
  playRowAudio,
  stopAudio,
  IqraPage,
  IqraRow,
} from "@/lib/services/iqra-service";

// Loading component - Skeleton version
const LoadingSpinner = () => (
  <div className="w-full min-h-[82svh] pt-20 px-4 overflow-x-hidden">
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-2xl p-4">
        <div className="h-8 w-32 bg-[#E37100]/10 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Order Modal Component - displays entire order (satuan bacaan)
interface OrderModalProps {
  row: IqraRow | null;
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onPlayAudio: () => void;
}

const OrderModal: React.FC<OrderModalProps> = ({
  row,
  isOpen,
  onClose,
  isPlaying,
  onPlayAudio,
}) => {
  if (!isOpen || !row) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 w-screen h-screen"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl transform transition-all relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Order Number Badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-brown-brand/10 text-brown-brand px-4 py-1 rounded-full text-sm font-semibold">
          Bacaan {row.order_id}
        </div>

        {/* Audio Button */}
        <button
          onClick={onPlayAudio}
          className={`
            absolute top-4 left-4 p-2 rounded-full 
            transition-all duration-200
            ${
              isPlaying
                ? "bg-brown-brand text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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

        {/* Arabic Letters - displayed RTL */}
        <div className="text-center mt-12 mb-6" dir="rtl">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {row.letters.map((letter, idx) => (
              <span
                key={idx}
                className="text-5xl sm:text-6xl lg:text-7xl font-arabic text-black leading-relaxed"
              >
                {letter.arabic}
              </span>
            ))}
          </div>

          {/* Decorative Diamond */}
          <div className="flex justify-center mt-6">
            <div className="w-3 h-3 bg-brown-brand transform rotate-45" />
          </div>
        </div>

        {/* Transliterations */}
        <div className="text-center space-y-2">
          <div
            className="flex flex-wrap items-center justify-center gap-2"
            dir="rtl"
          >
            {row.letters.map((letter, idx) => (
              <span
                key={idx}
                className="text-lg sm:text-xl font-medium text-gray-700 bg-gray-50 px-3 py-1 rounded-lg"
              >
                {letter.latin}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Single Cell Component - displays one order item in the grid (clickable as a whole)
interface IqraCellProps {
  row: IqraRow;
  onOrderClick: (row: IqraRow) => void;
  onRowAudioClick: (row: IqraRow) => void;
  isRowPlaying: boolean;
}

const IqraCell: React.FC<IqraCellProps> = ({
  row,
  onOrderClick,
  onRowAudioClick,
  isRowPlaying,
}) => {
  return (
    <div
      className={`
        flex flex-col items-center py-2 sm:py-3 px-1 sm:px-2 group
      `}
    >
      {/* Order number */}
      <div className="text-xs text-gray-400 font-medium mb-1">
        {row.order_id}
      </div>

      {/* Clickable Order Area - entire order is one button */}
      <button
        onClick={() => onOrderClick(row)}
        className={`
          flex w-full items-center justify-center gap-1
          py-1 px-2 rounded-lg transition-all duration-200
          group-hover:bg-white/60 hover:scale-[1.02] active:scale-[0.98]
          cursor-pointer text-gray-800'}
        `}
        dir="rtl"
      >
        {row.letters.map((letter, letterIndex) => (
          <span
            key={`${row.order_id}-${letterIndex}`}
            className="text-2xl sm:text-3xl lg:text-4xl font-arabic leading-relaxed text-black"
          >
            {letter.arabic}
          </span>
        ))}
      </button>

      {/* Audio button for row */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRowAudioClick(row);
        }}
        className={`
          mt-1 p-1 sm:p-1.5 rounded-full transition-all duration-200
          ${
            isRowPlaying
              ? "bg-brown-brand text-white"
              : "bg-gray-100/80 text-gray-400 hover:bg-gray-200"
          }
        `}
      >
        <Icon
          name={isRowPlaying ? "RiVolumeUpFill" : "RiVolumeUpLine"}
          className="w-3 h-3 sm:w-4 sm:h-4"
        />
      </button>
    </div>
  );
};

// Grid Row Component - displays 3 orders per row (RTL order: smallest on right)
interface IqraGridRowProps {
  rows: IqraRow[]; // Array of 3 (or fewer) rows
  rowGroupIndex: number;
  highlightsOn: boolean;
  onOrderClick: (row: IqraRow) => void;
  onRowAudioClick: (row: IqraRow) => void;
  playingRowId: number | null;
}

const IqraGridRow: React.FC<IqraGridRowProps> = ({
  rows,
  rowGroupIndex,
  onOrderClick,
  onRowAudioClick,
  playingRowId,
}) => {
  return (
    <div
      className={`
        grid grid-cols-3 gap-1 sm:gap-2
        ${rowGroupIndex > 0 ? "border-t border-[#B8B888] pt-2" : ""}
      `}
      dir="rtl"
    >
      {/* With dir="rtl", first item appears on right - so order 1 will be on right */}
      {rows.map((row) => (
        <IqraCell
          key={row.order_id}
          row={row}
          onOrderClick={onOrderClick}
          onRowAudioClick={onRowAudioClick}
          isRowPlaying={playingRowId === row.order_id}
        />
      ))}
      {/* Fill empty cells if less than 3 items */}
      {rows.length < 3 &&
        Array.from({ length: 3 - rows.length }).map((_, i) => (
          <div key={`empty-${i}`} className="py-2 sm:py-3" />
        ))}
    </div>
  );
};

// Main Reading Content Component
const TeacherIqraReadingContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentRoom, currentStudent, markIqraProgress } = useTeacher();

  const volumeNumber = parseInt(searchParams.get("volume") || "1");

  // Get progress directly from currentStudent
  const iqraProgress = currentStudent?.iqraProgress;

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageData, setPageData] = useState<IqraPage | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [volumeTitle, setVolumeTitle] = useState("");
  const [highlightsOn, setHighlightsOn] = useState(true);
  const [selectedRow, setSelectedRow] = useState<IqraRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingRowId, setPlayingRowId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMarkConfirm, setShowMarkConfirm] = useState(false);
  const [markedSuccess, setMarkedSuccess] = useState(false);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (isModalOpen || showSettings || showMarkConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, showSettings, showMarkConfirm]);

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

  // Handle order click - opens modal with full order
  const handleOrderClick = useCallback((row: IqraRow) => {
    setSelectedRow(row);
    setIsModalOpen(true);
  }, []);

  // Handle play order audio from modal
  const handlePlayAudio = useCallback(async () => {
    if (!selectedRow) return;

    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      try {
        await playRowAudio(selectedRow);
      } catch (error) {
        console.error("Error playing audio:", error);
      } finally {
        setIsPlaying(false);
      }
    }
  }, [selectedRow, isPlaying]);

  // Handle play row audio
  const handleRowAudioClick = useCallback(
    async (row: IqraRow) => {
      if (playingRowId === row.order_id) {
        stopAudio();
        setPlayingRowId(null);
      } else {
        setPlayingRowId(row.order_id);
        try {
          await playRowAudio(row);
        } catch (error) {
          console.error("Error playing row audio:", error);
        } finally {
          setPlayingRowId(null);
        }
      }
    },
    [playingRowId],
  );

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    stopAudio();
    setIsPlaying(false);
    setIsModalOpen(false);
    setSelectedRow(null);
  }, []);

  // Handle page navigation
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const isMarkedPage =
    iqraProgress?.currentJilid === volumeNumber &&
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
      />

      {/* Student Banner */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="RiUserLine" className="w-5 h-5 text-emerald-600" />
          <span className="text-emerald-700 font-medium">
            {currentStudent.name}
          </span>
        </div>
        <button
          onClick={() => setShowMarkConfirm(true)}
          className="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1"
        >
          <Icon name="RiBookmarkLine" className="w-4 h-4" />
          Tandai
        </button>
      </div>

      {/* Page Topic Header */}
      {pageData?.topic && (
        <div className="bg-linear-r from-brown-brand/10 to-tertiary-orange/10 rounded-2xl p-4 mb-4 border border-brown-brand/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-1">
                Topik Halaman {currentPage}
              </p>
              <p className="text-lg sm:text-xl font-bold text-brown-brand">
                {pageData.topic.latin}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-arabic text-black">
                {pageData.topic.arab}
              </p>
            </div>
          </div>
          {pageData.instruction && (
            <p className="text-xs sm:text-sm text-gray-600 mt-2 pt-2 border-t border-brown-brand/10">
              💡 {pageData.instruction}
            </p>
          )}
        </div>
      )}

      {/* Marked Page Indicator */}
      {isMarkedPage && (
        <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-3 mb-4 flex items-center gap-2">
          <Icon name="RiBookmarkFill" className="w-5 h-5 text-emerald-600" />
          <span className="text-emerald-700 text-sm">
            Halaman ini ditandai sebagai progress terakhir
          </span>
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
      <div className="flex items-center gap-3 mb-4">
        <span className="text-gray-800 font-semibold text-sm sm:text-base">
          Highlights {highlightsOn ? "On" : "Off"}
        </span>
        <button
          onClick={toggleHighlights}
          className={`
            relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-colors duration-200
            ${highlightsOn ? "bg-brown-brand" : "bg-gray-300"}
          `}
        >
          <div
            className={`
              absolute top-0.5 sm:top-1 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow-md
              transition-transform duration-200
              ${highlightsOn ? "translate-x-6 sm:translate-x-7" : "translate-x-1"}
            `}
          />
        </button>
      </div>

      {/* Iqra Content - Grid Based Layout (3 orders per row) */}
      {pageData && pageData.rows && (
        <div className="bg-[#F5F5DC] rounded-3xl p-3 sm:p-4 lg:p-6 shadow-lg border border-[#D4D4AA] mb-6">
          <div className="space-y-2">
            {Array.from({ length: Math.ceil(pageData.rows.length / 3) }).map(
              (_, groupIndex) => {
                const startIndex = groupIndex * 3;
                const rowGroup = pageData.rows.slice(
                  startIndex,
                  startIndex + 3,
                );
                return (
                  <IqraGridRow
                    key={groupIndex}
                    rows={rowGroup}
                    rowGroupIndex={groupIndex}
                    highlightsOn={highlightsOn}
                    onOrderClick={handleOrderClick}
                    onRowAudioClick={handleRowAudioClick}
                    playingRowId={playingRowId}
                  />
                );
              },
            )}
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
            ${
              currentPage === 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-brown-brand text-white hover:opacity-90 shadow-md"
            }
          `}
        >
          <Icon name="RiArrowLeftSLine" className="w-6 h-6" />
        </button>

        <div className="text-gray-700 font-semibold text-lg">
          Halaman {currentPage} / {totalPages}
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className={`
            p-3 rounded-full transition-all duration-200
            ${
              currentPage === totalPages
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-brown-brand text-white hover:opacity-90 shadow-md"
            }
          `}
        >
          <Icon name="RiArrowRightSLine" className="w-6 h-6" />
        </button>
      </div>

      {/* Page Progress */}
      <div className="flex justify-center mt-4 mb-24">
        <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
          {Array.from({ length: Math.min(totalPages, 15) }, (_, i) => {
            const pageNum = i + 1;
            const isCurrentPageMarked =
              iqraProgress?.currentJilid === volumeNumber &&
              iqraProgress?.currentPage === pageNum;
            return (
              <button
                key={i}
                onClick={() => {
                  setCurrentPage(pageNum);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`
                  w-2.5 h-2.5 rounded-full transition-all duration-200
                  ${
                    currentPage === pageNum
                      ? "bg-brown-brand w-6"
                      : isCurrentPageMarked
                        ? "bg-emerald-500"
                        : "bg-gray-300 hover:bg-gray-400"
                  }
                `}
              />
            );
          })}
          {totalPages > 15 && (
            <span className="text-gray-400 text-xs self-center ml-1">
              +{totalPages - 15}
            </span>
          )}
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
                <Icon
                  name="RiBookmarkLine"
                  className="w-8 h-8 text-emerald-600"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Tandai Progress
              </h3>
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

      {/* Order Modal */}
      <OrderModal
        row={selectedRow}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isPlaying={isPlaying}
        onPlayAudio={handlePlayAudio}
      />      
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
