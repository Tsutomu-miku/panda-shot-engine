/**
 * panda-shot-engine — Enhanced Scene Renderer
 *
 * Full multi-layer compositing pipeline:
 *   Background → Characters (skeleton-driven) → VFX → UI (subtitles/dialog)
 *
 * Features:
 *  - Asset-based character part rendering with placeholder panda fallback
 *  - Rich expression system: neutral/angry/shocked/happy/crying/smirk
 *  - Full body drawing: head, torso, arms, legs in simple illustration style
 *  - Skeleton-driven bone transforms applied to each body part
 *  - Dialog bubbles with rounded rect + triangle tail + wrapped text
 *  - VFX: slash_effect, fire_burst, lightning, sparkle via Canvas paths
 *  - Subtitle bar at bottom
 *  - Camera transform: zoom, pan, rotation, shake
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
const SUBTITLE_HEIGHT = 64;
const BUBBLE_PADDING = 14;
const BUBBLE_MAX_WIDTH = 260;
const BUBBLE_FONT_SIZE = 14;
const BUBBLE_LINE_HEIGHT = 20;

// Body part colors for placeholder drawing
const BODY_WHITE = '#FAFAFA';
const BODY_BLACK = '#222222';
const BODY_DARK_GRAY = '#333333';
const BODY_OUTLINE = '#444444';

// ---------------------------------------------------------------------------
// Asset types used by the renderer
// ---------------------------------------------------------------------------

export interface AssetLibrary {
  /** character id → part name → loaded HTMLImageElement */
  characterParts: Map<string, Map<string, HTMLImageElement>>;
  /** background key → loaded HTMLImageElement */
  backgrounds: Map<string, HTMLImageElement>;
}

export function createEmptyAssetLibrary(): AssetLibrary {
  return {
    characterParts: new Map(),
    backgrounds: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Expression drawing helpers (standalone functions)
// ---------------------------------------------------------------------------

type ExpressionDrawFn = (
  ctx: CanvasRenderingContext2D,
  r: number,
) => void;

function drawEyesNeutral(ctx: CanvasRenderingContext2D, r: number): void {
  // Black eye patches
  ctx.fillStyle = BODY_BLACK;
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.15, r * 0.22, r * 0.28, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.32, -r * 0.15, r * 0.22, r * 0.28, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // White pupils
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(-r * 0.30, -r * 0.15, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.30, -r * 0.15, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // Black iris
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-r * 0.30, -r * 0.14, r * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.30, -r * 0.14, r * 0.045, 0, Math.PI * 2);
  ctx.fill();
}

function drawMouthNeutral(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.strokeStyle = BODY_DARK_GRAY;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, r * 0.30);
  ctx.quadraticCurveTo(0, r * 0.38, r * 0.12, r * 0.30);
  ctx.stroke();
}

function drawEyesAngry(ctx: CanvasRenderingContext2D, r: number): void {
  // Eye patches
  ctx.fillStyle = BODY_BLACK;
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.15, r * 0.22, r * 0.28, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.32, -r * 0.15, r * 0.22, r * 0.28, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Angry small eyes
  ctx.fillStyle = '#FF4444';
  ctx.beginPath();
  ctx.arc(-r * 0.30, -r * 0.12, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.30, -r * 0.12, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-r * 0.30, -r * 0.11, r * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.30, -r * 0.11, r * 0.035, 0, Math.PI * 2);
  ctx.fill();
  // Angry eyebrows
  ctx.strokeStyle = BODY_BLACK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.48, -r * 0.38);
  ctx.lineTo(-r * 0.18, -r * 0.30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.48, -r * 0.38);
  ctx.lineTo(r * 0.18, -r * 0.30);
  ctx.stroke();
}

function drawMouthAngry(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.strokeStyle = BODY_DARK_GRAY;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.18, r * 0.28);
  ctx.lineTo(-r * 0.06, r * 0.34);
  ctx.lineTo(r * 0.06, r * 0.28);
  ctx.lineTo(r * 0.18, r * 0.34);
  ctx.stroke();
}

function drawEyesShocked(ctx: CanvasRenderingContext2D, r: number): void {
  // Eye patches
  ctx.fillStyle = BODY_BLACK;
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.15, r * 0.24, r * 0.30, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.32, -r * 0.15, r * 0.24, r * 0.30, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Wide white eyes
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(-r * 0.30, -r * 0.15, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.30, -r * 0.15, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  // Small pupils
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-r * 0.30, -r * 0.13, r * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.30, -r * 0.13, r * 0.04, 0, Math.PI * 2);
  ctx.fill();
}

function drawMouthShocked(ctx: CanvasRenderingContext2D, r: number): void {
  // Open mouth O shape
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.33, r * 0.12, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#722';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.33, r * 0.08, r * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyesHappy(ctx: CanvasRenderingContext2D, r: number): void {
  // Eye patches
  ctx.fillStyle = BODY_BLACK;
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.15, r * 0.22, r * 0.28, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.32, -r * 0.15, r * 0.22, r * 0.28, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Closed happy eyes (arcs)
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(-r * 0.30, -r * 0.10, r * 0.10, Math.PI + 0.3, -0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 0.30, -r * 0.10, r * 0.10, Math.PI + 0.3, -0.3);
  ctx.stroke();
}

function drawMouthHappy(ctx: CanvasRenderingContext2D, r: number): void {
  // Big smile
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(0, r * 0.26, r * 0.18, 0.1, Math.PI - 0.1);
  ctx.closePath();
  ctx.fill();
  // Tongue hint
  ctx.fillStyle = '#E57373';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.38, r * 0.08, r * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyesCrying(ctx: CanvasRenderingContext2D, r: number): void {
  // Eye patches
  ctx.fillStyle = BODY_BLACK;
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.15, r * 0.22, r * 0.28, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.32, -r * 0.15, r * 0.22, r * 0.28, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Squished crying eyes
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-r * 0.30, -r * 0.18, r * 0.08, 0.4, Math.PI - 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 0.30, -r * 0.18, r * 0.08, 0.4, Math.PI - 0.4);
  ctx.stroke();
  // Tear drops
  ctx.fillStyle = '#64B5F6';
  ctx.beginPath();
  ctx.ellipse(-r * 0.38, r * 0.02, r * 0.04, r * 0.08, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.38, r * 0.05, r * 0.04, r * 0.10, -0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawMouthCrying(ctx: CanvasRenderingContext2D, r: number): void {
  // Wobbly frown
  ctx.strokeStyle = BODY_DARK_GRAY;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, r * 0.45, r * 0.14, Math.PI + 0.3, -0.3);
  ctx.stroke();
}

function drawEyesSmirk(ctx: CanvasRenderingContext2D, r: number): void {
  // Eye patches
  ctx.fillStyle = BODY_BLACK;
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.15, r * 0.22, r * 0.28, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.32, -r * 0.15, r * 0.22, r * 0.28, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Left eye half-closed
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-r * 0.30, -r * 0.13, r * 0.08, Math.PI + 0.5, -0.5);
  ctx.stroke();
  // Right eye open
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(r * 0.30, -r * 0.15, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(r * 0.31, -r * 0.14, r * 0.045, 0, Math.PI * 2);
  ctx.fill();
}

function drawMouthSmirk(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.strokeStyle = BODY_DARK_GRAY;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.05, r * 0.30);
  ctx.quadraticCurveTo(r * 0.08, r * 0.32, r * 0.18, r * 0.24);
  ctx.stroke();
}

const EXPRESSION_EYES: Record<string, ExpressionDrawFn> = {
  neutral: drawEyesNeutral,
  angry: drawEyesAngry,
  shocked: drawEyesShocked,
  happy: drawEyesHappy,
  crying: drawEyesCrying,
  smirk: drawEyesSmirk,
  smile: drawEyesHappy,
  sad: drawEyesCrying,
  surprised: drawEyesShocked,
};

const EXPRESSION_MOUTHS: Record<string, ExpressionDrawFn> = {
  neutral: drawMouthNeutral,
  angry: drawMouthAngry,
  shocked: drawMouthShocked,
  happy: drawMouthHappy,
  crying: drawMouthCrying,
  smirk: drawMouthSmirk,
  smile: drawMouthHappy,
  sad: drawMouthCrying,
  surprised: drawMouthShocked,
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

  // Assets
  private assets: AssetLibrary;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  // Callbacks
  private onFrameCallback: ((frame: number, total: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, fps: number = DEFAULT_FPS, assets?: AssetLibrary) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to get 2D rendering context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.fps = fps;
    this.assets = assets ?? createEmptyAssetLibrary();

    this.cameraSys = new CameraSystem(this.width, this.height);
    this.skeletonDef = SkeletonSystem.getDefaultSkeleton();
    this.skeletonSys = new SkeletonSystem(this.skeletonDef);
  }

  // -----------------------------------------------------------------------
  // Asset management
  // -----------------------------------------------------------------------

  setAssets(assets: AssetLibrary): void {
    this.assets = assets;
  }

  getAssets(): AssetLibrary {
    return this.assets;
  }

  // -----------------------------------------------------------------------
  // Shot loading
  // -----------------------------------------------------------------------

  setShot(shot: Shot): void {
    this.shot = shot;
    this.totalFrames = Math.ceil(shot.duration * this.fps);
    this.currentFrame = 0;
    this.playing = false;
    this.timeline = new TimelineEngine(shot, this.fps, this.width, this.height);

    // Pre-load background image if URL
    if (shot.background && shot.background.startsWith('http')) {
      this.loadImage('bg', shot.background);
    }
  }

  setOnFrame(cb: (frame: number, total: number) => void): void {
    this.onFrameCallback = cb;
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
  // Frame rendering pipeline — multi-layer compositing
  // -----------------------------------------------------------------------

  renderFrame(frameIndex: number): void {
    if (!this.timeline) return;
    this.currentFrame = frameIndex;

    const state = this.timeline.getStateAtFrame(frameIndex);
    const ctx = this.ctx;

    // === Layer 0: Clear ===
    ctx.clearRect(0, 0, this.width, this.height);

    // === Layer 1: Background (pre-camera for parallax feel) ===
    ctx.save();
    this.applyCameraTransform(state.camera);
    this.drawBackground(ctx);

    // === Layer 2: Characters (sorted by Y for depth) ===
    const sortedChars = [...state.characters].sort((a, b) => a.y - b.y);
    for (const ch of sortedChars) {
      this.drawCharacterFull(ctx, ch);
    }

    // === Layer 3: VFX ===
    for (const vfx of state.activeVfx) {
      this.drawVFX(ctx, vfx);
    }

    ctx.restore();

    // === Layer 4: UI (screen-space, no camera transform) ===
    if (state.activeSubtitle) {
      this.drawSubtitle(ctx, state.activeSubtitle.character, state.activeSubtitle.text);
      this.drawDialogBubble(ctx, state.activeSubtitle, state.characters, state.camera);
    }

    if (this.onFrameCallback) {
      this.onFrameCallback(frameIndex, this.totalFrames);
    }
  }

  // -----------------------------------------------------------------------
  // Camera transform
  // -----------------------------------------------------------------------

  private applyCameraTransform(camera: CameraState): void {
    const matrix = this.cameraSys.getViewMatrix(camera);
    this.ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
  }

  // -----------------------------------------------------------------------
  // Layer 1: Background
  // -----------------------------------------------------------------------

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    if (!this.shot) return;
    const bg = this.shot.background;

    if (!bg) {
      // Default gradient sky + ground
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, '#87CEEB');
      grad.addColorStop(0.55, '#E0F0FF');
      grad.addColorStop(0.55, '#90C695');
      grad.addColorStop(0.75, '#6BAA6B');
      grad.addColorStop(1, '#4A8A4A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Horizon line
      ctx.strokeStyle = '#5A7A5A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, this.height * 0.55);
      ctx.lineTo(this.width, this.height * 0.55);
      ctx.stroke();

      // Simple clouds
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      this.drawCloud(ctx, this.width * 0.2, this.height * 0.12, 40);
      this.drawCloud(ctx, this.width * 0.6, this.height * 0.08, 55);
      this.drawCloud(ctx, this.width * 0.85, this.height * 0.18, 35);
      return;
    }

    // Cached background image
    const bgImg = this.assets.backgrounds.get('bg') ?? this.imageCache.get('bg');
    if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, this.width, this.height);
      return;
    }

    // CSS color fallback
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // Ground line
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.8);
    ctx.lineTo(this.width, this.height * 0.8);
    ctx.stroke();
  }

  private drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
    ctx.arc(cx - size * 0.4, cy + size * 0.1, size * 0.35, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.45, cy + size * 0.08, size * 0.38, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.15, cy - size * 0.15, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // -----------------------------------------------------------------------
  // Layer 2: Character rendering — full body with skeleton drive
  // -----------------------------------------------------------------------

  private drawCharacterFull(ctx: CanvasRenderingContext2D, ch: CharacterFrameState): void {
    ctx.save();
    ctx.translate(ch.x, ch.y);
    const flipX = ch.facing === 'left' ? -1 : 1;
    ctx.scale(flipX * ch.scale, ch.scale);

    // Try to load character asset parts from the library
    const charParts = this.assets.characterParts.get(ch.id);
    const hasAssets = charParts && charParts.size > 0;

    if (hasAssets) {
      this.drawCharacterFromAssets(ctx, ch, charParts!);
    } else {
      this.drawCharacterPlaceholder(ctx, ch);
    }

    // Name label (always un-flipped)
    ctx.save();
    ctx.scale(flipX, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const nameW = ctx.measureText(ch.id).width + 10;
    this.roundRect(ctx, -nameW / 2, 55, nameW, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.fillText(ch.id, 0, 58);
    ctx.restore();

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Character from asset images
  // -----------------------------------------------------------------------

  private drawCharacterFromAssets(
    ctx: CanvasRenderingContext2D,
    ch: CharacterFrameState,
    parts: Map<string, HTMLImageElement>,
  ): void {
    // Render order: back-to-front
    const renderOrder = [
      'upper_leg_l', 'upper_leg_r', 'lower_leg_l', 'lower_leg_r',
      'foot_l', 'foot_r', 'hip', 'spine', 'chest',
      'upper_arm_l', 'forearm_l', 'hand_l',
      'upper_arm_r', 'forearm_r', 'hand_r',
      'neck', 'head',
    ];

    const stateMap = new Map<string, BoneState>();
    for (const bs of ch.boneStates) {
      stateMap.set(bs.boneId, bs);
    }

    for (const boneId of renderOrder) {
      const boneDef = this.skeletonDef.bones.find(b => b.id === boneId);
      if (!boneDef) continue;

      const worldTx = this.skeletonSys.getBoneWorldTransform(boneId, ch.boneStates);
      const partKey = boneDef.partImage ?? boneId;
      const img = parts.get(partKey);

      ctx.save();
      ctx.translate(worldTx.x, worldTx.y);
      ctx.rotate(worldTx.rotation);
      ctx.scale(worldTx.scaleX, worldTx.scaleY);

      if (img && img.complete && img.naturalWidth > 0) {
        const w = boneDef.length * 0.8;
        const h = boneDef.length;
        ctx.drawImage(img, -w / 2, 0, w, h);
      } else if (boneId === 'head') {
        this.drawPandaHead(ctx, boneDef.length, ch.expression);
      } else if (boneId !== 'root') {
        this.drawBonePlaceholder(ctx, boneDef);
      }

      ctx.restore();
    }
  }

  // -----------------------------------------------------------------------
  // Character placeholder (no assets) — complete panda drawing
  // -----------------------------------------------------------------------

  private drawCharacterPlaceholder(ctx: CanvasRenderingContext2D, ch: CharacterFrameState): void {
    // We draw body parts in order: legs → hip → torso → arms → neck → head
    const renderOrder = [
      'upper_leg_l', 'lower_leg_l', 'foot_l',
      'upper_leg_r', 'lower_leg_r', 'foot_r',
      'hip', 'spine', 'chest',
      'upper_arm_l', 'forearm_l', 'hand_l',
      'upper_arm_r', 'forearm_r', 'hand_r',
      'neck', 'head',
    ];

    for (const boneId of renderOrder) {
      const boneDef = this.skeletonDef.bones.find(b => b.id === boneId);
      if (!boneDef) continue;

      const worldTx = this.skeletonSys.getBoneWorldTransform(boneId, ch.boneStates);

      ctx.save();
      ctx.translate(worldTx.x, worldTx.y);
      ctx.rotate(worldTx.rotation);
      ctx.scale(worldTx.scaleX, worldTx.scaleY);

      if (boneId === 'head') {
        this.drawPandaHead(ctx, boneDef.length, ch.expression);
      } else if (boneId === 'root') {
        // Skip root visual
      } else if (boneId === 'chest' || boneId === 'spine') {
        this.drawTorso(ctx, boneDef);
      } else if (boneId === 'hip') {
        this.drawHip(ctx, boneDef);
      } else if (boneId === 'neck') {
        this.drawNeck(ctx, boneDef);
      } else if (boneId.includes('hand')) {
        this.drawHand(ctx, boneDef);
      } else if (boneId.includes('foot')) {
        this.drawFoot(ctx, boneDef);
      } else if (boneId.includes('arm') || boneId.includes('forearm')) {
        this.drawLimb(ctx, boneDef, '#222');
      } else if (boneId.includes('leg')) {
        this.drawLimb(ctx, boneDef, '#222');
      } else {
        this.drawBonePlaceholder(ctx, boneDef);
      }

      ctx.restore();
    }
  }

  // -----------------------------------------------------------------------
  // Panda Head — detailed with expression system
  // -----------------------------------------------------------------------

  private drawPandaHead(
    ctx: CanvasRenderingContext2D,
    size: number,
    expression: string,
  ): void {
    const r = size * 0.55;

    // Ears (black circles behind the head)
    ctx.fillStyle = BODY_BLACK;
    ctx.beginPath();
    ctx.ellipse(-r * 0.72, -r * 0.72, r * 0.36, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = BODY_OUTLINE;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(r * 0.72, -r * 0.72, r * 0.36, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner ear (slight pink)
    ctx.fillStyle = '#8B6E6E';
    ctx.beginPath();
    ctx.ellipse(-r * 0.72, -r * 0.72, r * 0.18, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.72, -r * 0.72, r * 0.18, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head (white circle)
    ctx.fillStyle = BODY_WHITE;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = BODY_OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Expression-dependent eyes
    const eyesFn = EXPRESSION_EYES[expression] ?? drawEyesNeutral;
    eyesFn(ctx, r);

    // Nose
    ctx.fillStyle = BODY_DARK_GRAY;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.16, r * 0.09, r * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.02, r * 0.14, r * 0.035, r * 0.025, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Expression-dependent mouth
    const mouthFn = EXPRESSION_MOUTHS[expression] ?? drawMouthNeutral;
    mouthFn(ctx, r);

    // Cheek blush for happy/smirk
    if (expression === 'happy' || expression === 'smile' || expression === 'smirk') {
      ctx.fillStyle = 'rgba(255, 150, 150, 0.25)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.45, r * 0.12, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(r * 0.45, r * 0.12, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // -----------------------------------------------------------------------
  // Body parts — simple illustration style
  // -----------------------------------------------------------------------

  private drawTorso(ctx: CanvasRenderingContext2D, bone: BoneDefinition): void {
    const w = bone.length * 0.65;
    const h = bone.length;
    // Rounded white body with black outline
    ctx.fillStyle = BODY_WHITE;
    this.roundRect(ctx, -w / 2, 0, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = BODY_OUTLINE;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, -w / 2, 0, w, h, 6);
    ctx.stroke();
  }

  private drawHip(ctx: CanvasRenderingContext2D, bone: BoneDefinition): void {
    const w = bone.length * 0.8;
    const h = bone.length;
    ctx.fillStyle = BODY_WHITE;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.5, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = BODY_OUTLINE;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  private drawNeck(ctx: CanvasRenderingContext2D, bone: BoneDefinition): void {
    const w = bone.length * 0.4;
    const h = bone.length;
    ctx.fillStyle = BODY_WHITE;
    this.roundRect(ctx, -w / 2, 0, w, h, 3);
    ctx.fill();
    ctx.strokeStyle = BODY_OUTLINE;
    ctx.lineWidth = 1;
    this.roundRect(ctx, -w / 2, 0, w, h, 3);
    ctx.stroke();
  }

  private drawLimb(ctx: CanvasRenderingContext2D, bone: BoneDefinition, color: string): void {
    const w = Math.max(bone.length * 0.35, 7);
    const h = bone.length;
    ctx.fillStyle = color;
    this.roundRect(ctx, -w / 2, 0, w, h, w / 2);
    ctx.fill();
    ctx.strokeStyle = BODY_OUTLINE;
    ctx.lineWidth = 1;
    this.roundRect(ctx, -w / 2, 0, w, h, w / 2);
    ctx.stroke();
  }

  private drawHand(ctx: CanvasRenderingContext2D, bone: BoneDefinition): void {
    const r = bone.length * 0.45;
    ctx.fillStyle = BODY_BLACK;
    ctx.beginPath();
    ctx.arc(0, r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = BODY_OUTLINE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawFoot(ctx: CanvasRenderingContext2D, bone: BoneDefinition): void {
    const w = bone.length * 0.9;
    const h = bone.length * 0.5;
    ctx.fillStyle = BODY_BLACK;
    ctx.beginPath();
    ctx.ellipse(w * 0.2, h * 0.5, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = BODY_OUTLINE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawBonePlaceholder(ctx: CanvasRenderingContext2D, bone: BoneDefinition): void {
    const w = Math.max(bone.length * 0.4, 8);
    const h = bone.length;
    ctx.fillStyle = '#CCC';
    ctx.globalAlpha = 0.7;
    this.roundRect(ctx, -w / 2, 0, w, h, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    this.roundRect(ctx, -w / 2, 0, w, h, 4);
    ctx.stroke();
  }

  // -----------------------------------------------------------------------
  // Layer 3: VFX rendering
  // -----------------------------------------------------------------------

  private drawVFX(ctx: CanvasRenderingContext2D, vfx: VfxFrameState): void {
    ctx.save();
    ctx.translate(vfx.x, vfx.y);

    const alpha = Math.max(1 - vfx.progress * 0.8, 0.1);
    ctx.globalAlpha = alpha;

    switch (vfx.type) {
      case 'slash':
      case 'slash_effect':
        this.drawSlashEffect(ctx, vfx);
        break;
      case 'fire_burst':
        this.drawFireBurst(ctx, vfx);
        break;
      case 'lightning':
        this.drawLightning(ctx, vfx);
        break;
      case 'sparkle':
        this.drawSparkle(ctx, vfx);
        break;
      case 'impact':
        this.drawImpact(ctx, vfx);
        break;
      default:
        this.drawGenericVfx(ctx, vfx);
        break;
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawSlashEffect(ctx: CanvasRenderingContext2D, vfx: VfxFrameState): void {
    const len = 50 + vfx.progress * 100;
    const width = 4 - vfx.progress * 2;

    // Three arc slashes
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * 12;
      const startAngle = -Math.PI * 0.7 + i * 0.1;
      const endAngle = -Math.PI * 0.1 + i * 0.05;

      ctx.strokeStyle = `rgba(200, 200, 255, ${1 - i * 0.2})`;
      ctx.lineWidth = width - i * 0.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(offset, offset * 0.5, len - i * 10, startAngle, endAngle);
      ctx.stroke();
    }

    // Central glow
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, len * 0.3);
    glowGrad.addColorStop(0, 'rgba(220, 220, 255, 0.4)');
    glowGrad.addColorStop(1, 'rgba(220, 220, 255, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, len * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFireBurst(ctx: CanvasRenderingContext2D, vfx: VfxFrameState): void {
    const baseSize = 30 + vfx.progress * 40;
    const flames = 8;

    for (let i = 0; i < flames; i++) {
      const angle = (i / flames) * Math.PI * 2 + vfx.progress * 2;
      const flameLen = baseSize * (0.6 + Math.sin(angle * 3 + vfx.progress * 10) * 0.4);
      const tipX = Math.cos(angle) * flameLen;
      const tipY = Math.sin(angle) * flameLen;

      const grad = ctx.createLinearGradient(0, 0, tipX, tipY);
      grad.addColorStop(0, 'rgba(255, 200, 50, 0.9)');
      grad.addColorStop(0.5, 'rgba(255, 100, 20, 0.7)');
      grad.addColorStop(1, 'rgba(200, 30, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const perpX = Math.cos(angle + Math.PI / 2) * baseSize * 0.15;
      const perpY = Math.sin(angle + Math.PI / 2) * baseSize * 0.15;
      ctx.lineTo(perpX, perpY);
      ctx.quadraticCurveTo(tipX * 0.7 + perpX * 0.5, tipY * 0.7 + perpY * 0.5, tipX, tipY);
      ctx.quadraticCurveTo(tipX * 0.7 - perpX * 0.5, tipY * 0.7 - perpY * 0.5, -perpX, -perpY);
      ctx.closePath();
      ctx.fill();
    }

    // Core glow
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseSize * 0.4);
    coreGrad.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
    coreGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, baseSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLightning(ctx: CanvasRenderingContext2D, vfx: VfxFrameState): void {
    const bolts = 3;
    const height = 120 + vfx.progress * 40;

    for (let b = 0; b < bolts; b++) {
      const offsetX = (b - 1) * 15;
      ctx.strokeStyle = b === 1 ? 'rgba(200, 200, 255, 0.95)' : 'rgba(150, 150, 255, 0.6)';
      ctx.lineWidth = b === 1 ? 3 : 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      let px = offsetX;
      let py = -height / 2;
      ctx.moveTo(px, py);

      const segments = 8;
      const segH = height / segments;
      // Use a seeded pseudo-random based on progress for consistent look within frame
      const seed = b * 1000 + Math.floor(vfx.progress * 5);
      for (let i = 1; i <= segments; i++) {
        const jitter = ((Math.sin(seed + i * 73.1) * 43758.5453) % 1) * 30 - 15;
        px = offsetX + jitter;
        py = -height / 2 + segH * i;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Central glow
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    glowGrad.addColorStop(0, 'rgba(180, 180, 255, 0.5)');
    glowGrad.addColorStop(1, 'rgba(180, 180, 255, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, vfx: VfxFrameState): void {
    const count = 6;
    const spread = 20 + vfx.progress * 50;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = spread * (0.5 + Math.sin(i * 2.3 + vfx.progress * 8) * 0.5);
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      const starSize = 4 + Math.sin(i * 1.7 + vfx.progress * 12) * 2;

      ctx.fillStyle = `rgba(255, 230, 100, ${0.9 - vfx.progress * 0.7})`;
      this.drawStar(ctx, px, py, starSize, starSize * 0.4, 4);
      ctx.fill();
    }

    // Center sparkle
    ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - vfx.progress * 0.6})`;
    this.drawStar(ctx, 0, 0, 8, 3, 4);
    ctx.fill();
  }

  private drawImpact(ctx: CanvasRenderingContext2D, vfx: VfxFrameState): void {
    const size = 20 + vfx.progress * 60;

    // Starburst lines
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * size * 0.3, Math.sin(angle) * size * 0.3);
      ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
      ctx.stroke();
    }

    // Center flash
    const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.3);
    flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    flashGrad.addColorStop(1, 'rgba(255, 100, 100, 0)');
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGenericVfx(ctx: CanvasRenderingContext2D, vfx: VfxFrameState): void {
    const sparkleSize = 10 + vfx.progress * 30;
    ctx.fillStyle = '#FFD93D';
    ctx.beginPath();
    ctx.arc(0, 0, sparkleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points: number,
  ): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // -----------------------------------------------------------------------
  // Layer 4: UI — Subtitle bar
  // -----------------------------------------------------------------------

  private drawSubtitle(
    ctx: CanvasRenderingContext2D,
    character: string,
    text: string,
  ): void {
    // Semi-transparent bar at bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, this.height - SUBTITLE_HEIGHT, this.width, SUBTITLE_HEIGHT);

    // Top border line
    ctx.strokeStyle = 'rgba(255, 217, 61, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.height - SUBTITLE_HEIGHT);
    ctx.lineTo(this.width, this.height - SUBTITLE_HEIGHT);
    ctx.stroke();

    // Character name tag
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    const nameW = ctx.measureText(character).width + 16;
    ctx.fillStyle = 'rgba(255, 217, 61, 0.9)';
    this.roundRect(ctx, 16, this.height - SUBTITLE_HEIGHT + 8, nameW, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#1e1e2e';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(character, 24, this.height - SUBTITLE_HEIGHT + 18);

    // Dialog text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 24, this.height - SUBTITLE_HEIGHT + 42);
  }

  // -----------------------------------------------------------------------
  // Layer 4: UI — Dialog bubble above character
  // -----------------------------------------------------------------------

  private drawDialogBubble(
    ctx: CanvasRenderingContext2D,
    subtitle: { character: string; text: string },
    characters: CharacterFrameState[],
    camera: CameraState,
  ): void {
    const ch = characters.find(
      (c) => c.id === subtitle.character || c.id.includes(subtitle.character) || c.name === subtitle.character,
    );
    if (!ch) return;

    // Approximate screen position (simplified — in production would use camera matrix)
    const cx = this.width / 2;
    const cy = this.height / 2;
    const screenX = cx + (ch.x - camera.x) * camera.zoom;
    const screenY = cy + (ch.y - camera.y - 120) * camera.zoom;

    // Clamp to visible area
    const bubbleX = Math.max(100, Math.min(screenX, this.width - 100));
    const bubbleY = Math.max(40, Math.min(screenY, this.height - SUBTITLE_HEIGHT - 60));

    // Measure and wrap text
    ctx.font = `${BUBBLE_FONT_SIZE}px "Segoe UI", sans-serif`;
    const lines = this.wrapText(ctx, subtitle.text, BUBBLE_MAX_WIDTH - BUBBLE_PADDING * 2);
    const textW = Math.min(
      BUBBLE_MAX_WIDTH,
      Math.max(...lines.map(l => ctx.measureText(l).width)) + BUBBLE_PADDING * 2
    );
    const textH = lines.length * BUBBLE_LINE_HEIGHT + BUBBLE_PADDING * 2;

    const bx = bubbleX - textW / 2;
    const by = bubbleY - textH;

    ctx.save();

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Bubble background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.roundRect(ctx, bx, by, textW, textH, 10);
    ctx.fill();

    // Remove shadow for border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;
    this.roundRect(ctx, bx, by, textW, textH, 10);
    ctx.stroke();

    // Tail triangle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(bubbleX - 8, by + textH);
    ctx.lineTo(bubbleX, by + textH + 12);
    ctx.lineTo(bubbleX + 8, by + textH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#DDD';
    ctx.beginPath();
    ctx.moveTo(bubbleX - 8, by + textH);
    ctx.lineTo(bubbleX, by + textH + 12);
    ctx.lineTo(bubbleX + 8, by + textH);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#222';
    ctx.font = `${BUBBLE_FONT_SIZE}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + BUBBLE_PADDING, by + BUBBLE_PADDING + i * BUBBLE_LINE_HEIGHT);
    }

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Text wrapping
  // -----------------------------------------------------------------------

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    if (lines.length === 0) lines.push('');
    return lines;
  }

  // -----------------------------------------------------------------------
  // Drawing helpers
  // -----------------------------------------------------------------------

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private loadImage(key: string, src: string): void {
    if (this.imageCache.has(key)) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    this.imageCache.set(key, img);
  }

  // -----------------------------------------------------------------------
  // Public utilities
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

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.cameraSys.setSize(width, height);
  }

  destroy(): void {
    this.pause();
    this.imageCache.clear();
  }
}

// ---------------------------------------------------------------------------
// Standalone render functions for export/offscreen use
// ---------------------------------------------------------------------------

/**
 * Render a single frame to a given context, using the provided FrameState
 * and optional asset library.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  frameState: FrameState,
  width: number,
  height: number,
  assets?: AssetLibrary,
): void {
  // Create a temporary offscreen renderer-like wrapper
  const canvas = ctx.canvas;
  const renderer = new SceneRenderer(canvas, 24, assets);
  // We need to set a minimal shot to drive it
  // Instead, directly composite the layers:

  const cameraSys = new CameraSystem(width, height);

  ctx.clearRect(0, 0, width, height);

  // Camera transform
  ctx.save();
  const matrix = cameraSys.getViewMatrix(frameState.camera);
  ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(0.55, '#E0F0FF');
  grad.addColorStop(0.55, '#90C695');
  grad.addColorStop(1, '#4A8A4A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();

  // Subtitle
  if (frameState.activeSubtitle) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, height - SUBTITLE_HEIGHT, width, SUBTITLE_HEIGHT);
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(frameState.activeSubtitle.character, 20, height - SUBTITLE_HEIGHT + 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '15px sans-serif';
    ctx.fillText(frameState.activeSubtitle.text, 20, height - SUBTITLE_HEIGHT + 42);
  }
}

/**
 * Render an entire shot frame-by-frame, calling onFrame for each rendered frame.
 */
export async function renderShot(
  canvas: HTMLCanvasElement,
  shot: Shot,
  assets: AssetLibrary | undefined,
  onFrame?: (frameIndex: number, totalFrames: number, imageData: ImageData) => void,
  fps: number = 24,
): Promise<ImageData[]> {
  const renderer = new SceneRenderer(canvas, fps, assets);
  renderer.setShot(shot);

  const totalFrames = renderer.getTotalFrames();
  const frames: ImageData[] = [];
  const ctx = canvas.getContext('2d')!;

  for (let i = 0; i < totalFrames; i++) {
    renderer.renderFrame(i);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    frames.push(imageData);
    if (onFrame) {
      onFrame(i, totalFrames, imageData);
    }
    // Yield to event loop every 10 frames
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return frames;
}
