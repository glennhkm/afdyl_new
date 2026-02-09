"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeacher } from "@/contexts/TeacherContext";
import Icon from "@/components/Icon";
import Topbar from "@/components/topbar";
import { TeacherPageSkeleton } from "@/components/ui/Skeleton";

const TeacherModePage = () => {
  const router = useRouter();
  const { 
    session,
    isLoading,
    currentRoom,
    rooms,
    createRoom, 
    joinRoom, 
    deleteRoom,
  } = useTeacher();

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [className, setClassName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [roomPin, setRoomPin] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  // If already in a room, redirect to room page
  useEffect(() => {
    if (!isLoading && session && currentRoom) {
      router.push("/guru/kelas");
    }
  }, [isLoading, session, currentRoom, router]);

  const handleCreateRoom = async () => {
    if (!className.trim()) {
      setError("Mohon masukkan nama kelas");
      return;
    }
    if (!teacherName.trim()) {
      setError("Mohon masukkan nama guru");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const newRoom = await createRoom(className.trim(), teacherName.trim());
      if (newRoom) {
        router.push("/guru/kelas");
      } else {
        setError("Gagal membuat kelas. Silakan coba lagi.");
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomPin.trim()) {
      setError("Mohon masukkan PIN kelas");
      return;
    }

    if (roomPin.length !== 6 || !/^\d+$/.test(roomPin)) {
      setError("PIN harus 6 digit angka");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const room = await joinRoom(roomPin);
      if (room) {
        router.push("/guru/kelas");
      } else {
        setError("Kelas tidak ditemukan. PIN yang Anda masukkan tidak terdaftar.");
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    await deleteRoom(roomId);
    setRoomToDelete(null);
  };

  const handleSelectRoom = async (pin: string) => {
    setIsSubmitting(true);
    try {
      const room = await joinRoom(pin);
      if (room) {
        router.push("/guru/kelas");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Show loading state
  if (isLoading) {
    return <TeacherPageSkeleton />;
  }

  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden">
      <Topbar title="Mode Pengajar" onBackClick={() => router.push("/")} />

      {/* Info Card */}
      <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
        <div className="flex items-start gap-3">
          <Icon name="RiInformationLine" className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-emerald-800 mb-1">Tentang Mode Pengajar</h3>
            <p className="text-sm text-emerald-700 leading-relaxed">
              Mode pengajar memungkinkan Anda membuat kelas, menambahkan nama peserta didik, dan memantau 
              progress belajar setiap peserta didik di berbagai modul (Al-Qur&apos;an, Iqra&apos;, Jejak Hijaiyah).
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Sync Badge */}
      <div className="mb-6 flex items-center justify-center gap-2 text-sm text-emerald-700">
        <Icon name="RiCloudLine" className="w-5 h-5" />
        <span>Data tersimpan di cloud - bisa diakses dari device manapun</span>
      </div>

      {/* Room History */}
      {rooms.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Icon name="RiHistoryLine" className="w-5 h-5" />
            Riwayat Kelas
          </h2>
          <div className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-xl border-2 border-gray-100 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{room.className}</h3>
                    <p className="text-sm text-gray-500">Guru: {room.teacherName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">
                        PIN: <span className="font-mono font-bold text-emerald-600">{room.pin}</span>
                      </span>
                      <span className="text-xs text-gray-400">
                        {room.students.length} siswa
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(room.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => handleSelectRoom(room.pin)}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
                    >
                      Masuk
                    </button>
                    <button
                      onClick={() => setRoomToDelete(room.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Icon name="RiDeleteBinLine" className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {roomToDelete === room.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-red-600 mb-2">Hapus kelas ini? Semua data siswa akan hilang.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        Ya, Hapus
                      </button>
                      <button
                        onClick={() => setRoomToDelete(null)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setActiveTab("create");
            setError("");
          }}
          className={`flex-1 py-3 px-4 rounded-full font-semibold text-sm sm:text-base transition-all duration-200 ${
            activeTab === "create"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Buat Kelas
        </button>
        <button
          onClick={() => {
            setActiveTab("join");
            setError("");
          }}
          className={`flex-1 py-3 px-4 rounded-full font-semibold text-sm sm:text-base transition-all duration-200 ${
            activeTab === "join"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Masuk dengan PIN
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
          <Icon name="RiErrorWarningLine" className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Create Room Tab */}
      {activeTab === "create" && (
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <Icon name="RiAddLine" className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Buat Kelas Baru</h2>
              <p className="text-sm text-gray-500">Anda akan mendapatkan PIN untuk akses kelas</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Kelas
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  setError("");
                }}
                placeholder="Contoh: Kelas 3A SLB"
                className="w-full text-black placeholder:text-black/20 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors text-lg"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Guru
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => {
                  setTeacherName(e.target.value);
                  setError("");
                }}
                placeholder="Contoh: Bu Sari"
                className="w-full text-black placeholder:text-black/20 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors text-lg"
                onKeyDown={(e) => e.key === "Enter" && !isSubmitting && handleCreateRoom()}
                disabled={isSubmitting}
              />
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:bg-emerald-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:0.4s]" />
                  </div>
                  <span>Membuat...</span>
                </>
              ) : (
                <>
                  <Icon name="RiAddLine" className="w-5 h-5" />
                  Buat Kelas
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Join Room Tab */}
      {activeTab === "join" && (
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Icon name="RiDoorOpenLine" className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Masuk dengan PIN</h2>
              <p className="text-sm text-gray-500">Akses kelas dari device lain dengan PIN</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN Kelas
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={roomPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setRoomPin(value);
                  setError("");
                }}
                placeholder="Masukkan 6 digit PIN"
                className="w-full px-4 py-3 border-2 placeholder:text-sm lg:placeholder:text-lg placeholder:tracking-tight border-gray-200 text-black placeholder:text-black/20 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-2xl text-center tracking-[0.5em] font-mono"
                onKeyDown={(e) => e.key === "Enter" && !isSubmitting && handleJoinRoom()}
                disabled={isSubmitting}
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={roomPin.length !== 6 || isSubmitting}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:0.4s]" />
                  </div>
                  <span>Mencari...</span>
                </>
              ) : (
                <>
                  <Icon name="RiDoorOpenLine" className="w-5 h-5" />
                  Masuk Kelas
                </>
              )}
            </button>
          </div>

          {/* Hint */}
          <div className="mt-6 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 text-center">
              <Icon name="RiLightbulbLine" className="w-4 h-4 inline mr-1" />
              PIN didapatkan saat membuat kelas. Anda bisa masuk dari device manapun dengan PIN yang sama.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherModePage;
