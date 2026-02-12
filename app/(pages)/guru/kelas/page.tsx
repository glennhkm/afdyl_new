"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeacher } from "@/contexts/TeacherContext";
import Icon from "@/components/Icon";
import Topbar from "@/components/topbar";
import { RoomPageSkeleton } from "@/components/ui/Skeleton";

const RoomManagementPage = () => {
  const router = useRouter();
  const {
    currentRoom,
    currentStudent,
    isLoading,
    addStudent,
    selectStudent,
    removeStudent,
    updateStudent,
    deleteRoom,
    leaveRoom,
    refreshRooms,
    syncFromCloud,
  } = useTeacher();

  const [newStudentName, setNewStudentName] = useState("");
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentName, setEditingStudentName] = useState("");
  const [showPinCopied, setShowPinCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Lock body scroll when delete confirmation modal is open
  useEffect(() => {
    if (showDeleteConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDeleteConfirm]);

  // Redirect if no room is active
  useEffect(() => {
    if (!isLoading && !currentRoom) {
      router.push("/guru");
    }
  }, [isLoading, currentRoom, router]);

  // Refresh data on mount only
  useEffect(() => {
    refreshRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle sync from cloud
  const handleSyncFromCloud = async () => {
    setIsSyncing(true);
    try {
      await syncFromCloud();
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading || !currentRoom) {
    return <RoomPageSkeleton />;
  }

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) {
      setError("Mohon masukkan nama siswa");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const student = await addStudent(newStudentName.trim());
      if (student) {
        setNewStudentName("");
      } else {
        setError("Gagal menambahkan siswa");
      }
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectStudent = (studentId: string) => {
    selectStudent(studentId);
    router.push("/guru/siswa");
  };

  const handleEditStudent = (studentId: string, currentName: string) => {
    setEditingStudentId(studentId);
    setEditingStudentName(currentName);
  };

  const handleSaveStudentName = async () => {
    if (editingStudentId && editingStudentName.trim()) {
      setIsSubmitting(true);
      try {
        await updateStudent(editingStudentId, editingStudentName.trim());
        setEditingStudentId(null);
        setEditingStudentName("");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (confirm("Yakin ingin menghapus siswa ini? Progress belajar juga akan dihapus.")) {
      setIsSubmitting(true);
      try {
        await removeStudent(studentId);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteRoom = async () => {
    setIsSubmitting(true);
    try {
      await deleteRoom(currentRoom.id);
      router.push("/guru");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    router.push("/guru");
  };

  const copyPinToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentRoom.pin);
      setShowPinCopied(true);
      setTimeout(() => setShowPinCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy PIN:", err);
    }
  };

  // Get progress badges for student
  const getProgressBadges = (student: typeof currentRoom.students[0]) => {
    const badges = [];
    
    if (student.quranProgress.lastSurah > 1 || student.quranProgress.lastAyah > 1 || student.quranProgress.completedSurahs.length > 0) {
      badges.push({ label: "Qur'an", color: "blue" });
    }
    
    if (student.iqraProgress.currentJilid > 1 || student.iqraProgress.currentPage > 1 || student.iqraProgress.completedJilids.length > 0) {
      badges.push({ label: "Iqra'", color: "purple" });
    }
    
    if (student.hijaiyahProgress.completedLetters.length > 0) {
      badges.push({ label: `${student.hijaiyahProgress.completedLetters.length}/29 Hijaiyah`, color: "amber" });
    }
    
    return badges;
  };

  return (
    <div className="w-full min-h-[82svh] overflow-x-hidden pb-8">
      <Topbar title={currentRoom.className} onBackClick={handleLeaveRoom} />

      {/* Room Info Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 mb-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-emerald-100 text-sm">PIN Kelas</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold tracking-wider">{currentRoom.pin}</span>
              <button
                onClick={copyPinToClipboard}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                title="Salin PIN"
              >
                <Icon 
                  name={showPinCopied ? "RiCheckLine" : "RiFileCopyLine"} 
                  className="w-5 h-5" 
                />
              </button>
            </div>
            {showPinCopied && (
              <span className="text-xs text-emerald-100">PIN disalin!</span>
            )}
          </div>
          <div className="text-right">
            <p className="text-emerald-100 text-sm">Jumlah Siswa</p>
            <span className="text-3xl font-bold">{currentRoom.students.length}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-emerald-100 text-sm">
            <span>Guru: {currentRoom.teacherName}</span>
          </div>
          {/* Sync Button */}
          <button
            onClick={handleSyncFromCloud}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
            title="Sinkronkan data dari cloud"
          >
            <Icon 
              name="RiRefreshLine" 
              className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} 
            />
            <span className="text-xs">
              {isSyncing ? 'Menyinkronkan...' : 'Refresh'}
            </span>
          </button>
        </div>
        {lastSyncTime && (
          <div className="mt-2 text-emerald-100 text-xs text-right">
            Terakhir diperbarui: {lastSyncTime.toLocaleTimeString('id-ID')}
          </div>
        )}
      </div>

      {/* Add Student Form */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 mb-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Icon name="RiUserAddLine" className="w-5 h-5 text-emerald-600" />
          Tambah Siswa
        </h2>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <Icon name="RiErrorWarningLine" className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newStudentName}
            onChange={(e) => {
              setNewStudentName(e.target.value);
              setError("");
            }}
            placeholder="Nama siswa"
            className="flex-1 px-4 py-3 border-2 border-gray-200 text-black placeholder:text-black/20 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
            onKeyDown={(e) => e.key === "Enter" && !isSubmitting && handleAddStudent()}
            disabled={isSubmitting}
          />
          <button
            onClick={handleAddStudent}
            disabled={isSubmitting}
            className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1 disabled:bg-emerald-400"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:0.4s]" />
              </div>
            ) : (
              <>
                <Icon name="RiAddLine" className="w-5 h-5" />
                <span className="hidden sm:inline">Tambah</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Student List */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Icon name="RiGroupLine" className="w-5 h-5 text-emerald-600" />
          Daftar Siswa
        </h2>

        {currentRoom.students.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <Icon name="RiUserLine" className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-2">Belum ada siswa</p>
            <p className="text-sm text-gray-400">Tambahkan siswa untuk mulai menggunakan aplikasi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentRoom.students.map((student, index) => {
              const badges = getProgressBadges(student);
              
              return (
                <div
                  key={student.id}
                  className={`bg-white rounded-xl border-2 p-4 transition-all ${
                    currentStudent?.id === student.id 
                      ? "border-emerald-400 shadow-md" 
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {editingStudentId === student.id ? (
                    // Edit mode
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingStudentName}
                        onChange={(e) => setEditingStudentName(e.target.value)}
                        placeholder="Nama siswa"
                        className="flex-1 px-3 py-2 border-2 border-emerald-300 text-black placeholder:text-black/20 rounded-lg focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveStudentName();
                          if (e.key === "Escape") setEditingStudentId(null);
                        }}
                        disabled={isSubmitting}
                      />
                      <button
                        onClick={handleSaveStudentName}
                        disabled={isSubmitting}
                        className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 disabled:opacity-50"
                      >
                        <Icon name="RiCheckLine" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setEditingStudentId(null)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                      >
                        <Icon name="RiCloseLine" className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-emerald-700 font-bold">{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{student.name}</h3>
                          {badges.length > 0 && (
                            <div className="flex items-center gap-2 text-xs mt-1">
                              {badges.map((badge, i) => (
                                <span 
                                  key={i}
                                  className={`px-2 py-0.5 rounded-full ${
                                    badge.color === "blue" ? "bg-blue-100 text-blue-700" :
                                    badge.color === "purple" ? "bg-purple-100 text-purple-700" :
                                    "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSelectStudent(student.id)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1"
                        >
                          <Icon name="RiPlayFill" className="w-4 h-4" />
                          Pilih
                        </button>
                        <button
                          onClick={() => handleEditStudent(student.id, student.name)}
                          className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Icon name="RiEditLine" className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          disabled={isSubmitting}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Icon name="RiDeleteBinLine" className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Room Actions */}
      <div className="space-y-3">
        <button
          onClick={handleLeaveRoom}
          className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="RiLogoutBoxLine" className="w-5 h-5" />
          Keluar dari Kelas
        </button>
        
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="RiDeleteBinLine" className="w-5 h-5" />
          Hapus Kelas
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="RiAlertLine" className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Hapus Kelas?</h3>
              <p className="text-gray-600 text-sm">
                Semua data siswa dan progress belajar akan dihapus permanen dari server. 
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteRoom}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:bg-red-400"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:0.4s]" />
                  </div>
                ) : (
                  "Hapus"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagementPage;
