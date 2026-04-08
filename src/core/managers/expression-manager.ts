/**
 * Expression Manager — Manage expressions for characters
 */

import { DemoCharacter } from '../../demo/demo-project';

const AVAILABLE_EXPRESSIONS = [
  'neutral', 'happy', 'angry', 'shocked', 'smirk', 'crying',
  'confused', 'determined', 'scared', 'disgusted', 'sleepy',
  'excited', 'embarrassed', 'proud', 'sad', 'thinking',
] as const;

export type ExpressionName = typeof AVAILABLE_EXPRESSIONS[number] | string;

export class ExpressionManager {
  /**
   * Get all available expression presets.
   */
  static getAvailableExpressions(): readonly string[] {
    return AVAILABLE_EXPRESSIONS;
  }

  /**
   * Add an expression to a character.
   */
  static addExpression(
    characters: DemoCharacter[],
    characterId: string,
    expression: string,
  ): DemoCharacter[] {
    const idx = characters.findIndex((c) => c.id === characterId);
    if (idx === -1) throw new Error(`Character "${characterId}" not found`);

    const char = characters[idx];
    if (char.expressions.includes(expression)) {
      throw new Error(`Expression "${expression}" already exists on "${char.name}"`);
    }

    const updated = [...characters];
    updated[idx] = {
      ...char,
      expressions: [...char.expressions, expression],
    };
    return updated;
  }

  /**
   * Remove an expression from a character.
   */
  static removeExpression(
    characters: DemoCharacter[],
    characterId: string,
    expression: string,
  ): DemoCharacter[] {
    const idx = characters.findIndex((c) => c.id === characterId);
    if (idx === -1) throw new Error(`Character "${characterId}" not found`);

    const char = characters[idx];
    if (!char.expressions.includes(expression)) {
      throw new Error(`Expression "${expression}" not found on "${char.name}"`);
    }
    if (char.expressions.length <= 1) {
      throw new Error('Character must have at least one expression');
    }

    const updated = [...characters];
    updated[idx] = {
      ...char,
      expressions: char.expressions.filter((e) => e !== expression),
    };
    return updated;
  }

  /**
   * Reorder expressions for a character.
   */
  static reorderExpressions(
    characters: DemoCharacter[],
    characterId: string,
    fromIndex: number,
    toIndex: number,
  ): DemoCharacter[] {
    const idx = characters.findIndex((c) => c.id === characterId);
    if (idx === -1) throw new Error(`Character "${characterId}" not found`);

    const char = characters[idx];
    const exprs = [...char.expressions];
    const [moved] = exprs.splice(fromIndex, 1);
    exprs.splice(toIndex, 0, moved);

    const updated = [...characters];
    updated[idx] = { ...char, expressions: exprs };
    return updated;
  }

  /**
   * Batch set expressions for a character (replaces all).
   */
  static setExpressions(
    characters: DemoCharacter[],
    characterId: string,
    expressions: string[],
  ): DemoCharacter[] {
    const idx = characters.findIndex((c) => c.id === characterId);
    if (idx === -1) throw new Error(`Character "${characterId}" not found`);
    if (expressions.length === 0) {
      throw new Error('Character must have at least one expression');
    }

    const uniqueExprs = [...new Set(expressions)];
    const updated = [...characters];
    updated[idx] = { ...characters[idx], expressions: uniqueExprs };
    return updated;
  }

  /**
   * Get expression names referenced in DSL text.
   */
  static getReferencedExpressions(dslText: string): Set<string> {
    const exprs = new Set<string>();
    const regex = /expression\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(dslText)) !== null) exprs.add(m[1]);
    return exprs;
  }

  /**
   * Validate that all expressions referenced in DSL exist on the characters.
   */
  static validateDslExpressions(
    dslText: string,
    characters: DemoCharacter[],
  ): string[] {
    const warnings: string[] = [];
    const charExprRegex = /(\w+)\s+expression\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = charExprRegex.exec(dslText)) !== null) {
      const charId = m[1];
      const expr = m[2];
      const char = characters.find((c) => c.id === charId);
      if (char && !char.expressions.includes(expr)) {
        warnings.push(`Character "${char.name}" does not have expression "${expr}"`);
      }
    }
    return warnings;
  }
}
