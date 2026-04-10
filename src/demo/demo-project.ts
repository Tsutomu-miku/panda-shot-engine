/**
 * Demo Project — Sample data using image-based character system
 * 
 * In a real app, images would be loaded from files.
 * Here we use inline SVG data URLs as placeholder illustrations.
 */

import { CharacterAsset, SceneAsset, ExpressionSet, DslShot, PandaProject } from '../core/project/types';

// ─── Placeholder SVG generators ─────────────────────────────

function svgDataUrl(svg: string): string {
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

function makePartSvg(label: string, color: string, w = 64, h = 64): string {
  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<rect width="${w}" height="${h}" rx="8" fill="${color}" opacity="0.8"/>` +
    `<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="10" font-family="sans-serif">${label}</text>` +
    `</svg>`
  );
}

function makeExpressionSvg(emoji: string, color: string, w = 48, h = 48): string {
  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<circle cx="${w/2}" cy="${h/2}" r="${w/2 - 2}" fill="${color}" opacity="0.3"/>` +
    `<text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-size="24">${emoji}</text>` +
    `</svg>`
  );
}

function makeThumbnailSvg(label: string, color: string): string {
  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">` +
    `<rect width="80" height="80" rx="12" fill="${color}"/>` +
    `<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="12" font-family="sans-serif">${label}</text>` +
    `</svg>`
  );
}

// ─── Demo Expression Sets ───────────────────────────────────

function makeExpressions(color: string): Record<string, ExpressionSet> {
  return {
    neutral: {
      id: 'neutral', name: 'Neutral',
      eyesImage: makeExpressionSvg('👀', color),
      mouthImage: makeExpressionSvg('😐', color),
      thumbnail: makeExpressionSvg('😐', color),
    },
    happy: {
      id: 'happy', name: 'Happy',
      eyesImage: makeExpressionSvg('😊', color),
      mouthImage: makeExpressionSvg('😄', color),
      thumbnail: makeExpressionSvg('😄', color),
    },
    angry: {
      id: 'angry', name: 'Angry',
      eyesImage: makeExpressionSvg('😠', color),
      mouthImage: makeExpressionSvg('😤', color),
      eyebrowImage: makeExpressionSvg('🤨', color),
      overlayImage: makeExpressionSvg('💢', '#f38ba8'),
      thumbnail: makeExpressionSvg('😠', color),
    },
    surprised: {
      id: 'surprised', name: 'Surprised',
      eyesImage: makeExpressionSvg('😲', color),
      mouthImage: makeExpressionSvg('😮', color),
      thumbnail: makeExpressionSvg('😮', color),
    },
    sad: {
      id: 'sad', name: 'Sad',
      eyesImage: makeExpressionSvg('😢', color),
      mouthImage: makeExpressionSvg('😞', color),
      overlayImage: makeExpressionSvg('💧', '#89b4fa'),
      thumbnail: makeExpressionSvg('😢', color),
    },
    smirk: {
      id: 'smirk', name: 'Smirk',
      eyesImage: makeExpressionSvg('😏', color),
      mouthImage: makeExpressionSvg('😏', color),
      thumbnail: makeExpressionSvg('😏', color),
    },
  };
}

// ─── Demo Characters ────────────────────────────────────────

function makeCharacterParts(color: string, label: string): Record<string, string> {
  return {
    head: makePartSvg(`${label}\nHead`, color, 64, 64),
    body: makePartSvg(`${label}\nBody`, color, 48, 72),
    left_arm: makePartSvg('L.Arm', color, 24, 56),
    right_arm: makePartSvg('R.Arm', color, 24, 56),
    left_leg: makePartSvg('L.Leg', color, 28, 56),
    right_leg: makePartSvg('R.Leg', color, 28, 56),
  };
}

export const DEMO_CHARACTERS: CharacterAsset[] = [
  {
    id: 'hero',
    name: 'Hero',
    style: 'humanoid',
    parts: makeCharacterParts('#89b4fa', 'Hero'),
    expressions: makeExpressions('#89b4fa'),
    skeletonType: 'humanoid',
    thumbnail: makeThumbnailSvg('Hero', '#1e3a5f'),
    description: 'Main protagonist with blue theme',
  },
  {
    id: 'villain',
    name: 'Villain',
    style: 'humanoid',
    parts: makeCharacterParts('#f38ba8', 'Villain'),
    expressions: makeExpressions('#f38ba8'),
    skeletonType: 'humanoid',
    thumbnail: makeThumbnailSvg('Villain', '#5f1e2e'),
    description: 'Antagonist with red theme',
  },
  {
    id: 'sidekick',
    name: 'Sidekick',
    style: 'chibi',
    parts: makeCharacterParts('#a6e3a1', 'Sidekick'),
    expressions: makeExpressions('#a6e3a1'),
    skeletonType: 'chibi',
    thumbnail: makeThumbnailSvg('Sidekick', '#1e5f2e'),
    description: 'Comic relief chibi character',
  },
  {
    id: 'elder',
    name: 'Elder',
    style: 'humanoid',
    parts: makeCharacterParts('#cba6f7', 'Elder'),
    expressions: makeExpressions('#cba6f7'),
    skeletonType: 'humanoid',
    thumbnail: makeThumbnailSvg('Elder', '#3a1e5f'),
    description: 'Wise elder character',
  },
  {
    id: 'beast',
    name: 'Wild Beast',
    style: 'beast',
    parts: makeCharacterParts('#fab387', 'Beast'),
    expressions: makeExpressions('#fab387'),
    skeletonType: 'beast',
    thumbnail: makeThumbnailSvg('Beast', '#5f3a1e'),
    description: 'A wild beast creature',
  },
];

// ─── Demo Scenes ────────────────────────────────────────────

export const DEMO_SCENES: SceneAsset[] = [
  {
    id: 'tavern_interior',
    name: 'Tavern Interior',
    color: '#795548',
    gradientStart: '#3e2723',
    gradientEnd: '#1a0e0a',
    description: 'A warm tavern with wooden furniture',
    floorY: 0.78,
  },
  {
    id: 'dark_forest',
    name: 'Dark Forest',
    color: '#1b5e20',
    gradientStart: '#0d2818',
    gradientEnd: '#050f08',
    description: 'A spooky forest at night',
    floorY: 0.82,
  },
  {
    id: 'mountain_cliff',
    name: 'Mountain Cliff',
    color: '#546e7a',
    gradientStart: '#263238',
    gradientEnd: '#0d1518',
    description: 'High cliff overlooking the valley',
    floorY: 0.75,
  },
  {
    id: 'throne_room',
    name: 'Throne Room',
    color: '#b71c1c',
    gradientStart: '#3e0a0a',
    gradientEnd: '#1a0404',
    description: 'Grand throne room of the castle',
    floorY: 0.80,
  },
  {
    id: 'village_square',
    name: 'Village Square',
    color: '#ff6f00',
    gradientStart: '#4a2000',
    gradientEnd: '#1a0b00',
    description: 'Busy village marketplace',
    floorY: 0.78,
  },
  {
    id: 'moonlit_lake',
    name: 'Moonlit Lake',
    color: '#0d47a1',
    gradientStart: '#0a1929',
    gradientEnd: '#040d17',
    description: 'A serene lake under moonlight',
    floorY: 0.85,
  },
];

export interface SceneRenderPreset {
  bgGradientStart: string;
  bgGradientEnd: string;
  floorColor: string;
  floorHighlight: string;
}

const DEFAULT_SCENE_PRESET: SceneRenderPreset = {
  bgGradientStart: '#3e2723',
  bgGradientEnd: '#1a0e0a',
  floorColor: '#2d2018',
  floorHighlight: 'rgba(255, 255, 255, 0.14)',
};

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(255, 255, 255, ${alpha})`;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getScenePreset(sceneId: string): SceneRenderPreset {
  const scene = DEMO_SCENES.find((item) => item.id === sceneId);
  if (!scene) return DEFAULT_SCENE_PRESET;

  return {
    bgGradientStart: scene.gradientStart || DEFAULT_SCENE_PRESET.bgGradientStart,
    bgGradientEnd: scene.gradientEnd || DEFAULT_SCENE_PRESET.bgGradientEnd,
    floorColor: scene.color || DEFAULT_SCENE_PRESET.floorColor,
    floorHighlight: withAlpha(scene.color || '#ffffff', 0.28),
  };
}

// ─── Demo DSL Story ─────────────────────────────────────────

export const DEMO_SHOTS: DslShot[] = [
  {
    id: 'shot_001',
    label: 'Scene 1 – Tavern Meeting',
    dsl: `scene tavern_interior\n  camera wide\n  enter hero from left\n    expression happy\n    walk_to 0.3\n  enter sidekick from right\n    expression surprised\n    walk_to 0.7\n  hero\n    action wave\n    say "Ready for adventure?"\n  sidekick\n    expression happy\n    action nod\n    say "Always!"`,
    duration: 5,
  },
  {
    id: 'shot_002',
    label: 'Scene 2 – Forest Encounter',
    dsl: `scene dark_forest\n  camera tracking\n  enter hero from left\n    expression neutral\n    walk_to 0.4\n  enter villain from right\n    expression smirk\n    walk_to 0.6\n  villain\n    action sword_slash\n    say "Going somewhere?"\n  hero\n    expression angry\n    action punch\n    say "Out of my way!"`,
    duration: 6,
  },
  {
    id: 'shot_003',
    label: 'Scene 3 – Victory',
    dsl: `scene mountain_cliff\n  camera close_up hero\n  hero\n    expression happy\n    action idle\n    say "We did it!"\n  enter sidekick from left\n    expression happy\n    action jump\n  camera wide\n  hero\n    action wave\n  sidekick\n    action wave`,
    duration: 4,
  },
];

export const SHOT_1_DSL = DEMO_SHOTS[0]?.dsl ?? '';
export const SHOT_2_DSL = DEMO_SHOTS[1]?.dsl ?? '';
export const SHOT_3_DSL = DEMO_SHOTS[2]?.dsl ?? '';
export const FULL_DEMO_DSL = DEMO_SHOTS.map((shot) => shot.dsl).join('\n\n');

// ─── Full Demo Project ──────────────────────────────────────

export function createDemoProject(): PandaProject {
  return {
    name: 'Demo Project',
    shots: DEMO_SHOTS,
    characters: DEMO_CHARACTERS,
    scenes: DEMO_SCENES,
    customActions: [],
  };
}
