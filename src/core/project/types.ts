/**
 * Core Project Types — Image-based character & expression system
 * 
 * Key concepts:
 * - Characters are composed of uploadable image parts (head, body, arms, etc.)
 * - Expressions work by replacing facial sticker images on the character
 * - This is the SINGLE source of truth for character/expression types
 */

// ─── Expression System ──────────────────────────────────────
/** An expression set defines the facial sticker images to overlay on a character */
export interface ExpressionSet {
  id: string;
  name: string;
  /** Eyes sticker image (data URL or asset path) */
  eyesImage?: string;
  /** Mouth sticker image */
  mouthImage?: string;
  /** Eyebrow sticker image */
  eyebrowImage?: string;
  /** Full-face overlay (e.g. blush, sweat drops, anger marks) */
  overlayImage?: string;
  /** Optional thumbnail preview of the combined expression */
  thumbnail?: string;
}

// ─── Character System ───────────────────────────────────────
/** A character asset with image-based body parts and expression sticker sets */
export interface CharacterAsset {
  id: string;
  name: string;
  /** Visual style category */
  style: 'humanoid' | 'beast' | 'chibi' | 'custom';
  /** 
   * Image parts that compose the character body.
   * Keys are part names (e.g. "head", "body", "left_arm", "right_arm", "legs")
   * Values are data URLs or asset paths to the image files.
   */
  parts: Record<string, string>;
  /**
   * Named expression sets. Each expression replaces facial stickers on the character.
   * Key is the expression ID (e.g. "happy", "angry", "surprised")
   */
  expressions: Record<string, ExpressionSet>;
  /** Which skeleton template to use for rigging */
  skeletonType: string;
  /** Character thumbnail preview (data URL or asset path) */
  thumbnail?: string;
  /** Text description for AI/DSL reference */
  description?: string;
}

// ─── Scene System ───────────────────────────────────────────
export interface SceneAsset {
  id: string;
  name: string;
  /** Background image (data URL or asset path), if provided overrides gradient */
  backgroundImage?: string;
  /** Fallback background color */
  color: string;
  gradientStart: string;
  gradientEnd: string;
  description: string;
  /** Vertical position of the floor line (0-1, 0=top, 1=bottom) */
  floorY: number;
}

// ─── DSL Shot ───────────────────────────────────────────────
export interface DslShot {
  id: string;
  label: string;
  dsl: string;
  /** Duration in seconds for this shot */
  duration?: number;
}

// ─── Project Root ───────────────────────────────────────────
export interface PandaProject {
  name: string;
  shots: DslShot[];
  characters: CharacterAsset[];
  scenes: SceneAsset[];
  customActions: import('../skeleton/types').ActionDefinition[];
}

// ─── Standard character parts definition ────────────────────
export const STANDARD_PARTS = [
  { key: 'head', label: 'Head', description: 'Character head/face base image' },
  { key: 'body', label: 'Body', description: 'Torso/body image' },
  { key: 'left_arm', label: 'Left Arm', description: 'Left arm image' },
  { key: 'right_arm', label: 'Right Arm', description: 'Right arm image' },
  { key: 'left_leg', label: 'Left Leg', description: 'Left leg image' },
  { key: 'right_leg', label: 'Right Leg', description: 'Right leg image' },
] as const;

/** Standard expression sticker slots */
export const EXPRESSION_SLOTS = [
  { key: 'eyesImage', label: 'Eyes', description: 'Eye sticker overlay' },
  { key: 'mouthImage', label: 'Mouth', description: 'Mouth sticker overlay' },
  { key: 'eyebrowImage', label: 'Eyebrows', description: 'Eyebrow sticker overlay' },
  { key: 'overlayImage', label: 'Overlay', description: 'Full-face overlay (blush, sweat, etc.)' },
] as const;
