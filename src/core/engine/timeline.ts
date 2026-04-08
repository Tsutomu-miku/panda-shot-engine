/**
 * panda-shot-engine — Timeline Engine
 *
 * Evaluates the complete state of a Shot at any given frame, producing a
 * `FrameState` that the renderer can consume directly.
 */

import type {
  CameraState,
  Shot,
  ShotCharacter,
  ShotCharacterAction,
  VfxFrameState,
  SemanticPosition,
  VerticalPosition,
} from './types';
import { defaultCameraState } from './types';
import { CameraSystem } from './camera';
import { SkeletonSystem } from '../skeleton/skeleton';
import { getAction } from '../skeleton/action-library';
import type { BoneState, SkeletonDefinition } from '../skeleton/types';
import { resolveEasing } from './easing';

// ---------------------------------------------------------------------------
// Frame state types
// ---------------------------------------------------------------------------

export interface CharacterFrameState {
  id: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  scale: number;
  expression: string;
  currentAction: string | null;
  actionProgress: number;
  boneStates: BoneState[];
}

export interface FrameState {
  camera: CameraState;
  characters: CharacterFrameState[];
  activeSubtitle: { character: string; text: string } | null;
  activeSfx: string[];
  activeVfx: VfxFrameState[];
}

// ---------------------------------------------------------------------------
// TimelineEngine
// ---------------------------------------------------------------------------

export class TimelineEngine {
  private shot: Shot;
  private fps: number;
  private totalFrames: number;
  private cameraSys: CameraSystem;
  private skeletonSys: SkeletonSystem;
  private skeletonDef: SkeletonDefinition;

  constructor(
    shot: Shot,
    fps: number,
    canvasWidth: number = 960,
    canvasHeight: number = 540,
  ) {
    this.shot = shot;
    this.fps = fps;
    this.totalFrames = Math.ceil(shot.duration * fps);
    this.cameraSys = new CameraSystem(canvasWidth, canvasHeight);
    this.skeletonDef = SkeletonSystem.getDefaultSkeleton();
    this.skeletonSys = new SkeletonSystem(this.skeletonDef);
  }

  /** Total number of frames for this shot. */
  getTotalFrames(): number {
    return this.totalFrames;
  }

  /** Convert a frame index to a time in seconds. */
  frameToTime(frame: number): number {
    return frame / this.fps;
  }

  // -----------------------------------------------------------------------
  // Main entry point — compute full state for a frame
  // -----------------------------------------------------------------------

  getStateAtFrame(frame: number): FrameState {
    const time = this.frameToTime(frame);

    return {
      camera: this.computeCamera(time),
      characters: this.computeCharacters(time),
      activeSubtitle: this.computeSubtitle(time),
      activeSfx: this.computeSfx(time),
      activeVfx: this.computeVfx(time),
    };
  }

  // -----------------------------------------------------------------------
  // Camera
  // -----------------------------------------------------------------------

  private computeCamera(time: number): CameraState {
    let state = defaultCameraState();

    // Walk through camera commands that have started by `time`
    const cmds = this.shot.cameraCommands
      .filter((c) => c.time <= time)
      .sort((a, b) => a.time - b.time);

    for (const entry of cmds) {
      state = this.cameraSys.applyCommand(
        entry.command,
        entry.time,
        time,
        state,
      );
    }

    return state;
  }

  // -----------------------------------------------------------------------
  // Characters
  // -----------------------------------------------------------------------

  private computeCharacters(time: number): CharacterFrameState[] {
    return this.shot.characters.map((ch) =>
      this.computeSingleCharacter(ch, time),
    );
  }

  private computeSingleCharacter(
    ch: ShotCharacter,
    time: number,
  ): CharacterFrameState {
    // Base position from semantic position
    const basePos = this.cameraSys.resolveSemanticPosition(
      ch.position,
      ch.verticalPosition ?? 'bottom',
    );

    // Find the currently active action (if any)
    let currentAction: ShotCharacterAction | null = null;
    for (const action of ch.actions) {
      if (time >= action.startTime && time < action.startTime + action.duration) {
        currentAction = action;
        break;
      }
    }

    // Compute action progress and bone states
    let boneStates: BoneState[] = [];
    let actionProgress = 0;
    let actionId: string | null = null;

    if (currentAction) {
      actionId = currentAction.type;
      const elapsed = time - currentAction.startTime;
      actionProgress = currentAction.duration > 0
        ? elapsed / currentAction.duration
        : 1;

      // Attempt to apply the matching skeleton action
      if (actionId !== 'say' && actionId !== 'move') {
        const actionDef = getAction(actionId);
        boneStates = this.skeletonSys.applyAction(actionDef, actionProgress);
      } else {
        // For 'say' and 'move' we use the idle pose
        const idleAction = getAction('idle');
        boneStates = this.skeletonSys.applyAction(idleAction, actionProgress);
      }
    } else {
      // Default idle
      const idleAction = getAction('idle');
      const idleProgress = (time % idleAction.duration) / idleAction.duration;
      boneStates = this.skeletonSys.applyAction(idleAction, idleProgress);
    }

    // Compute position — if action is "move", interpolate position
    let x = basePos.x;
    let y = basePos.y;

    if (currentAction?.type === 'move') {
      const targetPos = currentAction.params['targetPosition'] as
        | SemanticPosition
        | undefined;
      const targetVert = currentAction.params['targetVertical'] as
        | VerticalPosition
        | undefined;
      if (targetPos) {
        const dest = this.cameraSys.resolveSemanticPosition(
          targetPos,
          targetVert ?? 'bottom',
        );
        x = this.interpolateValue(basePos.x, dest.x, actionProgress, 'easeInOut');
        y = this.interpolateValue(basePos.y, dest.y, actionProgress, 'easeInOut');
      }
    }

    // Expression — can be overridden by a 'say' action's params
    let expression = ch.expression;
    if (currentAction?.type === 'say' && currentAction.params['expression']) {
      expression = currentAction.params['expression'] as string;
    }

    return {
      id: ch.id,
      x,
      y,
      facing: ch.facing,
      scale: ch.scale,
      expression,
      currentAction: actionId,
      actionProgress,
      boneStates,
    };
  }

  // -----------------------------------------------------------------------
  // Subtitles / Dialogue
  // -----------------------------------------------------------------------

  private computeSubtitle(
    time: number,
  ): { character: string; text: string } | null {
    for (const ch of this.shot.characters) {
      for (const action of ch.actions) {
        if (
          action.type === 'say' &&
          time >= action.startTime &&
          time < action.startTime + action.duration
        ) {
          return {
            character: ch.name,
            text: (action.params['text'] as string) ?? '',
          };
        }
      }
    }
    return null;
  }

  // -----------------------------------------------------------------------
  // SFX
  // -----------------------------------------------------------------------

  private computeSfx(time: number): string[] {
    // SFX events are instantaneous — we consider them "active" for 0.3s
    const SFX_DURATION = 0.3;
    return this.shot.sfx
      .filter((s) => time >= s.time && time < s.time + SFX_DURATION)
      .map((s) => s.id);
  }

  // -----------------------------------------------------------------------
  // VFX
  // -----------------------------------------------------------------------

  private computeVfx(time: number): VfxFrameState[] {
    const vfxList: VfxFrameState[] = [];

    for (const ch of this.shot.characters) {
      for (const action of ch.actions) {
        // Generate VFX for impact-like actions
        if (
          (action.type === 'punch' || action.type === 'sword_slash') &&
          time >= action.startTime &&
          time < action.startTime + action.duration
        ) {
          const progress =
            (time - action.startTime) / action.duration;
          const basePos = this.cameraSys.resolveSemanticPosition(
            ch.position,
            ch.verticalPosition ?? 'bottom',
          );

          vfxList.push({
            type: action.type === 'punch' ? 'impact' : 'slash',
            x: basePos.x + (ch.facing === 'right' ? 60 : -60),
            y: basePos.y - 40,
            progress,
            params: { intensity: 1 - progress },
          });
        }
      }
    }

    return vfxList;
  }

  // -----------------------------------------------------------------------
  // Interpolation utilities
  // -----------------------------------------------------------------------

  /**
   * Linear interpolation between two {x, y} positions.
   */
  interpolatePosition(
    from: { x: number; y: number },
    to: { x: number; y: number },
    progress: number,
  ): { x: number; y: number } {
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    };
  }

  /**
   * Interpolate a single numeric value with optional easing.
   */
  interpolateValue(
    from: number,
    to: number,
    progress: number,
    easing: string = 'linear',
  ): number {
    const easeFn = resolveEasing(easing);
    const t = easeFn(Math.min(Math.max(progress, 0), 1));
    return from + (to - from) * t;
  }
}
