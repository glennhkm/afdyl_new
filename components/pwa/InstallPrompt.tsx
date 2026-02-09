"use client";

import React, { useState, useCallback, useSyncExternalStore, useMemo } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

// Client-side state store for hydration-safe detection
const clientStore = {
  isClient: false,
  listeners: new Set<() => void>(),
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },
  getSnapshot() {
    return this.isClient;
  },
  getServerSnapshot() {
    return false;
  },
};

// Initialize client state after hydration
if (typeof window !== "undefined") {
  clientStore.isClient = true;
}

const useIsClient = () => {
  return useSyncExternalStore(
    clientStore.subscribe.bind(clientStore),
    clientStore.getSnapshot.bind(clientStore),
    clientStore.getServerSnapshot.bind(clientStore)
  );
};

// Check installation state (derived, not useState in effect)
const getInstallationState = () => {
  if (typeof window === "undefined") {
    return { isStandalone: false, isInstalled: false, isIOS: false };
  }

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ||
    document.referrer.includes("android-app://");

  const isInstalled =
    localStorage.getItem("afdyl-pwa-installed") === "true" || isStandalone;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return { isStandalone, isInstalled, isIOS };
};

const InstallPrompt: React.FC = () => {
  const isClient = useIsClient();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [manuallyInstalled, setManuallyInstalled] = useState(false);

  // Compute installation state from client
  const { isStandalone, isInstalled, isIOS } = useMemo(() => {
    if (!isClient) return { isStandalone: false, isInstalled: false, isIOS: false };
    return getInstallationState();
  }, [isClient]);

  // Setup event listeners for install prompt
  React.useEffect(() => {
    if (!isClient) return;

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setManuallyInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem("afdyl-pwa-installed", "true");
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setManuallyInstalled(true);
        localStorage.setItem("afdyl-pwa-installed", "true");
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, [isClient]);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSGuide(true);
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setManuallyInstalled(true);
        localStorage.setItem("afdyl-pwa-installed", "true");
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Error installing PWA:", error);
    }
  }, [deferredPrompt, isIOS]);

  // Show loading state (when not yet client-side)
  if (!isClient) {
    return (
      <div className="fixed inset-0 bg-[#FDF6E3] z-9999 flex items-center justify-center">
        <div className="w-full max-w-md px-6 animate-pulse">
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 bg-[#C98151]/20 rounded-3xl" />
            <div className="h-6 w-32 bg-[#C98151]/20 rounded-full" />
            <div className="w-full space-y-3">
              <div className="h-4 bg-[#C98151]/10 rounded-full w-3/4 mx-auto" />
              <div className="h-4 bg-[#C98151]/10 rounded-full w-1/2 mx-auto" />
            </div>
            <div className="h-12 w-full bg-[#C98151]/20 rounded-full mt-4" />
          </div>
        </div>
      </div>
    );
  }

  // If already installed or running in standalone mode, don't show prompt
  if (isInstalled || isStandalone || manuallyInstalled) {
    return null;
  }

  // iOS Installation Guide Modal
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 bg-black/60 z-9999 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Cara Install di iOS
            </h2>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Icon name="RiCloseLine" className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C98151] text-white flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>
                <p className="text-gray-700">
                  Ketuk tombol{" "}
                  <span className="inline-flex items-center">
                    <Icon
                      name="RiShareLine"
                      className="w-5 h-5 text-[#007AFF]"
                    />
                  </span>{" "}
                  <strong>Share</strong> di bagian bawah Safari
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C98151] text-white flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div>
                <p className="text-gray-700">
                  Scroll ke bawah dan ketuk{" "}
                  <strong>&quot;Add to Home Screen&quot;</strong>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C98151] text-white flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div>
                <p className="text-gray-700">
                  Ketuk <strong>&quot;Add&quot;</strong> di pojok kanan atas
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowIOSGuide(false)}
            className="w-full mt-6 py-3 bg-[#C98151] text-white font-semibold rounded-full hover:bg-[#b5724a] transition-colors"
          >
            Mengerti
          </button>
        </div>
      </div>
    );
  }

  // Main Install Prompt Screen
  return (
    <div className="fixed inset-0 bg-background z-9999 flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#C98151]/10 rounded-full" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#D4C785]/20 rounded-full" />
        <div className="absolute top-1/3 right-10 w-20 h-20 bg-[#E37100]/10 rounded-full" />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* App Icon */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl shadow-xl flex items-center justify-center mb-6 relative overflow-hidden">
          <Image 
            src="/icons/icon-192x192.png" 
            alt="Afdyl Logo" 
            width={192}
            height={192}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        {/* App Name */}
        <h1 className="text-3xl sm:text-4xl font-bold text-[#C98151] mb-2">
          Afdyl
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-2">
          Al-Qur&apos;an for Dyslexia
        </p>
        <p className="text-sm text-gray-500 max-w-xs mb-8">
          Aplikasi pembelajaran Al-Qur&apos;an untuk anak-anak dengan disleksia
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 max-w-xs w-full mb-8">
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm">
            <Icon
              name="RiBookOpenLine"
              className="w-6 h-6 text-[#C98151] mx-auto mb-1"
            />
            <p className="text-xs text-gray-600">Baca Quran dan Iqra&apos;</p>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm">
            <Icon
              name="RiMicLine"
              className="w-6 h-6 text-[#C98151] mx-auto mb-1"
            />
            <p className="text-xs text-gray-600">Lafal Hijaiyah</p>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm">
            <Icon
              name="RiEdit2Line"
              className="w-6 h-6 text-[#C98151] mx-auto mb-1"
            />
            <p className="text-xs text-gray-600">Jejak Hijaiyah</p>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm">
            <Icon
              name="RiGamepadLine"
              className="w-6 h-6 text-[#C98151] mx-auto mb-1"
            />
            <p className="text-xs text-gray-600">Tebak Hijaiyah</p>
          </div>
        </div>

        {/* Install Button */}
        <button
          onClick={handleInstallClick}
          className="w-full max-w-xs py-4 bg-[#C98151] text-white font-bold text-lg rounded-full shadow-lg hover:bg-[#b5724a] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Icon name="RiDownloadLine" className="w-6 h-6" />
          Install Aplikasi
        </button>

        {/* iOS hint */}
        {isIOS && !deferredPrompt && (
          <p className="text-xs text-gray-500 mt-4 max-w-xs">
            Ketuk tombol di atas untuk melihat panduan instalasi di perangkat
            iOS
          </p>
        )}

        {/* Android/Desktop hint */}
        {!isIOS && !deferredPrompt && (
          <p className="text-xs text-gray-500 mt-4 max-w-xs">
            Gunakan browser Chrome, Edge, atau Samsung Internet untuk menginstal
            aplikasi
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="relative p-4 text-center">
        <p className="text-xs text-gray-400">
          Instal aplikasi untuk pengalaman belajar yang lebih baik
        </p>
      </div>
    </div>
  );
};

export default InstallPrompt;
