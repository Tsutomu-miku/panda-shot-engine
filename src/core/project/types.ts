/**
 * panda-shot-engine — Project Type Definitions
 *
 * Complete type system for project management including project settings,
 * asset manifests, character assets, scenes, props, audio, and export options.
 */

// ---------------------------------------------------------------------------
// Action Categories
// ---------------------------------------------------------------------------

export type ActionCategory = 'movement' | 'combat' | 'emotion' | 'gesture' | 'idle' | 'custom';

export const ACTION_CATEGORIES: ActionCategory[] = [
  'movement', 'combat', 'emotion', 'gesture', 'idle', 'custom',
];

// ---------------------------------------------------------------------------
// Appearance System
// ---------------------------------------------------------------------------

export type AppearanceCategoryType = 'hair' | 'outfit' | 'accessory' | 'hat' | 'shoes' | 'weapon' | 'custom';

export const APPEARANCE_CATEGORIES: AppearanceCategoryType[] = [
  'hair', 'outfit', 'accessory', 'hat', 'shoes', 'weapon', 'custom',
];

export interface AppearanceItem {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Category */
  category: AppearanceCategoryType;
  /** Image path or data URI */
  image: string;
  /** Layer order (higher = on top) */
  zIndex: number;
  /** Optional tint color */
  tint?: string;
  /** Optional thumbnail */
  thumbnail?: string;
}

export interface AppearancePreset {
  /** Unique identifier */
  id: string;
  /** Preset display name */
  name: string;
  /** IDs of AppearanceItems in this preset */
  itemIds: string[];
}

// ---------------------------------------------------------------------------
// Expression set for a character
// ---------------------------------------------------------------------------

export interface ExpressionSet {
  /** Expression name, e.g. "happy", "angry" */
  name: string;
  /** Eye part image path / data URI */
  eyesImage?: string;
  /** Mouth part image path / data URI */
  mouthImage?: string;
  /** Optional eyebrow image path / data URI */
  eyebrowImage?: string;
  /** Optional blush/overlay image path / data URI */
  overlayImage?: string;
  /** Optional thumbnail */
  thumbnail?: string;
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
  /** Appearance items owned by this character */
  appearanceItems: AppearanceItem[];
  /** Named appearance presets */
  appearancePresets: AppearancePreset[];
  /** Currently active preset */
  activePresetId?: string;
  /** Optional thumbnail path */
  thumbnail?: string;
  /** Optional color for UI display */
  color?: string;
  /** Optional description */
  description?: string;
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
  /** File path to the scene background image or data URI */
  filePath: string;
  /** Optional thumbnail */
  thumbnail?: string;
  /** Optional background color fallback */
  backgroundColor?: string;
  /** Optional description */
  description?: string;
  /** Scene dimensions hint */
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Prop Asset (items, weapons, etc.)
// ---------------------------------------------------------------------------

export interface PropAsset {
  id: string;
  name: string;
  filePath: string;
  attachBone?: string;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  scale?: number;
  thumbnail?: string;
}

// ---------------------------------------------------------------------------
// Audio Asset
// ---------------------------------------------------------------------------

export interface AudioAsset {
  id: string;
  name: string;
  filePath: string;
  duration?: number;
  audioType: 'bgm' | 'sfx';
  defaultVolume?: number;
}

// ---------------------------------------------------------------------------
// Asset Manifest
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
  resolution: { width: number; height: number };
  fps: number;
  backgroundColor: string;
  defaultTransition: string;
  defaultTransitionDuration: number;
  autoSave: boolean;
  autoSaveInterval: number;
}

// ---------------------------------------------------------------------------
// Shot reference
// ---------------------------------------------------------------------------

export interface ProjectShot {
  id: string;
  duration: number;
  dslSource: string;
  notes?: string;
  order: number;
  thumbnail?: string;
}

// ---------------------------------------------------------------------------
// PandaProject
// ---------------------------------------------------------------------------

export interface PandaProject {
  version: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  assets: AssetManifest;
  shots: ProjectShot[];
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
  return { characters: [], scenes: [], props: [], audio: [] };
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
  format: 'png-sequence' | 'mp4' | 'webm' | 'gif';
  fps: number;
  width: number;
  height: number;
  quality?: number;
  outputPath: string;
  shotIds?: string[];
  includeAudio?: boolean;
}

export interface RecentProjectEntry {
  name: string;
  filePath: string;
  lastOpened: string;
  thumbnail?: string;
}
