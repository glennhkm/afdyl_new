"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/topbar";
import { getAllVolumes, IqraVolumeInfo } from "@/lib/services/iqra-service";

const IqraPage = () => {
  const router = useRouter();
  const volumes = getAllVolumes();

  const handleVolumeClick = (volume: IqraVolumeInfo) => {
    router.push(`/iqra/read?volume=${volume.volumeNumber}`);
  };

  // Colors for each volume
  const volumeColors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    2: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    3: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    4: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    5: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    6: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  };

  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden">
      <Topbar title="Iqra'" />

      {/* Header Description */}
      <div className="mb-8 text-center">
        <p className="text-gray-600 text-lg">
          Pilih jilid Iqra&apos; untuk mulai belajar membaca Al-Qur&apos;an
        </p>
      </div>

      {/* Volume Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {volumes.map((volume) => {
          const colors = volumeColors[volume.volumeNumber] || volumeColors[1];
          
          return (
            <button
              key={volume.volumeNumber}
              onClick={() => handleVolumeClick(volume)}
              className={`
                relative overflow-hidden rounded-2xl p-6 
                ${colors.bg} border-2 ${colors.border}
                hover:shadow-lg hover:-translate-y-1 
                transition-all duration-200 
                text-left group
              `}
            >
              {/* Volume Number Badge */}
              <div className={`
                absolute top-4 right-4 w-12 h-12 
                rounded-full flex items-center justify-center
                bg-white shadow-md
                ${colors.text} font-bold text-xl
              `}>
                {volume.volumeNumber}
              </div>

              {/* Arabic Title */}
              <div className={`text-4xl font-arabic ${colors.text} mb-2`}>
                {volume.arabicTitle}
              </div>

              {/* Latin Title */}
              <h3 className={`text-xl font-bold ${colors.text} mb-2`}>
                {volume.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4">
                {volume.description}
              </p>

              {/* Page Count */}
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
                <span>{volume.totalPages} Halaman</span>
              </div>

              {/* Hover Arrow */}
              <div className={`
                absolute bottom-4 right-4 opacity-0 group-hover:opacity-100
                transition-opacity duration-200
                ${colors.text}
              `}>
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 7l5 5m0 0l-5 5m5-5H6" 
                  />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Card */}
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
            <span className="text-emerald-500">•</span>
            <span><strong>Jilid 1:</strong> Huruf hijaiyah dengan fathah</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span><strong>Jilid 2:</strong> Huruf dengan kasrah dan dammah</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500">•</span>
            <span><strong>Jilid 3:</strong> Mad (panjang) dan tanwin</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500">•</span>
            <span><strong>Jilid 4:</strong> Kombinasi huruf dan suku kata</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-500">•</span>
            <span><strong>Jilid 5:</strong> Sukun dan tasydid</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500">•</span>
            <span><strong>Jilid 6:</strong> Hukum tajwid lengkap</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default IqraPage;
