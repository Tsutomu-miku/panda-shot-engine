// ============================================================
// panda-shot-engine — Canvas Preview Component
// Full scene rendering with characters, backgrounds, dialogues,
// camera effects, drag-to-move, HUD overlay
// ============================================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import { getScenePreset, SceneRenderPreset } from '../../demo/demo-project';
import type { Shot, PlaceCommand, TimelineEvent, Command, CameraCommand } from '../../../core/dsl/types';

// ─── Types ──────────────────────────────────────────────────

type Expression = 'neutral' | 'happy' | 'angry' | 'shocked' | 'smirk' | 'crying';

interface CharacterRenderState {
  id: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  scale: number;
  expression: Expression;
  action: string | null;
  dialogueText: string | null;
  dialogueVoice: string | null;
}

interface CameraRenderState {
  type: string;
  target: string | null;
  zoom: number;
  shakeIntensity: number;
  shakeTime: number;
  panX: number;
  panY: number;
}

// ─── Semantic Position Mapping ──────────────────────────────

function semanticToX(semantic: string | undefined): number {
  const map: Record<string, number> = {
    'far-left': 0.1,
    'left-third': 0.25,
    'left': 0.2,
    'center-left': 0.35,
    'center': 0.5,
    'center-right': 0.65,
    'right': 0.8,
    'right-third': 0.75,
    'far-right': 0.9,
  };
  return map[semantic ?? 'center'] ?? 0.5;
}

// ─── Compute Frame State from DSL Shot ──────────────────────

function computeCharactersAtTime(
  shot: Shot,
  time: number,
): CharacterRenderState[] {
  const characters: Map<string, CharacterRenderState> = new Map();

  // Initialize from placements
  for (const p of shot.placements) {
    characters.set(p.character, {
      id: p.character,
      x: semanticToX(p.position.semantic),
      y: 0.65,
      facing: p.facing,
      scale: p.scale ?? 1.0,
      expression: 'neutral',
      action: null,
      dialogueText: null,
      dialogueVoice: null,
    });
  }

  // Apply timeline events up to current time
  for (const ev of shot.timeline) {
    if (ev.time > time) break;
    for (const cmd of ev.commands) {
      if (cmd.type === 'expression' && characters.has(cmd.character)) {
        const ch = characters.get(cmd.character)!;
        ch.expression = cmd.expression as Expression;
        ch.dialogueText = null; // clear old dialogue
      }
      if (cmd.type === 'say' && characters.has(cmd.character)) {
        const ch = characters.get(cmd.character)!;
        ch.dialogueText = cmd.text;
        ch.dialogueVoice = cmd.voice ?? null;
      }
      if (cmd.type === 'action' && characters.has(cmd.character)) {
        const ch = characters.get(cmd.character)!;
        ch.action = cmd.action;
      }
      if (cmd.type === 'enter') {
        const toX = semanticToX(cmd.to.semantic);
        const fromX = semanticToX(cmd.from.semantic);
        // Check if enter is still in progress
        const enterDuration = 1.5; // default enter duration
        const elapsed = time - ev.time;
        const progress = Math.min(1, elapsed / enterDuration);
        const currentX = fromX + (toX - fromX) * progress;
        characters.set(cmd.character, {
          id: cmd.character,
          x: currentX,
          y: 0.65,
          facing: cmd.facing,
          scale: 1.0,
          expression: 'neutral',
          action: cmd.action ?? 'walk',
          dialogueText: null,
          dialogueVoice: null,
        });
      }
    }
  }

  // Clear dialogue that is old (more than 2s)
  for (const ev of shot.timeline) {
    if (ev.time > time) break;
    for (const cmd of ev.commands) {
      if (cmd.type === 'say' && characters.has(cmd.character)) {
        if (time - ev.time > 2.0) {
          const ch = characters.get(cmd.character)!;
          if (ch.dialogueText === cmd.text) {
            ch.dialogueText = null;
          }
        }
      }
    }
  }

  return Array.from(characters.values());
}

function computeCameraAtTime(shot: Shot, time: number): CameraRenderState {
  const cam: CameraRenderState = {
    type: 'wide',
    target: null,
    zoom: 1.0,
    shakeIntensity: 0,
    shakeTime: 0,
    panX: 0,
    panY: 0,
  };

  for (const ev of shot.timeline) {
    if (ev.time > time) break;
    for (const cmd of ev.commands) {
      if (cmd.type === 'camera') {
        cam.type = cmd.cameraType;
        cam.target = cmd.target ?? null;
        if (cmd.cameraType === 'close-up') {
          cam.zoom = 1.8;
        } else if (cmd.cameraType === 'medium') {
          cam.zoom = 1.3;
        } else if (cmd.cameraType === 'extreme-close-up') {
          cam.zoom = 2.5;
        } else {
          cam.zoom = 1.0;
        }
        if (cmd.motion === 'shake' && cmd.duration) {
          const elapsed = time - ev.time;
          if (elapsed < cmd.duration) {
            cam.shakeIntensity = cmd.intensity ?? 5;
            cam.shakeTime = elapsed;
          } else {
            cam.shakeIntensity = 0;
          }
        }
        if (cmd.motion === 'zoom-in') cam.zoom *= 1.3;
        if (cmd.motion === 'zoom-out') cam.zoom *= 0.8;
        if (cmd.motion === 'pan-left') cam.panX -= 50;
        if (cmd.motion === 'pan-right') cam.panX += 50;
      }
    }
  }
  return cam;
}

// ─── Background Rendering ───────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  sceneId: string,
  time: number,
) {
  const preset = getScenePreset(sceneId);

  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, preset.bgGradientStart);
  grad.addColorStop(0.7, preset.bgGradientEnd);
  grad.addColorStop(1, preset.floorColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Floor
  const floorY = H * 0.78;
  ctx.fillStyle = preset.floorColor;
  ctx.fillRect(0, floorY, W, H - floorY);

  // Floor highlight line
  ctx.strokeStyle = preset.floorHighlight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(W, floorY);
  ctx.stroke();

  // Scene-specific details
  if (sceneId === 'inn_interior' || sceneId.includes('inn')) {
    drawInnDetails(ctx, W, H, floorY, time, preset);
  } else if (sceneId === 'forest_night' || sceneId.includes('forest')) {
    drawForestDetails(ctx, W, H, floorY, time, preset);
  } else if (sceneId === 'throne_room' || sceneId.includes('throne')) {
    drawThroneDetails(ctx, W, H, floorY, preset);
  } else if (sceneId === 'street_ancient' || sceneId.includes('street')) {
    drawStreetDetails(ctx, W, H, floorY, preset);
  } else if (sceneId === 'mountain_top' || sceneId.includes('mountain')) {
    drawMountainDetails(ctx, W, H, floorY, preset);
  } else if (sceneId === 'marketplace' || sceneId.includes('market')) {
    drawMarketDetails(ctx, W, H, floorY, preset);
  }

  // Ambient lighting overlay
  if (preset.lightingIntensity > 0) {
    const lightGrad = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.7);
    lightGrad.addColorStop(0, `${preset.lightingColor}${Math.round(preset.lightingIntensity * 40).toString(16).padStart(2, '0')}`);
    lightGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // Ambient particles
  if (preset.ambientParticles) {
    drawParticles(ctx, W, H, time, preset.lightingColor);
  }
}

function drawInnDetails(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  floorY: number, time: number, preset: SceneRenderPreset,
) {
  // Wooden beams on ceiling
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 6;
  for (let i = 0; i < 5; i++) {
    const x = W * (0.1 + i * 0.2);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H * 0.15);
    ctx.stroke();
  }

  // Horizontal beam
  ctx.beginPath();
  ctx.moveTo(0, H * 0.15);
  ctx.lineTo(W, H * 0.15);
  ctx.stroke();

  // Lanterns (flickering)
  const flicker = Math.sin(time * 5) * 0.1 + 0.9;
  for (let i = 0; i < 3; i++) {
    const lx = W * (0.2 + i * 0.3);
    const ly = H * 0.18;
    // Glow
    const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 40 * flicker);
    glow.addColorStop(0, `rgba(255, 170, 50, ${0.3 * flicker})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 50, ly - 50, 100, 100);
    // Lantern body
    ctx.fillStyle = '#c62828';
    ctx.fillRect(lx - 6, ly - 10, 12, 20);
    ctx.fillStyle = '#ffab00';
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tables on floor
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(W * 0.15, floorY - 20, 60, 20);
  ctx.fillRect(W * 0.65, floorY - 20, 60, 20);
  // Table legs
  ctx.fillRect(W * 0.15 + 5, floorY, 4, 15);
  ctx.fillRect(W * 0.15 + 51, floorY, 4, 15);
  ctx.fillRect(W * 0.65 + 5, floorY, 4, 15);
  ctx.fillRect(W * 0.65 + 51, floorY, 4, 15);

  // Wine jars
  ctx.fillStyle = '#6d4c41';
  ctx.beginPath();
  ctx.arc(W * 0.18 + 30, floorY - 28, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawForestDetails(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  floorY: number, time: number, _preset: SceneRenderPreset,
) {
  // Bamboo stalks
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const x = W * (0.05 + i * 0.13) + Math.sin(time + i) * 2;
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x + Math.sin(time * 0.5 + i) * 3, H * 0.05);
    ctx.stroke();
    // Bamboo nodes
    for (let j = 1; j < 5; j++) {
      const ny = floorY - (floorY - H * 0.05) * (j / 5);
      ctx.fillStyle = '#388e3c';
      ctx.fillRect(x - 3, ny - 2, 6, 4);
    }
  }

  // Moon
  ctx.fillStyle = '#e8eaf6';
  ctx.beginPath();
  ctx.arc(W * 0.8, H * 0.12, 25, 0, Math.PI * 2);
  ctx.fill();
  // Moon glow
  const moonGlow = ctx.createRadialGradient(W * 0.8, H * 0.12, 20, W * 0.8, H * 0.12, 80);
  moonGlow.addColorStop(0, 'rgba(200, 220, 255, 0.15)');
  moonGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(W * 0.6, 0, W * 0.4, H * 0.3);
}

function drawThroneDetails(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  floorY: number, _preset: SceneRenderPreset,
) {
  // Pillars
  ctx.fillStyle = '#6d4c41';
  for (let i = 0; i < 4; i++) {
    const x = W * (0.1 + i * 0.27);
    ctx.fillRect(x - 8, H * 0.1, 16, floorY - H * 0.1);
    // Pillar cap
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(x - 12, H * 0.1 - 4, 24, 8);
    ctx.fillRect(x - 12, floorY - 4, 24, 8);
    ctx.fillStyle = '#6d4c41';
  }

  // Throne at center back
  ctx.fillStyle = '#b71c1c';
  ctx.fillRect(W * 0.42, floorY - 50, W * 0.16, 50);
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(W * 0.42, floorY - 55, W * 0.16, 8);
  // Throne back
  ctx.fillStyle = '#c62828';
  ctx.fillRect(W * 0.44, floorY - 80, W * 0.12, 30);
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.arc(W * 0.5, floorY - 85, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawStreetDetails(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  floorY: number, _preset: SceneRenderPreset,
) {
  // Stone pavement lines
  ctx.strokeStyle = '#455a64';
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const x = i * (W / 20);
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  // Buildings silhouettes
  ctx.fillStyle = '#263238';
  ctx.fillRect(0, H * 0.2, W * 0.15, floorY - H * 0.2);
  ctx.fillRect(W * 0.85, H * 0.25, W * 0.15, floorY - H * 0.25);
  // Roofs
  ctx.fillStyle = '#37474f';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.2);
  ctx.lineTo(W * 0.075, H * 0.12);
  ctx.lineTo(W * 0.15, H * 0.2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W * 0.85, H * 0.25);
  ctx.lineTo(W * 0.925, H * 0.17);
  ctx.lineTo(W, H * 0.25);
  ctx.fill();
}

function drawMountainDetails(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  floorY: number, _preset: SceneRenderPreset,
) {
  // Distant mountains
  ctx.fillStyle = '#455a64';
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(W * 0.2, H * 0.3);
  ctx.lineTo(W * 0.4, floorY * 0.6);
  ctx.lineTo(W * 0.6, H * 0.2);
  ctx.lineTo(W * 0.8, floorY * 0.5);
  ctx.lineTo(W, H * 0.35);
  ctx.lineTo(W, floorY);
  ctx.fill();

  // Clouds
  ctx.fillStyle = 'rgba(200, 200, 220, 0.1)';
  for (let i = 0; i < 4; i++) {
    const cx = W * (0.15 + i * 0.22);
    const cy = H * (0.15 + i * 0.05);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 40, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMarketDetails(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  floorY: number, _preset: SceneRenderPreset,
) {
  // Market stalls
  for (let i = 0; i < 3; i++) {
    const sx = W * (0.1 + i * 0.3);
    // Stall roof
    ctx.fillStyle = '#bf360c';
    ctx.beginPath();
    ctx.moveTo(sx, floorY - 45);
    ctx.lineTo(sx + 30, floorY - 60);
    ctx.lineTo(sx + 60, floorY - 45);
    ctx.fill();
    // Stall body
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(sx, floorY - 45, 60, 45);
    // Stall counter
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(sx - 5, floorY - 20, 70, 5);
  }

  // Hanging banners
  ctx.fillStyle = '#c62828';
  ctx.fillRect(W * 0.5 - 5, H * 0.1, 10, 50);
  ctx.fillRect(W * 0.5 - 15, H * 0.1, 30, 8);
}

function drawParticles(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  time: number, color: string,
) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 15; i++) {
    const seed = i * 137.5;
    const px = ((seed * 0.618 + time * 10 * (0.3 + (i % 3) * 0.2)) % W + W) % W;
    const py = ((seed * 0.314 + time * 8 * (0.2 + (i % 4) * 0.15)) % H + H) % H;
    const size = 1.5 + (i % 3);
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Character Drawing ──────────────────────────────────────

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  ch: CharacterRenderState,
  W: number,
  H: number,
  isSelected: boolean,
) {
  const x = ch.x * W;
  const y = ch.y * H;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(ch.scale, ch.scale);

  if (ch.facing === 'left') {
    ctx.scale(-1, 1);
  }

  const headR = 28;

  // Selection highlight
  if (isSelected) {
    ctx.strokeStyle = '#536dfe';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-40, -headR - 15, 80, headR * 2 + 100);
    ctx.setLineDash([]);
  }

  // ─── Body (rectangle) ───
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(-18, headR - 2, 36, 44);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-18, headR - 2, 36, 44);

  // ─── Limbs ───
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  // Action-based arm poses
  if (ch.action === 'sword_slash' || ch.action === 'sword_draw') {
    // Right arm up with sword
    ctx.beginPath();
    ctx.moveTo(18, headR + 6);
    ctx.lineTo(40, headR - 15);
    ctx.stroke();
    // Sword
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, headR - 15);
    ctx.lineTo(55, headR - 40);
    ctx.stroke();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    // Left arm guard
    ctx.beginPath();
    ctx.moveTo(-18, headR + 6);
    ctx.lineTo(-30, headR + 15);
    ctx.stroke();
  } else if (ch.action === 'block') {
    // Arms crossed
    ctx.beginPath();
    ctx.moveTo(-18, headR + 6);
    ctx.lineTo(5, headR - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, headR + 6);
    ctx.lineTo(-5, headR - 5);
    ctx.stroke();
  } else if (ch.action === 'dodge') {
    // Leaning back
    ctx.beginPath();
    ctx.moveTo(-18, headR + 6);
    ctx.lineTo(-38, headR + 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, headR + 6);
    ctx.lineTo(38, headR + 20);
    ctx.stroke();
  } else if (ch.action === 'kick') {
    // Normal arms
    ctx.beginPath();
    ctx.moveTo(-18, headR + 6);
    ctx.lineTo(-34, headR + 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, headR + 6);
    ctx.lineTo(34, headR + 30);
    ctx.stroke();
  } else {
    // Default arms
    ctx.beginPath();
    ctx.moveTo(-18, headR + 6);
    ctx.lineTo(-34, headR + 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, headR + 6);
    ctx.lineTo(34, headR + 30);
    ctx.stroke();
  }

  // Legs
  if (ch.action === 'walk') {
    ctx.beginPath();
    ctx.moveTo(-10, headR + 42);
    ctx.lineTo(-20, headR + 64);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, headR + 42);
    ctx.lineTo(20, headR + 58);
    ctx.stroke();
  } else if (ch.action === 'kick') {
    ctx.beginPath();
    ctx.moveTo(-10, headR + 42);
    ctx.lineTo(-14, headR + 64);
    ctx.stroke();
    // Kicking leg extended
    ctx.beginPath();
    ctx.moveTo(10, headR + 42);
    ctx.lineTo(35, headR + 45);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-10, headR + 42);
    ctx.lineTo(-14, headR + 64);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, headR + 42);
    ctx.lineTo(14, headR + 64);
    ctx.stroke();
  }

  // ─── Head ───
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ─── Ears ───
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-20, -22, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, -22, 9, 0, Math.PI * 2);
  ctx.fill();

  // ─── Eye patches ───
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.ellipse(-10, -4, 10, 8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, -4, 10, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // ─── Eyes ───
  const expr = ch.expression;
  if (expr === 'shocked') {
    // Big round eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-10, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-10, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-10, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-9, -4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── Nose ───
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(0, 6, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // ─── Expression-specific mouth & extras ───
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  switch (expr) {
    case 'happy':
      ctx.beginPath();
      ctx.arc(0, 10, 8, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      break;
    case 'angry':
      // Angry eyebrows
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -13);
      ctx.lineTo(-6, -10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16, -13);
      ctx.lineTo(6, -10);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      // Square mouth
      ctx.fillStyle = '#333';
      ctx.fillRect(-6, 11, 12, 6);
      break;
    case 'shocked':
      // O-mouth
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.ellipse(0, 14, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'smirk':
      ctx.beginPath();
      ctx.arc(4, 11, 6, 0, 0.7 * Math.PI);
      ctx.stroke();
      break;
    case 'crying':
      // Sad mouth
      ctx.beginPath();
      ctx.arc(0, 18, 8, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();
      // Tears
      ctx.fillStyle = '#64b5f6';
      ctx.beginPath();
      ctx.ellipse(-12, 6, 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(12, 4, 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'neutral':
    default:
      ctx.beginPath();
      ctx.moveTo(-6, 13);
      ctx.lineTo(6, 13);
      ctx.stroke();
      break;
  }

  // ─── Name Label ───
  if (ch.facing === 'left') {
    ctx.scale(-1, 1); // undo flip for text
  }

  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const textW = ctx.measureText(ch.id).width + 14;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  const labelY = headR + 72;
  ctx.beginPath();
  (ctx as CanvasRenderingContext2D).roundRect(-textW / 2, labelY, textW, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(ch.id, 0, labelY + 3);

  ctx.restore();
}

// ─── Dialogue Bubble ────────────────────────────────────────

function drawDialogueBubble(
  ctx: CanvasRenderingContext2D,
  ch: CharacterRenderState,
  W: number,
  H: number,
) {
  if (!ch.dialogueText) return;

  const cx = ch.x * W;
  const cy = ch.y * H - 65 * ch.scale;

  ctx.save();
  ctx.font = '13px Inter, sans-serif';

  const text = ch.dialogueText;
  const maxLineWidth = 180;
  const lines: string[] = [];
  let currentLine = '';
  for (const char of text) {
    const testLine = currentLine + char;
    if (ctx.measureText(testLine).width > maxLineWidth) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = 18;
  const padding = 10;
  const bubbleW = Math.min(maxLineWidth + padding * 2, Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2);
  const bubbleH = lines.length * lineHeight + padding * 2;
  const bx = cx - bubbleW / 2;
  const by = cy - bubbleH - 15;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  (ctx as CanvasRenderingContext2D).roundRect(bx + 2, by + 2, bubbleW, bubbleH, 8);
  ctx.fill();

  // Bubble
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  (ctx as CanvasRenderingContext2D).roundRect(bx, by, bubbleW, bubbleH, 8);
  ctx.fill();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Triangle pointer
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx - 6, by + bubbleH);
  ctx.lineTo(cx, by + bubbleH + 10);
  ctx.lineTo(cx + 6, by + bubbleH);
  ctx.fill();
  ctx.strokeStyle = '#ccc';
  ctx.beginPath();
  ctx.moveTo(cx - 6, by + bubbleH);
  ctx.lineTo(cx, by + bubbleH + 10);
  ctx.lineTo(cx + 6, by + bubbleH);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, by + padding + i * lineHeight);
  }

  ctx.restore();
}

// ─── Subtitle Bar ───────────────────────────────────────────

function drawSubtitleBar(
  ctx: CanvasRenderingContext2D,
  characters: CharacterRenderState[],
  W: number,
  H: number,
) {
  // Find the latest dialogue
  const speaking = characters.find((c) => c.dialogueText);
  if (!speaking) return;

  const barH = 36;
  const barY = H - barH - 10;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(W * 0.1, barY, W * 0.8, barH);

  ctx.font = '14px Inter, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = `${speaking.id}: ${speaking.dialogueText}`;
  ctx.fillText(label, W * 0.5, barY + barH / 2, W * 0.75);
}

// ─── HUD Overlay ────────────────────────────────────────────

function drawHUD(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  shot: Shot,
  time: number,
  camera: CameraRenderState,
) {
  ctx.save();
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const info = [
    `Shot: ${shot.id}`,
    `Time: ${time.toFixed(2)}s / ${shot.duration}s`,
    `Camera: ${camera.type}${camera.target ? ' -> ' + camera.target : ''}`,
    `Set: ${shot.set}`,
  ];
  for (let i = 0; i < info.length; i++) {
    ctx.fillText(info[i], 10, 10 + i * 14);
  }

  // Safe area
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  const m = 0.05;
  ctx.strokeRect(W * m, H * m, W * (1 - 2 * m), H * (1 - 2 * m));
  ctx.setLineDash([]);

  ctx.restore();
}

// ─── Canvas Preview Component ───────────────────────────────

const ZOOM_OPTIONS = [50, 75, 100, 150];

const CanvasPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { state, dispatch, currentShot } = useEditor();
  const [draggingChar, setDraggingChar] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    if (W === 0 || H === 0) return;

    ctx.clearRect(0, 0, W, H);

    if (!currentShot) {
      // Empty state
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, W, H);
      ctx.font = '16px Inter, sans-serif';
      ctx.fillStyle = '#606080';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No shot selected', W / 2, H / 2);
      return;
    }

    const time = state.currentTime;
    const camera = computeCameraAtTime(currentShot, time);
    const characters = computeCharactersAtTime(currentShot, time);

    // Apply camera transform
    ctx.save();

    // Shake effect
    if (camera.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * camera.shakeIntensity * 2;
      const shakeY = (Math.random() - 0.5) * camera.shakeIntensity * 2;
      ctx.translate(shakeX, shakeY);
    }

    // Camera zoom and pan
    if (camera.zoom !== 1.0) {
      const zoomCenterX = camera.target
        ? (characters.find((c) => c.id === camera.target)?.x ?? 0.5) * W
        : W / 2;
      const zoomCenterY = camera.target
        ? (characters.find((c) => c.id === camera.target)?.y ?? 0.5) * H
        : H * 0.5;
      ctx.translate(zoomCenterX, zoomCenterY);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-zoomCenterX + camera.panX, -zoomCenterY + camera.panY);
    }

    // Draw background
    drawBackground(ctx, W, H, currentShot.set, time);

    // Draw characters sorted by y position (back to front)
    const sorted = [...characters].sort((a, b) => a.y - b.y);
    for (const ch of sorted) {
      const isSelected =
        state.selectedElement?.type === 'character' &&
        state.selectedElement?.id === ch.id;
      drawCharacter(ctx, ch, W, H, isSelected);
    }

    // Draw dialogue bubbles
    for (const ch of sorted) {
      drawDialogueBubble(ctx, ch, W, H);
    }

    ctx.restore(); // remove camera transform

    // Draw subtitle bar (outside camera transform)
    drawSubtitleBar(ctx, characters, W, H);

    // Draw HUD
    drawHUD(ctx, W, H, currentShot, time, camera);
  }, [currentShot, state.currentTime, state.selectedElement]);

  // Resize & redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const maxW = rect.width - 24;
      const maxH = rect.height - 24;
      const zoom = state.zoom / 100;

      let w = maxW * zoom;
      let h = w * (9 / 16);
      if (h > maxH * zoom) {
        h = maxH * zoom;
        w = h * (16 / 9);
      }

      canvas.width = Math.floor(Math.max(100, w));
      canvas.height = Math.floor(Math.max(56, h));
      draw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [draw, state.zoom]);

  // Redraw on state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Playback animation loop
  useEffect(() => {
    if (!state.isPlaying || !currentShot) return;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000 * state.playbackSpeed;
      lastTime = now;
      const nextTime = state.currentTime + dt;

      if (nextTime >= currentShot.duration) {
        dispatch({ type: 'PAUSE' });
        dispatch({ type: 'SEEK', time: currentShot.duration });
      } else {
        dispatch({ type: 'SEEK', time: nextTime });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.isPlaying, state.playbackSpeed, currentShot]);

  // Mouse handlers for character drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !currentShot) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;

      const characters = computeCharactersAtTime(currentShot, state.currentTime);
      // Find clicked character (check in reverse order for top-most)
      for (let i = characters.length - 1; i >= 0; i--) {
        const ch = characters[i];
        const dx = Math.abs(mx - ch.x);
        const dy = Math.abs(my - ch.y);
        if (dx < 0.06 && dy < 0.12) {
          setDraggingChar(ch.id);
          setDragOffset({ x: mx - ch.x, y: my - ch.y });
          dispatch({
            type: 'SELECT_ELEMENT',
            element: {
              type: 'character',
              shotIndex: state.currentShotIndex,
              id: ch.id,
            },
          });
          return;
        }
      }

      // Click on empty area: select shot
      dispatch({
        type: 'SELECT_ELEMENT',
        element: {
          type: 'shot',
          shotIndex: state.currentShotIndex,
          id: currentShot.id,
        },
      });
    },
    [currentShot, state.currentTime, state.currentShotIndex, dispatch],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!draggingChar || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const _mx = (e.clientX - rect.left) / rect.width;
      const _my = (e.clientY - rect.top) / rect.height;
      // Visual feedback during drag is handled by the draw loop
      // Actual position update happens on mouse up
    },
    [draggingChar],
  );

  const handleMouseUp = useCallback(() => {
    setDraggingChar(null);
  }, []);

  return (
    <div className="panel canvas-panel">
      <span className="canvas-panel__shot-id">
        {currentShot ? `# ${currentShot.id}` : 'No shot selected'}
      </span>

      <div className="canvas-panel__wrapper" ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          className="canvas-panel__canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="canvas-panel__zoom">
        {ZOOM_OPTIONS.map((z) => (
          <button
            key={z}
            className={`btn btn--small ${state.zoom === z ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ZOOM', zoom: z })}
          >
            {z}%
          </button>
        ))}
      </div>
    </div>
  );
};

export default CanvasPreview;
