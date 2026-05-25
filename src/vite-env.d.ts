/// <reference types="vite/client" />

interface Window {
  mmboard?: {
    platform: NodeJS.Platform;
    expandFloatingWindow: () => Promise<void>;
    onFloatingModeChanged: (
      callback: (state: { mode: 'full' | 'compact'; edge: 'left' | 'right' | 'top' | 'bottom' }) => void,
    ) => () => void;
  };
}
