"use client";

import Topbar from "@/components/topbar";
import Link from "next/link";
import Icon from "@/components/Icon";

interface MenuItem {
  title: string;
  url: string;
  icon: string;
  description: string;
}

const ClientPage = () => {
  const menu: MenuItem[] = [
    {
      title: "Al-Qur'an",
      url: "/quran",
      icon: "RiBookOpenLine",
      description: "Baca dan pelajari Al-Qur'an",
    },
    {
      title: "Iqra'",
      url: "/iqra",
      icon: "RiFileTextLine",
      description: "Belajar membaca huruf hijaiyah",
    },
    {
      title: "Jejak Hijaiyah",
      url: "/jejak-hijaiyah",
      icon: "RiEditLine",
      description: "Latih menulis huruf hijaiyah",
    },
    {
      title: "Tebak Hijaiyah",
      url: "/tebak-hijaiyah",
      icon: "RiGamepadLine",
      description: "Permainan mengenal hijaiyah",
    },
    {
      title: "Latihan Lafal",
      url: "/lafal-hijaiyah",
      icon: "RiMicLine",
      description: "Latih pelafalan huruf hijaiyah",
    },
  ];

  return (
    <div className="w-full h-full overflow-x-hidden pt-4">
      <Topbar title="Yuk Belajar!" />
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {menu.map((item, index) => (
          <Link
            key={index}
            href={item.url}
            className="h-36 sm:h-44 md:h-48 lg:h-52 bg-background-2 rounded-xl shadow cursor-pointer flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 hover:-translate-y-1 duration-200 hover:border-2 hover:border-brown-brand group"
          >
            <Icon
              name={item.icon as keyof typeof import('@remixicon/react')}
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-brown-brand group-hover:scale-110 transition-transform"
            />
            <h2 className="text-base sm:text-lg md:text-xl lg:text-3xl font-semibold text-gray-800 text-center leading-tight">
              {item.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 text-center px-1 sm:px-2 md:px-4 line-clamp-2">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ClientPage;
