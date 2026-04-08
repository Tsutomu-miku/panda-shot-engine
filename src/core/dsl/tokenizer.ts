// ============================================================
// panda-shot-engine — Scene DSL Tokenizer
// Indent-sensitive tokenizer (Python/YAML style)
// ============================================================

import {
  Token,
  TokenType,
  KEYWORDS,
  UNIT_SUFFIXES,
} from './types';

// ─── Tokenizer ──────────────────────────────────────────────

export class Tokenizer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private indentStack: number[] = [0];

  constructor(source: string) {
    this.source = source;
  }

  /** Tokenize the full source and return the token array. */
  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.indentStack = [0];

    while (this.pos < this.source.length) {
      this.tokenizeLine();
    }

    // Emit remaining DEDENT tokens to close all open blocks
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.push('DEDENT', '', this.line, 1);
    }

    this.push('EOF', '', this.line, this.column);
    return this.tokens;
  }

  // ── Line-level tokenization ─────────────────────────────

  private tokenizeLine(): void {
    // Measure leading whitespace
    const lineStart = this.pos;
    let indent = 0;
    while (this.pos < this.source.length && this.source[this.pos] === ' ') {
      indent++;
      this.advance();
    }

    // Skip blank lines
    if (this.pos >= this.source.length || this.source[this.pos] === '\n') {
      if (this.pos < this.source.length) {
        this.advance(); // consume '\n'
        this.line++;
        this.column = 1;
      }
      return;
    }

    // Skip comment lines
    if (this.source[this.pos] === '#') {
      this.skipToEndOfLine();
      return;
    }

    // Emit INDENT / DEDENT based on indentation change
    const currentIndent = this.indentStack[this.indentStack.length - 1];
    if (indent > currentIndent) {
      this.indentStack.push(indent);
      this.push('INDENT', '', this.line, 1);
    } else if (indent < currentIndent) {
      while (
        this.indentStack.length > 1 &&
        this.indentStack[this.indentStack.length - 1] > indent
      ) {
        this.indentStack.pop();
        this.push('DEDENT', '', this.line, 1);
      }
    }

    // Tokenize contents of the line
    this.tokenizeLineContent();

    // Emit NEWLINE at end of line
    if (this.pos < this.source.length && this.source[this.pos] === '\n') {
      this.push('NEWLINE', '\\n', this.line, this.column);
      this.advance();
      this.line++;
      this.column = 1;
    } else if (this.pos >= this.source.length) {
      // End of input without trailing newline — emit NEWLINE anyway for consistency
      this.push('NEWLINE', '\\n', this.line, this.column);
    }
  }

  private tokenizeLineContent(): void {
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      this.skipSpaces();

      if (this.pos >= this.source.length || this.source[this.pos] === '\n') {
        break;
      }

      const ch = this.source[this.pos];

      if (ch === '#') {
        // Inline comment — skip rest of line
        this.skipToEndOfLine();
        return;
      } else if (ch === ':') {
        this.push('COLON', ':', this.line, this.column);
        this.advance();
      } else if (ch === '-' && this.peek(1) === '>') {
        this.push('ARROW', '->', this.line, this.column);
        this.advance();
        this.advance();
      } else if (ch === '"') {
        this.readString();
      } else if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.peek(1)))) {
        this.readNumber();
      } else if (this.isIdentStart(ch)) {
        this.readIdentifierOrKeyword();
      } else {
        // Unknown character — skip
        this.advance();
      }
    }
  }

  // ── Token readers ───────────────────────────────────────

  private readString(): void {
    const startCol = this.column;
    this.advance(); // opening quote
    let value = '';
    while (this.pos < this.source.length && this.source[this.pos] !== '"') {
      if (this.source[this.pos] === '\\' && this.pos + 1 < this.source.length) {
        this.advance();
        const escaped = this.source[this.pos];
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case '"': value += '"'; break;
          case '\\': value += '\\'; break;
          default: value += escaped;
        }
      } else {
        value += this.source[this.pos];
      }
      this.advance();
    }
    if (this.pos < this.source.length) {
      this.advance(); // closing quote
    }
    this.push('STRING', value, this.line, startCol);
  }

  private readNumber(): void {
    const startCol = this.column;
    let value = '';
    if (this.source[this.pos] === '-') {
      value += '-';
      this.advance();
    }
    while (this.pos < this.source.length && (this.isDigit(this.source[this.pos]) || this.source[this.pos] === '.')) {
      value += this.source[this.pos];
      this.advance();
    }
    this.push('NUMBER', value, this.line, startCol);

    // Check for unit suffix immediately after number
    const unitStart = this.pos;
    const unitCol = this.column;
    let unit = '';
    // Collect alphabetic or % characters after number
    while (this.pos < this.source.length && (this.isAlpha(this.source[this.pos]) || this.source[this.pos] === '%')) {
      unit += this.source[this.pos];
      this.advance();
    }
    if (unit && UNIT_SUFFIXES.has(unit)) {
      this.push('UNIT', unit, this.line, unitCol);
    } else if (unit) {
      // Not a valid unit, rewind
      this.pos = unitStart;
      this.column = unitCol;
    }
  }

  private readIdentifierOrKeyword(): void {
    const startCol = this.column;
    let value = '';
    while (
      this.pos < this.source.length &&
      (this.isIdentPart(this.source[this.pos]))
    ) {
      value += this.source[this.pos];
      this.advance();
    }

    // Compound keywords: try to extend with '-' followed by alpha chars
    // e.g. enter-from, fade-in, fade-black, close-up, pan-left, center-left, etc.
    while (
      this.pos < this.source.length &&
      this.source[this.pos] === '-' &&
      this.pos + 1 < this.source.length &&
      this.isAlpha(this.source[this.pos + 1])
    ) {
      value += '-';
      this.advance();
      while (
        this.pos < this.source.length &&
        this.isIdentPart(this.source[this.pos])
      ) {
        value += this.source[this.pos];
        this.advance();
      }
    }

    if (KEYWORDS.has(value)) {
      this.push('KEYWORD', value, this.line, startCol);
    } else {
      this.push('IDENTIFIER', value, this.line, startCol);
    }
  }

  // ── Helpers ─────────────────────────────────────────────

  private push(type: TokenType, value: string, line: number, column: number): void {
    this.tokens.push({ type, value, line, column });
  }

  private advance(): void {
    this.pos++;
    this.column++;
  }

  private peek(offset: number = 0): string {
    const idx = this.pos + offset;
    return idx < this.source.length ? this.source[idx] : '';
  }

  private skipSpaces(): void {
    while (this.pos < this.source.length && this.source[this.pos] === ' ') {
      this.advance();
    }
  }

  private skipToEndOfLine(): void {
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      this.advance();
    }
    if (this.pos < this.source.length) {
      this.advance();
      this.line++;
      this.column = 1;
    }
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isIdentStart(ch: string): boolean {
    return this.isAlpha(ch);
  }

  private isIdentPart(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch) || ch === '_';
  }
}

/** Convenience function */
export function tokenize(source: string): Token[] {
  return new Tokenizer(source).tokenize();
}
