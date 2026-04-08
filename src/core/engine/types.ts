/**
 * panda-shot-engine — 2D Rendering Engine Types
 *
 * Core type definitions for the rendering pipeline, layers, transforms,
 * and camera state used throughout the engine.
 */

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

export interface Transform2D {
  x: number;
  y: number;
  rotation: number; // radians
  scaleX: number;
  scaleY: number;
  pivotX: number;
  pivotY: number;
}

export function defaultTransform2D(): Transform2D {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    pivotX: 0,
    pivotY: 0,
  };
}

// ---------------------------------------------------------------------------
// Render Context
// ---------------------------------------------------------------------------

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  fps: number;
  currentFrame: number;
  totalFrames: number;
}

// ---------------------------------------------------------------------------
// Render Layer
// ---------------------------------------------------------------------------

export type LayerType = 'background' | 'character' | 'vfx' | 'ui';

export interface RenderLayer {
  id: string;
  type: LayerType;
  zIndex: number;
  visible: boolean;
  opacity: number;
  transform: Transform2D;
}

// ---------------------------------------------------------------------------
// Camera State
// ---------------------------------------------------------------------------

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotation: number; // radians
  shakeIntensity: number;
  shakeDecay: number;
}

export function defaultCameraState(): CameraState {
  return {
    x: 0,
    y: 0,
    zoom: 1,
    rotation: 0,
    shakeIntensity: 0,
    shakeDecay: 0.9,
  };
}

// ---------------------------------------------------------------------------
// Semantic positions (used by the Shot DSL / camera commands)
// ---------------------------------------------------------------------------

export type SemanticPosition =
  | 'left'
  | 'center'
  | 'right'
  | 'far_left'
  | 'far_right';

export type VerticalPosition = 'top' | 'middle' | 'bottom';

// ---------------------------------------------------------------------------
// Camera commands (subset — matches what the Shot DSL emits)
// ---------------------------------------------------------------------------

export type CameraAngle = 'wide' | 'medium' | 'close-up';

export interface CameraCommand {
  type: CameraAngle | 'pan' | 'shake' | 'zoom';
  target?: string; // character id or position
  position?: SemanticPosition;
  verticalPosition?: VerticalPosition;
  duration?: number; // seconds
  intensity?: number; // for shake
  zoomLevel?: number; // for explicit zoom
}

// ---------------------------------------------------------------------------
// VFX frame state
// ---------------------------------------------------------------------------

export interface VfxFrameState {
  type: string; // 'impact', 'sparkle', 'dust', etc.
  x: number;
  y: number;
  progress: number; // 0-1
  params: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Shot – lightweight representation consumed by the engine.
// Intentionally kept thin so the renderer doesn't depend on the
// full DSL compiler output.
// ---------------------------------------------------------------------------

export interface ShotCharacterAction {
  type: string; // action id — e.g. 'walk', 'punch', 'say'
  startTime: number; // seconds from shot start
  duration: number;
  params: Record<string, unknown>;
}

export interface ShotCharacter {
  id: string;
  name: string;
  position: SemanticPosition;
  verticalPosition?: VerticalPosition;
  facing: 'left' | 'right';
  scale: number;
  expression: string;
  actions: ShotCharacterAction[];
}

export interface Shot {
  id: string;
  duration: number; // seconds
  background?: string; // color or image url
  characters: ShotCharacter[];
  cameraCommands: { time: number; command: CameraCommand }[];
  sfx: { time: number; id: string }[];
}
