/**
 * panda-shot-engine — Project Type Definitions
 *
 * Complete type system for project management including project settings,
 * asset manifests, character assets, scenes, props, audio, and export options.
 */

// ---------------------------------------------------------------------------
// Expression set for a character
// ---------------------------------------------------------------------------

export interface ExpressionSet {
  /** Expression name, e.g. "happy", "angry" */
  name: string;
  /** Eye part image path */
  eyesImage?: string;
  /** Mouth part image path */
  mouthImage?: string;
  /** Optional eyebrow image path */
  eyebrowImage?: string;
  /** Optional blush/overlay image path */
  overlayImage?: string;
}

// ---------------------------------------------------------------------------
// Character Asset
// ---------------------------------------------------------------------------

export interface CharacterAsset {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Visual style identifier (e.g. "panda-default", "custom") */
  style: string;
  /** Part name → file path mapping (e.g. "head" → "./assets/chars/panda/head.png") */
  parts: Record<string, string>;
  /** Expression name → expression set (e.g. "happy" → {eyesImage, mouthImage}) */
  expressions: Record<string, ExpressionSet>;
  /** Skeleton type id (e.g. "panda_default") */
  skeletonType: string;
  /** Optional thumbnail path */
  thumbnail?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Scene Asset (background)
// ---------------------------------------------------------------------------

export interface SceneAsset {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** File path to the scene background image */
  filePath: string;
  /** Optional thumbnail */
  thumbnail?: string;
  /** Optional background color fallback */
  backgroundColor?: string;
  /** Scene dimensions hint */
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Prop Asset (items, weapons, etc.)
// ---------------------------------------------------------------------------

export interface PropAsset {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** File path to prop image */
  filePath: string;
  /** Which bone this prop attaches to (e.g. "hand_r") */
  attachBone?: string;
  /** Local offset from the attach bone */
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  /** Scale factor */
  scale?: number;
  /** Optional thumbnail */
  thumbnail?: string;
}

// ---------------------------------------------------------------------------
// Audio Asset
// ---------------------------------------------------------------------------

export interface AudioAsset {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** File path to audio file */
  filePath: string;
  /** Duration in seconds (cached after first load) */
  duration?: number;
  /** Audio type: bgm for background music, sfx for sound effects */
  audioType: 'bgm' | 'sfx';
  /** Default volume (0-1) */
  defaultVolume?: number;
}

// ---------------------------------------------------------------------------
// Asset Manifest — all assets in a project
// ---------------------------------------------------------------------------

export interface AssetManifest {
  characters: CharacterAsset[];
  scenes: SceneAsset[];
  props: PropAsset[];
  audio: AudioAsset[];
}

// ---------------------------------------------------------------------------
// Project Settings
// ---------------------------------------------------------------------------

export interface ProjectSettings {
  /** Output resolution */
  resolution: {
    width: number;
    height: number;
  };
  /** Frames per second */
  fps: number;
  /** Default background color */
  backgroundColor: string;
  /** Default transition type between shots */
  defaultTransition: string;
  /** Default transition duration */
  defaultTransitionDuration: number;
  /** Whether to auto-save */
  autoSave: boolean;
  /** Auto-save interval in seconds */
  autoSaveInterval: number;
}

// ---------------------------------------------------------------------------
// Shot reference (imported from dsl/types, re-exported here for convenience)
// ---------------------------------------------------------------------------

export interface ProjectShot {
  /** Shot ID */
  id: string;
  /** Duration in seconds */
  duration: number;
  /** DSL source text for this shot */
  dslSource: string;
  /** Optional notes / description */
  notes?: string;
  /** Order index */
  order: number;
  /** Thumbnail data URL or file path */
  thumbnail?: string;
}

// ---------------------------------------------------------------------------
// PandaProject — the root project structure
// ---------------------------------------------------------------------------

export interface PandaProject {
  /** File format version */
  version: string;
  /** Project name */
  name: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-updated timestamp */
  updatedAt: string;
  /** Project settings */
  settings: ProjectSettings;
  /** All project assets */
  assets: AssetManifest;
  /** Ordered list of shots */
  shots: ProjectShot[];
  /** Optional project-level metadata */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Defaults factory
// ---------------------------------------------------------------------------

export function createDefaultSettings(): ProjectSettings {
  return {
    resolution: { width: 960, height: 540 },
    fps: 24,
    backgroundColor: '#1e1e2e',
    defaultTransition: 'cut',
    defaultTransitionDuration: 0.5,
    autoSave: true,
    autoSaveInterval: 60,
  };
}

export function createEmptyAssetManifest(): AssetManifest {
  return {
    characters: [],
    scenes: [],
    props: [],
    audio: [],
  };
}

export function createNewProject(name: string): PandaProject {
  const now = new Date().toISOString();
  return {
    version: '1.0.0',
    name,
    createdAt: now,
    updatedAt: now,
    settings: createDefaultSettings(),
    assets: createEmptyAssetManifest(),
    shots: [],
  };
}

// ---------------------------------------------------------------------------
// Export options
// ---------------------------------------------------------------------------

export interface ExportOptions {
  /** Output format */
  format: 'png-sequence' | 'mp4' | 'webm' | 'gif';
  /** Frames per second */
  fps: number;
  /** Output resolution */
  width: number;
  height: number;
  /** Video quality (1-100, for lossy formats) */
  quality?: number;
  /** Output directory or file path */
  outputPath: string;
  /** Which shots to export (empty = all) */
  shotIds?: string[];
  /** Whether to include audio in video export */
  includeAudio?: boolean;
}

// ---------------------------------------------------------------------------
// Recent project entry (for the recent-projects list)
// ---------------------------------------------------------------------------

export interface RecentProjectEntry {
  /** Project name */
  name: string;
  /** Full file path */
  filePath: string;
  /** Last opened ISO timestamp */
  lastOpened: string;
  /** Optional thumbnail data URL */
  thumbnail?: string;
}
