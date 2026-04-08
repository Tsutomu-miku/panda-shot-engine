// ============================================================
// panda-shot-engine — Scene DSL Validator
// Validates Shot objects for structural and semantic correctness
// ============================================================

import {
  Shot,
  Command,
  DiagnosticMessage,
  DiagnosticSeverity,
  ValidationResult,
  PlaceCommand,
  TimelineEvent,
  SEMANTIC_POSITIONS,
  VERTICAL_POSITIONS,
  CAMERA_TYPES,
  CAMERA_MOTIONS,
  TRANSITION_TYPES,
  Position,
} from './types';

// ─── Validator ──────────────────────────────────────────────

export class Validator {
  private errors: DiagnosticMessage[] = [];
  private warnings: DiagnosticMessage[] = [];

  /** Validate a single shot. Returns a ValidationResult. */
  validate(shot: Shot): ValidationResult {
    this.errors = [];
    this.warnings = [];

    this.validateShotMeta(shot);
    this.validatePlacements(shot);
    this.validateTimeline(shot);
    this.validateTransition(shot);

    return {
      valid: this.errors.length === 0,
      warnings: [...this.warnings],
      errors: [...this.errors],
    };
  }

  /** Validate multiple shots. Aggregates all results. */
  validateAll(shots: Shot[]): ValidationResult {
    this.errors = [];
    this.warnings = [];

    if (shots.length === 0) {
      this.addWarning(1, 1, 'No shots defined');
    }

    // Check for duplicate shot IDs
    const seenIds = new Set<string>();
    for (const shot of shots) {
      if (seenIds.has(shot.id)) {
        this.addError(1, 1, `Duplicate shot ID: "${shot.id}"`);
      }
      seenIds.add(shot.id);

      const result = new Validator().validate(shot);
      this.errors.push(...result.errors);
      this.warnings.push(...result.warnings);
    }

    return {
      valid: this.errors.length === 0,
      warnings: [...this.warnings],
      errors: [...this.errors],
    };
  }

  // ── Shot metadata ───────────────────────────────────────

  private validateShotMeta(shot: Shot): void {
    if (!shot.id || shot.id.trim() === '') {
      this.addError(1, 1, 'Shot must have a non-empty ID');
    }

    if (shot.duration <= 0) {
      this.addError(1, 1, `Shot "${shot.id}": duration must be positive, got ${shot.duration}`);
    }

    if (!shot.set || shot.set.trim() === '') {
      this.addError(1, 1, `Shot "${shot.id}": "set" (scene ID) is required`);
    }

    // Validate BGM if present
    if (shot.bgm) {
      if (!shot.bgm.track || shot.bgm.track.trim() === '') {
        this.addError(1, 1, `Shot "${shot.id}": BGM track must be a non-empty string`);
      }
      if (shot.bgm.volume !== undefined && (shot.bgm.volume < 0 || shot.bgm.volume > 1)) {
        this.addWarning(1, 1, `Shot "${shot.id}": BGM volume ${shot.bgm.volume} outside expected range [0, 1]`);
      }
      if (shot.bgm.fadeIn !== undefined && shot.bgm.fadeIn < 0) {
        this.addError(1, 1, `Shot "${shot.id}": BGM fade-in must be non-negative`);
      }
      if (shot.bgm.fadeOut !== undefined && shot.bgm.fadeOut < 0) {
        this.addError(1, 1, `Shot "${shot.id}": BGM fade-out must be non-negative`);
      }
    }
  }

  // ── Placements ──────────────────────────────────────────

  private validatePlacements(shot: Shot): void {
    const placedCharacters = new Set<string>();

    for (const p of shot.placements) {
      if (!p.character || p.character.trim() === '') {
        this.addError(1, 1, `Shot "${shot.id}": placement has empty character name`);
        continue;
      }

      if (placedCharacters.has(p.character)) {
        this.addWarning(1, 1, `Shot "${shot.id}": character "${p.character}" placed multiple times`);
      }
      placedCharacters.add(p.character);

      this.validatePosition(shot.id, p.position, `placement of "${p.character}"`);

      if (p.scale !== undefined && p.scale <= 0) {
        this.addError(1, 1, `Shot "${shot.id}": scale for "${p.character}" must be positive`);
      }
    }
  }

  // ── Timeline ────────────────────────────────────────────

  private validateTimeline(shot: Shot): void {
    const placedCharacters = new Set(shot.placements.map((p) => p.character));
    // Characters that enter during the timeline
    const enteredCharacters = new Set<string>();
    let lastTime = -Infinity;

    for (let i = 0; i < shot.timeline.length; i++) {
      const event = shot.timeline[i];

      // Check time is within duration
      if (event.time < 0) {
        this.addError(1, 1, `Shot "${shot.id}": timeline event ${i} has negative time (${event.time})`);
      }
      if (event.time > shot.duration) {
        this.addError(
          1, 1,
          `Shot "${shot.id}": timeline event at ${event.time}s exceeds shot duration (${shot.duration}s)`,
        );
      }

      // Check times are monotonically non-decreasing
      if (event.time < lastTime) {
        this.addError(
          1, 1,
          `Shot "${shot.id}": timeline events not in order — ${event.time}s follows ${lastTime}s`,
        );
      }
      lastTime = event.time;

      // Check no empty event blocks
      if (event.commands.length === 0) {
        this.addWarning(1, 1, `Shot "${shot.id}": timeline event at ${event.time}s has no commands`);
      }

      // Validate each command
      for (const cmd of event.commands) {
        this.validateCommand(shot, cmd, placedCharacters, enteredCharacters, event.time);
      }
    }
  }

  private validateCommand(
    shot: Shot,
    cmd: Command,
    placedCharacters: Set<string>,
    enteredCharacters: Set<string>,
    time: number,
  ): void {
    switch (cmd.type) {
      case 'camera':
        if (!CAMERA_TYPES.has(cmd.cameraType)) {
          this.addError(1, 1, `Shot "${shot.id}": unknown camera type "${cmd.cameraType}"`);
        }
        if (cmd.motion && !CAMERA_MOTIONS.has(cmd.motion)) {
          this.addError(1, 1, `Shot "${shot.id}": unknown camera motion "${cmd.motion}"`);
        }
        if (cmd.duration !== undefined && cmd.duration < 0) {
          this.addError(1, 1, `Shot "${shot.id}": camera motion duration must be non-negative`);
        }
        break;

      case 'expression':
      case 'action':
      case 'say':
        this.checkCharacterPlaced(shot.id, cmd.character, placedCharacters, enteredCharacters);
        break;

      case 'move':
        this.checkCharacterPlaced(shot.id, cmd.character, placedCharacters, enteredCharacters);
        this.validatePosition(shot.id, cmd.to, `move target of "${cmd.character}"`);
        if (cmd.duration < 0) {
          this.addError(1, 1, `Shot "${shot.id}": move duration for "${cmd.character}" must be non-negative`);
        }
        // Check move end time within shot
        if (time + cmd.duration > shot.duration) {
          this.addWarning(
            1, 1,
            `Shot "${shot.id}": move for "${cmd.character}" ends at ${time + cmd.duration}s, exceeding shot duration (${shot.duration}s)`,
          );
        }
        break;

      case 'enter':
        // Enter introduces a new character — no need to check placement
        enteredCharacters.add(cmd.character);
        this.validatePosition(shot.id, cmd.from, `enter-from of "${cmd.character}"`);
        this.validatePosition(shot.id, cmd.to, `enter-to of "${cmd.character}"`);
        break;

      case 'sfx':
        if (!cmd.sound || cmd.sound.trim() === '') {
          this.addError(1, 1, `Shot "${shot.id}": SFX sound must be non-empty`);
        }
        break;

      case 'vfx':
        if (!cmd.effect || cmd.effect.trim() === '') {
          this.addError(1, 1, `Shot "${shot.id}": VFX effect must be non-empty`);
        }
        if (cmd.position && typeof cmd.position !== 'string') {
          this.validatePosition(shot.id, cmd.position, 'VFX position');
        }
        break;

      case 'bgm':
        // BGM in timeline is unusual but valid
        break;

      case 'place':
        // Place in timeline is unusual
        this.addWarning(1, 1, `Shot "${shot.id}": "place" inside timeline is unusual; prefer top-level placement`);
        break;
    }
  }

  // ── Character reference check ───────────────────────────

  private checkCharacterPlaced(
    shotId: string,
    character: string,
    placed: Set<string>,
    entered: Set<string>,
  ): void {
    if (!placed.has(character) && !entered.has(character)) {
      this.addError(
        1, 1,
        `Shot "${shotId}": character "${character}" is used but not placed or entered`,
      );
    }
  }

  // ── Position validation ─────────────────────────────────

  private validatePosition(shotId: string, pos: Position, context: string): void {
    const hasSemantic = pos.semantic !== undefined;
    const hasVertical = pos.vertical !== undefined;
    const hasCoords = pos.x !== undefined || pos.y !== undefined;

    if (!hasSemantic && !hasVertical && !hasCoords) {
      this.addError(1, 1, `Shot "${shotId}": empty position in ${context}`);
      return;
    }

    if (pos.semantic && !SEMANTIC_POSITIONS.has(pos.semantic)) {
      this.addError(1, 1, `Shot "${shotId}": invalid semantic position "${pos.semantic}" in ${context}`);
    }

    if (pos.vertical && !VERTICAL_POSITIONS.has(pos.vertical)) {
      this.addError(1, 1, `Shot "${shotId}": invalid vertical position "${pos.vertical}" in ${context}`);
    }

    // Mixing semantic and coordinate is a warning
    if ((hasSemantic || hasVertical) && hasCoords) {
      this.addWarning(1, 1, `Shot "${shotId}": mixing semantic and coordinate positions in ${context}`);
    }
  }

  // ── Transition ──────────────────────────────────────────

  private validateTransition(shot: Shot): void {
    if (!TRANSITION_TYPES.has(shot.transition.type)) {
      this.addError(1, 1, `Shot "${shot.id}": unknown transition type "${shot.transition.type}"`);
    }
    if (shot.transition.duration !== undefined && shot.transition.duration < 0) {
      this.addError(1, 1, `Shot "${shot.id}": transition duration must be non-negative`);
    }
  }

  // ── Helpers ─────────────────────────────────────────────

  private addError(line: number, column: number, message: string): void {
    this.errors.push({ line, column, message, severity: 'error' });
  }

  private addWarning(line: number, column: number, message: string): void {
    this.warnings.push({ line, column, message, severity: 'warning' });
  }
}

// ─── Convenience ──────────────────────────────────────────

export function validateShot(shot: Shot): ValidationResult {
  return new Validator().validate(shot);
}

export function validateShots(shots: Shot[]): ValidationResult {
  return new Validator().validateAll(shots);
}
