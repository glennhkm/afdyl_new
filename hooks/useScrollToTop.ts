"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Custom hook to scroll to the top of the page when the route changes
 * or when the component mounts for the first time.
 * 
 * @param options - Configuration options
 * @param options.behavior - Scroll behavior: 'auto' (instant) or 'smooth'
 * @param options.delay - Optional delay before scrolling (in ms)
 */
export const useScrollToTop = (options?: {
  behavior?: ScrollBehavior;
  delay?: number;
}) => {
  const pathname = usePathname();
  const { behavior = "auto", delay = 0 } = options || {};

  useEffect(() => {
    const scrollToTop = () => {
      // Use both methods to ensure compatibility
      window.scrollTo({
        top: 0,
        left: 0,
        behavior,
      });
      
      // Also reset scroll on document element for better compatibility
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    if (delay > 0) {
      const timer = setTimeout(scrollToTop, delay);
      return () => clearTimeout(timer);
    } else {
      // Use requestAnimationFrame for smoother experience
      requestAnimationFrame(scrollToTop);
    }
  }, [pathname, behavior, delay]);
};

export default useScrollToTop;
