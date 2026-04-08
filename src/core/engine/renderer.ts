/**
 * panda-shot-engine — Scene Renderer
 *
 * Orchestrates the full rendering pipeline: background, characters (with
 * skeletal animation), VFX, subtitles / dialog bubbles, and camera.
 */

import type {
  CameraState,
  RenderContext,
  Shot,
  Transform2D,
  VfxFrameState,
} from './types';
import { defaultCameraState } from './types';
import { CameraSystem } from './camera';
import { TimelineEngine, type CharacterFrameState, type FrameState } from './timeline';
import { SkeletonSystem } from '../skeleton/skeleton';
import type { BoneDefinition, BoneState, SkeletonDefinition } from '../skeleton/types';

// ---------------------------------------------------------------------------
// Configuration constants
// ---------------------------------------------------------------------------

const DEFAULT_FPS = 24;
const SUBTITLE_HEIGHT = 60;
const BUBBLE_PADDING = 12;
const BONE_DEBUG_COLORS: Record<string, string> = {
  head: '#FFD93D',
  chest: '#6BCB77',
  hip: '#4D96FF',
  upper_arm: '#FF6B6B',
  forearm: '#C77DFF',
  hand: '#FFB4B4',
  upper_leg: '#3AB0FF',
  lower_leg: '#72EFDD',
  foot: '#F9C74F',
  spine: '#90BE6D',
  neck: '#F8961E',
  root: '#577590',
};

// ---------------------------------------------------------------------------
// SceneRenderer
// ---------------------------------------------------------------------------

export class SceneRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private fps: number;

  // Shot data
  private shot: Shot | null = null;
  private timeline: TimelineEngine | null = null;
  private cameraSys: CameraSystem;
  private skeletonSys: SkeletonSystem;
  private skeletonDef: SkeletonDefinition;

  // Playback state
  private currentFrame: number = 0;
  private totalFrames: number = 0;
  private playing: boolean = false;
  private animFrameId: number = 0;
  private startTimestamp: number = 0;
  private pausedAt: number = 0;

  // Loaded images cache
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(canvas: HTMLCanvasElement, fps: number = DEFAULT_FPS) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to get 2D rendering context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.fps = fps;

    this.cameraSys = new CameraSystem(this.width, this.height);
    this.skeletonDef = SkeletonSystem.getDefaultSkeleton();
    this.skeletonSys = new SkeletonSystem(this.skeletonDef);
  }

  // -----------------------------------------------------------------------
  // Shot loading
  // -----------------------------------------------------------------------

  setShot(shot: Shot): void {
    this.shot = shot;
    this.totalFrames = Math.ceil(shot.duration * this.fps);
    this.currentFrame = 0;
    this.playing = false;
    this.timeline = new TimelineEngine(
      shot,
      this.fps,
      this.width,
      this.height,
    );

    // Pre-load background image if it looks like a URL
    if (shot.background && shot.background.startsWith('http')) {
      this.loadImage('bg', shot.background);
    }
  }

  // -----------------------------------------------------------------------
  // Playback controls
  // -----------------------------------------------------------------------

  play(): void {
    if (!this.shot || !this.timeline) return;
    if (this.playing) return;
    this.playing = true;
    this.startTimestamp = performance.now() - (this.pausedAt * 1000);
    this.tick();
  }

  pause(): void {
    this.playing = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
    this.pausedAt = this.getCurrentTime();
  }

  seekTo(time: number): void {
    if (!this.timeline) return;
    const frame = Math.round(time * this.fps);
    this.currentFrame = Math.max(0, Math.min(frame, this.totalFrames - 1));
    this.pausedAt = time;
    if (!this.playing) {
      this.renderFrame(this.currentFrame);
    }
  }

  getCurrentTime(): number {
    return this.currentFrame / this.fps;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getTotalFrames(): number {
    return this.totalFrames;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  // -----------------------------------------------------------------------
  // Main render loop
  // -----------------------------------------------------------------------

  private tick = (): void => {
    if (!this.playing || !this.timeline) return;

    const elapsed = (performance.now() - this.startTimestamp) / 1000;
    this.currentFrame = Math.floor(elapsed * this.fps);

    if (this.currentFrame >= this.totalFrames) {
      this.currentFrame = this.totalFrames - 1;
      this.playing = false;
      this.renderFrame(this.currentFrame);
      return;
    }

    this.renderFrame(this.currentFrame);
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  // -----------------------------------------------------------------------
  // Frame rendering pipeline
  // -----------------------------------------------------------------------

  renderFrame(frameIndex: number): void {
    if (!this.timeline) return;
    this.currentFrame = frameIndex;

    const state = this.timeline.getStateAtFrame(frameIndex);
    const ctx = this.ctx;

    // 1. Clear canvas
    ctx.clearRect(0, 0, this.width, this.height);

    // 2. Save context & apply camera transform
    ctx.save();
    this.applyCameraTransform(state.camera);

    // 3. Draw background layer
    this.drawBackground();

    // 4. Draw characters — sort by implicit zIndex (order in array)
    const sortedChars = [...state.characters].sort(
      (a, b) => a.y - b.y, // simple depth sort: lower y = further back
    );
    for (const ch of sortedChars) {
      this.drawCharacter(ch);
    }

    // 5. Draw VFX
    for (const vfx of state.activeVfx) {
      this.drawVFX(vfx);
    }

    // 6. Restore camera transform before drawing UI (screen-space)
    ctx.restore();

    // 7. Draw UI layer — subtitles and dialog bubbles
    if (state.activeSubtitle) {
      this.drawSubtitle(state.activeSubtitle.character, state.activeSubtitle.text);
      this.drawDialogBubble(state.activeSubtitle, state.characters);
    }
  }

  // -----------------------------------------------------------------------
  // Camera transform
  // -----------------------------------------------------------------------

  private applyCameraTransform(camera: CameraState): void {
    const matrix = this.cameraSys.getViewMatrix(camera);
    this.ctx.setTransform(
      matrix.a,
      matrix.b,
      matrix.c,
      matrix.d,
      matrix.e,
      matrix.f,
    );
  }

  // -----------------------------------------------------------------------
  // Background
  // -----------------------------------------------------------------------

  private drawBackground(): void {
    const ctx = this.ctx;

    if (!this.shot) return;

    const bg = this.shot.background;

    if (!bg) {
      // Default gradient sky
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, '#87CEEB');
      grad.addColorStop(0.6, '#E0F0FF');
      grad.addColorStop(1, '#90C695');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
      return;
    }

    // If it's a cached image
    const img = this.imageCache.get('bg');
    if (img && img.complete) {
      ctx.drawImage(img, 0, 0, this.width, this.height);
      return;
    }

    // Otherwise treat it as a CSS color
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw a simple ground line
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.8);
    ctx.lineTo(this.width, this.height * 0.8);
    ctx.stroke();
  }

  // -----------------------------------------------------------------------
  // Character rendering (skeleton-based)
  // -----------------------------------------------------------------------

  private drawCharacter(ch: CharacterFrameState): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(ch.x, ch.y);
    ctx.scale(ch.facing === 'left' ? -ch.scale : ch.scale, ch.scale);

    // Draw each bone as a colored placeholder rectangle + label
    const boneMap = new Map<string, BoneDefinition>();
    for (const bone of this.skeletonDef.bones) {
      boneMap.set(bone.id, bone);
    }

    const stateMap = new Map<string, BoneState>();
    for (const bs of ch.boneStates) {
      stateMap.set(bs.boneId, bs);
    }

    // Render bones in definition order (parent-first)
    for (const bone of this.skeletonDef.bones) {
      const worldTx = this.skeletonSys.getBoneWorldTransform(
        bone.id,
        ch.boneStates,
      );

      ctx.save();
      ctx.translate(worldTx.x, worldTx.y);
      ctx.rotate(worldTx.rotation);
      ctx.scale(worldTx.scaleX, worldTx.scaleY);

      // Determine color
      const partName = bone.partImage ?? bone.id;
      const color = BONE_DEBUG_COLORS[partName] ?? '#AAA';

      if (bone.id === 'head') {
        // Draw panda head as a circle
        this.drawPandaHead(ctx, bone.length, ch.expression);
      } else if (bone.id === 'root') {
        // Skip visual for root
      } else {
        // Draw bone as a rounded rectangle
        const w = Math.max(bone.length * 0.4, 8);
        const h = bone.length;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        this.roundRect(ctx, -w / 2, 0, w, h, 4);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Outline
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        this.roundRect(ctx, -w / 2, 0, w, h, 4);
        ctx.stroke();

        // Pivot dot
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Draw character name label below
    ctx.save();
    ctx.scale(ch.facing === 'left' ? -1 : 1, 1); // un-flip for text
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ch.id, 0, 60);

    // Expression tag
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#FFD93D';
    ctx.fillText(`[${ch.expression}]`, 0, 74);

    // Action tag
    if (ch.currentAction) {
      ctx.fillStyle = '#72EFDD';
      ctx.fillText(
        `${ch.currentAction} (${Math.round(ch.actionProgress * 100)}%)`,
        0,
        86,
      );
    }
    ctx.restore();

    ctx.restore();
  }

  /** Draw a simplified panda head (circle + ears + face). */
  private drawPandaHead(
    ctx: CanvasRenderingContext2D,
    size: number,
    expression: string,
  ): void {
    const r = size * 0.5;

    // Ears
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(-r * 0.7, -r * 0.7, r * 0.35, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.7, -r * 0.7, r * 0.35, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head circle
    ctx.fillStyle = '#FAFAFA';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eye patches
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.15, r * 0.22, r * 0.28, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.32, -r * 0.15, r * 0.22, r * 0.28, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (white dots in patches)
    ctx.fillStyle = '#FFF';
    const eyeR = r * 0.08;
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.15, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.15, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 0.08, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouth — expression-dependent
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    switch (expression) {
      case 'happy':
      case 'smile':
        ctx.arc(0, r * 0.2, r * 0.2, 0.1, Math.PI - 0.1);
        break;
      case 'sad':
        ctx.arc(0, r * 0.45, r * 0.18, Math.PI + 0.2, -0.2);
        break;
      case 'angry':
        ctx.moveTo(-r * 0.15, r * 0.3);
        ctx.lineTo(r * 0.15, r * 0.3);
        break;
      case 'surprised':
        ctx.arc(0, r * 0.32, r * 0.1, 0, Math.PI * 2);
        break;
      default: // neutral
        ctx.moveTo(-r * 0.12, r * 0.3);
        ctx.quadraticCurveTo(0, r * 0.38, r * 0.12, r * 0.3);
    }
    ctx.stroke();
  }

  // -----------------------------------------------------------------------
  // VFX rendering
  // -----------------------------------------------------------------------

  private drawVFX(vfx: VfxFrameState): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(vfx.x, vfx.y);

    const alpha = 1 - vfx.progress;
    ctx.globalAlpha = Math.max(alpha, 0);

    switch (vfx.type) {
      case 'impact': {
        // Expanding starburst
        const size = 20 + vfx.progress * 60;
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(
            Math.cos(angle) * size * 0.3,
            Math.sin(angle) * size * 0.3,
          );
          ctx.lineTo(
            Math.cos(angle) * size,
            Math.sin(angle) * size,
          );
          ctx.stroke();
        }
        break;
      }
      case 'slash': {
        // Diagonal arc
        const len = 40 + vfx.progress * 80;
        ctx.strokeStyle = '#C0C0FF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, len, -Math.PI * 0.6, -Math.PI * 0.1);
        ctx.stroke();
        break;
      }
      default: {
        // Generic sparkle
        const sparkleSize = 10 + vfx.progress * 30;
        ctx.fillStyle = '#FFD93D';
        ctx.beginPath();
        ctx.arc(0, 0, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // UI: Subtitles
  // -----------------------------------------------------------------------

  private drawSubtitle(character: string, text: string): void {
    const ctx = this.ctx;

    // Semi-transparent bar at bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(
      0,
      this.height - SUBTITLE_HEIGHT,
      this.width,
      SUBTITLE_HEIGHT,
    );

    // Character name
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(character, 20, this.height - SUBTITLE_HEIGHT + 22);

    // Dialog text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px sans-serif';
    ctx.fillText(text, 20, this.height - SUBTITLE_HEIGHT + 44);
  }

  // -----------------------------------------------------------------------
  // UI: Dialog bubble above character head
  // -----------------------------------------------------------------------

  private drawDialogBubble(
    subtitle: { character: string; text: string },
    characters: CharacterFrameState[],
  ): void {
    const ch = characters.find(
      (c) => c.id === subtitle.character || c.id.includes(subtitle.character),
    );
    if (!ch) return;

    const ctx = this.ctx;

    // We need to account for the camera — but since we already restored
    // the transform before calling this, we use screen-space estimation.
    // For a production renderer the bubble would be drawn in world space.
    const bubbleX = ch.x;
    const bubbleY = ch.y - 100;

    const textWidth = ctx.measureText(subtitle.text).width;
    const bw = textWidth + BUBBLE_PADDING * 2;
    const bh = 30;

    ctx.save();

    // Bubble background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    this.roundRect(
      ctx,
      bubbleX - bw / 2,
      bubbleY - bh / 2,
      bw,
      bh,
      8,
    );
    ctx.fill();
    ctx.stroke();

    // Tail triangle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.moveTo(bubbleX - 6, bubbleY + bh / 2);
    ctx.lineTo(bubbleX, bubbleY + bh / 2 + 10);
    ctx.lineTo(bubbleX + 6, bubbleY + bh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#222';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(subtitle.text, bubbleX, bubbleY);

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Drawing helpers
  // -----------------------------------------------------------------------

  /** Trace a rounded rectangle path (does NOT fill/stroke). */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** Load an image and store it in the cache. */
  private loadImage(key: string, src: string): void {
    if (this.imageCache.has(key)) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    this.imageCache.set(key, img);
  }

  // -----------------------------------------------------------------------
  // Getters for external tooling
  // -----------------------------------------------------------------------

  getRenderContext(): RenderContext {
    return {
      canvas: this.canvas,
      ctx: this.ctx,
      width: this.width,
      height: this.height,
      fps: this.fps,
      currentFrame: this.currentFrame,
      totalFrames: this.totalFrames,
    };
  }

  getTimeline(): TimelineEngine | null {
    return this.timeline;
  }
}
