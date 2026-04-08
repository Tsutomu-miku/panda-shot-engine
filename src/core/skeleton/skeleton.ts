/**
 * panda-shot-engine — Skeleton System
 *
 * Implements hierarchical bone transforms, action interpolation, and provides
 * a default panda-head character skeleton.
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

/** Linearly interpolate between two numbers. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// SkeletonSystem
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

  /**
   * Recursively compute the world-space transform of the given bone,
   * taking into account the provided per-frame bone states.
   */
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

      // Local offsets + any runtime translation
      const localX = bone.offsetX + (state?.translateX ?? 0);
      const localY = bone.offsetY + (state?.translateY ?? 0);

      // Rotate local offset by accumulated parent rotation
      const cos = Math.cos(worldRotation);
      const sin = Math.sin(worldRotation);
      worldX += (localX * cos - localY * sin) * worldScaleX;
      worldY += (localX * sin + localY * cos) * worldScaleY;

      // Accumulate rotation (default + runtime)
      worldRotation += bone.rotation + (state?.rotation ?? 0);

      // Accumulate scale
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
  // Apply an action at a given progress
  // -----------------------------------------------------------------------

  /**
   * Evaluate all bone states for an action at the given normalised progress
   * (0 – 1). Keyframes are interpolated using the action's declared easing.
   */
  applyAction(action: ActionDefinition, progress: number): BoneState[] {
    const easingFn = resolveEasing(action.easing);

    // If looping, wrap progress
    let t = action.loop ? progress % 1 : Math.min(progress, 1);
    if (t < 0) t += 1;

    // Find the two surrounding keyframes
    const kfs = action.keyframes;
    if (kfs.length === 0) {
      return this.definition.bones.map((b) => defaultBoneState(b.id));
    }

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
    const easedProgress = easingFn(segProgress);

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
  // Default panda-head skeleton
  // -----------------------------------------------------------------------

  /**
   * Returns a default bipedal panda-head character skeleton:
   *
   *   root
   *     └─ spine
   *          ├─ chest
   *          │    ├─ neck
   *          │    │    └─ head
   *          │    ├─ arm_l (upper_arm_l → forearm_l → hand_l)
   *          │    └─ arm_r (upper_arm_r → forearm_r → hand_r)
   *          └─ hip
   *               ├─ leg_l (upper_leg_l → lower_leg_l → foot_l)
   *               └─ leg_r (upper_leg_r → lower_leg_r → foot_r)
   */
  static getDefaultSkeleton(): SkeletonDefinition {
    const bones: BoneDefinition[] = [
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
      // Head (panda head)
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
      // ---- Left arm chain ----
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
      // ---- Right arm chain ----
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
      // ---- Hip ----
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
      // ---- Left leg chain ----
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
      // ---- Right leg chain ----
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
    ];

    return {
      id: 'panda_default',
      name: 'Default Panda Character',
      bones,
    };
  }

  /** Convenience — returns the underlying definition. */
  getDefinition(): SkeletonDefinition {
    return this.definition;
  }
}
