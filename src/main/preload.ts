import { contextBridge, ipcRenderer } from 'electron';

// ── Type Definitions ──────────────────────────────────────────────────────────────

export interface FileOpenResult {
  filePath: string;
  content: string;
}

export interface FileSaveResult {
  filePath: string;
}

export interface ProjectLoadResult {
  success: boolean;
  project?: unknown;
  error?: string;
}

export interface ProjectSaveResult {
  success: boolean;
  error?: string;
}

// ── Exposed API ───────────────────────────────────────────────────────────────────

const api = {
  /** File operations */
  file: {
    /** Open a file dialog and read the selected file */
    openFile: (): Promise<FileOpenResult | null> => {
      return ipcRenderer.invoke('file:open');
    },

    /** Save content to a file (shows save dialog if no filePath provided) */
    saveFile: (data: { filePath?: string; content: string }): Promise<FileSaveResult | null> => {
      return ipcRenderer.invoke('file:save', data);
    },
  },

  /** Project operations */
  project: {
    /** Load a project from disk */
    loadProject: (projectPath: string): Promise<ProjectLoadResult> => {
      return ipcRenderer.invoke('project:load', projectPath);
    },

    /** Save the current project to disk */
    saveProject: (data: { projectPath: string; project: unknown }): Promise<ProjectSaveResult> => {
      return ipcRenderer.invoke('project:save', data);
    },
  },
};

contextBridge.exposeInMainWorld('pandaEngine', api);

// ── Global Type Augmentation ──────────────────────────────────────────────────────

declare global {
  interface Window {
    pandaEngine: typeof api;
  }
}
