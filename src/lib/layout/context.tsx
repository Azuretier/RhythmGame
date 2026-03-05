'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type LayoutConfig = {
  showNav: boolean;
  showFooter: boolean;
  setFullscreen: (fullscreen: boolean) => void;
};

const LayoutConfigContext = createContext<LayoutConfig>({
  showNav: true,
  showFooter: true,
  setFullscreen: () => {},
});

export function LayoutConfigProvider({ children }: { children: ReactNode }) {
  const [fullscreen, setFullscreenState] = useState(false);

  const setFullscreen = useCallback((val: boolean) => {
    setFullscreenState(val);
  }, []);

  return (
    <LayoutConfigContext.Provider
      value={{
        showNav: !fullscreen,
        showFooter: !fullscreen,
        setFullscreen,
      }}
    >
      {children}
    </LayoutConfigContext.Provider>
  );
}

export function useLayoutConfig() {
  return useContext(LayoutConfigContext);
}
