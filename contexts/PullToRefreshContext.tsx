"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface PullToRefreshContextType {
  isDisabled: boolean;
  disablePullToRefresh: () => void;
  enablePullToRefresh: () => void;
}

const PullToRefreshContext = createContext<PullToRefreshContextType>({
  isDisabled: false,
  disablePullToRefresh: () => {},
  enablePullToRefresh: () => {},
});

export const usePullToRefresh = () => useContext(PullToRefreshContext);

interface PullToRefreshProviderProps {
  children: React.ReactNode;
}

export const PullToRefreshProvider: React.FC<PullToRefreshProviderProps> = ({ children }) => {
  const [isDisabled, setIsDisabled] = useState(false);

  const disablePullToRefresh = useCallback(() => {
    setIsDisabled(true);
  }, []);

  const enablePullToRefresh = useCallback(() => {
    setIsDisabled(false);
  }, []);

  return (
    <PullToRefreshContext.Provider value={{ isDisabled, disablePullToRefresh, enablePullToRefresh }}>
      {children}
    </PullToRefreshContext.Provider>
  );
};

export default PullToRefreshContext;
