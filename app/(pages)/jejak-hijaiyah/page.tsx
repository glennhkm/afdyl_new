"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { hijaiyahLetters } from "@/lib/data/hijaiyah-letters";
import Topbar from "@/components/topbar";
import Icon from "@/components/Icon";
import { useStudentProgress } from "@/contexts/StudentProgressContext";
import { usePullToRefresh } from "@/contexts/PullToRefreshContext";

const HijaiyahTracingPage = () => {
  const router = useRouter();
  const { hijaiyahProgress, hasHijaiyahProgress } = useStudentProgress();
  const { disablePullToRefresh, enablePullToRefresh } = usePullToRefresh();
  
  // Disable pull-to-refresh when component mounts (tracing game page)
  useEffect(() => {
    disablePullToRefresh();
    return () => {
      enablePullToRefresh();
    };
  }, [disablePullToRefresh, enablePullToRefresh]);
  
  const completedLetters = hijaiyahProgress.completedLetters || [];
  const lastCompletedIndex = completedLetters.length > 0 ? Math.max(...completedLetters) : -1;

  const handleLetterClick = (index: number) => {
    const letter = hijaiyahLetters[index];
    router.push(
      `/jejak-hijaiyah/tracing/${index}?letter=${encodeURIComponent(letter.arabic)}&pronunciation=${encodeURIComponent(letter.latin)}`
    );
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden p-2">
      <Topbar title="Jejak Hijaiyah" onBackClick={() => router.push("/dashboard")}/>

      {/* Progress Banner */}
      {hasHijaiyahProgress && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="RiEditBoxFill" className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-700 font-medium text-sm sm:text-base">
              {completedLetters.length}/29 huruf selesai
            </span>
          </div>
          {lastCompletedIndex < hijaiyahLetters.length - 1 && (
            <button
              onClick={() => handleLetterClick(lastCompletedIndex + 1)}
              className="text-xs sm:text-sm text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors"
            >
              Lanjutkan
            </button>
          )}
        </div>
      )}

      {/* Grid of Hijaiyah Letters */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
        {hijaiyahLetters.map((letter, index) => {
          const isCompleted = completedLetters.includes(index);
          const isCurrentLetter = !isCompleted && (completedLetters.length === 0 ? index === 0 : index === lastCompletedIndex + 1);
          
          return (
            <button
              key={index}
              onClick={() => handleLetterClick(index)}
              className={`
                group relative bg-foreground-2 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 
                aspect-[0.85] flex flex-col items-center justify-center 
                shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                ${isCurrentLetter ? 'ring-2 ring-emerald-500' : ''}
                ${isCompleted ? 'bg-emerald-50 border-2 border-emerald-200' : ''}
              `}
            >
              {/* Completed indicator */}
              {isCompleted && (
                <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-1">
                  <Icon name="RiCheckLine" className="w-3 h-3" />
                </div>
              )}

              {/* Current letter indicator */}
              {isCurrentLetter && (
                <div className="absolute top-1 left-1 bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[10px] font-medium">
                  Lanjut
                </div>
              )}

              {/* Arabic Letter */}
              <div className="flex-1 flex items-center justify-center">
                <span className={`font-arabic text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold leading-none ${isCompleted ? 'text-emerald-700' : 'text-black'}`}>
                  {letter.arabic}
                </span>
              </div>
              
              {/* Latin Pronunciation */}
              <div className="w-full py-1 sm:py-2 text-center">
                <span className={`text-xs sm:text-sm md:text-base lg:text-lg font-medium ${isCompleted ? 'text-emerald-600' : 'text-black/80'}`}>
                  ({letter.latin})
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HijaiyahTracingPage;
