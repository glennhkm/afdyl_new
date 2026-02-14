"use client";

import Image from "next/image";
import Link from "next/link";
import { useTeacher } from "@/contexts/TeacherContext";
import Icon from "@/components/Icon";

const Home = () => {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="relative w-full min-h-screen">
        <Image
          src="/images/bg.png"
          alt="Background Image"
          width={1920}
          height={1080}
          className="w-full h-auto absolute inset-0 lg:-top-20 object-cover object-center z-0"
          priority
        />
      </div>
      {/* Teacher Mode */}
      <Link
        href="/guru"
        className="flex-1 fixed top-0 z-100 right-0 bg-emerald-600 text-white rounded-bl-2xl p-4 shadow-lg hover:opacity-90 transition-all duration-200 hover:-translate-y-1 group"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Mode Pengajar</h2>
          <Icon name="RiArrowRightLine" className="w-6 h-6 text-white" />
        </div>
      </Link>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8 text-center lg:mt-72 gap-6 sm:gap-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900">
          Selamat Datang di AFDYL
        </h1>

        <p className="text-sm sm:text-base md:text-xl font-normal text-gray-700 max-w-3xl px-4 -mt-5 flex flex-col">
          <span className="font-semibold mb-6">
            Al-Qur&apos;an for Dyslexia
          </span>{" "}
          <span>
            {" "}
            Media pembelajaran interaktif Al-Qur&apos;an dan Iqra&apos; untuk
            anak-anak Disleksia
          </span>
        </p>

        {/* Mode Selection Cards */}
        <div className="flex justify-center gap-4 sm:gap-6 w-full max-w-2xl px-4">
          {/* Student Mode */}
          <Link
            href="/dashboard"
            className="bg-brown-brand text-white rounded-2xl p-6 sm:p-8 shadow-lg hover:opacity-90 transition-all duration-200 hover:-translate-y-1 group"
          >
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <h2 className="text-xl sm:text-2xl font-bold">Mulai Belajar</h2>
            </div>
          </Link>
        </div>
        <p className="text-center text-xs sm:text-sm text-gray-600 mb-6">
          © {new Date().getFullYear()} Afdyl. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Home;
