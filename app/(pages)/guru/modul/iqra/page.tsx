"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeacher } from "@/contexts/TeacherContext";
import Topbar from "@/components/topbar";
import Icon from "@/components/Icon";
import { getAllVolumes, IqraVolumeInfo } from "@/lib/services/iqra-service";

const TeacherIqraPage = () => {
  const router = useRouter();
  const { currentRoom, currentStudent } = useTeacher();
  const volumes = getAllVolumes();
  
  // Get progress directly from currentStudent
  const iqraProgress = currentStudent?.iqraProgress;
  const hasIqraProgress = iqraProgress && (iqraProgress.currentJilid > 1 || iqraProgress.currentPage > 1);

  // Redirect if no student selected
  useEffect(() => {
    if (!currentRoom || !currentStudent) {
      router.push("/guru");
    }
  }, [currentRoom, currentStudent, router]);

  const handleVolumeClick = (volume: IqraVolumeInfo) => {
    router.push(`/guru/modul/iqra/read?volume=${volume.volumeNumber}`);
  };

  const isLastReadVolume = (volumeNumber: number) => {
    return iqraProgress && iqraProgress.currentJilid === volumeNumber;
  };

  if (!currentStudent) return null;

  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden">
      <Topbar title="Iqra'" onBackClick={() => router.push("/guru/siswa")} />

      {/* Teacher: Student Info Banner */}
      <div className="bg-[#E37100]/10 border-2 border-[#E37100]/30 rounded-xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="RiUserLine" className="w-5 h-5 text-[#E37100]" />
          <span className="text-[#E37100] font-medium">{currentStudent.name}</span>
        </div>
        {hasIqraProgress && (
          <div className="text-xs text-[#E37100] bg-[#E37100]/10 px-2 py-1 rounded-full">
            Terakhir: Jilid {iqraProgress.currentJilid} Hal. {iqraProgress.currentPage}
          </div>
        )}
      </div>

      {/* Header Description - Same as student */}
      <div className="mb-8 text-center">
        <p className="text-gray-600 text-lg">
          Pilih jilid Iqra&apos; untuk mulai belajar membaca Al-Qur&apos;an
        </p>
      </div>

      {/* Volume Grid - Same as student with teacher highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
        {volumes.map((volume) => {
          const isLastRead = isLastReadVolume(volume.volumeNumber);
          
          return (
            <button
              key={volume.volumeNumber}
              onClick={() => handleVolumeClick(volume)}
              className={`
                relative overflow-hidden rounded-2xl p-6 
                bg-brown-brand/5 border-2 border-brown-brand/20
                hover:shadow-lg hover:-translate-y-1 hover:bg-brown-brand/10
                transition-all duration-200 
                text-left group
                ${isLastRead ? 'ring-2 ring-[#E37100]' : ''}
              `}
            >
              {/* Teacher: Last Read Badge */}
              {isLastRead && (
                <div className="absolute top-2 left-2 bg-[#E37100] text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Icon name="RiBookmarkFill" className="w-3 h-3" />
                  Terakhir: Hal. {iqraProgress?.currentPage}
                </div>
              )}

              {/* Volume Number Badge */}
              <div className={`
                absolute top-4 right-4 w-12 h-12 
                rounded-full flex items-center justify-center
                bg-brown-brand text-white shadow-md
                font-bold text-xl
              `}>
                {volume.volumeNumber}
              </div>

              {/* Arabic Title */}
              <div className={`text-4xl font-arabic text-brown-brand mb-2 ${isLastRead ? 'mt-6' : ''}`}>
                {volume.arabicTitle}
              </div>

              {/* Latin Title */}
              <h3 className="text-xl font-bold text-brown-brand mb-2">
                {volume.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4">
                {volume.description}
              </p>

              {/* Page Count */}
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{volume.totalPages} Halaman</span>
              </div>

              {/* Hover Arrow */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-brown-brand">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Card - Same as student */}
      <div className="mt-8 p-6 bg-background-2 rounded-2xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          📚 Tentang Iqra&apos;
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          Iqra&apos; adalah metode pembelajaran membaca Al-Qur&apos;an yang dikembangkan oleh 
          KH. As&apos;ad Humam. Metode ini terdiri dari 6 jilid yang disusun secara bertahap 
          dari yang paling dasar hingga mahir membaca Al-Qur&apos;an dengan tajwid yang benar.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-brown-brand">•</span>
            <span><strong>Jilid 1:</strong> Huruf hijaiyah dengan fathah</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brown-brand">•</span>
            <span><strong>Jilid 2:</strong> Huruf dengan kasrah dan dammah</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brown-brand">•</span>
            <span><strong>Jilid 3:</strong> Mad (panjang) dan tanwin</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brown-brand">•</span>
            <span><strong>Jilid 4:</strong> Kombinasi huruf dan suku kata</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brown-brand">•</span>
            <span><strong>Jilid 5:</strong> Sukun dan tasydid</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brown-brand">•</span>
            <span><strong>Jilid 6:</strong> Hukum tajwid lengkap</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TeacherIqraPage;
