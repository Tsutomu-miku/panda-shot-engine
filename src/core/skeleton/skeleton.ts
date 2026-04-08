/**
 * panda-shot-engine — Enhanced Skeleton System
 *
 * Features:
 *  - SkeletonInstance class: manages one character's skeleton
 *  - Pre-defined standard panda skeleton tree (PANDA_SKELETON):
 *      root → spine → chest/hip
 *      chest → neck/arm_l/arm_r, neck → head
 *      hip → leg_l/leg_r
 *  - applyAction(actionName, time): compute current pose from keyframes
 *  - blendActions(action1, action2, weight): cross-fade between two actions
 *  - getWorldTransforms(): return all bone world-space transforms
 */

import type { Transform2D } from '../engine/types';
import { resolveEasing } from '../engine/easing';
import type {
  BoneDefinition,
  BoneState,
  SkeletonDefinition,
  ActionDefinition,
} from './types';
import { defaultBoneState } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// ---------------------------------------------------------------------------
// SkeletonSystem — stateless transform evaluator
// ---------------------------------------------------------------------------

export class SkeletonSystem {
  private boneMap: Map<string, BoneDefinition>;
  private definition: SkeletonDefinition;

  constructor(definition: SkeletonDefinition) {
    this.definition = definition;
    this.boneMap = new Map();
    for (const bone of definition.bones) {
      this.boneMap.set(bone.id, bone);
    }
  }

  // -----------------------------------------------------------------------
  // World transform for a single bone
  // -----------------------------------------------------------------------

  getBoneWorldTransform(boneId: string, boneStates: BoneState[]): Transform2D {
    const stateMap = new Map<string, BoneState>();
    for (const s of boneStates) {
      stateMap.set(s.boneId, s);
    }

    // Build chain from root → target
    const chain: BoneDefinition[] = [];
    let current: BoneDefinition | undefined = this.boneMap.get(boneId);
    while (current) {
      chain.unshift(current);
      current = current.parent ? this.boneMap.get(current.parent) : undefined;
    }

    // Accumulate transforms
    let worldX = 0;
    let worldY = 0;
    let worldRotation = 0;
    let worldScaleX = 1;
    let worldScaleY = 1;

    for (const bone of chain) {
      const state = stateMap.get(bone.id);

      const localX = bone.offsetX + (state?.translateX ?? 0);
      const localY = bone.offsetY + (state?.translateY ?? 0);

      const cos = Math.cos(worldRotation);
      const sin = Math.sin(worldRotation);
      worldX += (localX * cos - localY * sin) * worldScaleX;
      worldY += (localX * sin + localY * cos) * worldScaleY;

      worldRotation += bone.rotation + (state?.rotation ?? 0);
      worldScaleX *= state?.scaleX ?? 1;
      worldScaleY *= state?.scaleY ?? 1;
    }

    const targetBone = this.boneMap.get(boneId)!;
    return {
      x: worldX,
      y: worldY,
      rotation: worldRotation,
      scaleX: worldScaleX,
      scaleY: worldScaleY,
      pivotX: targetBone.pivotX,
      pivotY: targetBone.pivotY,
    };
  }

  // -----------------------------------------------------------------------
  // Apply an action at a given normalised progress
  // -----------------------------------------------------------------------

  applyAction(action: ActionDefinition, progress: number): BoneState[] {
    const easingFn = resolveEasing(action.easing);

    let t = action.loop ? progress % 1 : clamp01(progress);
    if (t < 0) t += 1;

    const kfs = action.keyframes;
    if (kfs.length === 0) {
      return this.definition.bones.map((b) => defaultBoneState(b.id));
    }

    // Single keyframe — just use it
    if (kfs.length === 1) {
      return this.definition.bones.map((bone) => {
        const kfState = kfs[0].boneStates[bone.id];
        if (!kfState) return defaultBoneState(bone.id);
        return {
          boneId: bone.id,
          rotation: kfState.rotation ?? 0,
          translateX: kfState.translateX ?? 0,
          translateY: kfState.translateY ?? 0,
          scaleX: kfState.scaleX ?? 1,
          scaleY: kfState.scaleY ?? 1,
        };
      });
    }

    // Find the two surrounding keyframes
    let prevKf = kfs[0];
    let nextKf = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (t >= kfs[i].time && t <= kfs[i + 1].time) {
        prevKf = kfs[i];
        nextKf = kfs[i + 1];
        break;
      }
    }

    // Segment progress
    const segLen = nextKf.time - prevKf.time;
    const segProgress = segLen > 0 ? (t - prevKf.time) / segLen : 0;
    const easedProgress = easingFn(clamp01(segProgress));

    // Interpolate each bone
    return this.definition.bones.map((bone) => {
      const prevState = prevKf.boneStates[bone.id];
      const nextState = nextKf.boneStates[bone.id];

      if (!prevState && !nextState) {
        return defaultBoneState(bone.id);
      }

      return {
        boneId: bone.id,
        rotation: lerp(
          prevState?.rotation ?? 0,
          nextState?.rotation ?? 0,
          easedProgress,
        ),
        translateX: lerp(
          prevState?.translateX ?? 0,
          nextState?.translateX ?? 0,
          easedProgress,
        ),
        translateY: lerp(
          prevState?.translateY ?? 0,
          nextState?.translateY ?? 0,
          easedProgress,
        ),
        scaleX: lerp(
          prevState?.scaleX ?? 1,
          nextState?.scaleX ?? 1,
          easedProgress,
        ),
        scaleY: lerp(
          prevState?.scaleY ?? 1,
          nextState?.scaleY ?? 1,
          easedProgress,
        ),
      };
    });
  }

  // -----------------------------------------------------------------------
  // Blend two sets of bone states
  // -----------------------------------------------------------------------

  blendBoneStates(statesA: BoneState[], statesB: BoneState[], weight: number): BoneState[] {
    const w = clamp01(weight);
    const mapA = new Map<string, BoneState>();
    const mapB = new Map<string, BoneState>();
    for (const s of statesA) mapA.set(s.boneId, s);
    for (const s of statesB) mapB.set(s.boneId, s);

    return this.definition.bones.map((bone) => {
      const a = mapA.get(bone.id) ?? defaultBoneState(bone.id);
      const b = mapB.get(bone.id) ?? defaultBoneState(bone.id);
      return {
        boneId: bone.id,
        rotation: lerp(a.rotation, b.rotation, w),
        translateX: lerp(a.translateX, b.translateX, w),
        translateY: lerp(a.translateY, b.translateY, w),
        scaleX: lerp(a.scaleX, b.scaleX, w),
        scaleY: lerp(a.scaleY, b.scaleY, w),
      };
    });
  }

  // -----------------------------------------------------------------------
  // Get all world transforms
  // -----------------------------------------------------------------------

  getWorldTransforms(boneStates: BoneState[]): Map<string, Transform2D> {
    const result = new Map<string, Transform2D>();
    for (const bone of this.definition.bones) {
      result.set(bone.id, this.getBoneWorldTransform(bone.id, boneStates));
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // Default skeleton
  // -----------------------------------------------------------------------

  static getDefaultSkeleton(): SkeletonDefinition {
    return PANDA_SKELETON;
  }

  getDefinition(): SkeletonDefinition {
    return this.definition;
  }
}

// ---------------------------------------------------------------------------
// SkeletonInstance — stateful per-character skeleton manager
// ---------------------------------------------------------------------------

export class SkeletonInstance {
  private system: SkeletonSystem;
  private definition: SkeletonDefinition;
  private currentBoneStates: BoneState[];

  // Current action state
  private currentActionId: string | null = null;
  private currentActionDef: ActionDefinition | null = null;
  private actionStartTime: number = 0;
  private actionDuration: number = 0;

  // Blending state
  private blendFromStates: BoneState[] | null = null;
  private blendWeight: number = 0;
  private blendDuration: number = 0;
  private blendStartTime: number = 0;

  constructor(definition?: SkeletonDefinition) {
    this.definition = definition ?? PANDA_SKELETON;
    this.system = new SkeletonSystem(this.definition);
    this.currentBoneStates = this.definition.bones.map(b => defaultBoneState(b.id));
  }

  /**
   * Start playing an action by name, with optional blend-in duration.
   */
  applyAction(actionName: string, time: number, blendInDuration: number = 0.15): void {
    const { getAction } = require('../skeleton/action-library');
    const actionDef: ActionDefinition = getAction(actionName);

    if (blendInDuration > 0 && this.currentBoneStates.length > 0) {
      this.blendFromStates = [...this.currentBoneStates];
      this.blendDuration = blendInDuration;
      this.blendStartTime = time;
      this.blendWeight = 0;
    } else {
      this.blendFromStates = null;
    }

    this.currentActionId = actionName;
    this.currentActionDef = actionDef;
    this.actionStartTime = time;
    this.actionDuration = actionDef.duration;
  }

  /**
   * Update the skeleton at the given time, computing the current pose.
   */
  update(time: number): BoneState[] {
    if (!this.currentActionDef) {
      // No action — return idle
      const { getAction } = require('../skeleton/action-library');
      const idleDef: ActionDefinition = getAction('idle');
      const idleProgress = (time % idleDef.duration) / idleDef.duration;
      this.currentBoneStates = this.system.applyAction(idleDef, idleProgress);
      return this.currentBoneStates;
    }

    const elapsed = time - this.actionStartTime;
    const progress = this.actionDuration > 0
      ? elapsed / this.actionDuration
      : 1;

    const actionStates = this.system.applyAction(this.currentActionDef, progress);

    // Apply blending if active
    if (this.blendFromStates && this.blendDuration > 0) {
      const blendElapsed = time - this.blendStartTime;
      this.blendWeight = clamp01(blendElapsed / this.blendDuration);

      if (this.blendWeight >= 1) {
        // Blend complete
        this.currentBoneStates = actionStates;
        this.blendFromStates = null;
      } else {
        this.currentBoneStates = this.system.blendBoneStates(
          this.blendFromStates,
          actionStates,
          this.blendWeight,
        );
      }
    } else {
      this.currentBoneStates = actionStates;
    }

    // If non-looping action is complete, clear it
    if (!this.currentActionDef.loop && progress >= 1) {
      this.currentActionId = null;
      this.currentActionDef = null;
    }

    return this.currentBoneStates;
  }

  /**
   * Blend between two named actions with a given weight (0 = action1, 1 = action2).
   */
  blendActions(action1Name: string, action2Name: string, weight: number, time: number): BoneState[] {
    const { getAction } = require('../skeleton/action-library');
    const def1: ActionDefinition = getAction(action1Name);
    const def2: ActionDefinition = getAction(action2Name);

    const progress1 = def1.loop
      ? (time % def1.duration) / def1.duration
      : clamp01(time / def1.duration);
    const progress2 = def2.loop
      ? (time % def2.duration) / def2.duration
      : clamp01(time / def2.duration);

    const states1 = this.system.applyAction(def1, progress1);
    const states2 = this.system.applyAction(def2, progress2);

    this.currentBoneStates = this.system.blendBoneStates(states1, states2, weight);
    return this.currentBoneStates;
  }

  /**
   * Get the world-space transform for all bones.
   */
  getWorldTransforms(): Map<string, Transform2D> {
    return this.system.getWorldTransforms(this.currentBoneStates);
  }

  /**
   * Get the current bone states.
   */
  getBoneStates(): BoneState[] {
    return this.currentBoneStates;
  }

  /**
   * Get current action id.
   */
  getCurrentActionId(): string | null {
    return this.currentActionId;
  }

  /**
   * Get the underlying system.
   */
  getSystem(): SkeletonSystem {
    return this.system;
  }
}

// ---------------------------------------------------------------------------
// PANDA_SKELETON — Standard panda character skeleton
//
//   root
//     └─ spine
//          ├─ chest
//          │    ├─ neck
//          │    │    └─ head
//          │    ├─ upper_arm_l → forearm_l → hand_l
//          │    └─ upper_arm_r → forearm_r → hand_r
//          └─ hip
//               ├─ upper_leg_l → lower_leg_l → foot_l
//               └─ upper_leg_r → lower_leg_r → foot_r
// ---------------------------------------------------------------------------

export const PANDA_SKELETON: SkeletonDefinition = {
  id: 'panda_default',
  name: 'Default Panda Character',
  bones: [
    // Root (pelvis anchor)
    {
      id: 'root',
      parent: null,
      offsetX: 0,
      offsetY: 0,
      length: 0,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
    },
    // Spine
    {
      id: 'spine',
      parent: 'root',
      offsetX: 0,
      offsetY: -20,
      length: 40,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
    },
    // Chest
    {
      id: 'chest',
      parent: 'spine',
      offsetX: 0,
      offsetY: -40,
      length: 30,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
      partImage: 'chest',
    },
    // Neck
    {
      id: 'neck',
      parent: 'chest',
      offsetX: 0,
      offsetY: -30,
      length: 15,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
    },
    // Head
    {
      id: 'head',
      parent: 'neck',
      offsetX: 0,
      offsetY: -15,
      length: 40,
      pivotX: 0,
      pivotY: 20,
      rotation: 0,
      partImage: 'head',
    },
    // Left arm chain
    {
      id: 'upper_arm_l',
      parent: 'chest',
      offsetX: -25,
      offsetY: -5,
      length: 30,
      pivotX: 0,
      pivotY: 0,
      rotation: deg2rad(10),
      partImage: 'upper_arm',
    },
    {
      id: 'forearm_l',
      parent: 'upper_arm_l',
      offsetX: 0,
      offsetY: 30,
      length: 28,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
      partImage: 'forearm',
    },
    {
      id: 'hand_l',
      parent: 'forearm_l',
      offsetX: 0,
      offsetY: 28,
      length: 12,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
      partImage: 'hand',
    },
    // Right arm chain
    {
      id: 'upper_arm_r',
      parent: 'chest',
      offsetX: 25,
      offsetY: -5,
      length: 30,
      pivotX: 0,
      pivotY: 0,
      rotation: deg2rad(-10),
      partImage: 'upper_arm',
    },
    {
      id: 'forearm_r',
      parent: 'upper_arm_r',
      offsetX: 0,
      offsetY: 30,
      length: 28,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
      partImage: 'forearm',
    },
    {
      id: 'hand_r',
      parent: 'forearm_r',
      offsetX: 0,
      offsetY: 28,
      length: 12,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
      partImage: 'hand',
    },
    // Hip
    {
      id: 'hip',
      parent: 'spine',
      offsetX: 0,
      offsetY: 10,
      length: 20,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
      partImage: 'hip',
    },
    // Left leg chain
    {
      id: 'upper_leg_l',
      parent: 'hip',
      offsetX: -12,
      offsetY: 20,
      length: 35,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
      partImage: 'upper_leg',
    },
    {
      id: 'lower_leg_l',
      parent: 'upper_leg_l',
      offsetX: 0,
      offsetY: 35,
      length: 32,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
      partImage: 'lower_leg',
    },
    {
      id: 'foot_l',
      parent: 'lower_leg_l',
      offsetX: 0,
      offsetY: 32,
      length: 15,
      pivotX: 0,
      pivotY: 0,
      rotation: deg2rad(90),
      partImage: 'foot',
    },
    // Right leg chain
    {
      id: 'upper_leg_r',
      parent: 'hip',
      offsetX: 12,
      offsetY: 20,
      length: 35,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
      partImage: 'upper_leg',
    },
    {
      id: 'lower_leg_r',
      parent: 'upper_leg_r',
      offsetX: 0,
      offsetY: 35,
      length: 32,
      pivotX: 0,
      pivotY: 0,
      rotation: 0,
      partImage: 'lower_leg',
    },
    {
      id: 'foot_r',
      parent: 'lower_leg_r',
      offsetX: 0,
      offsetY: 32,
      length: 15,
      pivotX: 0,
      pivotY: 0,
      rotation: deg2rad(90),
      partImage: 'foot',
    },
  ],
};
