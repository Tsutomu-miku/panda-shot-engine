/**
 * panda-shot-engine — Camera System
 *
 * Handles camera angle resolution, panning, zooming, shake, and the
 * generation of a DOMMatrix view transform for Canvas2D rendering.
 */

import type {
  CameraCommand,
  CameraState,
  SemanticPosition,
  VerticalPosition,
} from './types';
import { defaultCameraState } from './types';
import { resolveEasing, type EasingFn } from './easing';
import { linear } from './easing';

// ---------------------------------------------------------------------------
// Zoom presets by camera angle
// ---------------------------------------------------------------------------

const ZOOM_PRESETS: Record<string, number> = {
  wide: 1.0,
  medium: 1.5,
  'close-up': 2.5,
};

// ---------------------------------------------------------------------------
// CameraSystem
// ---------------------------------------------------------------------------

export class CameraSystem {
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /** Update dimensions if the canvas is resized. */
  setSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  // -----------------------------------------------------------------------
  // Semantic position → pixel coordinates
  // -----------------------------------------------------------------------

  /**
   * Convert a semantic horizontal + vertical position pair into canvas-pixel
   * coordinates. The coordinate system origin is at the top-left.
   */
  resolveSemanticPosition(
    pos: SemanticPosition,
    vertical: VerticalPosition = 'middle',
    canvasW: number = this.canvasWidth,
    canvasH: number = this.canvasHeight,
  ): { x: number; y: number } {
    let x: number;
    switch (pos) {
      case 'far_left':
        x = canvasW * 0.1;
        break;
      case 'left':
        x = canvasW * 0.25;
        break;
      case 'center':
        x = canvasW * 0.5;
        break;
      case 'right':
        x = canvasW * 0.75;
        break;
      case 'far_right':
        x = canvasW * 0.9;
        break;
      default:
        x = canvasW * 0.5;
    }

    let y: number;
    switch (vertical) {
      case 'top':
        y = canvasH * 0.2;
        break;
      case 'middle':
        y = canvasH * 0.5;
        break;
      case 'bottom':
        y = canvasH * 0.8;
        break;
      default:
        y = canvasH * 0.5;
    }

    return { x, y };
  }

  // -----------------------------------------------------------------------
  // Apply a camera command over time
  // -----------------------------------------------------------------------

  /**
   * Given a `CameraCommand`, its start time (seconds), and the current
   * playback time (seconds), compute the interpolated `CameraState`.
   *
   * This function handles:
   *  - wide / medium / close-up — snap or ease to preset zoom & focus
   *  - pan  — linearly interpolate position
   *  - shake — random offset with exponential decay
   *  - zoom — explicit zoom level
   */
  applyCommand(
    cmd: CameraCommand,
    startTime: number,
    currentTime: number,
    prevState: CameraState = defaultCameraState(),
  ): CameraState {
    const duration = cmd.duration ?? 0.5;
    const elapsed = currentTime - startTime;
    const rawProgress = duration > 0 ? elapsed / duration : 1;
    const progress = Math.min(Math.max(rawProgress, 0), 1);
    const eased = linear(progress); // camera transitions use linear by default

    const state: CameraState = { ...prevState };

    switch (cmd.type) {
      // --- Angle presets ---
      case 'wide':
      case 'medium':
      case 'close-up': {
        const targetZoom = ZOOM_PRESETS[cmd.type] ?? 1;
        state.zoom = lerp(prevState.zoom, targetZoom, eased);

        // If a target position was specified, focus on it
        if (cmd.position) {
          const targetPos = this.resolveSemanticPosition(
            cmd.position,
            cmd.verticalPosition ?? 'middle',
          );
          state.x = lerp(prevState.x, targetPos.x, eased);
          state.y = lerp(prevState.y, targetPos.y, eased);
        }
        break;
      }

      // --- Pan ---
      case 'pan': {
        if (cmd.position) {
          const targetPos = this.resolveSemanticPosition(
            cmd.position,
            cmd.verticalPosition ?? 'middle',
          );
          state.x = lerp(prevState.x, targetPos.x, eased);
          state.y = lerp(prevState.y, targetPos.y, eased);
        }
        break;
      }

      // --- Shake ---
      case 'shake': {
        const intensity = cmd.intensity ?? 8;
        const decay = Math.pow(cmd.duration ? 0.05 : 0.9, progress);
        const shakeX = (Math.random() * 2 - 1) * intensity * decay;
        const shakeY = (Math.random() * 2 - 1) * intensity * decay;
        state.shakeIntensity = intensity * decay;
        state.shakeDecay = decay;
        state.x = prevState.x + shakeX;
        state.y = prevState.y + shakeY;
        break;
      }

      // --- Explicit zoom ---
      case 'zoom': {
        const targetZoom = cmd.zoomLevel ?? 1;
        state.zoom = lerp(prevState.zoom, targetZoom, eased);
        break;
      }
    }

    return state;
  }

  // -----------------------------------------------------------------------
  // View matrix (for canvas context transform)
  // -----------------------------------------------------------------------

  /**
   * Build a DOMMatrix that, when applied to a CanvasRenderingContext2D,
   * shifts and scales the scene according to the camera state.
   *
   * The camera conceptually "looks at" (state.x, state.y) with the given
   * zoom and rotation.  We translate so the focus point sits at the center
   * of the canvas, then apply zoom and rotation around that center.
   */
  getViewMatrix(state: CameraState): DOMMatrix {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;

    const m = new DOMMatrix();

    // 1. Move canvas center to origin
    m.translateSelf(cx, cy);

    // 2. Apply zoom
    m.scaleSelf(state.zoom, state.zoom);

    // 3. Apply rotation
    if (state.rotation !== 0) {
      m.rotateSelf((state.rotation * 180) / Math.PI);
    }

    // 4. Translate so that the camera target is at origin
    m.translateSelf(-state.x, -state.y);

    // 5. Apply shake offset
    if (state.shakeIntensity > 0.01) {
      const shakeX =
        (Math.random() * 2 - 1) * state.shakeIntensity;
      const shakeY =
        (Math.random() * 2 - 1) * state.shakeIntensity;
      m.translateSelf(shakeX, shakeY);
    }

    return m;
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
