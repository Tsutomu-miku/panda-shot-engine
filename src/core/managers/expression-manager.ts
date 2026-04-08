/**
 * Expression Manager — CRUD for image-based ExpressionSet on characters
 * 
 * Expressions are facial sticker images that overlay on the character's face.
 * Each expression set contains images for eyes, mouth, eyebrows, and overlays.
 */

import { CharacterAsset, ExpressionSet } from '../project/types';

export interface ExpressionCreateInput {
  name: string;
  eyesImage?: string;
  mouthImage?: string;
  eyebrowImage?: string;
  overlayImage?: string;
  thumbnail?: string;
}

export interface ExpressionUpdateInput {
  name?: string;
  eyesImage?: string | null;  // null = remove
  mouthImage?: string | null;
  eyebrowImage?: string | null;
  overlayImage?: string | null;
  thumbnail?: string | null;
}

function generateExpressionId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') + '_' + Date.now().toString(36);
}

export class ExpressionManager {
  /** Add a new expression set to a character */
  static addExpression(
    characters: CharacterAsset[],
    charId: string,
    input: ExpressionCreateInput,
  ): CharacterAsset[] {
    const idx = characters.findIndex((c) => c.id === charId);
    if (idx === -1) throw new Error(`Character "${charId}" not found`);

    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Expression name is required');
    }

    const char = characters[idx];
    const exprId = generateExpressionId(input.name);
    
    // Check for duplicate names
    const existing = Object.values(char.expressions);
    if (existing.some((e) => e.name === input.name.trim())) {
      throw new Error(`Expression "${input.name}" already exists on this character`);
    }

    const newExpr: ExpressionSet = {
      id: exprId,
      name: input.name.trim(),
      eyesImage: input.eyesImage,
      mouthImage: input.mouthImage,
      eyebrowImage: input.eyebrowImage,
      overlayImage: input.overlayImage,
      thumbnail: input.thumbnail,
    };

    const updated = [...characters];
    updated[idx] = {
      ...char,
      expressions: { ...char.expressions, [exprId]: newExpr },
    };
    return updated;
  }

  /** Update an existing expression's sticker images */
  static updateExpression(
    characters: CharacterAsset[],
    charId: string,
    exprId: string,
    input: ExpressionUpdateInput,
  ): CharacterAsset[] {
    const idx = characters.findIndex((c) => c.id === charId);
    if (idx === -1) throw new Error(`Character "${charId}" not found`);

    const char = characters[idx];
    const expr = char.expressions[exprId];
    if (!expr) throw new Error(`Expression "${exprId}" not found on character "${charId}"`);

    if (input.name !== undefined) {
      const existing = Object.values(char.expressions);
      if (existing.some((e) => e.name === input.name!.trim() && e.id !== exprId)) {
        throw new Error(`Expression name "${input.name}" already exists`);
      }
    }

    const updatedExpr: ExpressionSet = {
      ...expr,
      ...(input.name !== undefined && { name: input.name.trim() }),
    };

    // Handle image updates (null means remove)
    for (const key of ['eyesImage', 'mouthImage', 'eyebrowImage', 'overlayImage', 'thumbnail'] as const) {
      if (input[key] !== undefined) {
        if (input[key] === null) {
          delete (updatedExpr as any)[key];
        } else {
          (updatedExpr as any)[key] = input[key];
        }
      }
    }

    const updated = [...characters];
    updated[idx] = {
      ...char,
      expressions: { ...char.expressions, [exprId]: updatedExpr },
    };
    return updated;
  }

  /** Update a single sticker slot on an expression */
  static updateStickerSlot(
    characters: CharacterAsset[],
    charId: string,
    exprId: string,
    slot: 'eyesImage' | 'mouthImage' | 'eyebrowImage' | 'overlayImage',
    imageData: string | null,
  ): CharacterAsset[] {
    const idx = characters.findIndex((c) => c.id === charId);
    if (idx === -1) throw new Error(`Character "${charId}" not found`);

    const char = characters[idx];
    const expr = char.expressions[exprId];
    if (!expr) throw new Error(`Expression "${exprId}" not found`);

    const updatedExpr = { ...expr };
    if (imageData === null) {
      delete (updatedExpr as any)[slot];
    } else {
      (updatedExpr as any)[slot] = imageData;
    }

    const updated = [...characters];
    updated[idx] = {
      ...char,
      expressions: { ...char.expressions, [exprId]: updatedExpr },
    };
    return updated;
  }

  /** Remove an expression from a character */
  static removeExpression(
    characters: CharacterAsset[],
    charId: string,
    exprId: string,
  ): CharacterAsset[] {
    const idx = characters.findIndex((c) => c.id === charId);
    if (idx === -1) throw new Error(`Character "${charId}" not found`);

    const char = characters[idx];
    if (!char.expressions[exprId]) {
      throw new Error(`Expression "${exprId}" not found`);
    }

    const newExprs = { ...char.expressions };
    delete newExprs[exprId];

    const updated = [...characters];
    updated[idx] = { ...char, expressions: newExprs };
    return updated;
  }

  /** Duplicate an expression within the same character */
  static duplicateExpression(
    characters: CharacterAsset[],
    charId: string,
    exprId: string,
  ): CharacterAsset[] {
    const idx = characters.findIndex((c) => c.id === charId);
    if (idx === -1) throw new Error(`Character "${charId}" not found`);

    const char = characters[idx];
    const original = char.expressions[exprId];
    if (!original) throw new Error(`Expression "${exprId}" not found`);

    let copyName = original.name + ' (Copy)';
    let counter = 2;
    const existing = Object.values(char.expressions);
    while (existing.some((e) => e.name === copyName)) {
      copyName = `${original.name} (Copy ${counter})`;
      counter++;
    }

    const newId = generateExpressionId(copyName);
    const newExpr: ExpressionSet = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: copyName,
    };

    const updated = [...characters];
    updated[idx] = {
      ...char,
      expressions: { ...char.expressions, [newId]: newExpr },
    };
    return updated;
  }

  /** Copy an expression from one character to another */
  static copyExpressionToCharacter(
    characters: CharacterAsset[],
    fromCharId: string,
    exprId: string,
    toCharId: string,
  ): CharacterAsset[] {
    const fromIdx = characters.findIndex((c) => c.id === fromCharId);
    const toIdx = characters.findIndex((c) => c.id === toCharId);
    if (fromIdx === -1) throw new Error(`Source character "${fromCharId}" not found`);
    if (toIdx === -1) throw new Error(`Target character "${toCharId}" not found`);

    const original = characters[fromIdx].expressions[exprId];
    if (!original) throw new Error(`Expression "${exprId}" not found`);

    const newId = generateExpressionId(original.name);
    const newExpr: ExpressionSet = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
    };

    const updated = [...characters];
    updated[toIdx] = {
      ...updated[toIdx],
      expressions: { ...updated[toIdx].expressions, [newId]: newExpr },
    };
    return updated;
  }
}
