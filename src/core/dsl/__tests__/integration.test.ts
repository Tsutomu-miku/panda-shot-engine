// ============================================================
// panda-shot-engine — DSL Integration Tests
// End-to-end tests for tokenizer, parser, serializer, validator,
// and round-trip DSL text consistency.
// At least 15 test cases covering the full pipeline.
// ============================================================

import { tokenize } from '../tokenizer';
import { parseShot, parseShots, ParseError } from '../parser';
import { serializeShot, serializeShots } from '../serializer';
import { validateShot, validateShots, Validator } from '../validator';
import {
  Shot,
  Token,
  PlaceCommand,
  CameraCommand,
  ActionCommand,
  ExpressionCommand,
  SayCommand,
  SfxCommand,
  VfxCommand,
  MoveCommand,
  TimelineEvent,
  SEMANTIC_POSITIONS,
  CAMERA_TYPES,
  CAMERA_MOTIONS,
  TRANSITION_TYPES,
} from '../types';
import { SHOT_1_DSL, SHOT_2_DSL, SHOT_3_DSL, FULL_DEMO_DSL } from '../../../demo/demo-project';

// ─── Test 1: Tokenizer produces correct token types ─────────

describe('Tokenizer', () => {
  test('1. tokenizes a minimal shot correctly', () => {
    const src = `shot "test_001":
  duration: 5s
  set: "forest"

  transition: cut`;

    const tokens = tokenize(src);
    expect(tokens.length).toBeGreaterThan(0);

    // First token should be a keyword 'shot'
    const shotToken = tokens.find((t) => t.value === 'shot');
    expect(shotToken).toBeDefined();
    expect(shotToken!.type).toBe('KEYWORD');

    // Should have string tokens for "test_001" and "forest"
    const strings = tokens.filter((t) => t.type === 'STRING');
    expect(strings.length).toBeGreaterThanOrEqual(2);

    // Should have INDENT tokens
    const indents = tokens.filter((t) => t.type === 'INDENT');
    expect(indents.length).toBeGreaterThan(0);

    // Should end with EOF
    const last = tokens[tokens.length - 1];
    expect(last.type).toBe('EOF');
  });

  test('2. tokenizes numbers with units', () => {
    const src = `shot "t":
  duration: 10s
  set: "x"

  transition: cut`;

    const tokens = tokenize(src);
    const numTokens = tokens.filter((t) => t.type === 'NUMBER');
    expect(numTokens.length).toBeGreaterThan(0);
    // duration value should be present
    const tenToken = numTokens.find((t) => t.value === '10');
    expect(tenToken).toBeDefined();
  });
});

// ─── Test 3-6: Parser produces correct Shot AST ─────────────

describe('Parser', () => {
  test('3. parses a minimal shot', () => {
    const src = `shot "minimal_001":
  duration: 3s
  set: "inn_interior"

  transition: cut`;

    const shot = parseShot(src);
    expect(shot.id).toBe('minimal_001');
    expect(shot.duration).toBe(3);
    expect(shot.set).toBe('inn_interior');
    expect(shot.transition.type).toBe('cut');
    expect(shot.placements).toEqual([]);
    expect(shot.timeline).toEqual([]);
  });

  test('4. parses placements with position and facing', () => {
    const src = `shot "place_test":
  duration: 5s
  set: "street"

  place "hero" at center facing right
  place "villain" at left facing left scale 1.2

  transition: cut`;

    const shot = parseShot(src);
    expect(shot.placements.length).toBe(2);

    const hero = shot.placements.find((p) => p.character === 'hero') as PlaceCommand;
    expect(hero).toBeDefined();
    expect(hero.position.semantic).toBe('center');
    expect(hero.facing).toBe('right');

    const villain = shot.placements.find((p) => p.character === 'villain') as PlaceCommand;
    expect(villain).toBeDefined();
    expect(villain.position.semantic).toBe('left');
    expect(villain.facing).toBe('left');
    expect(villain.scale).toBe(1.2);
  });

  test('5. parses timeline events with multiple command types', () => {
    const src = `shot "timeline_test":
  duration: 10s
  set: "forest"

  place "hero" at center facing right

  at 0s:
    camera wide
    expression "hero" neutral

  at 3s:
    action "hero" sword_slash
    sfx "sword_clash"

  at 5s:
    say "hero" "Hello world!"

  transition: fade-black`;

    const shot = parseShot(src);
    expect(shot.timeline.length).toBe(3);

    // First event at 0s
    expect(shot.timeline[0].time).toBe(0);
    const firstCmds = shot.timeline[0].commands;
    expect(firstCmds.length).toBe(2);
    expect(firstCmds[0].type).toBe('camera');
    expect((firstCmds[0] as CameraCommand).cameraType).toBe('wide');
    expect(firstCmds[1].type).toBe('expression');

    // Second event at 3s
    expect(shot.timeline[1].time).toBe(3);
    expect(shot.timeline[1].commands[0].type).toBe('action');
    expect((shot.timeline[1].commands[0] as ActionCommand).action).toBe('sword_slash');
    expect(shot.timeline[1].commands[1].type).toBe('sfx');

    // Third event at 5s
    expect(shot.timeline[2].time).toBe(5);
    expect(shot.timeline[2].commands[0].type).toBe('say');
    expect((shot.timeline[2].commands[0] as SayCommand).text).toBe('Hello world!');

    // Transition
    expect(shot.transition.type).toBe('fade-black');
  });

  test('6. parses multiple shots', () => {
    const src = `shot "multi_001":
  duration: 5s
  set: "inn"

  transition: cut

shot "multi_002":
  duration: 8s
  set: "street"

  transition: dissolve`;

    const shots = parseShots(src);
    expect(shots.length).toBe(2);
    expect(shots[0].id).toBe('multi_001');
    expect(shots[1].id).toBe('multi_002');
    expect(shots[1].transition.type).toBe('dissolve');
  });

  test('7. throws ParseError on invalid input', () => {
    const invalid = `this is not valid DSL`;
    expect(() => parseShot(invalid)).toThrow();
  });
});

// ─── Test 8-10: Serializer produces correct DSL text ────────

describe('Serializer', () => {
  test('8. serializes a minimal shot', () => {
    const shot: Shot = {
      id: 'ser_001',
      duration: 5,
      set: 'test_scene',
      placements: [],
      timeline: [],
      transition: { type: 'cut' },
    };

    const text = serializeShot(shot);
    expect(text).toContain('shot "ser_001"');
    expect(text).toContain('duration: 5s');
    expect(text).toContain('set: "test_scene"');
    expect(text).toContain('transition: cut');
  });

  test('9. serializes placements correctly', () => {
    const shot: Shot = {
      id: 'ser_002',
      duration: 5,
      set: 'test',
      placements: [
        {
          type: 'place',
          character: 'hero',
          position: { semantic: 'center' },
          facing: 'right',
          scale: 1.5,
        },
      ],
      timeline: [],
      transition: { type: 'cut' },
    };

    const text = serializeShot(shot);
    expect(text).toContain('place "hero"');
    expect(text).toContain('center');
    expect(text).toContain('facing right');
    expect(text).toContain('scale 1.5');
  });

  test('10. serializes timeline events with commands', () => {
    const shot: Shot = {
      id: 'ser_003',
      duration: 10,
      set: 'test',
      placements: [],
      timeline: [
        {
          time: 0,
          commands: [
            { type: 'camera', cameraType: 'wide' } as CameraCommand,
          ],
        },
        {
          time: 3,
          commands: [
            { type: 'say', character: 'hero', text: 'Hello!' } as SayCommand,
          ],
        },
      ],
      transition: { type: 'fade-black' },
    };

    const text = serializeShot(shot);
    expect(text).toContain('at 0s:');
    expect(text).toContain('camera wide');
    expect(text).toContain('at 3s:');
    expect(text).toContain('say "hero"');
    expect(text).toContain('"Hello!"');
    expect(text).toContain('transition: fade-black');
  });
});

// ─── Test 11-12: Round-trip consistency ─────────────────────

describe('Round-trip (parse -> serialize -> reparse)', () => {
  test('11. round-trip preserves shot structure', () => {
    const src = `shot "roundtrip_001":
  duration: 7s
  set: "marketplace"

  place "hero" at center facing right
  place "merchant" at right facing left

  at 0s:
    camera wide

  at 2s:
    expression "hero" happy
    say "hero" "Nice to meet you"

  at 5s:
    action "merchant" bow

  transition: cut`;

    const shot1 = parseShot(src);
    const serialized = serializeShot(shot1);
    const shot2 = parseShot(serialized);

    expect(shot2.id).toBe(shot1.id);
    expect(shot2.duration).toBe(shot1.duration);
    expect(shot2.set).toBe(shot1.set);
    expect(shot2.placements.length).toBe(shot1.placements.length);
    expect(shot2.timeline.length).toBe(shot1.timeline.length);
    expect(shot2.transition.type).toBe(shot1.transition.type);

    // Deep check placements
    for (let i = 0; i < shot1.placements.length; i++) {
      expect(shot2.placements[i].character).toBe(shot1.placements[i].character);
      expect(shot2.placements[i].position.semantic).toBe(
        shot1.placements[i].position.semantic,
      );
      expect(shot2.placements[i].facing).toBe(shot1.placements[i].facing);
    }

    // Deep check timeline events
    for (let i = 0; i < shot1.timeline.length; i++) {
      expect(shot2.timeline[i].time).toBe(shot1.timeline[i].time);
      expect(shot2.timeline[i].commands.length).toBe(
        shot1.timeline[i].commands.length,
      );
      for (let j = 0; j < shot1.timeline[i].commands.length; j++) {
        expect(shot2.timeline[i].commands[j].type).toBe(
          shot1.timeline[i].commands[j].type,
        );
      }
    }
  });

  test('12. round-trip with demo project shots', () => {
    const shots1 = parseShots(FULL_DEMO_DSL);
    const serialized = serializeShots(shots1);
    const shots2 = parseShots(serialized);

    expect(shots2.length).toBe(shots1.length);

    for (let s = 0; s < shots1.length; s++) {
      expect(shots2[s].id).toBe(shots1[s].id);
      expect(shots2[s].duration).toBe(shots1[s].duration);
      expect(shots2[s].set).toBe(shots1[s].set);
      expect(shots2[s].placements.length).toBe(shots1[s].placements.length);
      expect(shots2[s].timeline.length).toBe(shots1[s].timeline.length);
    }
  });
});

// ─── Test 13-15: Validator ──────────────────────────────────

describe('Validator', () => {
  test('13. validates a correct shot without errors', () => {
    const shot = parseShot(SHOT_1_DSL);
    const result = validateShot(shot);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('14. validates all demo shots without errors', () => {
    const shots = parseShots(FULL_DEMO_DSL);
    const result = validateShots(shots);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('15. detects warnings for potential issues', () => {
    // A shot with negative duration should fail or warn
    const shot: Shot = {
      id: '',
      duration: -1,
      set: '',
      placements: [],
      timeline: [],
      transition: { type: 'cut' },
    };

    const validator = new Validator();
    const result = validator.validate(shot);
    // Should have errors or warnings for empty id, negative duration, empty set
    const issues = [...result.errors, ...result.warnings];
    expect(issues.length).toBeGreaterThan(0);
  });

  test('16. detects duplicate character placements', () => {
    const shot: Shot = {
      id: 'dup_test',
      duration: 5,
      set: 'test_scene',
      placements: [
        { type: 'place', character: 'hero', position: { semantic: 'left' }, facing: 'right' },
        { type: 'place', character: 'hero', position: { semantic: 'right' }, facing: 'left' },
      ],
      timeline: [],
      transition: { type: 'cut' },
    };

    const result = validateShot(shot);
    const allIssues = [...result.errors, ...result.warnings];
    // Should detect duplicate placement
    const dupIssues = allIssues.filter(
      (d) => d.message.toLowerCase().includes('duplicate') || d.message.toLowerCase().includes('already'),
    );
    expect(dupIssues.length).toBeGreaterThan(0);
  });

  test('17. validates timeline event times within duration', () => {
    const shot: Shot = {
      id: 'time_test',
      duration: 5,
      set: 'test',
      placements: [],
      timeline: [
        { time: 0, commands: [{ type: 'camera', cameraType: 'wide' } as CameraCommand] },
        { time: 10, commands: [{ type: 'camera', cameraType: 'close-up' } as CameraCommand] },
      ],
      transition: { type: 'cut' },
    };

    const result = validateShot(shot);
    const allIssues = [...result.errors, ...result.warnings];
    // Event at time 10 exceeds duration 5 — should flag
    const timeIssues = allIssues.filter(
      (d) => d.message.toLowerCase().includes('exceed') || d.message.toLowerCase().includes('duration') || d.message.toLowerCase().includes('time'),
    );
    expect(timeIssues.length).toBeGreaterThan(0);
  });
});

// ─── Test 18: Full pipeline integration ─────────────────────

describe('Full Pipeline Integration', () => {
  test('18. demo project: tokenize -> parse -> validate -> serialize -> reparse', () => {
    // Step 1: Tokenize
    const tokens = tokenize(FULL_DEMO_DSL);
    expect(tokens.length).toBeGreaterThan(50);

    // Step 2: Parse
    const shots = parseShots(FULL_DEMO_DSL);
    expect(shots.length).toBe(3);

    // Verify shot IDs match the demo
    expect(shots[0].id).toContain('客栈相遇');
    expect(shots[1].id).toContain('客栈相遇');
    expect(shots[2].id).toContain('客栈相遇');

    // Step 3: Validate all
    const validationResult = validateShots(shots);
    expect(validationResult.errors.length).toBe(0);

    // Step 4: Serialize
    const reserialized = serializeShots(shots);
    expect(reserialized.length).toBeGreaterThan(100);

    // Step 5: Reparse
    const reparsed = parseShots(reserialized);
    expect(reparsed.length).toBe(3);

    // Step 6: Verify structural equivalence
    for (let i = 0; i < shots.length; i++) {
      expect(reparsed[i].id).toBe(shots[i].id);
      expect(reparsed[i].duration).toBe(shots[i].duration);
      expect(reparsed[i].set).toBe(shots[i].set);
      expect(reparsed[i].placements.length).toBe(shots[i].placements.length);
      expect(reparsed[i].transition.type).toBe(shots[i].transition.type);
    }
  });

  test('19. individual demo shots parse and validate correctly', () => {
    const dslTexts = [SHOT_1_DSL, SHOT_2_DSL, SHOT_3_DSL];

    for (const dsl of dslTexts) {
      const shot = parseShot(dsl);
      expect(shot.id).toBeTruthy();
      expect(shot.duration).toBeGreaterThan(0);
      expect(shot.set).toBeTruthy();

      const result = validateShot(shot);
      expect(result.errors).toEqual([]);

      // Verify round-trip
      const serialized = serializeShot(shot);
      const reparsed = parseShot(serialized);
      expect(reparsed.id).toBe(shot.id);
    }
  });

  test('20. shot 1 has expected characters and events', () => {
    const shot = parseShot(SHOT_1_DSL);

    // Should have character placements
    expect(shot.placements.length).toBeGreaterThan(0);
    const charNames = shot.placements.map((p) => p.character);
    // The demo has hero (张三) and possibly others in shot 1
    expect(charNames.length).toBeGreaterThan(0);

    // Should have timeline events
    expect(shot.timeline.length).toBeGreaterThan(0);

    // First timeline event should be at time 0
    expect(shot.timeline[0].time).toBe(0);

    // Should have at least one camera command
    const hasCam = shot.timeline.some((te) =>
      te.commands.some((c) => c.type === 'camera'),
    );
    expect(hasCam).toBe(true);
  });
});
