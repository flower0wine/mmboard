import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mmboard', {
  platform: process.platform,
  expandFloatingWindow: () => ipcRenderer.invoke('floating-window:expand'),
  onFloatingModeChanged: (
    callback: (state: { mode: 'full' | 'compact'; edge: 'left' | 'right' | 'top' | 'bottom' }) => void,
  ) => {
    const listener = (_event: Electron.IpcRendererEvent, state: { mode: 'full' | 'compact'; edge: 'left' | 'right' | 'top' | 'bottom' }) => {
      callback(state);
    };

    ipcRenderer.on('floating-mode-changed', listener);

    return () => {
      ipcRenderer.removeListener('floating-mode-changed', listener);
    };
  },
});
