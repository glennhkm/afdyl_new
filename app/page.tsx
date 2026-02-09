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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8 text-center lg:mt-72 gap-6 sm:gap-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900">
          Selamat Datang di AFDYL
        </h1>

        <p className="text-sm sm:text-base md:text-xl font-normal text-gray-700 max-w-3xl px-4">
          Media pembelajaran interaktif Al-Qur&apos;an dan Iqra&apos; untuk
          anak-anak Disleksia
        </p>

        {/* Teacher Mode Session Indicator */}
        {/* {session && currentRoom && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="RiUserSettingsLine" className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-800">Mode Pengajar Aktif</span>
            </div>
            <p className="text-sm text-amber-700">
              Kelas: <span className="font-semibold">{currentRoom.className}</span>
            </p>
            {currentStudent && (
              <p className="text-sm text-amber-700">
                Siswa: <span className="font-semibold">{currentStudent.name}</span>
              </p>
            )}
          </div>
        )} */}

        {/* Mode Selection Cards */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-2xl px-4">
          {/* Student Mode */}
          <Link
            href="/dashboard"
            className="flex-1 bg-brown-brand text-white rounded-2xl p-6 sm:p-8 shadow-lg hover:opacity-90 transition-all duration-200 hover:-translate-y-1 group"
          >
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon
                  name="RiBookOpenLine"
                  className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Mode Siswa</h2>
              <p className="text-sm sm:text-base text-white/80 text-center">
                Belajar Al-Qur&apos;an dan Iqra&apos; secara mandiri
              </p>
            </div>
          </Link>

          {/* Teacher Mode */}
          <Link
            href="/guru"
            className="flex-1 bg-emerald-600 text-white rounded-2xl p-6 sm:p-8 shadow-lg hover:opacity-90 transition-all duration-200 hover:-translate-y-1 group"
          >
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon
                  name="RiUserSettingsLine"
                  className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Mode Pengajar</h2>
              <p className="text-sm sm:text-base text-white/80 text-center">
                Kelola kelas dan pantau progress peserta didik
              </p>
            </div>
          </Link>
        </div>

        {/* Continue Session Button (if teacher mode is active) */}
        {/* {session && currentRoom && currentStudent && (
          <Link 
            href="/guru/siswa" 
            className="mt-2 bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-full font-semibold transition-colors duration-200 flex items-center gap-2"
          >
            <Icon name="RiPlayFill" className="w-5 h-5" />
            Lanjutkan Sesi dengan {currentStudent.name}
          </Link>
        )} */}
        <p className="text-center text-xs sm:text-sm text-gray-600 mb-6">
          © {new Date().getFullYear()} Afdyl. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Home;
