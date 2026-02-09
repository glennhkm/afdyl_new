"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
    />
  );
};

// Page Loading Skeleton - untuk halaman guru
export const PageLoadingSkeleton: React.FC<{ variant?: "guru" | "quran" | "iqra" | "default" }> = ({ 
  variant = "default" 
}) => {
  const accentColor = variant === "guru" ? "bg-emerald-100" : 
                      variant === "quran" ? "bg-[#E37100]/20" : 
                      variant === "iqra" ? "bg-brown-brand/20" : "bg-gray-200";

  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden pb-8 animate-pulse">
      {/* Topbar skeleton */}
      <div className="h-14 bg-gray-100 mb-6 rounded-b-xl" />
      
      {/* Content skeleton */}
      <div className="space-y-4">
        {/* Card skeleton */}
        <div className={`h-32 ${accentColor} rounded-2xl`} />
        
        {/* List items skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
};

// Teacher Page Loading Skeleton
export const TeacherPageSkeleton: React.FC = () => {
  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden pb-8 animate-pulse">
      {/* Header skeleton */}
      <div className="text-center py-8 mb-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-4" />
        <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-2" />
        <div className="h-4 bg-gray-100 rounded w-64 mx-auto" />
      </div>
      
      {/* Tabs skeleton */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 h-12 bg-emerald-100 rounded-xl" />
        <div className="flex-1 h-12 bg-gray-100 rounded-xl" />
      </div>
      
      {/* Form skeleton */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 mb-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-12 bg-emerald-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

// Room/Kelas Page Loading Skeleton
export const RoomPageSkeleton: React.FC = () => {
  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden pb-8 animate-pulse">
      {/* Topbar skeleton */}
      <div className="h-14 bg-gray-100 mb-6 rounded-b-xl" />
      
      {/* Room info card skeleton */}
      <div className="h-36 bg-emerald-100 rounded-2xl mb-6" />
      
      {/* Add student form skeleton */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 mb-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="flex gap-2">
          <div className="flex-1 h-12 bg-gray-100 rounded-xl" />
          <div className="w-24 h-12 bg-emerald-100 rounded-xl" />
        </div>
      </div>
      
      {/* Student list skeleton */}
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
};

// Student Dashboard Skeleton
export const StudentDashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden pb-8 animate-pulse">
      {/* Topbar skeleton */}
      <div className="h-14 bg-gray-100 mb-6 rounded-b-xl" />
      
      {/* Student info card skeleton */}
      <div className="h-24 bg-[#E37100]/10 rounded-xl mb-6" />
      
      {/* Progress summary skeleton */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
      
      {/* Module cards skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
};

// Quran Page Loading Skeleton
export const QuranPageSkeleton: React.FC = () => {
  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden pb-8 animate-pulse">
      {/* Topbar skeleton */}
      <div className="h-14 bg-gray-100 mb-6 rounded-b-xl" />
      
      {/* Search bar skeleton */}
      <div className="h-12 bg-gray-100 rounded-xl mb-6" />
      
      {/* Surah list skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-gray-100">
            <div className="w-10 h-10 bg-[#E37100]/20 rounded-full" />
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-32" />
            </div>
            <div className="h-6 bg-[#E37100]/20 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Quran Read Page Loading Skeleton
export const QuranReadSkeleton: React.FC = () => {
  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden pb-8 animate-pulse">
      {/* Topbar skeleton */}
      <div className="h-14 bg-gray-100 mb-6 rounded-b-xl" />
      
      {/* Surah header skeleton */}
      <div className="text-center mb-6">
        <div className="h-8 bg-[#E37100]/20 rounded w-40 mx-auto mb-2" />
        <div className="h-4 bg-gray-100 rounded w-32 mx-auto" />
      </div>
      
      {/* Ayah list skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-xl border-2 border-gray-100 p-4">
            <div className="h-10 bg-gray-100 rounded mb-3" />
            <div className="h-6 bg-gray-50 rounded mb-2" />
            <div className="h-4 bg-gray-50 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Iqra Page Loading Skeleton
export const IqraPageSkeleton: React.FC = () => {
  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden pb-8 animate-pulse">
      {/* Topbar skeleton */}
      <div className="h-14 bg-gray-100 mb-6 rounded-b-xl" />
      
      {/* Jilid cards skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 bg-brown-brand/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
};

// Iqra Read Page Skeleton
export const IqraReadSkeleton: React.FC = () => {
  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden pb-8 animate-pulse">
      {/* Topbar skeleton */}
      <div className="h-14 bg-gray-100 mb-6 rounded-b-xl" />
      
      {/* Page content skeleton */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
        <div className="h-[60vh] bg-brown-brand/10 rounded-xl mb-4" />
        <div className="flex justify-between">
          <div className="w-24 h-10 bg-gray-100 rounded-lg" />
          <div className="w-24 h-10 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

// PWA Loading Skeleton
export const PWALoadingSkeleton: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 animate-pulse">
      <div className="w-24 h-24 bg-[#C98151]/20 rounded-full mb-6" />
      <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-48" />
    </div>
  );
};

export default Skeleton;
