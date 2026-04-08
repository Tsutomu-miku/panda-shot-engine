// ============================================================
// panda-shot-engine — Scene DSL Serializer
// Converts Shot AST back to DSL text
// ============================================================

import {
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
} from './types';

// ─── Configuration ──────────────────────────────────────────

const INDENT = '  '; // 2-space indent

// ─── Serializer ─────────────────────────────────────────────

export class Serializer {
  /** Serialize an array of shots to DSL text. */
  serializeAll(shots: Shot[]): string {
    return shots.map((s) => this.serialize(s)).join('\n\n');
  }

  /** Serialize a single Shot to DSL text. */
  serialize(shot: Shot): string {
    const lines: string[] = [];

    // Shot header
    lines.push(`shot "${this.escapeString(shot.id)}":`);

    // Duration
    lines.push(`${INDENT}duration: ${this.formatTime(shot.duration)}`);

    // Set
    lines.push(`${INDENT}set: "${this.escapeString(shot.set)}"`);

    // BGM (optional)
    if (shot.bgm) {
      lines.push(`${INDENT}${this.serializeBgm(shot.bgm)}`);
    }

    // Blank line before placements
    if (shot.placements.length > 0) {
      lines.push('');
      for (const placement of shot.placements) {
        lines.push(`${INDENT}${this.serializePlace(placement)}`);
      }
    }

    // Timeline events
    if (shot.timeline.length > 0) {
      for (const event of shot.timeline) {
        lines.push('');
        lines.push(`${INDENT}at ${this.formatTime(event.time)}:`);
        for (const cmd of event.commands) {
          lines.push(`${INDENT}${INDENT}${this.serializeCommand(cmd)}`);
        }
      }
    }

    // Blank line + transition
    lines.push('');
    lines.push(`${INDENT}${this.serializeTransition(shot.transition)}`);

    return lines.join('\n');
  }

  // ── BGM ─────────────────────────────────────────────────

  private serializeBgm(bgm: BgmCommand): string {
    let result = `bgm: "${this.escapeString(bgm.track)}"`;
    if (bgm.volume !== undefined) {
      result += ` volume ${bgm.volume}`;
    }
    if (bgm.fadeIn !== undefined) {
      result += ` fade-in ${this.formatTime(bgm.fadeIn)}`;
    }
    if (bgm.fadeOut !== undefined) {
      result += ` fade-out ${this.formatTime(bgm.fadeOut)}`;
    }
    return result;
  }

  // ── Place ───────────────────────────────────────────────

  private serializePlace(cmd: PlaceCommand): string {
    let result = `place ${cmd.character} at ${this.formatPosition(cmd.position)}`;
    result += ` facing ${cmd.facing}`;
    if (cmd.scale !== undefined) {
      result += ` scale ${cmd.scale}`;
    }
    return result;
  }

  // ── Command dispatch ────────────────────────────────────

  private serializeCommand(cmd: Command): string {
    switch (cmd.type) {
      case 'camera':
        return this.serializeCamera(cmd);
      case 'expression':
        return this.serializeExpression(cmd);
      case 'action':
        return this.serializeAction(cmd);
      case 'say':
        return this.serializeSay(cmd);
      case 'move':
        return this.serializeMove(cmd);
      case 'enter':
        return this.serializeEnter(cmd);
      case 'sfx':
        return this.serializeSfx(cmd);
      case 'vfx':
        return this.serializeVfx(cmd);
      case 'bgm':
        return this.serializeBgm(cmd);
      case 'place':
        return this.serializePlace(cmd);
      default:
        return `# unknown command type: ${(cmd as Command).type}`;
    }
  }

  // ── Camera ──────────────────────────────────────────────

  private serializeCamera(cmd: CameraCommand): string {
    let result = `camera ${cmd.cameraType}`;
    if (cmd.target) {
      result += ` ${cmd.target}`;
    }
    if (cmd.motion) {
      result += ` ${cmd.motion}`;
      if (cmd.duration !== undefined) {
        result += ` ${this.formatTime(cmd.duration)}`;
      }
    }
    if (cmd.intensity !== undefined) {
      result += ` intensity ${cmd.intensity}`;
    }
    if (cmd.angle !== undefined) {
      result += ` angle ${cmd.angle}deg`;
    }
    return result;
  }

  // ── Expression ──────────────────────────────────────────

  private serializeExpression(cmd: ExpressionCommand): string {
    return `${cmd.character} expression ${cmd.expression}`;
  }

  // ── Action ──────────────────────────────────────────────

  private serializeAction(cmd: ActionCommand): string {
    let result = `${cmd.character} action ${cmd.action}`;
    if (cmd.target) {
      result += ` target ${cmd.target}`;
    }
    return result;
  }

  // ── Say ─────────────────────────────────────────────────

  private serializeSay(cmd: SayCommand): string {
    let result = `${cmd.character} say "${this.escapeString(cmd.text)}"`;
    if (cmd.voice) {
      result += ` voice "${this.escapeString(cmd.voice)}"`;
    }
    return result;
  }

  // ── Move ────────────────────────────────────────────────

  private serializeMove(cmd: MoveCommand): string {
    return `${cmd.character} move to ${this.formatPosition(cmd.to)} ${this.formatTime(cmd.duration)}`;
  }

  // ── Enter ───────────────────────────────────────────────

  private serializeEnter(cmd: EnterCommand): string {
    let result = `${cmd.character} enter-from ${this.formatPosition(cmd.from)} to ${this.formatPosition(cmd.to)}`;
    result += ` facing ${cmd.facing}`;
    if (cmd.action) {
      result += ` action ${cmd.action}`;
    }
    return result;
  }

  // ── SFX ─────────────────────────────────────────────────

  private serializeSfx(cmd: SfxCommand): string {
    return `sfx "${this.escapeString(cmd.sound)}"`;
  }

  // ── VFX ─────────────────────────────────────────────────

  private serializeVfx(cmd: VfxCommand): string {
    let result = `vfx ${cmd.effect}`;
    if (cmd.target) {
      result += ` at ${cmd.target}`;
    } else if (cmd.position) {
      if (typeof cmd.position === 'string') {
        result += ` at ${cmd.position}`;
      } else {
        result += ` at ${this.formatPosition(cmd.position)}`;
      }
    }
    return result;
  }

  // ── Transition ──────────────────────────────────────────

  private serializeTransition(t: Transition): string {
    let result = `transition: ${t.type}`;
    if (t.duration !== undefined) {
      result += ` ${this.formatTime(t.duration)}`;
    }
    return result;
  }

  // ── Formatting helpers ──────────────────────────────────

  private formatPosition(pos: Position): string {
    if (pos.x !== undefined && pos.y !== undefined) {
      return `${pos.x} ${pos.y}`;
    }
    const parts: string[] = [];
    if (pos.semantic) parts.push(pos.semantic);
    if (pos.vertical) parts.push(pos.vertical);
    return parts.join(' ') || 'center';
  }

  private formatTime(seconds: number): string {
    if (seconds === 0) return '0s';
    // Use milliseconds if sub-second and not a clean fraction
    if (seconds < 1 && (seconds * 1000) % 1 === 0) {
      return `${seconds * 1000}ms`;
    }
    // Clean decimal representation
    const str = parseFloat(seconds.toFixed(3)).toString();
    return `${str}s`;
  }

  private escapeString(s: string): string {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t');
  }
}

// ─── Convenience ──────────────────────────────────────────

export function serializeShot(shot: Shot): string {
  return new Serializer().serialize(shot);
}

export function serializeShots(shots: Shot[]): string {
  return new Serializer().serializeAll(shots);
}
