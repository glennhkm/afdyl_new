"use client";

import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import InstallPrompt from "./InstallPrompt";
import PullToRefresh from "./PullToRefresh";
import ScrollToTopProvider from "@/components/ScrollToTopProvider";
import { PullToRefreshProvider } from "@/contexts/PullToRefreshContext";

interface PWAProviderProps {
  children: React.ReactNode;
}

// ── Client-side hydration-safe store ─────────────────────────────────────────
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

if (typeof window !== "undefined") {
  clientStore.isClient = true;
}

const useIsClient = () =>
  useSyncExternalStore(
    clientStore.subscribe.bind(clientStore),
    clientStore.getSnapshot.bind(clientStore),
    clientStore.getServerSnapshot.bind(clientStore),
  );

// ── Standalone detection ─────────────────────────────────────────────────────
// Returns true ONLY when running as an installed PWA (not in a browser tab).
const checkStandaloneMode = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true ||
    document.referrer.includes("android-app://")
  );
};

// ── Component ────────────────────────────────────────────────────────────────
const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const isClient = useIsClient();

  // Compute standalone mode synchronously — no effect needed
  const initialStandalone = useMemo(() => {
    if (!isClient) return false;
    // if (process.env.NODE_ENV === "development") return true;
    return checkStandaloneMode();
  }, [isClient]);

  // Track runtime display-mode changes (user installs while page is open)
  const [runtimeStandalone, setRuntimeStandalone] = useState(false);

  useEffect(() => {
    if (!isClient || initialStandalone) return;
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setRuntimeStandalone(true);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [isClient, initialStandalone]);

  const isStandalone = initialStandalone || runtimeStandalone;

  // ── SSR / pre-hydration skeleton ────────────────────────────────────────
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

  // ── Browser mode → show install landing page (gates ALL features) ───────
  if (!isStandalone) {
    return <InstallPrompt />;
  }

  // ── Standalone (installed PWA) → full app ───────────────────────────────
  return (
    <PullToRefreshProvider>
      <ScrollToTopProvider>
        <PullToRefresh>{children}</PullToRefresh>
      </ScrollToTopProvider>
    </PullToRefreshProvider>
  );
};

export default PWAProvider;
