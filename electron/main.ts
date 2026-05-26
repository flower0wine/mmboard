import { app, BrowserWindow, ipcMain, screen } from 'electron';
import isDev from 'electron-is-dev';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ballBounds = {
  compact: 96,
  expandedWidth: 280,
  expandedHeight: 236,
  edgeGap: 18,
};

let ballWindow: BrowserWindow | undefined;
let statsTimer: NodeJS.Timeout | undefined;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadRenderer(window: BrowserWindow, hash?: string) {
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    const url = new URL(process.env.VITE_DEV_SERVER_URL);
    if (hash) url.hash = hash;
    void window.loadURL(url.toString());
    return;
  }

  void window.loadFile(path.join(__dirname, '../dist/index.html'), hash ? { hash } : undefined);
}

function getInitialBallBounds() {
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;

  return {
    x: area.x + area.width - ballBounds.compact - ballBounds.edgeGap,
    y: area.y + Math.round(area.height * 0.36),
    width: ballBounds.compact,
    height: ballBounds.compact,
  };
}

function getMemoryStats() {
  const memoryInfo = process.getSystemMemoryInfo();
  const used = Math.max(memoryInfo.total - memoryInfo.free, 0);
  const percent = memoryInfo.total > 0 ? Math.round((used / memoryInfo.total) * 100) : 0;

  return {
    percent,
    usedMb: Math.round(used / 1024),
    totalMb: Math.round(memoryInfo.total / 1024),
  };
}

function sendBallStats() {
  if (!ballWindow || ballWindow.isDestroyed()) return;
  ballWindow.webContents.send('floating-ball:stats', getMemoryStats());
}

function startStatsTimer() {
  if (statsTimer) clearInterval(statsTimer);
  statsTimer = setInterval(sendBallStats, 2000);
  sendBallStats();
}

function resizeBallWindow(expanded: boolean) {
  if (!ballWindow || ballWindow.isDestroyed()) return;

  const bounds = ballWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const nextWidth = expanded ? ballBounds.expandedWidth : ballBounds.compact;
  const nextHeight = expanded ? ballBounds.expandedHeight : ballBounds.compact;
  const right = Math.min(bounds.x + bounds.width, area.x + area.width - ballBounds.edgeGap);
  const bottom = Math.min(bounds.y + bounds.height, area.y + area.height - ballBounds.edgeGap);

  const nextBounds = {
    x: Math.max(area.x + ballBounds.edgeGap, right - nextWidth),
    y: Math.max(area.y + ballBounds.edgeGap, bottom - nextHeight),
    width: nextWidth,
    height: nextHeight,
  };

  ballWindow.setBounds(nextBounds, true);
}

function moveBallWindow(delta: { deltaX: number; deltaY: number }) {
  if (!ballWindow || ballWindow.isDestroyed()) return;

  const bounds = ballWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;

  ballWindow.setBounds(
    {
      ...bounds,
      x: clamp(bounds.x + Math.round(delta.deltaX), area.x, area.x + area.width - bounds.width),
      y: clamp(bounds.y + Math.round(delta.deltaY), area.y, area.y + area.height - bounds.height),
    },
    false,
  );
}

function createBallWindow() {
  ballWindow = new BrowserWindow({
    ...getInitialBallBounds(),
    title: 'mmboard ball',
    backgroundColor: '#00000000',
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  ballWindow.setAlwaysOnTop(true, 'screen-saver');
  ballWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  ballWindow.on('closed', () => {
    ballWindow = undefined;
  });

  ballWindow.webContents.on('did-finish-load', () => {
    sendBallStats();
  });

  loadRenderer(ballWindow, '/floating-ball');
}

ipcMain.handle('floating-ball:set-expanded', (_event, expanded: boolean) => {
  resizeBallWindow(expanded);
});

ipcMain.handle('floating-ball:boost', () => {
  sendBallStats();
  return getMemoryStats();
});

ipcMain.handle('floating-ball:move', (_event, delta: { deltaX: number; deltaY: number }) => {
  moveBallWindow(delta);
});

app.whenReady().then(() => {
  createBallWindow();
  startStatsTimer();

  app.on('activate', () => {
    if (!ballWindow || ballWindow.isDestroyed()) createBallWindow();
  });
});

app.on('before-quit', () => {
  if (statsTimer) clearInterval(statsTimer);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
