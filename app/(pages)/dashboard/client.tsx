"use client";

import Topbar from "@/components/topbar";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useStudentProgress } from "@/contexts/StudentProgressContext";
import { useRouter } from "next/navigation";

interface MenuItem {
  title: string;
  url: string;
  icon: string;
  progress?: string | null;
}

const ClientPage = () => {
  const router = useRouter();
  const { 
    quranProgress, 
    iqraProgress, 
    hijaiyahProgress,
    hasQuranProgress,
    hasIqraProgress,
    hasHijaiyahProgress,
  } = useStudentProgress();

  const menu: MenuItem[] = [
    {
      title: "Al-Qur'an",
      url: "/quran",
      icon: "RiBookOpenLine",
      progress: hasQuranProgress 
        ? `Terakhir: ${quranProgress.lastSurahName} Ayat ${quranProgress.lastAyah}` 
        : null,
    },
    {
      title: "Iqra'",
      url: "/iqra",
      icon: "RiFileTextLine",
      progress: hasIqraProgress 
        ? `Terakhir: Jilid ${iqraProgress.currentJilid} Hal. ${iqraProgress.currentPage}` 
        : null,
    },
    {
      title: "Jejak Hijaiyah",
      url: "/jejak-hijaiyah",
      icon: "RiEditLine",
      progress: hasHijaiyahProgress 
        ? `${hijaiyahProgress.completedLetters.length}/29 huruf selesai` 
        : null,
    },
    {
      title: "Tebak Hijaiyah",
      url: "/tebak-hijaiyah",
      icon: "RiGamepadLine",
    },
    {
      title: "Tangkap Hijaiyah",
      url: "/tangkap-hijaiyah",
      icon: "RiCameraLine",
    },
    {
      title: "Latihan Lafal",
      url: "/lafal-hijaiyah",
      icon: "RiMicLine",
    },
  ];

  return (
    <div className="w-full h-full overflow-x-hidden py-4">
      <Topbar title="Yuk Belajar!" onBackClick={() => router.push("/")} />
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {menu.map((item, index) => (
          <Link
            key={index}
            href={item.url}
            className="relative h-36 sm:h-44 md:h-48 lg:h-52 bg-background-2 rounded-3xl shadow cursor-pointer flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 hover:-translate-y-1 duration-200 border-2 border-brown-brand/50 hover:border-brown-brand group"
          >
            {/* Progress Badge */}
            {item.progress && (
              <div className="absolute top-2 right-2 text-[10px] sm:text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Icon name="RiCheckboxCircleFill" className="w-3 h-3" />
                <span className="hidden sm:inline">{item.progress}</span>
                <span className="sm:hidden">✓</span>
              </div>
            )}
            <Icon
              name={item.icon as keyof typeof import('@remixicon/react')}
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-brown-brand group-hover:scale-110 transition-transform"
            />
            <h2 className="text-base sm:text-lg md:text-xl lg:text-3xl font-semibold text-gray-800 text-center leading-tight">
              {item.title}
            </h2>
            {/* Progress text on mobile */}
            {item.progress && (
              <p className="sm:hidden text-[10px] text-emerald-600 text-center px-1">
                {item.progress}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ClientPage;
