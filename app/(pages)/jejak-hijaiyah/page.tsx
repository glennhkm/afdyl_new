"use client";

import { useRouter } from "next/navigation";
import { hijaiyahLetters } from "@/lib/data/hijaiyah-letters";
import Topbar from "@/components/topbar";

const HijaiyahTracingPage = () => {
  const router = useRouter();

  const handleLetterClick = (index: number) => {
    const letter = hijaiyahLetters[index];
    router.push(
      `/jejak-hijaiyah/tracing/${index}?letter=${encodeURIComponent(letter.arabic)}&pronunciation=${encodeURIComponent(letter.latin)}`
    );
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      <Topbar title="Jejak Hijaiyah" onBackClick={() => router.push("/dashboard")}/>

      {/* Grid of Hijaiyah Letters */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
        {hijaiyahLetters.map((letter, index) => (
          <button
            key={index}
            onClick={() => handleLetterClick(index)}
            className="group relative bg-foreground-2 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 aspect-[0.85] flex flex-col items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Arabic Letter */}
            <div className="flex-1 flex items-center justify-center">
              <span className="font-arabic text-4xl sm:text-5xl md:text-6xl lg:text-8xl text-black font-bold leading-none">
                {letter.arabic}
              </span>
            </div>
            
            {/* Latin Pronunciation */}
            <div className="w-full py-1 sm:py-2 text-center">
              <span className="text-xs sm:text-sm md:text-base lg:text-lg text-black/80 font-medium">
                ({letter.latin})
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HijaiyahTracingPage;
