/// <reference types="vite/client" />

interface Window {
  mmboard?: {
    platform: NodeJS.Platform;
    setFloatingBallExpanded: (expanded: boolean) => Promise<void>;
    moveFloatingBall: (delta: { deltaX: number; deltaY: number }) => Promise<void>;
    boostFloatingBall: () => Promise<{ percent: number; usedMb: number; totalMb: number }>;
    onFloatingBallStats: (
      callback: (stats: { percent: number; usedMb: number; totalMb: number }) => void,
    ) => () => void;
  };
}
