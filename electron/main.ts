import { app, BrowserWindow, ipcMain, screen, shell } from 'electron';
import isDev from 'electron-is-dev';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type DockEdge = 'left' | 'right' | 'top' | 'bottom';
type FloatingMode = 'full' | 'compact';

const fullBounds = {
  width: 1040,
  height: 700,
};
const compactSize = 64;
const edgeThreshold = 100;
const edgeGap = 16;
const autoCollapseDelay = 7000;

let floatingMode: FloatingMode = 'full';
let dockEdge: DockEdge = 'right';
let moveCheckTimer: NodeJS.Timeout | undefined;
let autoCollapseTimer: NodeJS.Timeout | undefined;
let suppressMoveCheck = false;
let expandedFromDock = false;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getNearestEdge(window: BrowserWindow): DockEdge | null {
  const bounds = window.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const distances: Array<[DockEdge, number]> = [
    ['left', bounds.x - area.x],
    ['right', area.x + area.width - (bounds.x + bounds.width)],
    ['top', bounds.y - area.y],
    ['bottom', area.y + area.height - (bounds.y + bounds.height)],
  ];
  const [edge, distance] = distances.sort((a, b) => a[1] - b[1])[0];

  return distance <= edgeThreshold ? edge : null;
}

function getCompactBounds(window: BrowserWindow, edge: DockEdge) {
  const bounds = window.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  if (edge === 'left' || edge === 'right') {
    return {
      x: edge === 'left' ? area.x + edgeGap : area.x + area.width - compactSize - edgeGap,
      y: clamp(Math.round(centerY - compactSize / 2), area.y + edgeGap, area.y + area.height - compactSize - edgeGap),
      width: compactSize,
      height: compactSize,
    };
  }

  return {
    x: clamp(Math.round(centerX - compactSize / 2), area.x + edgeGap, area.x + area.width - compactSize - edgeGap),
    y: edge === 'top' ? area.y + edgeGap : area.y + area.height - compactSize - edgeGap,
    width: compactSize,
    height: compactSize,
  };
}

function getExpandedBounds(window: BrowserWindow, edge: DockEdge) {
  const bounds = window.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const width = Math.min(fullBounds.width, area.width - edgeGap * 2);
  const height = Math.min(fullBounds.height, area.height - edgeGap * 2);

  if (edge === 'left' || edge === 'right') {
    return {
      x: edge === 'left' ? area.x + edgeGap : area.x + area.width - width - edgeGap,
      y: clamp(Math.round(centerY - height / 2), area.y + edgeGap, area.y + area.height - height - edgeGap),
      width,
      height,
    };
  }

  return {
    x: clamp(Math.round(centerX - width / 2), area.x + edgeGap, area.x + area.width - width - edgeGap),
    y: edge === 'top' ? area.y + edgeGap : area.y + area.height - height - edgeGap,
    width,
    height,
  };
}

function sendFloatingMode(window: BrowserWindow) {
  window.webContents.send('floating-mode-changed', {
    mode: floatingMode,
    edge: dockEdge,
  });
}

function withSuppressedMoveCheck(work: () => void) {
  suppressMoveCheck = true;
  work();
  setTimeout(() => {
    suppressMoveCheck = false;
  }, 250);
}

function collapseToDock(window: BrowserWindow, edge = getNearestEdge(window)) {
  if (!edge || floatingMode === 'compact') return;

  dockEdge = edge;
  floatingMode = 'compact';
  expandedFromDock = false;
  if (autoCollapseTimer) clearTimeout(autoCollapseTimer);

  withSuppressedMoveCheck(() => {
    window.setResizable(false);
    window.setMinimumSize(compactSize, compactSize);
    window.setBounds(getCompactBounds(window, dockEdge), true);
  });
  sendFloatingMode(window);
}

function expandFromDock(window: BrowserWindow) {
  if (floatingMode === 'full') return;

  floatingMode = 'full';
  expandedFromDock = true;

  withSuppressedMoveCheck(() => {
    window.setResizable(true);
    window.setMinimumSize(320, 320);
    window.setBounds(getExpandedBounds(window, dockEdge), true);
  });
  sendFloatingMode(window);

  if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
  autoCollapseTimer = setTimeout(() => {
    if (expandedFromDock && getNearestEdge(window)) {
      collapseToDock(window, dockEdge);
    }
  }, autoCollapseDelay);
}

function scheduleEdgeCheck(window: BrowserWindow) {
  if (suppressMoveCheck || window.isDestroyed()) return;
  if (moveCheckTimer) clearTimeout(moveCheckTimer);

  moveCheckTimer = setTimeout(() => {
    const edge = getNearestEdge(window);

    if (!edge) {
      expandedFromDock = false;
      if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
      return;
    }

    if (floatingMode === 'full' && !expandedFromDock) {
      collapseToDock(window, edge);
    }
  }, 180);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: fullBounds.width,
    height: fullBounds.height,
    minWidth: 320,
    minHeight: 320,
    title: 'mmboard',
    backgroundColor: '#f6f7f4',
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.on('move', () => scheduleEdgeCheck(mainWindow));
  mainWindow.on('resize', () => scheduleEdgeCheck(mainWindow));
  mainWindow.webContents.on('did-finish-load', () => sendFloatingMode(mainWindow));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (process.env.ELECTRON_OPEN_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

ipcMain.handle('floating-window:expand', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) expandFromDock(window);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
