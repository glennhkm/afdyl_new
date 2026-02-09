"use client";

import React, { useSyncExternalStore, useMemo } from "react";
import InstallPrompt from "./InstallPrompt";

interface PWAProviderProps {
  children: React.ReactNode;
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
    return { isStandalone: false, isInstalled: false };
  }

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ||
    document.referrer.includes("android-app://");

  const isInstalled =
    localStorage.getItem("afdyl-pwa-installed") === "true" || isStandalone;

  return { isStandalone, isInstalled };
};

const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const isClient = useIsClient();

  // Compute installation state from client (no setState in effect)
  const { isStandalone, isInstalled } = useMemo(() => {
    if (!isClient) return { isStandalone: false, isInstalled: false };
    return getInstallationState();
  }, [isClient]);

  const showInstallPrompt = !isStandalone && !isInstalled;

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
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showInstallPrompt && <InstallPrompt />}
      {!showInstallPrompt && children}
    </>
  );
};

export default PWAProvider;
