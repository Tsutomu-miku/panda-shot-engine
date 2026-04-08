/**
 * panda-shot-engine — Project Manager
 *
 * Manages project lifecycle: create, save, load, export bundles,
 * shot management, and asset management.
 */

import type {
  PandaProject,
  ProjectShot,
  CharacterAsset,
  SceneAsset,
  PropAsset,
  AudioAsset,
  ExportOptions,
  RecentProjectEntry,
} from './types';
import {
  createNewProject,
  createDefaultSettings,
  createEmptyAssetManifest,
} from './types';

// ---------------------------------------------------------------------------
// File system abstraction (works in both Node.js and Electron contexts)
// ---------------------------------------------------------------------------

interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
}

/**
 * Default Node.js file system adapter.
 * In Electron renderer, this would be replaced by IPC-based calls.
 */
function createNodeFs(): FileSystem {
  return {
    async readFile(path: string): Promise<string> {
      const fs = require('fs');
      return fs.promises.readFile(path, 'utf-8');
    },
    async writeFile(path: string, content: string): Promise<void> {
      const fs = require('fs');
      const pathMod = require('path');
      const dir = pathMod.dirname(path);
      await fs.promises.mkdir(dir, { recursive: true }).catch(() => {});
      await fs.promises.writeFile(path, content, 'utf-8');
    },
    async exists(path: string): Promise<boolean> {
      const fs = require('fs');
      try {
        await fs.promises.access(path);
        return true;
      } catch {
        return false;
      }
    },
    async mkdir(path: string): Promise<void> {
      const fs = require('fs');
      await fs.promises.mkdir(path, { recursive: true });
    },
    async copyFile(src: string, dest: string): Promise<void> {
      const fs = require('fs');
      await fs.promises.copyFile(src, dest);
    },
    async readDir(path: string): Promise<string[]> {
      const fs = require('fs');
      return fs.promises.readdir(path);
    },
  };
}

// ---------------------------------------------------------------------------
// ProjectManager
// ---------------------------------------------------------------------------

export class ProjectManager {
  private currentProject: PandaProject | null = null;
  private currentFilePath: string | null = null;
  private isDirty: boolean = false;
  private recentProjects: RecentProjectEntry[] = [];
  private fs: FileSystem;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxUndoSteps: number = 50;

  constructor(fs?: FileSystem) {
    this.fs = fs ?? createNodeFs();
  }

  // -----------------------------------------------------------------------
  // Project lifecycle
  // -----------------------------------------------------------------------

  /**
   * Create a new empty project with the given name.
   */
  createProject(name: string): PandaProject {
    const project = createNewProject(name);
    this.currentProject = project;
    this.currentFilePath = null;
    this.isDirty = true;
    this.undoStack = [];
    this.redoStack = [];
    this.pushUndoState();
    return project;
  }

  /**
   * Save the current project to the given file path as a .panda JSON file.
   */
  async saveProject(project: PandaProject, filePath: string): Promise<void> {
    project.updatedAt = new Date().toISOString();
    const json = JSON.stringify(project, null, 2);
    await this.fs.writeFile(filePath, json);
    this.currentProject = project;
    this.currentFilePath = filePath;
    this.isDirty = false;
    this.addRecentProject(project.name, filePath);
  }

  /**
   * Save the current project (must have been previously saved or created with a path).
   */
  async saveCurrentProject(): Promise<void> {
    if (!this.currentProject) {
      throw new Error('No project is currently open');
    }
    if (!this.currentFilePath) {
      throw new Error('No file path set — use saveProject() with a file path');
    }
    await this.saveProject(this.currentProject, this.currentFilePath);
  }

  /**
   * Load a project from a .panda JSON file.
   */
  async loadProject(filePath: string): Promise<PandaProject> {
    const content = await this.fs.readFile(filePath);
    const project = JSON.parse(content) as PandaProject;

    // Validate basic structure
    if (!project.version || !project.name || !project.settings) {
      throw new Error('Invalid project file: missing required fields');
    }

    // Apply defaults for any missing fields
    if (!project.settings.resolution) {
      project.settings = { ...createDefaultSettings(), ...project.settings };
    }
    if (!project.assets) {
      project.assets = createEmptyAssetManifest();
    }
    if (!project.shots) {
      project.shots = [];
    }

    this.currentProject = project;
    this.currentFilePath = filePath;
    this.isDirty = false;
    this.undoStack = [];
    this.redoStack = [];
    this.pushUndoState();
    this.addRecentProject(project.name, filePath);

    return project;
  }

  /**
   * Export the project as a bundle: copies the .panda file and all
   * referenced assets into the output directory.
   */
  async exportProjectBundle(project: PandaProject, outputDir: string): Promise<void> {
    await this.fs.mkdir(outputDir);

    // Save the project file
    const projectFilePath = `${outputDir}/${this.sanitizeFilename(project.name)}.panda`;
    const clonedProject = JSON.parse(JSON.stringify(project)) as PandaProject;

    // Create asset subdirectories
    const assetDirs = ['characters', 'scenes', 'props', 'audio'];
    for (const dir of assetDirs) {
      await this.fs.mkdir(`${outputDir}/assets/${dir}`);
    }

    // Copy character assets and rewrite paths
    for (const char of clonedProject.assets.characters) {
      const newParts: Record<string, string> = {};
      for (const [partName, partPath] of Object.entries(char.parts)) {
        if (await this.fs.exists(partPath)) {
          const filename = this.extractFilename(partPath);
          const destPath = `assets/characters/${char.id}_${filename}`;
          await this.fs.copyFile(partPath, `${outputDir}/${destPath}`);
          newParts[partName] = destPath;
        } else {
          newParts[partName] = partPath;
        }
      }
      char.parts = newParts;
    }

    // Copy scene assets
    for (const scene of clonedProject.assets.scenes) {
      if (await this.fs.exists(scene.filePath)) {
        const filename = this.extractFilename(scene.filePath);
        const destPath = `assets/scenes/${scene.id}_${filename}`;
        await this.fs.copyFile(scene.filePath, `${outputDir}/${destPath}`);
        scene.filePath = destPath;
      }
    }

    // Copy prop assets
    for (const prop of clonedProject.assets.props) {
      if (await this.fs.exists(prop.filePath)) {
        const filename = this.extractFilename(prop.filePath);
        const destPath = `assets/props/${prop.id}_${filename}`;
        await this.fs.copyFile(prop.filePath, `${outputDir}/${destPath}`);
        prop.filePath = destPath;
      }
    }

    // Copy audio assets
    for (const audio of clonedProject.assets.audio) {
      if (await this.fs.exists(audio.filePath)) {
        const filename = this.extractFilename(audio.filePath);
        const destPath = `assets/audio/${audio.id}_${filename}`;
        await this.fs.copyFile(audio.filePath, `${outputDir}/${destPath}`);
        audio.filePath = destPath;
      }
    }

    // Write the updated project file
    await this.fs.writeFile(projectFilePath, JSON.stringify(clonedProject, null, 2));
  }

  // -----------------------------------------------------------------------
  // Shot management
  // -----------------------------------------------------------------------

  /**
   * Add a new shot to the project.
   */
  addShot(shot: ProjectShot): void {
    this.ensureProject();
    shot.order = this.currentProject!.shots.length;
    this.currentProject!.shots.push(shot);
    this.markDirty();
  }

  /**
   * Remove a shot by ID.
   */
  removeShot(shotId: string): void {
    this.ensureProject();
    const idx = this.currentProject!.shots.findIndex(s => s.id === shotId);
    if (idx === -1) {
      throw new Error(`Shot not found: ${shotId}`);
    }
    this.currentProject!.shots.splice(idx, 1);
    // Re-index order
    this.currentProject!.shots.forEach((s, i) => { s.order = i; });
    this.markDirty();
  }

  /**
   * Reorder shots by providing the shot IDs in the desired order.
   */
  reorderShots(shotIds: string[]): void {
    this.ensureProject();
    const shotMap = new Map<string, ProjectShot>();
    for (const s of this.currentProject!.shots) {
      shotMap.set(s.id, s);
    }

    const reordered: ProjectShot[] = [];
    for (const id of shotIds) {
      const shot = shotMap.get(id);
      if (shot) {
        shot.order = reordered.length;
        reordered.push(shot);
      }
    }

    // Append any shots not in the provided list (safety)
    for (const shot of this.currentProject!.shots) {
      if (!shotIds.includes(shot.id)) {
        shot.order = reordered.length;
        reordered.push(shot);
      }
    }

    this.currentProject!.shots = reordered;
    this.markDirty();
  }

  /**
   * Update an existing shot.
   */
  updateShot(shotId: string, updates: Partial<ProjectShot>): void {
    this.ensureProject();
    const shot = this.currentProject!.shots.find(s => s.id === shotId);
    if (!shot) {
      throw new Error(`Shot not found: ${shotId}`);
    }
    Object.assign(shot, updates);
    this.markDirty();
  }

  /**
   * Get a shot by ID.
   */
  getShot(shotId: string): ProjectShot | undefined {
    return this.currentProject?.shots.find(s => s.id === shotId);
  }

  /**
   * Get all shots in order.
   */
  getShots(): ProjectShot[] {
    return (this.currentProject?.shots ?? []).sort((a, b) => a.order - b.order);
  }

  // -----------------------------------------------------------------------
  // Asset management
  // -----------------------------------------------------------------------

  addAsset(type: 'characters', asset: CharacterAsset): void;
  addAsset(type: 'scenes', asset: SceneAsset): void;
  addAsset(type: 'props', asset: PropAsset): void;
  addAsset(type: 'audio', asset: AudioAsset): void;
  addAsset(type: string, asset: CharacterAsset | SceneAsset | PropAsset | AudioAsset): void {
    this.ensureProject();
    const manifest = this.currentProject!.assets;
    switch (type) {
      case 'characters':
        manifest.characters.push(asset as CharacterAsset);
        break;
      case 'scenes':
        manifest.scenes.push(asset as SceneAsset);
        break;
      case 'props':
        manifest.props.push(asset as PropAsset);
        break;
      case 'audio':
        manifest.audio.push(asset as AudioAsset);
        break;
      default:
        throw new Error(`Unknown asset type: ${type}`);
    }
    this.markDirty();
  }

  removeAsset(type: 'characters' | 'scenes' | 'props' | 'audio', assetId: string): void {
    this.ensureProject();
    const manifest = this.currentProject!.assets;
    switch (type) {
      case 'characters':
        manifest.characters = manifest.characters.filter(a => a.id !== assetId);
        break;
      case 'scenes':
        manifest.scenes = manifest.scenes.filter(a => a.id !== assetId);
        break;
      case 'props':
        manifest.props = manifest.props.filter(a => a.id !== assetId);
        break;
      case 'audio':
        manifest.audio = manifest.audio.filter(a => a.id !== assetId);
        break;
    }
    this.markDirty();
  }

  // -----------------------------------------------------------------------
  // Undo / Redo
  // -----------------------------------------------------------------------

  undo(): PandaProject | null {
    if (this.undoStack.length <= 1) return null;

    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    const prev = this.undoStack[this.undoStack.length - 1];
    this.currentProject = JSON.parse(prev);
    this.isDirty = true;
    return this.currentProject;
  }

  redo(): PandaProject | null {
    if (this.redoStack.length === 0) return null;

    const next = this.redoStack.pop()!;
    this.undoStack.push(next);

    this.currentProject = JSON.parse(next);
    this.isDirty = true;
    return this.currentProject;
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // -----------------------------------------------------------------------
  // State queries
  // -----------------------------------------------------------------------

  getCurrentProject(): PandaProject | null {
    return this.currentProject;
  }

  getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }

  getIsDirty(): boolean {
    return this.isDirty;
  }

  getRecentProjects(): RecentProjectEntry[] {
    return [...this.recentProjects];
  }

  setRecentProjects(entries: RecentProjectEntry[]): void {
    this.recentProjects = entries;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private ensureProject(): void {
    if (!this.currentProject) {
      throw new Error('No project is currently open');
    }
  }

  private markDirty(): void {
    this.isDirty = true;
    if (this.currentProject) {
      this.currentProject.updatedAt = new Date().toISOString();
    }
    this.pushUndoState();
  }

  private pushUndoState(): void {
    if (!this.currentProject) return;
    const snapshot = JSON.stringify(this.currentProject);
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    // Clear redo stack on new change
    this.redoStack = [];
  }

  private addRecentProject(name: string, filePath: string): void {
    // Remove existing entry for this path
    this.recentProjects = this.recentProjects.filter(e => e.filePath !== filePath);
    // Add to front
    this.recentProjects.unshift({
      name,
      filePath,
      lastOpened: new Date().toISOString(),
    });
    // Keep at most 10 entries
    if (this.recentProjects.length > 10) {
      this.recentProjects = this.recentProjects.slice(0, 10);
    }
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64);
  }

  private extractFilename(fullPath: string): string {
    const parts = fullPath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'unnamed';
  }
}
