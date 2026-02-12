"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import useScrollToTop from "@/hooks/useScrollToTop";

interface ScrollToTopProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that automatically scrolls to top on route changes
 * Wrap this around your app content to enable auto scroll-to-top behavior
 */
const ScrollToTopProvider: React.FC<ScrollToTopProviderProps> = ({ children }) => {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to top instantly when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
    
    // Also reset scroll on document element for better compatibility
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return <>{children}</>;
};

export default ScrollToTopProvider;
