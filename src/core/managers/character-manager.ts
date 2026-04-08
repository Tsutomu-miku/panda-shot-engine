/**
 * Character Manager — CRUD operations for DemoCharacter
 */

import { DemoCharacter } from '../../demo/demo-project';

export interface CharacterCreateInput {
  name: string;
  color?: string;
  expressions?: string[];
  skeletonType?: 'humanoid' | 'beast' | 'chibi';
  description?: string;
}

export interface CharacterUpdateInput {
  name?: string;
  color?: string;
  expressions?: string[];
  skeletonType?: 'humanoid' | 'beast' | 'chibi';
  description?: string;
}

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') + '_' + Date.now().toString(36);
}

const DEFAULT_EXPRESSIONS = ['neutral', 'happy', 'angry', 'shocked', 'smirk', 'crying'];

const PALETTE = [
  '#4caf50', '#f44336', '#2196f3', '#9c27b0', '#ff9800',
  '#00bcd4', '#e91e63', '#8bc34a', '#ff5722', '#607d8b',
];

export class CharacterManager {
  /**
   * Create a new character with sensible defaults.
   */
  static create(
    characters: DemoCharacter[],
    input: CharacterCreateInput,
  ): { characters: DemoCharacter[]; newCharacter: DemoCharacter } {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Character name is required');
    }
    if (characters.some((c) => c.name === input.name.trim())) {
      throw new Error(`Character "${input.name}" already exists`);
    }

    const newCharacter: DemoCharacter = {
      id: generateId(input.name),
      name: input.name.trim(),
      color: input.color ?? PALETTE[characters.length % PALETTE.length],
      expressions: input.expressions ?? [...DEFAULT_EXPRESSIONS],
      skeletonType: input.skeletonType ?? 'humanoid',
      description: input.description ?? '',
    };

    return {
      characters: [...characters, newCharacter],
      newCharacter,
    };
  }

  /**
   * Update an existing character.
   */
  static update(
    characters: DemoCharacter[],
    characterId: string,
    input: CharacterUpdateInput,
  ): DemoCharacter[] {
    const idx = characters.findIndex((c) => c.id === characterId);
    if (idx === -1) throw new Error(`Character "${characterId}" not found`);

    if (input.name !== undefined) {
      const duplicate = characters.find(
        (c) => c.name === input.name!.trim() && c.id !== characterId,
      );
      if (duplicate) throw new Error(`Character name "${input.name}" already exists`);
    }

    const updated = [...characters];
    updated[idx] = {
      ...updated[idx],
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.expressions !== undefined && { expressions: input.expressions }),
      ...(input.skeletonType !== undefined && { skeletonType: input.skeletonType }),
      ...(input.description !== undefined && { description: input.description }),
    };
    return updated;
  }

  /**
   * Remove a character by id.
   */
  static remove(characters: DemoCharacter[], characterId: string): DemoCharacter[] {
    const idx = characters.findIndex((c) => c.id === characterId);
    if (idx === -1) throw new Error(`Character "${characterId}" not found`);
    return characters.filter((c) => c.id !== characterId);
  }

  /**
   * Duplicate a character with a new id and name suffix.
   */
  static duplicate(characters: DemoCharacter[], characterId: string): {
    characters: DemoCharacter[];
    newCharacter: DemoCharacter;
  } {
    const original = characters.find((c) => c.id === characterId);
    if (!original) throw new Error(`Character "${characterId}" not found`);

    let copyName = original.name + ' (副本)';
    let counter = 2;
    while (characters.some((c) => c.name === copyName)) {
      copyName = `${original.name} (副本${counter})`;
      counter++;
    }

    const newCharacter: DemoCharacter = {
      ...original,
      id: generateId(copyName),
      name: copyName,
    };

    return {
      characters: [...characters, newCharacter],
      newCharacter,
    };
  }

  /**
   * Reorder a character in the list.
   */
  static reorder(
    characters: DemoCharacter[],
    fromIndex: number,
    toIndex: number,
  ): DemoCharacter[] {
    const result = [...characters];
    const [moved] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, moved);
    return result;
  }

  /**
   * Get characters referenced in DSL text.
   */
  static getReferencedIds(dslText: string): Set<string> {
    const ids = new Set<string>();
    const placeRegex = /place\s+(\w+)/g;
    const enterRegex = /(\w+)\s+enter-from/g;
    let m: RegExpExecArray | null;
    while ((m = placeRegex.exec(dslText)) !== null) ids.add(m[1]);
    while ((m = enterRegex.exec(dslText)) !== null) ids.add(m[1]);
    return ids;
  }
}
