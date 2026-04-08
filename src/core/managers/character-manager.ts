/**
 * Character Manager — CRUD operations for image-based CharacterAsset
 */

import { CharacterAsset, ExpressionSet } from '../project/types';

export interface CharacterCreateInput {
  name: string;
  style?: CharacterAsset['style'];
  parts?: Record<string, string>;
  expressions?: Record<string, ExpressionSet>;
  skeletonType?: string;
  thumbnail?: string;
  description?: string;
}

export interface CharacterUpdateInput {
  name?: string;
  style?: CharacterAsset['style'];
  skeletonType?: string;
  thumbnail?: string;
  description?: string;
}

function generateCharId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') + '_' + Date.now().toString(36);
}

export class CharacterManager {
  static create(
    characters: CharacterAsset[],
    input: CharacterCreateInput,
  ): { characters: CharacterAsset[]; newCharacter: CharacterAsset } {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Character name is required');
    }
    if (characters.some((c) => c.name === input.name.trim())) {
      throw new Error(`Character "${input.name}" already exists`);
    }

    const newCharacter: CharacterAsset = {
      id: generateCharId(input.name),
      name: input.name.trim(),
      style: input.style ?? 'humanoid',
      parts: input.parts ?? {},
      expressions: input.expressions ?? {},
      skeletonType: input.skeletonType ?? 'humanoid',
      thumbnail: input.thumbnail,
      description: input.description ?? '',
    };

    return { characters: [...characters, newCharacter], newCharacter };
  }

  static update(
    characters: CharacterAsset[],
    charId: string,
    input: CharacterUpdateInput,
  ): CharacterAsset[] {
    const idx = characters.findIndex((c) => c.id === charId);
    if (idx === -1) throw new Error(`Character "${charId}" not found`);

    if (input.name !== undefined) {
      const dup = characters.find((c) => c.name === input.name!.trim() && c.id !== charId);
      if (dup) throw new Error(`Character name "${input.name}" already exists`);
    }

    const updated = [...characters];
    updated[idx] = {
      ...updated[idx],
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.style !== undefined && { style: input.style }),
      ...(input.skeletonType !== undefined && { skeletonType: input.skeletonType }),
      ...(input.thumbnail !== undefined && { thumbnail: input.thumbnail }),
      ...(input.description !== undefined && { description: input.description }),
    };
    return updated;
  }

  /** Update a specific body part image */
  static updatePart(
    characters: CharacterAsset[],
    charId: string,
    partKey: string,
    imageData: string,
  ): CharacterAsset[] {
    const idx = characters.findIndex((c) => c.id === charId);
    if (idx === -1) throw new Error(`Character "${charId}" not found`);

    const updated = [...characters];
    updated[idx] = {
      ...updated[idx],
      parts: { ...updated[idx].parts, [partKey]: imageData },
    };
    return updated;
  }

  /** Remove a body part image */
  static removePart(
    characters: CharacterAsset[],
    charId: string,
    partKey: string,
  ): CharacterAsset[] {
    const idx = characters.findIndex((c) => c.id === charId);
    if (idx === -1) throw new Error(`Character "${charId}" not found`);

    const updated = [...characters];
    const newParts = { ...updated[idx].parts };
    delete newParts[partKey];
    updated[idx] = { ...updated[idx], parts: newParts };
    return updated;
  }

  static remove(characters: CharacterAsset[], charId: string): CharacterAsset[] {
    const idx = characters.findIndex((c) => c.id === charId);
    if (idx === -1) throw new Error(`Character "${charId}" not found`);
    return characters.filter((c) => c.id !== charId);
  }

  static duplicate(characters: CharacterAsset[], charId: string): {
    characters: CharacterAsset[];
    newCharacter: CharacterAsset;
  } {
    const original = characters.find((c) => c.id === charId);
    if (!original) throw new Error(`Character "${charId}" not found`);

    let copyName = original.name + ' (Copy)';
    let counter = 2;
    while (characters.some((c) => c.name === copyName)) {
      copyName = `${original.name} (Copy ${counter})`;
      counter++;
    }

    const newCharacter: CharacterAsset = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateCharId(copyName),
      name: copyName,
    };

    return { characters: [...characters, newCharacter], newCharacter };
  }

  static reorder(characters: CharacterAsset[], fromIndex: number, toIndex: number): CharacterAsset[] {
    const result = [...characters];
    const [moved] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, moved);
    return result;
  }
}
