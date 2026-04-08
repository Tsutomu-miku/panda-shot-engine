import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Panda Shot Engine',
    backgroundColor: '#1e1e2e',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────────

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Panda Shot Files', extensions: ['pshot', 'json'] },
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

    if (result.canceled || !result.filePath) {
      return null;
    }

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

ipcMain.handle('project:save', async (_event, data: { projectPath: string; project: unknown }) => {
  try {
    const content = JSON.stringify(data.project, null, 2);
    fs.writeFileSync(data.projectPath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// ── App Lifecycle ─────────────────────────────────────────────────────────────────

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
