import { contextBridge, ipcRenderer } from 'electron';

type BallStats = {
  percent: number;
  usedMb: number;
  totalMb: number;
};

contextBridge.exposeInMainWorld('mmboard', {
  platform: process.platform,
  setFloatingBallExpanded: (expanded: boolean) => ipcRenderer.invoke('floating-ball:set-expanded', expanded),
  moveFloatingBall: (delta: { deltaX: number; deltaY: number }) => ipcRenderer.invoke('floating-ball:move', delta),
  boostFloatingBall: () => ipcRenderer.invoke('floating-ball:boost') as Promise<BallStats>,
  onFloatingBallStats: (callback: (stats: BallStats) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, stats: BallStats) => {
      callback(stats);
    };

    ipcRenderer.on('floating-ball:stats', listener);

    return () => {
      ipcRenderer.removeListener('floating-ball:stats', listener);
    };
  },
});
