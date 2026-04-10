/**
 * panda-shot-engine — Skeleton & Action Type Definitions
 */

import type { ActionCategory } from '../project/types';

// ---------------------------------------------------------------------------
// Bone State — transform of a single bone at a keyframe
// All fields optional to allow shorthand in action definitions
// ---------------------------------------------------------------------------

export interface BoneState {
  rotation?: number;     // radians
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
}

// ---------------------------------------------------------------------------
// Keyframe — a snapshot of all bone states at a given time
// ---------------------------------------------------------------------------

export interface ActionKeyframe {
  /** Time in seconds from action start */
  time: number;
  /** Bone name → BoneState */
  boneStates: Record<string, BoneState>;
  /** Easing function name (e.g. "ease-in-out") */
  easing?: string;
}

// ---------------------------------------------------------------------------
// Action Definition
// ---------------------------------------------------------------------------

export interface ActionDefinition {
  /** Unique action ID (e.g. "walk_right") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category for UI grouping */
  category?: ActionCategory;
  /** Searchable tags */
  tags?: string[];
  /** Description of the action */
  description?: string;
  /** Total duration in seconds */
  duration: number;
  /** Whether the action loops */
  loop: boolean;
  /** Keyframes */
  keyframes: ActionKeyframe[];
  /** Target skeleton this action was designed for */
  targetSkeleton?: string;
}

// ---------------------------------------------------------------------------
// Skeleton Definition — bone hierarchy
// ---------------------------------------------------------------------------

export interface BoneDefinition {
  id: string;
  name: string;
  parentId: string | null;
  defaultState: BoneState;
  length: number;
  zOrder: number;
}

export interface SkeletonDefinition {
  id: string;
  name: string;
  bones: BoneDefinition[];
}

// ---------------------------------------------------------------------------
// Built-in bone names
// ---------------------------------------------------------------------------

export const HUMANOID_BONES = [
  'root', 'torso', 'head',
  'upper_arm_l', 'lower_arm_l', 'hand_l',
  'upper_arm_r', 'lower_arm_r', 'hand_r',
  'upper_leg_l', 'lower_leg_l', 'foot_l',
  'upper_leg_r', 'lower_leg_r', 'foot_r',
] as const;

export type HumanoidBoneName = (typeof HUMANOID_BONES)[number];
