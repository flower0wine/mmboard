/// <reference types="vite/client" />

interface Window {
  mmboard?: {
    platform: NodeJS.Platform;
    setFloatingBallExpanded: (expanded: boolean) => void;
    dragStart: (info: { startX: number; startY: number }) => void;
    dragStop: () => void;
    boostFloatingBall: () => Promise<{ percent: number; usedMb: number; totalMb: number }>;
    onFloatingBallStats: (
      callback: (stats: { percent: number; usedMb: number; totalMb: number }) => void,
    ) => () => void;
    onMainLog: (callback: (msg: string) => void) => () => void;
  };
}
