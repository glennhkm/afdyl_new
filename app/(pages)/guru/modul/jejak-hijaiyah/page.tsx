"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeacher } from "@/contexts/TeacherContext";
import Topbar from "@/components/topbar";
import Icon from "@/components/Icon";
import { hijaiyahLetters } from "@/lib/data/hijaiyah-letters";

const TeacherHijaiyahTracingPage = () => {
  const router = useRouter();
  const { currentRoom, currentStudent } = useTeacher();

  // Get progress directly from currentStudent
  const hijaiyahProgress = currentStudent?.hijaiyahProgress;
  const completedLetters = hijaiyahProgress?.completedLetters || [];
  const lastCompletedIndex = completedLetters.length > 0 ? Math.max(...completedLetters) : -1;

  // Redirect if no student selected
  useEffect(() => {
    if (!currentRoom || !currentStudent) {
      router.push("/guru");
    }
  }, [currentRoom, currentStudent, router]);

  const handleLetterClick = (index: number) => {
    const letter = hijaiyahLetters[index];
    router.push(
      `/guru/modul/jejak-hijaiyah/tracing/${index}?letter=${encodeURIComponent(letter.arabic)}&pronunciation=${encodeURIComponent(letter.latin)}`
    );
  };

  if (!currentStudent) return null;

  return (
    <div className="w-full min-h-screen overflow-x-hidden px-2 lg:px-6">
      <Topbar title="Jejak Hijaiyah" onBackClick={() => router.push("/guru/siswa")} />

      {/* Teacher: Student Info Banner */}
      <div className="bg-[#E37100]/10 border-2 border-[#E37100]/30 rounded-xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="RiUserLine" className="w-5 h-5 text-[#E37100]" />
          <span className="text-[#E37100] font-medium">{currentStudent.name}</span>
        </div>
        {lastCompletedIndex >= 0 && (
          <div className="text-xs text-[#E37100] bg-[#E37100]/10 px-2 py-1 rounded-full">
            Progress: {completedLetters.length}/{hijaiyahLetters.length} huruf
          </div>
        )}
      </div>

      {/* Grid of Hijaiyah Letters - Same as student */}
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
                ${isCurrentLetter ? 'ring-2 ring-[#E37100]' : ''}
                ${isCompleted ? 'bg-green-50 border-2 border-green-200' : ''}
              `}
            >
              {/* Teacher: Completed indicator */}
              {isCompleted && (
                <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1">
                  <Icon name="RiCheckLine" className="w-3 h-3" />
                </div>
              )}

              {/* Teacher: Current letter indicator */}
              {isCurrentLetter && (
                <div className="absolute top-1 left-1 bg-[#E37100] text-white px-1.5 py-0.5 rounded text-[10px] font-medium">
                  Lanjut
                </div>
              )}

              {/* Arabic Letter */}
              <div className="flex-1 flex items-center justify-center">
                <span className={`font-arabic text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold leading-none ${isCompleted ? 'text-green-700' : 'text-black'}`}>
                  {letter.arabic}
                </span>
              </div>
              
              {/* Latin Pronunciation */}
              <div className="w-full py-1 sm:py-2 text-center">
                <span className={`text-xs sm:text-sm md:text-base lg:text-lg font-medium ${isCompleted ? 'text-green-600' : 'text-black/80'}`}>
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

export default TeacherHijaiyahTracingPage;
