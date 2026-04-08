/**
 * Scene Manager — CRUD operations for DemoScene
 */

import { DemoScene } from '../../demo/demo-project';

export interface SceneCreateInput {
  name: string;
  color?: string;
  gradientStart?: string;
  gradientEnd?: string;
  description?: string;
  floorY?: number;
}

export interface SceneUpdateInput {
  name?: string;
  color?: string;
  gradientStart?: string;
  gradientEnd?: string;
  description?: string;
  floorY?: number;
}

function generateSceneId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') + '_' + Date.now().toString(36);
}

const SCENE_PALETTE: Array<{ color: string; gradientStart: string; gradientEnd: string }> = [
  { color: '#795548', gradientStart: '#3e2723', gradientEnd: '#1a0e0a' },
  { color: '#1b5e20', gradientStart: '#0d2818', gradientEnd: '#050f08' },
  { color: '#0d47a1', gradientStart: '#0a1929', gradientEnd: '#040d17' },
  { color: '#b71c1c', gradientStart: '#3e0a0a', gradientEnd: '#1a0404' },
  { color: '#4a148c', gradientStart: '#1a0533', gradientEnd: '#0d0219' },
  { color: '#ff6f00', gradientStart: '#4a2000', gradientEnd: '#1a0b00' },
];

export class SceneManager {
  static create(
    scenes: DemoScene[],
    input: SceneCreateInput,
  ): { scenes: DemoScene[]; newScene: DemoScene } {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Scene name is required');
    }
    if (scenes.some((s) => s.name === input.name.trim())) {
      throw new Error(`Scene "${input.name}" already exists`);
    }

    const palette = SCENE_PALETTE[scenes.length % SCENE_PALETTE.length];
    const newScene: DemoScene = {
      id: generateSceneId(input.name),
      name: input.name.trim(),
      color: input.color ?? palette.color,
      gradientStart: input.gradientStart ?? palette.gradientStart,
      gradientEnd: input.gradientEnd ?? palette.gradientEnd,
      description: input.description ?? '',
      floorY: input.floorY ?? 0.78,
    };

    return { scenes: [...scenes, newScene], newScene };
  }

  static update(
    scenes: DemoScene[],
    sceneId: string,
    input: SceneUpdateInput,
  ): DemoScene[] {
    const idx = scenes.findIndex((s) => s.id === sceneId);
    if (idx === -1) throw new Error(`Scene "${sceneId}" not found`);

    if (input.name !== undefined) {
      const dup = scenes.find((s) => s.name === input.name!.trim() && s.id !== sceneId);
      if (dup) throw new Error(`Scene name "${input.name}" already exists`);
    }

    const updated = [...scenes];
    updated[idx] = {
      ...updated[idx],
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.gradientStart !== undefined && { gradientStart: input.gradientStart }),
      ...(input.gradientEnd !== undefined && { gradientEnd: input.gradientEnd }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.floorY !== undefined && { floorY: Math.max(0, Math.min(1, input.floorY)) }),
    };
    return updated;
  }

  static remove(scenes: DemoScene[], sceneId: string): DemoScene[] {
    const idx = scenes.findIndex((s) => s.id === sceneId);
    if (idx === -1) throw new Error(`Scene "${sceneId}" not found`);
    return scenes.filter((s) => s.id !== sceneId);
  }

  static duplicate(scenes: DemoScene[], sceneId: string): {
    scenes: DemoScene[];
    newScene: DemoScene;
  } {
    const original = scenes.find((s) => s.id === sceneId);
    if (!original) throw new Error(`Scene "${sceneId}" not found`);

    let copyName = original.name + ' (副本)';
    let counter = 2;
    while (scenes.some((s) => s.name === copyName)) {
      copyName = `${original.name} (副本${counter})`;
      counter++;
    }

    const newScene: DemoScene = {
      ...original,
      id: generateSceneId(copyName),
      name: copyName,
    };

    return { scenes: [...scenes, newScene], newScene };
  }

  static reorder(scenes: DemoScene[], fromIndex: number, toIndex: number): DemoScene[] {
    const result = [...scenes];
    const [moved] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, moved);
    return result;
  }

  static getReferencedIds(dslText: string): Set<string> {
    const ids = new Set<string>();
    const regex = /set:\s*"([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(dslText)) !== null) ids.add(m[1]);
    return ids;
  }
}
