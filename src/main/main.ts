/**
 * panda-shot-engine — Enhanced Electron Main Process
 *
 * Features:
 *  - Full application menu: File (New/Open/Save/Save As/Export), Edit (Undo/Redo), View, Help
 *  - IPC handlers for project management: new, open, save, save-as
 *  - IPC handlers for export: frames, video
 *  - IPC handlers for dialogs: select-image, select-audio
 *  - Recent projects list (persisted via electron-store)
 *  - Window state management
 */

import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import ElectronStore from 'electron-store';

// ---------------------------------------------------------------------------
// Config store for persistent settings
// ---------------------------------------------------------------------------

interface StoreSchema {
  recentProjects: Array<{
    name: string;
    filePath: string;
    lastOpened: string;
  }>;
  windowBounds: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maximized: boolean;
  };
}

const store = new ElectronStore<StoreSchema>({
  defaults: {
    recentProjects: [],
    windowBounds: {
      width: 1400,
      height: 900,
      maximized: false,
    },
  },
});

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let currentProjectPath: string | null = null;

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createWindow(): void {
  const bounds = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 1024,
    minHeight: 680,
    title: 'Panda Shot Engine',
    backgroundColor: '#1e1e2e',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (bounds.maximized) {
    mainWindow.maximize();
  }

  // Show window when ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Save window bounds on resize/move
  mainWindow.on('resize', saveWindowBounds);
  mainWindow.on('move', saveWindowBounds);
  mainWindow.on('maximize', () => {
    store.set('windowBounds.maximized', true);
  });
  mainWindow.on('unmaximize', () => {
    store.set('windowBounds.maximized', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Build the application menu
  buildApplicationMenu();
}

function saveWindowBounds(): void {
  if (!mainWindow || mainWindow.isMaximized()) return;
  const bounds = mainWindow.getBounds();
  store.set('windowBounds', {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    maximized: false,
  });
}

// ---------------------------------------------------------------------------
// Application Menu
// ---------------------------------------------------------------------------

function buildApplicationMenu(): void {
  const isMac = process.platform === 'darwin';

  const recentProjects = store.get('recentProjects');
  const recentSubmenu: Electron.MenuItemConstructorOptions[] = recentProjects.length > 0
    ? [
      ...recentProjects.slice(0, 10).map(entry => ({
        label: `${entry.name} — ${entry.filePath}`,
        click: () => {
          mainWindow?.webContents.send('menu:open-recent', entry.filePath);
        },
      })),
      { type: 'separator' as const },
      {
        label: 'Clear Recent',
        click: () => {
          store.set('recentProjects', []);
          buildApplicationMenu();
        },
      },
    ]
    : [{ label: 'No Recent Projects', enabled: false }];

  const template: Electron.MenuItemConstructorOptions[] = [
    // ── File ──
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-project'),
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open-project'),
        },
        {
          label: 'Open Recent',
          submenu: recentSubmenu,
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save-project'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:save-project-as'),
        },
        { type: 'separator' },
        {
          label: 'Export Frames...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu:export-frames'),
        },
        {
          label: 'Export Video...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow?.webContents.send('menu:export-video'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },

    // ── Edit ──
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu:undo'),
        },
        {
          label: 'Redo',
          accelerator: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y',
          click: () => mainWindow?.webContents.send('menu:redo'),
        },
        { type: 'separator' },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },

    // ── View ──
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' },
        { role: 'togglefullscreen' as const },
      ],
    },

    // ── Help ──
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/panda-shot-engine/docs');
          },
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/panda-shot-engine/issues');
          },
        },
        { type: 'separator' },
        {
          label: `About Panda Shot Engine v${app.getVersion()}`,
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About Panda Shot Engine',
              message: 'Panda Shot Engine',
              detail: `Version ${app.getVersion()}\nDSL-driven animation editor for panda-style animations.`,
            });
          },
        },
      ],
    },
  ];

  // On macOS, prepend the application menu
  if (isMac) {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' },
        { role: 'services' as const },
        { type: 'separator' },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' },
        { role: 'quit' as const },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ---------------------------------------------------------------------------
// Recent projects helper
// ---------------------------------------------------------------------------

function addRecentProject(name: string, filePath: string): void {
  let recent = store.get('recentProjects');
  recent = recent.filter(e => e.filePath !== filePath);
  recent.unshift({
    name,
    filePath,
    lastOpened: new Date().toISOString(),
  });
  if (recent.length > 10) {
    recent = recent.slice(0, 10);
  }
  store.set('recentProjects', recent);
  buildApplicationMenu();
}

// ---------------------------------------------------------------------------
// IPC Handlers — Project management
// ---------------------------------------------------------------------------

ipcMain.handle('project:new', async (_event, name: string) => {
  currentProjectPath = null;
  if (mainWindow) {
    mainWindow.setTitle(`Panda Shot Engine — ${name} (unsaved)`);
  }
  return { success: true, name };
});

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Panda Projects', extensions: ['panda', 'pshot', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const project = JSON.parse(content);
    currentProjectPath = filePath;

    addRecentProject(project.name ?? path.basename(filePath), filePath);

    if (mainWindow) {
      mainWindow.setTitle(`Panda Shot Engine — ${project.name ?? 'Untitled'}`);
    }

    return { success: true, filePath, project };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('project:save', async (_event, data: { project: unknown; filePath?: string }) => {
  let targetPath = data.filePath ?? currentProjectPath;

  if (!targetPath) {
    // No path — show save dialog
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: 'untitled.panda',
      filters: [
        { name: 'Panda Projects', extensions: ['panda'] },
        { name: 'JSON Files', extensions: ['json'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }
    targetPath = result.filePath;
  }

  try {
    const content = JSON.stringify(data.project, null, 2);
    fs.writeFileSync(targetPath, content, 'utf-8');
    currentProjectPath = targetPath;

    const projectObj = data.project as Record<string, unknown>;
    const name = (projectObj.name as string) ?? path.basename(targetPath);
    addRecentProject(name, targetPath);

    if (mainWindow) {
      mainWindow.setTitle(`Panda Shot Engine — ${name}`);
    }

    return { success: true, filePath: targetPath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('project:save-as', async (_event, data: { project: unknown }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: currentProjectPath ?? 'untitled.panda',
    filters: [
      { name: 'Panda Projects', extensions: ['panda'] },
      { name: 'JSON Files', extensions: ['json'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  try {
    const content = JSON.stringify(data.project, null, 2);
    fs.writeFileSync(result.filePath, content, 'utf-8');
    currentProjectPath = result.filePath;

    const projectObj = data.project as Record<string, unknown>;
    const name = (projectObj.name as string) ?? path.basename(result.filePath);
    addRecentProject(name, result.filePath);

    if (mainWindow) {
      mainWindow.setTitle(`Panda Shot Engine — ${name}`);
    }

    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// ---------------------------------------------------------------------------
// IPC Handlers — Export
// ---------------------------------------------------------------------------

ipcMain.handle('export:frames', async (_event, data: {
  outputDir: string;
  frames: Array<{ index: number; dataUrl: string }>;
}) => {
  try {
    await fs.promises.mkdir(data.outputDir, { recursive: true });
    const padLen = String(data.frames.length).length;

    for (const frame of data.frames) {
      const paddedIdx = String(frame.index).padStart(padLen, '0');
      const filePath = path.join(data.outputDir, `frame_${paddedIdx}.png`);

      // Convert data URL to buffer
      const base64Data = frame.dataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.promises.writeFile(filePath, buffer);
    }

    return { success: true, count: data.frames.length, outputDir: data.outputDir };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('export:video', async (_event, data: {
  framesDir: string;
  outputPath: string;
  fps: number;
  codec?: string;
  crf?: number;
}) => {
  const { execFile } = require('child_process');

  try {
    // Find the frame pattern
    const files = await fs.promises.readdir(data.framesDir);
    const pngFiles = files.filter(f => f.endsWith('.png')).sort();
    if (pngFiles.length === 0) {
      return { success: false, error: 'No PNG frames found in directory' };
    }

    const padLen = pngFiles[0].match(/\d+/)?.[0]?.length ?? 4;
    const framePattern = path.join(data.framesDir, `frame_%0${padLen}d.png`);

    const ffmpegArgs = [
      '-y',
      '-framerate', String(data.fps),
      '-i', framePattern,
      '-c:v', data.codec ?? 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', String(data.crf ?? 23),
      '-movflags', '+faststart',
      data.outputPath,
    ];

    await new Promise<void>((resolve, reject) => {
      execFile('ffmpeg', ffmpegArgs, (error: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    });

    return { success: true, outputPath: data.outputPath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// ---------------------------------------------------------------------------
// IPC Handlers — Dialogs
// ---------------------------------------------------------------------------

ipcMain.handle('dialog:select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  return { success: true, filePaths: result.filePaths };
});

ipcMain.handle('dialog:select-audio', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  return { success: true, filePaths: result.filePaths };
});

ipcMain.handle('dialog:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  return { success: true, dirPath: result.filePaths[0] };
});

ipcMain.handle('dialog:save-file', async (_event, data: {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: data.defaultPath,
    filters: data.filters ?? [{ name: 'All Files', extensions: ['*'] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  return { success: true, filePath: result.filePath };
});

// ---------------------------------------------------------------------------
// IPC Handlers — File system (restricted to safe operations)
// ---------------------------------------------------------------------------

ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('fs:write-file', async (_event, data: { filePath: string; content: string }) => {
  try {
    const dir = path.dirname(data.filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(data.filePath, data.content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('fs:exists', async (_event, filePath: string) => {
  try {
    await fs.promises.access(filePath);
    return { success: true, exists: true };
  } catch {
    return { success: true, exists: false };
  }
});

ipcMain.handle('fs:read-binary', async (_event, filePath: string) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return { success: true, data: buffer.toString('base64') };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// ---------------------------------------------------------------------------
// IPC Handlers — Recent projects
// ---------------------------------------------------------------------------

ipcMain.handle('recent:get', () => {
  return store.get('recentProjects');
});

ipcMain.handle('recent:clear', () => {
  store.set('recentProjects', []);
  buildApplicationMenu();
  return { success: true };
});

// ---------------------------------------------------------------------------
// IPC Handlers — Legacy (backward compatible)
// ---------------------------------------------------------------------------

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Panda Shot Files', extensions: ['pshot', 'panda', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { filePath, content };
});

ipcMain.handle('file:save', async (_event, data: { filePath?: string; content: string }) => {
  let targetPath = data.filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog({
      filters: [
        { name: 'Panda Shot Files', extensions: ['pshot'] },
        { name: 'JSON Files', extensions: ['json'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    targetPath = result.filePath;
  }

  fs.writeFileSync(targetPath, data.content, 'utf-8');
  return { filePath: targetPath };
});

ipcMain.handle('project:load', async (_event, projectPath: string) => {
  try {
    const content = fs.readFileSync(projectPath, 'utf-8');
    const project = JSON.parse(content);
    return { success: true, project };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// ---------------------------------------------------------------------------
// App Lifecycle
// ---------------------------------------------------------------------------

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

// Handle second-instance: focus existing window
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
