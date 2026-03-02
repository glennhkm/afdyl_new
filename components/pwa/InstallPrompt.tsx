"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";

// ── Types ────────────────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

// ── Feature data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "RiBookOpenLine" as const,
    title: "Baca Al-Qur'an",
    desc: "Membaca & mendengar",
  },
  {
    icon: "RiBookReadLine" as const,
    title: "Baca Iqra'",
    desc: "Belajar dari dasar",
  },
  {
    icon: "RiMicLine" as const,
    title: "Lafal Hijaiyah",
    desc: "Latihan pelafalan",
  },
  {
    icon: "RiEdit2Line" as const,
    title: "Jejak Hijaiyah",
    desc: "Menelusuri huruf",
  },
  {
    icon: "RiGamepadLine" as const,
    title: "Tebak Hijaiyah",
    desc: "Tebak dari suara",
  },
  {
    icon: "RiHand" as const,
    title: "Tangkap Hijaiyah",
    desc: "Tangkap huruf jatuh",
  },
];

// ── Component ────────────────────────────────────────────────────────────────
const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // Derived once — platform never changes during session
  const isIOS = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    return (
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }, []);

  // Listen for install events
  useEffect(() => {
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setJustInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setJustInstalled(true);
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Install prompt error:", err);
      }
      return;
    }
    // No native prompt available — show iOS guide or hint
    if (isIOS) setShowIOSGuide(true);
  }, [deferredPrompt, isIOS]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-9999 overflow-y-auto bg-[#FDF6E3]">
      {/* ═══ Background decorations ═══ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* Gradient orbs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#E37100]/6" />
        <div className="absolute -bottom-36 -left-36 w-105 h-105 rounded-full bg-[#C98151]/6" />
        <div className="absolute top-1/3 right-6 w-28 h-28 rounded-full bg-[#EDDD6E]/12" />
        <div className="absolute top-2/3 left-6 w-24 h-24 rounded-full bg-[#14AE5C]/7" />

        {/* Floating emojis */}
        <span
          className="absolute top-6 left-7 text-2xl sm:text-3xl opacity-70"
          style={{ animation: "pwa-float 4.2s ease-in-out infinite" }}
        >
          ⭐
        </span>
        <span
          className="absolute top-14 right-10 text-xl sm:text-2xl opacity-60"
          style={{ animation: "pwa-float 5s ease-in-out 0.6s infinite" }}
        >
          🌙
        </span>
        <span
          className="absolute top-44 left-10 text-lg opacity-50"
          style={{ animation: "pwa-float 3.6s ease-in-out 1.1s infinite" }}
        >
          ✨
        </span>
        <span
          className="absolute bottom-52 right-7 text-xl opacity-50"
          style={{ animation: "pwa-float 4.6s ease-in-out 0.4s infinite" }}
        >
          📖
        </span>
        <span
          className="absolute bottom-36 left-5 text-lg opacity-40"
          style={{ animation: "pwa-float 3.9s ease-in-out 1.6s infinite" }}
        >
          🕌
        </span>
        <span
          className="absolute top-72 right-16 text-base opacity-40"
          style={{ animation: "pwa-float 5.4s ease-in-out 2s infinite" }}
        >
          🌟
        </span>
      </div>

      {/* ═══ Main content ═══ */}
      <div className="relative min-h-screen  flex flex-col items-center justify-center px-6 py-10 sm:py-14">
        {/* ── Hero ── */}
        <div
          className="flex flex-col items-center text-center"
          style={{ animation: "pwa-fade-up 0.6s ease-out forwards" }}
        >
          {/* App icon */}
          <div className="relative mb-5 flex gap-6 items-center">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[1.75rem] shadow-xl overflow-hidden ring-4 ring-white/80">
              <Image
                src="/icons/icon-192x192.png"
                alt="Afdyl"
                width={192}
                height={192}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span
              className="absolute -top-1.5 -right-1.5 text-lg"
              style={{ animation: "pwa-twinkle 2.2s ease-in-out infinite" }}
            >
              ✨
            </span>
            <div className="flex flex-col gap-2 text-start">
              <h1 className="text-4xl sm:text-5xl font-bold text-[#C98151] tracking-tight">
                AFDYL
              </h1>
              <p className="text-lg sm:text-xl font-semibold text-[#E37100] mt-1">
                Al-Qur&apos;an for Dyslexia
              </p>
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-500 mt-3 max-w-xs leading-relaxed">
            Media pembelajaran interaktif Al-Qur&apos;an dan Iqra&apos; untuk
            anak-anak dengan disleksia
          </p>
        </div>

        {/* ── Features ── */}
        <div
          className="w-full max-w-sm mt-8 sm:mt-10"
          style={{ animation: "pwa-fade-up 0.6s ease-out 0.15s both" }}
        >
          <h2 className="text-center text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            Fitur Pembelajaran
          </h2>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="rounded-2xl p-3 sm:p-4 text-center shadow-sm transition-transform duration-200 hover:scale-105 bg-white/70 border border-[#E8DCC8]"
                style={{
                  animation: `pwa-fade-up 0.45s ease-out ${0.3 + i * 0.07}s both`,
                }}
              >
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mx-auto mb-1.5 shadow-sm bg-[#F5EDE1]"
                >
                  <Icon
                    name={f.icon}
                    color="#C98151"
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                </div>
                <p className="text-[11px] sm:text-xs font-bold text-gray-700 leading-tight">
                  {f.title}
                </p>
                <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 leading-tight">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Install CTA ── */}
        <div
          className="w-full max-w-sm mt-8 sm:mt-10 flex flex-col items-center"
          style={{ animation: "pwa-fade-up 0.6s ease-out 0.72s both" }}
        >
          <button
            onClick={handleInstallClick}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-2.5 bg-[#E37100] hover:bg-[#d06800]"
            style={{ animation: "pwa-glow 3s ease-in-out infinite" }}
          >
            <Icon name="RiDownloadLine" className="w-6 h-6" />
            Install Aplikasi
          </button>

          {/* Platform hints */}
          {isIOS && !deferredPrompt && (
            <p className="text-xs text-gray-400 mt-3.5 text-center max-w-xs">
              Ketuk tombol di atas untuk melihat panduan instalasi di perangkat
              iOS
            </p>
          )}
          {!isIOS && !deferredPrompt && (
            <p className="text-xs text-gray-400 mt-3.5 text-center max-w-xs">
              Gunakan browser Chrome, Edge, atau Samsung Internet untuk
              menginstall
            </p>
          )}
          {deferredPrompt && (
            <p className="text-xs text-gray-400 mt-3.5 text-center">
              Install untuk pengalaman belajar yang optimal ✨
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="mt-auto pt-10 pb-4 text-center">
          <p className="text-[11px] text-gray-600">
            © {new Date().getFullYear()} Afdyl · Al-Qur&apos;an for Dyslexia
          </p>
        </div>
      </div>

      {/* ═══ iOS Guide Modal ═══ */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 bg-black/50 z-10000 flex items-center justify-center p-4"
          style={{ animation: "pwa-fade-in 0.2s ease-out" }}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            style={{ animation: "pwa-bounce-in 0.4s ease-out" }}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-800">
                Cara Install di iOS
              </h2>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icon name="RiCloseLine" className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                <>
                  Ketuk tombol{" "}
                  <Icon
                    name="RiShareLine"
                    size={18}
                    color="#007AFF"
                    className="inline -mt-0.5"
                  />{" "}
                  <strong>Share</strong> di Safari
                </>,
                <>
                  Scroll ke bawah & ketuk{" "}
                  <strong>&quot;Add to Home Screen&quot;</strong>
                </>,
                <>
                  Ketuk <strong>&quot;Add&quot;</strong> di pojok kanan atas
                </>,
              ].map((content, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E37100] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-gray-600 pt-1">{content}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-6 py-3 bg-[#E37100] text-white font-semibold rounded-2xl hover:bg-[#d06800] transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* ═══ Post-install success modal ═══ */}
      {justInstalled && (
        <div
          className="fixed inset-0 bg-black/50 z-10000 flex items-center justify-center p-4"
          style={{ animation: "pwa-fade-in 0.25s ease-out" }}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            style={{ animation: "pwa-bounce-in 0.5s ease-out" }}
          >
            {/* Success illustration */}
            <svg
              viewBox="0 0 120 120"
              className="w-28 h-28 mx-auto mb-3 drop-shadow-md"
            >
              <circle cx="60" cy="60" r="54" fill="#D1FAE5" />
              <circle cx="60" cy="60" r="44" fill="#6EE7B7" />
              <circle cx="60" cy="60" r="34" fill="#14AE5C" />
              <polyline
                points="40,62 53,75 80,46"
                fill="none"
                stroke="white"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="18" cy="20" r="4" fill="#FBBF24" opacity="0.8" />
              <circle cx="104" cy="16" r="3" fill="#FBBF24" opacity="0.7" />
              <circle cx="108" cy="98" r="3.5" fill="#34D399" opacity="0.6" />
            </svg>

            <h2 className="text-2xl font-bold text-gray-800">
              Berhasil Terinstall! 🎉
            </h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Buka <strong>Afdyl</strong> dari layar utama perangkatmu untuk
              mulai belajar
            </p>

            <button
              onClick={() => setJustInstalled(false)}
              className="mt-5 w-full py-3 bg-[#14AE5C] text-white font-semibold rounded-2xl hover:bg-[#0e9a4e] transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* ═══ CSS Animations ═══ */}
      <style jsx global>{`
        @keyframes pwa-float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-14px) rotate(4deg);
          }
        }
        @keyframes pwa-fade-up {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pwa-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes pwa-bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.35);
          }
          50% {
            opacity: 1;
            transform: scale(1.04);
          }
          70% {
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes pwa-twinkle {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.7);
          }
        }
        @keyframes pwa-glow {
          0%,
          100% {
            box-shadow: 0 4px 14px rgba(227, 113, 0, 0.35);
          }
          50% {
            box-shadow: 0 4px 28px rgba(227, 113, 0, 0.55);
          }
        }
      `}</style>
    </div>
  );
};

export default InstallPrompt;
