import { contextBridge, ipcRenderer } from 'electron';

type BallStats = {
  percent: number;
  usedMb: number;
  totalMb: number;
};

contextBridge.exposeInMainWorld('mmboard', {
  platform: process.platform,
  setFloatingBallExpanded: (expanded: boolean) => {
    ipcRenderer.send('floating-ball:set-expanded', expanded);
  },
  dragStart: (info: { startX: number; startY: number }) => {
    ipcRenderer.send('floating-ball:drag-start', info);
  },
  dragStop: () => {
    ipcRenderer.send('floating-ball:drag-stop');
  },
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
  onMainLog: (callback: (msg: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, msg: string) => {
      callback(msg);
    };
    ipcRenderer.on('floating-ball:log', listener);
    return () => {
      ipcRenderer.removeListener('floating-ball:log', listener);
    };
  },
});
