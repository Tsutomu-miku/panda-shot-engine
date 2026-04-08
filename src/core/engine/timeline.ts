/**
 * panda-shot-engine — Timeline Engine
 *
 * Evaluates the complete state of a Shot at any given frame, producing a
 * `FrameState` that the renderer can consume directly.
 *
 * Features:
 *  - TimelineEngine class: manages global playback state
 *  - computeFrameState: walks DSL Shot timeline events to accumulate character state
 *  - Move interpolation with easing
 *  - Camera state computation from camera commands
 *  - VFX/SFX collection
 *  - Playback controls: play, pause, seek, getTime, isPlaying
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
  name: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  scale: number;
  expression: string;
  currentAction: string | null;
  actionProgress: number;
  boneStates: BoneState[];
  isSpeaking: boolean;
  speakingText: string;
}

export interface FrameState {
  camera: CameraState;
  characters: CharacterFrameState[];
  activeSubtitle: { character: string; text: string } | null;
  activeSfx: string[];
  activeVfx: VfxFrameState[];
  time: number;
  frame: number;
}

// ---------------------------------------------------------------------------
// Playback state for external controllers
// ---------------------------------------------------------------------------

export interface PlaybackState {
  playing: boolean;
  currentTime: number;
  currentFrame: number;
  totalFrames: number;
  duration: number;
  fps: number;
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

  // Playback state
  private _playing: boolean = false;
  private _currentTime: number = 0;
  private _startTimestamp: number = 0;
  private _pausedAt: number = 0;
  private _animFrameId: number = 0;
  private _onTick: ((state: FrameState) => void) | null = null;

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

  // -----------------------------------------------------------------------
  // Getters
  // -----------------------------------------------------------------------

  getTotalFrames(): number {
    return this.totalFrames;
  }

  getDuration(): number {
    return this.shot.duration;
  }

  getFps(): number {
    return this.fps;
  }

  frameToTime(frame: number): number {
    return frame / this.fps;
  }

  timeToFrame(time: number): number {
    return Math.floor(time * this.fps);
  }

  // -----------------------------------------------------------------------
  // Playback controls
  // -----------------------------------------------------------------------

  play(): void {
    if (this._playing) return;
    this._playing = true;
    this._startTimestamp = performance.now() - this._pausedAt * 1000;
    this._tickLoop();
  }

  pause(): void {
    this._playing = false;
    this._pausedAt = this._currentTime;
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = 0;
    }
  }

  seek(time: number): void {
    const clampedTime = Math.max(0, Math.min(time, this.shot.duration));
    this._currentTime = clampedTime;
    this._pausedAt = clampedTime;
    if (this._playing) {
      this._startTimestamp = performance.now() - clampedTime * 1000;
    }
  }

  getTime(): number {
    return this._currentTime;
  }

  isPlaying(): boolean {
    return this._playing;
  }

  getPlaybackState(): PlaybackState {
    return {
      playing: this._playing,
      currentTime: this._currentTime,
      currentFrame: this.timeToFrame(this._currentTime),
      totalFrames: this.totalFrames,
      duration: this.shot.duration,
      fps: this.fps,
    };
  }

  onTick(callback: (state: FrameState) => void): void {
    this._onTick = callback;
  }

  private _tickLoop = (): void => {
    if (!this._playing) return;

    const elapsed = (performance.now() - this._startTimestamp) / 1000;
    this._currentTime = elapsed;

    if (this._currentTime >= this.shot.duration) {
      this._currentTime = this.shot.duration;
      this._playing = false;
      const frame = this.totalFrames - 1;
      const state = this.getStateAtFrame(frame);
      if (this._onTick) this._onTick(state);
      return;
    }

    const frame = this.timeToFrame(this._currentTime);
    const state = this.getStateAtFrame(frame);
    if (this._onTick) this._onTick(state);

    this._animFrameId = requestAnimationFrame(this._tickLoop);
  };

  // -----------------------------------------------------------------------
  // Main entry point — compute full state for a frame
  // -----------------------------------------------------------------------

  getStateAtFrame(frame: number): FrameState {
    const time = this.frameToTime(frame);
    return this.computeFrameState(time, frame);
  }

  /**
   * Core method: given a Shot and a time, compute the complete FrameState
   * by walking all timeline events up to the current time and accumulating
   * character states, camera, VFX, and SFX.
   */
  computeFrameState(time: number, frame?: number): FrameState {
    const frameIdx = frame ?? this.timeToFrame(time);

    return {
      camera: this.computeCamera(time),
      characters: this.computeCharacters(time),
      activeSubtitle: this.computeSubtitle(time),
      activeSfx: this.computeSfx(time),
      activeVfx: this.computeVfx(time),
      time,
      frame: frameIdx,
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

    // Find ALL active actions at current time (there may be overlaps)
    let currentAction: ShotCharacterAction | null = null;
    let speakAction: ShotCharacterAction | null = null;
    let moveAction: ShotCharacterAction | null = null;

    for (const action of ch.actions) {
      const actionEnd = action.startTime + action.duration;
      if (time >= action.startTime && time < actionEnd) {
        if (action.type === 'say') {
          speakAction = action;
        } else if (action.type === 'move') {
          moveAction = action;
        } else {
          currentAction = action;
        }
      }
    }

    // Determine the primary visual action (non-say, non-move)
    const primaryAction = currentAction;

    // Compute action progress and bone states
    let boneStates: BoneState[] = [];
    let actionProgress = 0;
    let actionId: string | null = null;

    if (primaryAction) {
      actionId = primaryAction.type;
      const elapsed = time - primaryAction.startTime;
      actionProgress = primaryAction.duration > 0
        ? elapsed / primaryAction.duration
        : 1;

      const actionDef = getAction(actionId);
      boneStates = this.skeletonSys.applyAction(actionDef, actionProgress);
    } else if (moveAction) {
      // Use walk animation during move
      const moveElapsed = time - moveAction.startTime;
      const moveProgress = moveAction.duration > 0
        ? moveElapsed / moveAction.duration
        : 1;
      actionId = 'walk';
      actionProgress = moveProgress;
      const walkDef = getAction('walk');
      // Walk loops based on elapsed time, not progress
      const walkTime = (moveElapsed % walkDef.duration) / walkDef.duration;
      boneStates = this.skeletonSys.applyAction(walkDef, walkTime);
    } else {
      // Default idle
      const idleAction = getAction('idle');
      const idleProgress = (time % idleAction.duration) / idleAction.duration;
      boneStates = this.skeletonSys.applyAction(idleAction, idleProgress);
    }

    // Compute position — handle "move" action interpolation
    let x = basePos.x;
    let y = basePos.y;

    // Walk through all completed move actions to find final position
    let lastResolvedPos = basePos;
    for (const action of ch.actions) {
      if (action.type === 'move') {
        const actionEnd = action.startTime + action.duration;
        const targetPos = action.params['targetPosition'] as SemanticPosition | undefined;
        const targetVert = action.params['targetVertical'] as VerticalPosition | undefined;

        if (targetPos) {
          const dest = this.cameraSys.resolveSemanticPosition(
            targetPos,
            targetVert ?? 'bottom',
          );

          if (time >= actionEnd) {
            // Move is complete — character is at destination
            lastResolvedPos = dest;
          } else if (time >= action.startTime) {
            // Move is in progress — interpolate
            const moveElapsed = time - action.startTime;
            const moveProgress = action.duration > 0
              ? moveElapsed / action.duration
              : 1;
            const easingName = (action.params['easing'] as string) ?? 'easeInOut';
            x = this.interpolateValue(lastResolvedPos.x, dest.x, moveProgress, easingName);
            y = this.interpolateValue(lastResolvedPos.y, dest.y, moveProgress, easingName);
            lastResolvedPos = { x, y };
          }
        }
      }
    }

    // If no move is active at current time, use last resolved
    if (!moveAction) {
      x = lastResolvedPos.x;
      y = lastResolvedPos.y;
    }

    // Expression — can be overridden by a 'say' action
    let expression = ch.expression;
    if (speakAction && speakAction.params['expression']) {
      expression = speakAction.params['expression'] as string;
    }
    // Also check for expression changes from non-say actions
    if (primaryAction && primaryAction.params['expression']) {
      expression = primaryAction.params['expression'] as string;
    }

    // Determine speaking state
    const isSpeaking = speakAction !== null;
    const speakingText = isSpeaking
      ? (speakAction!.params['text'] as string) ?? ''
      : '';

    return {
      id: ch.id,
      name: ch.name,
      x,
      y,
      facing: ch.facing,
      scale: ch.scale,
      expression,
      currentAction: actionId,
      actionProgress,
      boneStates,
      isSpeaking,
      speakingText,
    };
  }

  // -----------------------------------------------------------------------
  // Subtitles / Dialogue
  // -----------------------------------------------------------------------

  private computeSubtitle(
    time: number,
  ): { character: string; text: string } | null {
    // Find the latest active 'say' action
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
    const SFX_ACTIVE_DURATION = 0.3;
    return this.shot.sfx
      .filter((s) => time >= s.time && time < s.time + SFX_ACTIVE_DURATION)
      .map((s) => s.id);
  }

  // -----------------------------------------------------------------------
  // VFX
  // -----------------------------------------------------------------------

  private computeVfx(time: number): VfxFrameState[] {
    const vfxList: VfxFrameState[] = [];

    for (const ch of this.shot.characters) {
      for (const action of ch.actions) {
        const actionEnd = action.startTime + action.duration;
        if (time < action.startTime || time >= actionEnd) continue;

        const progress = (time - action.startTime) / action.duration;
        const basePos = this.cameraSys.resolveSemanticPosition(
          ch.position,
          ch.verticalPosition ?? 'bottom',
        );
        const facingMult = ch.facing === 'right' ? 1 : -1;

        switch (action.type) {
          case 'punch':
            vfxList.push({
              type: 'impact',
              x: basePos.x + facingMult * 60,
              y: basePos.y - 40,
              progress,
              params: { intensity: 1 - progress },
            });
            break;

          case 'sword_slash':
            vfxList.push({
              type: 'slash_effect',
              x: basePos.x + facingMult * 70,
              y: basePos.y - 50,
              progress,
              params: { intensity: 1 - progress },
            });
            break;

          case 'kick':
            vfxList.push({
              type: 'impact',
              x: basePos.x + facingMult * 50,
              y: basePos.y + 10,
              progress,
              params: { intensity: 0.8 - progress * 0.8 },
            });
            break;

          case 'cast_spell':
            vfxList.push({
              type: 'sparkle',
              x: basePos.x + facingMult * 40,
              y: basePos.y - 60,
              progress,
              params: { intensity: 1 },
            });
            if (progress > 0.4) {
              vfxList.push({
                type: 'fire_burst',
                x: basePos.x + facingMult * 80,
                y: basePos.y - 30,
                progress: (progress - 0.4) / 0.6,
                params: { intensity: 1 },
              });
            }
            break;

          default:
            break;
        }
      }
    }

    return vfxList;
  }

  // -----------------------------------------------------------------------
  // Interpolation utilities
  // -----------------------------------------------------------------------

  /**
   * Interpolate between two {x, y} positions with optional easing.
   */
  interpolatePosition(
    from: { x: number; y: number },
    to: { x: number; y: number },
    progress: number,
    easing: string = 'linear',
  ): { x: number; y: number } {
    const easeFn = resolveEasing(easing);
    const t = easeFn(Math.min(Math.max(progress, 0), 1));
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
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
