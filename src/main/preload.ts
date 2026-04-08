/**
 * panda-shot-engine — Enhanced Preload Script
 *
 * Exposes a comprehensive, typed API to the renderer process via contextBridge.
 * All IPC communication is channeled through this single bridge — no direct
 * access to Node.js or Electron internals leaks into the renderer.
 *
 * Exposed namespaces on `window.pandaEngine`:
 *   projectApi  – create / open / save / save-as projects
 *   exportApi   – export image frames / video
 *   dialogApi   – native OS dialogs (image, audio, directory, save-file)
 *   fsApi       – sandboxed filesystem access (read, write, exists)
 *   recentApi   – recent project list
 *   file        – (legacy) open/save single files
 *   project     – (legacy) load/save projects
 *   menu        – subscribe to menu events from the main process
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// ═══════════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

// ── Project types ──────────────────────────────────────────────────────────────

/** Result returned when creating a brand-new project. */
export interface ProjectNewResult {
  success: boolean;
  project?: unknown;
  error?: string;
}

/** Result returned when opening a project file via dialog. */
export interface ProjectOpenResult {
  success: boolean;
  project?: unknown;
  filePath?: string;
  error?: string;
}

/** Result returned after saving a project. */
export interface ProjectSaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

// ── Export types ────────────────────────────────────────────────────────────────

/** Options passed to the frame-export IPC handler. */
export interface ExportFramesOptions {
  frames: string[];          // Array of data-URL encoded PNG frames
  outputDir: string;         // Directory to write PNGs into
  namePrefix?: string;       // e.g. "frame_" (default)
}

/** Result of a frame-export operation. */
export interface ExportFramesResult {
  success: boolean;
  outputDir?: string;
  frameCount?: number;
  error?: string;
}

/** Options for video export. */
export interface ExportVideoOptions {
  frames: string[];          // data-URL encoded PNGs
  outputPath: string;        // e.g. "/Users/me/out.mp4"
  fps?: number;              // default 24
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high' | 'lossless';
}

/** Result of a video-export operation. */
export interface ExportVideoResult {
  success: boolean;
  outputPath?: string;
  duration?: number;         // seconds
  fileSize?: number;         // bytes
  error?: string;
}

// ── Dialog types ───────────────────────────────────────────────────────────────

/** Returned by image/audio selection dialogs. */
export interface FileSelectionResult {
  filePath: string;
  data?: string;             // Base64-encoded contents (for binary assets)
}

/** Options passed to the save-file dialog. */
export interface SaveFileDialogOptions {
  defaultName?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

// ── Filesystem types ───────────────────────────────────────────────────────────

export interface FsReadResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface FsWriteResult {
  success: boolean;
  error?: string;
}

export interface FsExistsResult {
  exists: boolean;
}

export interface FsReadBinaryResult {
  success: boolean;
  data?: string;             // Base64
  error?: string;
}

// ── Recent projects ────────────────────────────────────────────────────────────

export interface RecentProjectEntry {
  name: string;
  filePath: string;
  lastOpened: string;        // ISO 8601
}

// ── Legacy types (backward-compat) ─────────────────────────────────────────────

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

// ── Menu event names ───────────────────────────────────────────────────────────

type MenuEventName =
  | 'menu:new-project'
  | 'menu:open-project'
  | 'menu:open-recent'
  | 'menu:save-project'
  | 'menu:save-project-as'
  | 'menu:export-frames'
  | 'menu:export-video'
  | 'menu:undo'
  | 'menu:redo';

// ═══════════════════════════════════════════════════════════════════════════════
// API Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Project lifecycle management.
 *
 *  - new:     Creates a blank project scaffold
 *  - open:    Shows native open-dialog, reads & parses .panda file
 *  - save:    Writes current project to its known path (or prompts if new)
 *  - saveAs:  Always shows a save-dialog, writes to the chosen path
 */
const projectApi = {
  /** Create a new empty project with the given name. */
  new(name: string): Promise<ProjectNewResult> {
    return ipcRenderer.invoke('project:new', name);
  },

  /** Open a .panda project via native file dialog. */
  open(): Promise<ProjectOpenResult> {
    return ipcRenderer.invoke('project:open');
  },

  /**
   * Save the project. If `filePath` is provided the file is written directly;
   * otherwise the main process will prompt via save-dialog.
   */
  save(data: { project: unknown; filePath?: string }): Promise<ProjectSaveResult> {
    return ipcRenderer.invoke('project:save', data);
  },

  /** Always prompts for a new location before saving. */
  saveAs(data: { project: unknown }): Promise<ProjectSaveResult> {
    return ipcRenderer.invoke('project:save-as', data);
  },
};

/**
 * Export pipeline — image sequences and video encoding.
 */
const exportApi = {
  /**
   * Write an array of data-URL PNGs to disk as numbered image files.
   * Returns the output directory and count on success.
   */
  frames(data: ExportFramesOptions): Promise<ExportFramesResult> {
    return ipcRenderer.invoke('export:frames', data);
  },

  /**
   * Render frames and encode to a video file via ffmpeg.
   * Falls back gracefully with an error message if ffmpeg is unavailable.
   */
  video(data: ExportVideoOptions): Promise<ExportVideoResult> {
    return ipcRenderer.invoke('export:video', data);
  },
};

/**
 * Native OS dialogs — thin wrappers around Electron's `dialog` module.
 */
const dialogApi = {
  /** Open a file dialog filtered to image types (png, jpg, gif, webp, svg). */
  selectImage(): Promise<FileSelectionResult | null> {
    return ipcRenderer.invoke('dialog:select-image');
  },

  /** Open a file dialog filtered to audio types (mp3, wav, ogg, m4a, flac). */
  selectAudio(): Promise<FileSelectionResult | null> {
    return ipcRenderer.invoke('dialog:select-audio');
  },

  /** Open a directory-picker dialog. Returns the selected path or null. */
  selectDirectory(): Promise<string | null> {
    return ipcRenderer.invoke('dialog:select-directory');
  },

  /** Show a save-file dialog. Returns the chosen path or null. */
  saveFile(options?: SaveFileDialogOptions): Promise<string | null> {
    return ipcRenderer.invoke('dialog:save-file', options ?? {});
  },
};

/**
 * Sandboxed filesystem access.
 *
 * **Security note**: The main process may enforce path restrictions (e.g. only
 * allowing reads/writes within the active project directory). This preload
 * layer does *not* implement additional guards — it trusts the main process
 * handler to validate paths.
 */
const fsApi = {
  /** Read a UTF-8 text file. */
  readFile(filePath: string): Promise<FsReadResult> {
    return ipcRenderer.invoke('fs:read-file', filePath);
  },

  /** Write a UTF-8 text file (creates intermediate directories if needed). */
  writeFile(filePath: string, content: string): Promise<FsWriteResult> {
    return ipcRenderer.invoke('fs:write-file', { filePath, content });
  },

  /** Check whether a path exists on disk. */
  exists(filePath: string): Promise<FsExistsResult> {
    return ipcRenderer.invoke('fs:exists', filePath);
  },

  /** Read a binary file, returned as a Base64-encoded string. */
  readBinary(filePath: string): Promise<FsReadBinaryResult> {
    return ipcRenderer.invoke('fs:read-binary', filePath);
  },
};

/**
 * Recent-projects list (persisted in electron-store on the main side).
 */
const recentApi = {
  /** Retrieve the list of recently opened projects. */
  get(): Promise<RecentProjectEntry[]> {
    return ipcRenderer.invoke('recent:get');
  },

  /** Clear the recent-projects list. */
  clear(): Promise<void> {
    return ipcRenderer.invoke('recent:clear');
  },
};

/**
 * Legacy file/project API — kept for backward compatibility with older
 * renderer code that may still reference `window.pandaEngine.file.*` or
 * `window.pandaEngine.project.loadProject`.
 */
const legacyFileApi = {
  /** Open a file dialog and read the selected file (legacy). */
  openFile(): Promise<FileOpenResult | null> {
    return ipcRenderer.invoke('file:open');
  },

  /** Save content to a file via dialog (legacy). */
  saveFile(data: { filePath?: string; content: string }): Promise<FileSaveResult | null> {
    return ipcRenderer.invoke('file:save', data);
  },
};

const legacyProjectApi = {
  /** Load a project from a known path (legacy). */
  loadProject(projectPath: string): Promise<ProjectLoadResult> {
    return ipcRenderer.invoke('project:load', projectPath);
  },

  /** Save a project to a known path (legacy). */
  saveProject(data: { projectPath: string; project: unknown }): Promise<ProjectSaveResult> {
    return ipcRenderer.invoke('project:save', data);
  },
};

/**
 * Menu event subscription system.
 *
 * The main process sends named events (`menu:new-project`, `menu:save-project`,
 * etc.) via `webContents.send()` when the user clicks application menu items.
 * The renderer subscribes through this bridge.
 */
const menuApi = {
  /**
   * Register a handler for a menu event.
   * Returns an unsubscribe function for easy cleanup.
   *
   * @example
   * const unsub = window.pandaEngine.menu.on('menu:save-project', () => {
   *   saveCurrentProject();
   * });
   * // Later…
   * unsub();
   */
  on(channel: MenuEventName, handler: (...args: unknown[]) => void): () => void {
    const wrapped = (_event: IpcRendererEvent, ...args: unknown[]) => {
      handler(...args);
    };
    ipcRenderer.on(channel, wrapped);
    return () => {
      ipcRenderer.removeListener(channel, wrapped);
    };
  },

  /**
   * Register a one-time handler for a menu event.
   */
  once(channel: MenuEventName, handler: (...args: unknown[]) => void): void {
    ipcRenderer.once(channel, (_event: IpcRendererEvent, ...args: unknown[]) => {
      handler(...args);
    });
  },

  /**
   * Remove all listeners for a specific menu event channel.
   */
  removeAllListeners(channel: MenuEventName): void {
    ipcRenderer.removeAllListeners(channel);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Compose & Expose the Unified API
// ═══════════════════════════════════════════════════════════════════════════════

const pandaEngineApi = {
  // ── New, organized namespaces ──────────────────────────────────────────────
  projectApi,
  exportApi,
  dialogApi,
  fsApi,
  recentApi,
  menu: menuApi,

  // ── Legacy namespaces (backward-compat) ────────────────────────────────────
  file: legacyFileApi,
  project: legacyProjectApi,
};

contextBridge.exposeInMainWorld('pandaEngine', pandaEngineApi);

// ═══════════════════════════════════════════════════════════════════════════════
// Global Type Augmentation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Augments the global `Window` interface so that `window.pandaEngine` is
 * fully typed across the entire renderer codebase — no type casts needed.
 */
declare global {
  interface Window {
    pandaEngine: {
      // New APIs
      projectApi: typeof projectApi;
      exportApi: typeof exportApi;
      dialogApi: typeof dialogApi;
      fsApi: typeof fsApi;
      recentApi: typeof recentApi;
      menu: typeof menuApi;

      // Legacy APIs
      file: typeof legacyFileApi;
      project: typeof legacyProjectApi;
    };
  }
}
