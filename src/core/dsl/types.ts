// ============================================================
// panda-shot-engine — Scene DSL Type System
// ============================================================

// ─── Position System ────────────────────────────────────────

export type SemanticPosition =
  | 'far-left'
  | 'left-third'
  | 'left'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'right'
  | 'right-third'
  | 'far-right';

export type VerticalPosition = 'top' | 'middle' | 'bottom';

export interface Position {
  semantic?: SemanticPosition;
  vertical?: VerticalPosition;
  x?: number;
  y?: number;
}

// ─── Camera System ──────────────────────────────────────────

export type CameraType = 'wide' | 'medium' | 'close-up' | 'extreme-close-up';

export type CameraMotion =
  | 'pan-left'
  | 'pan-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'shake'
  | 'dutch-angle';

export interface CameraCommand {
  type: 'camera';
  cameraType: CameraType;
  target?: string;
  motion?: CameraMotion;
  duration?: number;
  intensity?: number;
  angle?: number;
}

// ─── Character Commands ─────────────────────────────────────

export type FacingDirection = 'left' | 'right';

export interface PlaceCommand {
  type: 'place';
  character: string;
  position: Position;
  facing: FacingDirection;
  scale?: number;
}

export interface ActionCommand {
  type: 'action';
  character: string;
  action: string;
  target?: string;
}

export interface ExpressionCommand {
  type: 'expression';
  character: string;
  expression: string;
}

export interface SayCommand {
  type: 'say';
  character: string;
  text: string;
  voice?: string;
}

export interface MoveCommand {
  type: 'move';
  character: string;
  to: Position;
  duration: number;
}

export interface EnterCommand {
  type: 'enter';
  character: string;
  from: Position;
  to: Position;
  facing: FacingDirection;
  action?: string;
}

// ─── Effect Commands ────────────────────────────────────────

export interface SfxCommand {
  type: 'sfx';
  sound: string;
}

export interface VfxCommand {
  type: 'vfx';
  effect: string;
  position?: Position | string;
  target?: string;
}

export interface BgmCommand {
  type: 'bgm';
  track: string;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
}

// ─── Transitions ────────────────────────────────────────────

export type TransitionType =
  | 'cut'
  | 'fade-black'
  | 'fade-white'
  | 'dissolve'
  | 'wipe-left'
  | 'wipe-right';

export interface Transition {
  type: TransitionType;
  duration?: number;
}

// ─── Unified Command Type ───────────────────────────────────

export type Command =
  | CameraCommand
  | PlaceCommand
  | ActionCommand
  | ExpressionCommand
  | SayCommand
  | MoveCommand
  | EnterCommand
  | SfxCommand
  | VfxCommand
  | BgmCommand;

// ─── Timeline ───────────────────────────────────────────────

export interface TimelineEvent {
  time: number;
  commands: Command[];
}

// ─── Shot (Minimal Unit) ────────────────────────────────────

export interface Shot {
  id: string;
  duration: number;
  set: string;
  bgm?: BgmCommand;
  placements: PlaceCommand[];
  timeline: TimelineEvent[];
  transition: Transition;
}

// ─── Asset Library ──────────────────────────────────────────

export interface AssetRef {
  id: string;
  path: string;
  assetType: 'character' | 'background' | 'sound' | 'music' | 'vfx';
}

export interface AssetLibrary {
  characters: Record<string, AssetRef>;
  backgrounds: Record<string, AssetRef>;
  sounds: Record<string, AssetRef>;
  music: Record<string, AssetRef>;
  vfx: Record<string, AssetRef>;
}

// ─── Project ────────────────────────────────────────────────

export interface Project {
  name: string;
  shots: Shot[];
  assets: AssetLibrary;
}

// ─── Diagnostics ────────────────────────────────────────────

export type DiagnosticSeverity = 'error' | 'warning';

export interface DiagnosticMessage {
  line: number;
  column: number;
  message: string;
  severity: DiagnosticSeverity;
}

export interface ValidationResult {
  valid: boolean;
  warnings: DiagnosticMessage[];
  errors: DiagnosticMessage[];
}

// ─── Token Types (for tokenizer) ────────────────────────────

export type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'UNIT'
  | 'COLON'
  | 'ARROW'
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// ─── Constants ──────────────────────────────────────────────

export const KEYWORDS = new Set([
  'shot', 'duration', 'set', 'bgm', 'place', 'at', 'facing',
  'scale', 'camera', 'expression', 'action', 'target', 'say',
  'voice', 'move', 'to', 'enter-from', 'from', 'sfx', 'vfx',
  'transition', 'volume', 'fade-in', 'fade-out',
]);

export const SEMANTIC_POSITIONS = new Set<string>([
  'far-left', 'left-third', 'left', 'center-left', 'center',
  'center-right', 'right', 'right-third', 'far-right',
]);

export const VERTICAL_POSITIONS = new Set<string>([
  'top', 'middle', 'bottom',
]);

export const CAMERA_TYPES = new Set<string>([
  'wide', 'medium', 'close-up', 'extreme-close-up',
]);

export const CAMERA_MOTIONS = new Set<string>([
  'pan-left', 'pan-right', 'zoom-in', 'zoom-out', 'shake', 'dutch-angle',
]);

export const TRANSITION_TYPES = new Set<string>([
  'cut', 'fade-black', 'fade-white', 'dissolve', 'wipe-left', 'wipe-right',
]);

export const FACING_DIRECTIONS = new Set<string>(['left', 'right']);

export const UNIT_SUFFIXES = new Set(['s', 'ms', 'deg', 'px', '%']);
