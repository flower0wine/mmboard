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
let dragTimer: NodeJS.Timeout | undefined;
let snapTimer: NodeJS.Timeout | undefined;
let dragStartCursor: { x: number; y: number } = { x: 0, y: 0 };
let dragStartWindow: { x: number; y: number } = { x: 0, y: 0 };

function mainLog(...args: unknown[]) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  console.log('[主进程]', msg);
  ballWindow?.webContents.send('floating-ball:log', `[主进程] ${msg}`);
}

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
      preload: path.join(__dirname, 'preload.cjs'),
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

  if (isDev) {
    ballWindow.webContents.openDevTools({ mode: 'detach' });
  }

  loadRenderer(ballWindow, '/floating-ball');
}

function snapToEdge(animate = true) {
  if (!ballWindow || ballWindow.isDestroyed()) return;
  if (snapTimer) {
    clearTimeout(snapTimer);
    snapTimer = undefined;
  }

  const bounds = ballWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const targetX = bounds.x - area.x < area.width / 2
    ? area.x + ballBounds.edgeGap
    : area.x + area.width - bounds.width - ballBounds.edgeGap;

  if (!animate) {
    ballWindow.setBounds({ ...bounds, x: targetX }, false);
    return;
  }

  const startX = bounds.x;
  const distance = targetX - startX;
  const duration = 200;
  const startTime = performance.now();

  function tick() {
    if (!ballWindow || ballWindow.isDestroyed()) return;
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    ballWindow.setBounds({ ...ballWindow.getBounds(), x: Math.round(startX + distance * eased) }, false);
    if (progress < 1) {
      snapTimer = setTimeout(tick, 16);
      return;
    }
    snapTimer = undefined;
  }

  snapTimer = setTimeout(tick, 16);
}

ipcMain.on('floating-ball:set-expanded', (_event, expanded: boolean) => {
  resizeBallWindow(expanded);
});

ipcMain.on('floating-ball:drag-start', (_event, info: { startX: number; startY: number }) => {
  mainLog('📩 收到 dragStart', info);
  if (!ballWindow || ballWindow.isDestroyed()) {
    mainLog('❌ ballWindow 无效');
    return;
  }

  if (dragTimer) clearInterval(dragTimer);
  mainLog('🧹 清理旧 timer');

  dragStartCursor = { x: info.startX, y: info.startY };
  dragStartWindow = { x: ballWindow.getBounds().x, y: ballWindow.getBounds().y };
  mainLog('📍 记录起始位置', { dragStartCursor, dragStartWindow });

  const pollRate = Math.floor(1000 / 60);
  mainLog('⏱️ 启动轮询', { pollRate });
  dragTimer = setInterval(() => {
    if (!ballWindow || ballWindow.isDestroyed()) {
      mainLog('❌ 轮询中 ballWindow 失效');
      if (dragTimer) clearInterval(dragTimer);
      dragTimer = undefined;
      return;
    }

    const cursor = screen.getCursorScreenPoint();
    const bounds = ballWindow.getBounds();
    const display = screen.getDisplayMatching(bounds);
    const area = display.workArea;

    const newX = clamp(
      dragStartWindow.x + (cursor.x - dragStartCursor.x),
      area.x,
      area.x + area.width - bounds.width,
    );
    const newY = clamp(
      dragStartWindow.y + (cursor.y - dragStartCursor.y),
      area.y,
      area.y + area.height - bounds.height,
    );

    ballWindow.setPosition(Math.round(newX), Math.round(newY));
  }, pollRate);
});

ipcMain.on('floating-ball:drag-stop', () => {
  mainLog('📩 收到 dragStop');
  if (dragTimer) {
    clearInterval(dragTimer);
    dragTimer = undefined;
    mainLog('⏹️ 停止轮询');
  }
  snapToEdge(true);
  mainLog('📎 执行吸附动画');
});

ipcMain.handle('floating-ball:boost', () => {
  sendBallStats();
  return getMemoryStats();
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
  if (dragTimer) clearInterval(dragTimer);
  if (snapTimer) clearTimeout(snapTimer);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
