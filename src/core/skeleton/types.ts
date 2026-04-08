/**
 * panda-shot-engine — Skeleton System Types
 *
 * Type definitions for the hierarchical bone system, skeleton definitions,
 * per-frame bone state, action keyframes, and action definitions.
 */

// ---------------------------------------------------------------------------
// Bone Definition (static / structural)
// ---------------------------------------------------------------------------

export interface BoneDefinition {
  /** Unique identifier within the skeleton, e.g. "spine", "arm_l". */
  id: string;
  /** Parent bone id. `null` for the root bone. */
  parent: string | null;
  /** Local offset from the parent's tail / pivot. */
  offsetX: number;
  offsetY: number;
  /** Visual length of the bone (pixels in design space). */
  length: number;
  /** Rotation pivot relative to the bone's local origin. */
  pivotX: number;
  pivotY: number;
  /** Default resting rotation in radians. */
  rotation: number;
  /** Optional image path for the body-part sprite bound to this bone. */
  partImage?: string;
}

// ---------------------------------------------------------------------------
// Skeleton Definition
// ---------------------------------------------------------------------------

export interface SkeletonDefinition {
  id: string;
  name: string;
  bones: BoneDefinition[];
}

// ---------------------------------------------------------------------------
// Runtime Bone State (per-frame)
// ---------------------------------------------------------------------------

export interface BoneState {
  boneId: string;
  /** Additional rotation on top of the default (radians). */
  rotation: number;
  /** Translation offset added to the bone's local position. */
  translateX: number;
  translateY: number;
  /** Scale factors applied in local space. */
  scaleX: number;
  scaleY: number;
}

export function defaultBoneState(boneId: string): BoneState {
  return {
    boneId,
    rotation: 0,
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

// ---------------------------------------------------------------------------
// Action Keyframe
// ---------------------------------------------------------------------------

/**
 * A single keyframe within an action clip.
 *
 * `time` is normalised to [0, 1] where 0 = action start, 1 = action end.
 * `boneStates` is a sparse map — only the bones that differ from default
 * need to be specified.
 */
export interface ActionKeyframe {
  time: number;
  boneStates: Partial<Record<string, Partial<BoneState>>>;
}

// ---------------------------------------------------------------------------
// Action Definition
// ---------------------------------------------------------------------------

export interface ActionDefinition {
  /** Unique identifier, e.g. "walk", "punch". */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Duration of one cycle in seconds. */
  duration: number;
  /** Whether the action loops. */
  loop: boolean;
  /** Ordered keyframes (must be sorted by `time` ascending). */
  keyframes: ActionKeyframe[];
  /** Name of the easing function applied between keyframes. */
  easing: string;
}
