"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Icon from "@/components/Icon";
import { usePullToRefresh } from "@/contexts/PullToRefreshContext";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
  threshold?: number; // Distance needed to trigger refresh (in px)
  maxPull?: number; // Maximum pull distance (in px)
}

/**
 * Pull-to-refresh component for PWA
 * Provides a native-like pull-to-refresh experience
 */
const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 120,
}) => {
  const { isDisabled } = usePullToRefresh();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isPullingRef = useRef(false);

  // Check if we're at the top of the page
  const isAtTop = useCallback(() => {
    return window.scrollY <= 0 && document.documentElement.scrollTop <= 0;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isDisabled || isRefreshing) return;
    if (!isAtTop()) return;

    startYRef.current = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
  }, [isDisabled, isRefreshing, isAtTop]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDisabled || isRefreshing) return;
    if (startYRef.current === 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    currentYRef.current = currentY;

    // Only activate if pulling down and at top
    if (diff > 0 && isAtTop()) {
      // Prevent default scroll behavior when pulling
      e.preventDefault();
      
      // Apply resistance to make it feel more natural
      const resistance = 0.5;
      const pullDist = Math.min(diff * resistance, maxPull);
      
      setPullDistance(pullDist);
      setIsPulling(true);
      isPullingRef.current = true;
    }
  }, [isDisabled, isRefreshing, isAtTop, maxPull]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (isDisabled || !isPullingRef.current) {
      startYRef.current = 0;
      return;
    }

    isPullingRef.current = false;
    setIsPulling(false);

    if (pullDistance >= threshold) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullDistance(threshold); // Keep at threshold during refresh

      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          // Default behavior: reload the page
          window.location.reload();
        }
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        // Small delay before hiding the indicator
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Not enough pull, reset
      setPullDistance(0);
    }

    startYRef.current = 0;
  }, [isDisabled, pullDistance, threshold, onRefresh]);

  // Add touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only enable pull-to-refresh in PWA mode or always for testing
    // You can modify this condition based on your needs
    const options: AddEventListenerOptions = { passive: false };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, options);
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Disable native pull-to-refresh in PWA
  useEffect(() => {
    // Prevent overscroll behavior that triggers native refresh
    const preventOverscroll = (e: TouchEvent) => {
      if (isAtTop() && isPullingRef.current) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventOverscroll, { passive: false });
    
    // Add CSS to prevent overscroll
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.removeEventListener("touchmove", preventOverscroll);
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, [isAtTop]);

  // Calculate progress (0 to 1)
  const progress = Math.min(pullDistance / threshold, 1);
  
  // Rotation for the icon
  const rotation = progress * 180;

  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Pull indicator */}
      <div
        className="fixed left-0 right-0 z-9999 flex justify-center items-center pointer-events-none transition-transform duration-200 ease-out"
        style={{
          top: 0,
          height: `${Math.max(pullDistance, 0)}px`,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div
          className={`
            flex items-center justify-center
            w-10 h-10 rounded-full 
            bg-[#E37100] shadow-lg
            transition-all duration-200
            ${isRefreshing ? "animate-spin" : ""}
          `}
          style={{
            transform: `rotate(${isRefreshing ? 0 : rotation}deg) scale(${0.5 + progress * 0.5})`,
          }}
        >
          {isRefreshing ? (
            <Icon name="RiLoader4Line" className="w-5 h-5 text-white" />
          ) : (
            <Icon 
              name="RiArrowDownLine" 
              className={`w-5 h-5 text-white transition-transform duration-200 ${progress >= 1 ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </div>

      {/* Pull status text */}
      {(isPulling || isRefreshing) && pullDistance > 20 && (
        <div
          className="fixed left-0 right-0 z-9998 flex justify-center pointer-events-none"
          style={{
            top: `${Math.max(pullDistance + 8, 48)}px`,
            opacity: pullDistance > 30 ? 1 : 0,
            transition: "opacity 0.2s ease-out",
          }}
        >
          <span className="text-xs font-medium text-[#E37100] bg-white/90 px-3 py-1 rounded-full shadow-sm">
            {isRefreshing 
              ? "Memuat ulang..." 
              : progress >= 1 
                ? "Lepaskan untuk memuat ulang" 
                : "Tarik untuk memuat ulang"}
          </span>
        </div>
      )}

      {/* Content with pull effect */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : "translateY(0)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
