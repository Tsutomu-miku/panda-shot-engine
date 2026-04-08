// ============================================================
// panda-shot-engine — Scene DSL Parser
// Converts token stream into Shot AST
// ============================================================

import { tokenize } from './tokenizer';
import {
  Token,
  Shot,
  Command,
  PlaceCommand,
  TimelineEvent,
  Transition,
  BgmCommand,
  CameraCommand,
  ExpressionCommand,
  ActionCommand,
  SayCommand,
  MoveCommand,
  EnterCommand,
  SfxCommand,
  VfxCommand,
  Position,
  FacingDirection,
  CameraType,
  CameraMotion,
  TransitionType,
  SemanticPosition,
  VerticalPosition,
  SEMANTIC_POSITIONS,
  VERTICAL_POSITIONS,
  CAMERA_TYPES,
  CAMERA_MOTIONS,
  TRANSITION_TYPES,
  FACING_DIRECTIONS,
} from './types';

// ─── Parse Error ────────────────────────────────────────────

export class ParseError extends Error {
  line: number;
  column: number;

  constructor(message: string, line: number, column: number) {
    super(`Parse error at ${line}:${column}: ${message}`);
    this.name = 'ParseError';
    this.line = line;
    this.column = column;
  }
}

// ─── Parser ─────────────────────────────────────────────────

export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;

  constructor() {}

  /** Parse DSL source text and return an array of Shot objects. */
  parse(source: string): Shot[] {
    this.tokens = tokenize(source);
    this.pos = 0;
    const shots: Shot[] = [];

    this.skipNewlines();
    while (!this.isAtEnd()) {
      shots.push(this.parseShot());
      this.skipNewlines();
    }

    return shots;
  }

  // ── Shot ────────────────────────────────────────────────

  private parseShot(): Shot {
    this.expect('KEYWORD', 'shot');
    const id = this.expectType('STRING').value;
    this.expect('COLON');
    this.expectNewline();
    this.expect('INDENT');

    const shot: Shot = {
      id,
      duration: 0,
      set: '',
      placements: [],
      timeline: [],
      transition: { type: 'cut' },
    };

    // Parse shot body
    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('DEDENT') || this.isAtEnd()) break;
      this.parseShotStatement(shot);
      this.skipNewlines();
    }

    if (this.check('DEDENT')) {
      this.advance(); // consume DEDENT
    }

    return shot;
  }

  private parseShotStatement(shot: Shot): void {
    const token = this.current();

    // duration: 5s
    if (token.type === 'KEYWORD' && token.value === 'duration') {
      this.advance();
      this.expect('COLON');
      shot.duration = this.parseTimeValue();
      this.consumeOptionalNewline();
      return;
    }

    // set: "scene_id"
    if (token.type === 'KEYWORD' && token.value === 'set') {
      this.advance();
      this.expect('COLON');
      shot.set = this.expectType('STRING').value;
      this.consumeOptionalNewline();
      return;
    }

    // bgm: "track" [volume {n}] [fade-in {n}s] [fade-out {n}s]
    if (token.type === 'KEYWORD' && token.value === 'bgm') {
      shot.bgm = this.parseBgmDirective();
      this.consumeOptionalNewline();
      return;
    }

    // place {char} at {position} [facing {dir}] [scale {n}]
    if (token.type === 'KEYWORD' && token.value === 'place') {
      shot.placements.push(this.parsePlaceCommand());
      this.consumeOptionalNewline();
      return;
    }

    // at {time}:
    if (token.type === 'KEYWORD' && token.value === 'at') {
      shot.timeline.push(this.parseTimelineBlock());
      return;
    }

    // transition: {type} [{duration}]
    if (token.type === 'KEYWORD' && token.value === 'transition') {
      shot.transition = this.parseTransition();
      this.consumeOptionalNewline();
      return;
    }

    throw new ParseError(
      `Unexpected token "${token.value}" in shot body`,
      token.line,
      token.column,
    );
  }

  // ── BGM ─────────────────────────────────────────────────

  private parseBgmDirective(): BgmCommand {
    this.expect('KEYWORD', 'bgm');
    this.expect('COLON');
    const track = this.expectType('STRING').value;
    const bgm: BgmCommand = { type: 'bgm', track };

    // Optional params
    while (this.checkKeyword('volume') || this.checkKeyword('fade-in') || this.checkKeyword('fade-out')) {
      if (this.checkKeyword('volume')) {
        this.advance();
        bgm.volume = this.expectNumber();
      } else if (this.checkKeyword('fade-in')) {
        this.advance();
        bgm.fadeIn = this.parseTimeValue();
      } else if (this.checkKeyword('fade-out')) {
        this.advance();
        bgm.fadeOut = this.parseTimeValue();
      }
    }
    return bgm;
  }

  // ── Place ───────────────────────────────────────────────

  private parsePlaceCommand(): PlaceCommand {
    this.expect('KEYWORD', 'place');
    const character = this.expectType('IDENTIFIER').value;
    this.expect('KEYWORD', 'at');
    const position = this.parsePosition();

    let facing: FacingDirection = 'right';
    if (this.checkKeyword('facing')) {
      this.advance();
      facing = this.parseFacing();
    }

    let scale: number | undefined;
    if (this.checkKeyword('scale')) {
      this.advance();
      scale = this.expectNumber();
    }

    return { type: 'place', character, position, facing, scale };
  }

  // ── Timeline Block ──────────────────────────────────────

  private parseTimelineBlock(): TimelineEvent {
    this.expect('KEYWORD', 'at');
    const time = this.parseTimeValue();
    this.expect('COLON');
    this.expectNewline();
    this.expect('INDENT');

    const commands: Command[] = [];

    while (!this.check('DEDENT') && !this.isAtEnd()) {
      this.skipNewlines();
      if (this.check('DEDENT') || this.isAtEnd()) break;
      commands.push(this.parseTimelineCommand());
      this.skipNewlines();
    }

    if (this.check('DEDENT')) {
      this.advance();
    }

    return { time, commands };
  }

  private parseTimelineCommand(): Command {
    const token = this.current();

    // camera {type} [{target}] [{motion} {duration}]
    if (token.type === 'KEYWORD' && token.value === 'camera') {
      return this.parseCameraCommand();
    }

    // sfx "sound"
    if (token.type === 'KEYWORD' && token.value === 'sfx') {
      return this.parseSfxCommand();
    }

    // vfx {effect} at {position}
    if (token.type === 'KEYWORD' && token.value === 'vfx') {
      return this.parseVfxCommand();
    }

    // Character commands: {char} expression|action|say|move|enter-from
    if (token.type === 'IDENTIFIER') {
      return this.parseCharacterCommand();
    }

    throw new ParseError(
      `Unexpected token "${token.value}" in timeline block`,
      token.line,
      token.column,
    );
  }

  // ── Camera ──────────────────────────────────────────────

  private parseCameraCommand(): CameraCommand {
    this.expect('KEYWORD', 'camera');
    const cameraTypeToken = this.current();
    let cameraType: CameraType;

    if (CAMERA_TYPES.has(cameraTypeToken.value)) {
      cameraType = cameraTypeToken.value as CameraType;
      this.advance();
    } else {
      throw new ParseError(
        `Expected camera type, got "${cameraTypeToken.value}"`,
        cameraTypeToken.line,
        cameraTypeToken.column,
      );
    }

    const cmd: CameraCommand = { type: 'camera', cameraType };

    // Optional target (identifier that is not a camera motion)
    if (
      this.check('IDENTIFIER') &&
      !CAMERA_MOTIONS.has(this.current().value) &&
      !this.isAtLineEnd()
    ) {
      if (!CAMERA_MOTIONS.has(this.current().value)) {
        cmd.target = this.current().value;
        this.advance();
      }
    }

    // Optional motion
    if (
      !this.isAtLineEnd() &&
      (this.check('IDENTIFIER') || this.check('KEYWORD')) &&
      CAMERA_MOTIONS.has(this.current().value)
    ) {
      cmd.motion = this.current().value as CameraMotion;
      this.advance();

      // Optional duration after motion
      if (this.check('NUMBER')) {
        cmd.duration = this.parseTimeValue();
      }
    }

    // Optional intensity
    if (this.checkKeyword('intensity')) {
      this.advance();
      cmd.intensity = this.expectNumber();
    }

    // Optional angle
    if (this.checkKeyword('angle')) {
      this.advance();
      cmd.angle = this.expectNumber();
      // consume optional unit (deg)
      if (this.check('UNIT')) {
        this.advance();
      }
    }

    this.consumeOptionalNewline();
    return cmd;
  }

  // ── Character Commands ──────────────────────────────────

  private parseCharacterCommand(): Command {
    const character = this.expectType('IDENTIFIER').value;
    const verb = this.current();

    if (verb.type === 'KEYWORD' && verb.value === 'expression') {
      return this.parseExpressionCommand(character);
    }
    if (verb.type === 'KEYWORD' && verb.value === 'action') {
      return this.parseActionCommand(character);
    }
    if (verb.type === 'KEYWORD' && verb.value === 'say') {
      return this.parseSayCommand(character);
    }
    if (verb.type === 'KEYWORD' && verb.value === 'move') {
      return this.parseMoveCommand(character);
    }
    if (verb.type === 'KEYWORD' && verb.value === 'enter-from') {
      return this.parseEnterCommand(character);
    }

    throw new ParseError(
      `Unknown character command "${verb.value}"`,
      verb.line,
      verb.column,
    );
  }

  private parseExpressionCommand(character: string): ExpressionCommand {
    this.expect('KEYWORD', 'expression');
    const expression = this.current().value;
    this.advance();
    this.consumeOptionalNewline();
    return { type: 'expression', character, expression };
  }

  private parseActionCommand(character: string): ActionCommand {
    this.expect('KEYWORD', 'action');
    const action = this.current().value;
    this.advance();

    let target: string | undefined;
    if (this.checkKeyword('target')) {
      this.advance();
      target = this.current().value;
      this.advance();
    }

    this.consumeOptionalNewline();
    return { type: 'action', character, action, target };
  }

  private parseSayCommand(character: string): SayCommand {
    this.expect('KEYWORD', 'say');
    const text = this.expectType('STRING').value;
    let voice: string | undefined;
    if (this.checkKeyword('voice')) {
      this.advance();
      voice = this.expectType('STRING').value;
    }
    this.consumeOptionalNewline();
    return { type: 'say', character, text, voice };
  }

  private parseMoveCommand(character: string): MoveCommand {
    this.expect('KEYWORD', 'move');
    this.expect('KEYWORD', 'to');
    const to = this.parsePosition();
    const duration = this.parseTimeValue();
    this.consumeOptionalNewline();
    return { type: 'move', character, to, duration };
  }

  private parseEnterCommand(character: string): EnterCommand {
    this.expect('KEYWORD', 'enter-from');
    const from = this.parsePosition();
    this.expect('KEYWORD', 'to');
    const to = this.parsePosition();

    let facing: FacingDirection = 'right';
    if (this.checkKeyword('facing')) {
      this.advance();
      facing = this.parseFacing();
    }

    let action: string | undefined;
    if (this.checkKeyword('action')) {
      this.advance();
      action = this.current().value;
      this.advance();
    }

    this.consumeOptionalNewline();
    return { type: 'enter', character, from, to, facing, action };
  }

  // ── SFX / VFX ──────────────────────────────────────────

  private parseSfxCommand(): SfxCommand {
    this.expect('KEYWORD', 'sfx');
    const sound = this.expectType('STRING').value;
    this.consumeOptionalNewline();
    return { type: 'sfx', sound };
  }

  private parseVfxCommand(): VfxCommand {
    this.expect('KEYWORD', 'vfx');
    const effect = this.current().value;
    this.advance();

    const cmd: VfxCommand = { type: 'vfx', effect };

    if (this.checkKeyword('at')) {
      this.advance();
      // Position can be a semantic position or a character name
      if (this.check('IDENTIFIER') && !SEMANTIC_POSITIONS.has(this.current().value) && !VERTICAL_POSITIONS.has(this.current().value)) {
        cmd.target = this.current().value;
        this.advance();
      } else {
        cmd.position = this.parsePosition();
      }
    }

    if (this.checkKeyword('target')) {
      this.advance();
      cmd.target = this.current().value;
      this.advance();
    }

    this.consumeOptionalNewline();
    return cmd;
  }

  // ── Transition ──────────────────────────────────────────

  private parseTransition(): Transition {
    this.expect('KEYWORD', 'transition');
    this.expect('COLON');

    const typeToken = this.current();
    if (!TRANSITION_TYPES.has(typeToken.value)) {
      throw new ParseError(
        `Unknown transition type "${typeToken.value}"`,
        typeToken.line,
        typeToken.column,
      );
    }
    const transType = typeToken.value as TransitionType;
    this.advance();

    let duration: number | undefined;
    if (this.check('NUMBER')) {
      duration = this.parseTimeValue();
    }

    return { type: transType, duration };
  }

  // ── Position ────────────────────────────────────────────

  private parsePosition(): Position {
    const pos: Position = {};
    const token = this.current();

    // Numeric position: x,y — not used in primary DSL but support just in case
    if (token.type === 'NUMBER') {
      pos.x = this.expectNumber();
      // consume possible unit
      if (this.check('UNIT')) this.advance();
      // check for comma or second number
      if (this.check('NUMBER')) {
        pos.y = this.expectNumber();
        if (this.check('UNIT')) this.advance();
      }
      return pos;
    }

    // Semantic position
    const value = token.value;
    if (SEMANTIC_POSITIONS.has(value)) {
      pos.semantic = value as SemanticPosition;
      this.advance();
    } else if (VERTICAL_POSITIONS.has(value)) {
      pos.vertical = value as VerticalPosition;
      this.advance();
    } else {
      // Might be a compound: e.g. "center" seen as IDENTIFIER
      // Accept identifier values that match positions
      throw new ParseError(
        `Expected position, got "${value}"`,
        token.line,
        token.column,
      );
    }

    // Check for secondary vertical/semantic component
    if (!this.isAtLineEnd() && this.current().type !== 'KEYWORD' && this.current().type !== 'COLON') {
      const next = this.current().value;
      if (VERTICAL_POSITIONS.has(next) && !pos.vertical) {
        pos.vertical = next as VerticalPosition;
        this.advance();
      } else if (SEMANTIC_POSITIONS.has(next) && !pos.semantic) {
        pos.semantic = next as SemanticPosition;
        this.advance();
      }
    }

    return pos;
  }

  // ── Primitives ──────────────────────────────────────────

  /** Parse a time value like "5s", "200ms", or bare number (defaults to seconds). */
  private parseTimeValue(): number {
    const numToken = this.expectType('NUMBER');
    let value = parseFloat(numToken.value);

    if (this.check('UNIT')) {
      const unit = this.current().value;
      this.advance();
      if (unit === 'ms') {
        value = value / 1000;
      }
      // 's' is default — no conversion needed
    }

    return value;
  }

  private parseFacing(): FacingDirection {
    const token = this.current();
    if (!FACING_DIRECTIONS.has(token.value)) {
      throw new ParseError(
        `Expected facing direction (left/right), got "${token.value}"`,
        token.line,
        token.column,
      );
    }
    this.advance();
    return token.value as FacingDirection;
  }

  private expectNumber(): number {
    const token = this.expectType('NUMBER');
    return parseFloat(token.value);
  }

  // ── Token Navigation ────────────────────────────────────

  private current(): Token {
    if (this.pos >= this.tokens.length) {
      return { type: 'EOF', value: '', line: -1, column: -1 };
    }
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  private check(type: string, value?: string): boolean {
    const t = this.current();
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  private checkKeyword(value: string): boolean {
    return this.check('KEYWORD', value);
  }

  private expect(type: string, value?: string): Token {
    const t = this.current();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new ParseError(
        `Expected ${type}${value ? ` "${value}"` : ''}, got ${t.type} "${t.value}"`,
        t.line,
        t.column,
      );
    }
    return this.advance();
  }

  private expectType(type: string): Token {
    return this.expect(type);
  }

  private expectNewline(): void {
    // Consume a NEWLINE if present
    if (this.check('NEWLINE')) {
      this.advance();
    }
  }

  private consumeOptionalNewline(): void {
    if (this.check('NEWLINE')) {
      this.advance();
    }
  }

  private skipNewlines(): void {
    while (this.check('NEWLINE')) {
      this.advance();
    }
  }

  private isAtLineEnd(): boolean {
    return this.check('NEWLINE') || this.check('DEDENT') || this.check('EOF');
  }

  private isAtEnd(): boolean {
    return this.current().type === 'EOF';
  }
}

// ─── Convenience ──────────────────────────────────────────

export function parseShots(source: string): Shot[] {
  return new Parser().parse(source);
}

export function parseShot(source: string): Shot {
  const shots = parseShots(source);
  if (shots.length === 0) {
    throw new Error('No shot found in source');
  }
  return shots[0];
}
