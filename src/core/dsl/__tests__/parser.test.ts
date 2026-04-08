// ============================================================
// panda-shot-engine — Scene DSL Parser Tests
// Comprehensive test suite using simple assert-style testing
// ============================================================

import { tokenize } from '../tokenizer';
import { parseShot, parseShots, Parser, ParseError } from '../parser';
import { serializeShot } from '../serializer';
import { validateShot } from '../validator';
import {
  Shot,
  Token,
  CameraCommand,
  ExpressionCommand,
  SayCommand,
  MoveCommand,
  EnterCommand,
  SfxCommand,
  VfxCommand,
  ActionCommand,
} from '../types';

// ─── Test Framework ─────────────────────────────────────────

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`,
    );
  }
}

function assertDeepIncludes(obj: any, subset: Record<string, any>, prefix: string = ''): void {
  for (const [key, expected] of Object.entries(subset)) {
    const actual = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
      assert(typeof actual === 'object' && actual !== null, `${path} should be an object`);
      assertDeepIncludes(actual, expected, path);
    } else if (Array.isArray(expected)) {
      assert(Array.isArray(actual), `${path} should be an array`);
      assertEqual(actual.length, expected.length, `${path}.length`);
      for (let i = 0; i < expected.length; i++) {
        if (typeof expected[i] === 'object') {
          assertDeepIncludes(actual[i], expected[i], `${path}[${i}]`);
        } else {
          assertEqual(actual[i], expected[i], `${path}[${i}]`);
        }
      }
    } else {
      assertEqual(actual, expected, path);
    }
  }
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    passCount++;
    console.log(`  PASS  ${name}`);
  } catch (e: any) {
    failCount++;
    const msg = `  FAIL  ${name}: ${e.message}`;
    console.log(msg);
    failures.push(msg);
  }
}

// ─── Test Cases ─────────────────────────────────────────────

// 1. Basic shot parsing
function testBasicShot(): void {
  test('Basic shot parsing', () => {
    const dsl = `shot "EP01_001":
  duration: 5s
  set: "inn_interior"
  transition: cut
`;
    const shot = parseShot(dsl);
    assertEqual(shot.id, 'EP01_001', 'shot id');
    assertEqual(shot.duration, 5, 'duration');
    assertEqual(shot.set, 'inn_interior', 'set');
    assertEqual(shot.transition.type, 'cut', 'transition');
    assertEqual(shot.placements.length, 0, 'placements count');
    assertEqual(shot.timeline.length, 0, 'timeline count');
  });
}

// 2. Shot with placements
function testPlacements(): void {
  test('Shot with character placements', () => {
    const dsl = `shot "scene_02":
  duration: 8s
  set: "forest"

  place hero at center facing right
  place villain at left facing right scale 1.2

  transition: fade-black
`;
    const shot = parseShot(dsl);
    assertEqual(shot.placements.length, 2, 'placements count');

    const hero = shot.placements[0];
    assertEqual(hero.character, 'hero', 'hero character');
    assertEqual(hero.position.semantic, 'center', 'hero position');
    assertEqual(hero.facing, 'right', 'hero facing');
    assertEqual(hero.scale, undefined, 'hero scale');

    const villain = shot.placements[1];
    assertEqual(villain.character, 'villain', 'villain character');
    assertEqual(villain.position.semantic, 'left', 'villain position');
    assertEqual(villain.facing, 'right', 'villain facing');
    assertEqual(villain.scale, 1.2, 'villain scale');

    assertEqual(shot.transition.type, 'fade-black', 'transition type');
  });
}

// 3. Multi-character scene with full timeline
function testMultiCharacterTimeline(): void {
  test('Multi-character scene with full timeline', () => {
    const dsl = `shot "EP01_001":
  duration: 5s
  set: "inn_interior"

  place hero at center facing right
  place npc at left facing right

  at 0s:
    camera wide
    hero expression neutral

  at 2s:
    hero say "Hello" voice "warm"
    npc expression surprised

  at 4s:
    npc say "Welcome!"

  transition: cut
`;
    const shot = parseShot(dsl);

    assertEqual(shot.placements.length, 2, 'placements');
    assertEqual(shot.timeline.length, 3, 'timeline events');

    // t=0
    const ev0 = shot.timeline[0];
    assertEqual(ev0.time, 0, 'event 0 time');
    assertEqual(ev0.commands.length, 2, 'event 0 commands');
    const cam = ev0.commands[0] as CameraCommand;
    assertEqual(cam.type, 'camera', 'camera command type');
    assertEqual(cam.cameraType, 'wide', 'camera type');
    const expr = ev0.commands[1] as ExpressionCommand;
    assertEqual(expr.type, 'expression', 'expression command type');
    assertEqual(expr.character, 'hero', 'expression character');
    assertEqual(expr.expression, 'neutral', 'expression value');

    // t=2
    const ev2 = shot.timeline[1];
    assertEqual(ev2.time, 2, 'event 1 time');
    const say = ev2.commands[0] as SayCommand;
    assertEqual(say.type, 'say', 'say command type');
    assertEqual(say.character, 'hero', 'say character');
    assertEqual(say.text, 'Hello', 'say text');
    assertEqual(say.voice, 'warm', 'say voice');

    // t=4
    const ev4 = shot.timeline[2];
    assertEqual(ev4.time, 4, 'event 2 time');
    assertEqual(ev4.commands.length, 1, 'event 2 commands');
  });
}

// 4. Camera commands with motions
function testCameraCommands(): void {
  test('Camera commands with motions', () => {
    const dsl = `shot "cam_test":
  duration: 10s
  set: "studio"

  place actor at center facing left

  at 0s:
    camera wide

  at 3s:
    camera close-up actor zoom-in 2s

  at 7s:
    camera medium pan-left 1.5s

  transition: dissolve 0.5s
`;
    const shot = parseShot(dsl);
    assertEqual(shot.timeline.length, 3, 'timeline events');

    const cam0 = shot.timeline[0].commands[0] as CameraCommand;
    assertEqual(cam0.cameraType, 'wide', 'cam0 type');
    assertEqual(cam0.target, undefined, 'cam0 no target');
    assertEqual(cam0.motion, undefined, 'cam0 no motion');

    const cam1 = shot.timeline[1].commands[0] as CameraCommand;
    assertEqual(cam1.cameraType, 'close-up', 'cam1 type');
    assertEqual(cam1.target, 'actor', 'cam1 target');
    assertEqual(cam1.motion, 'zoom-in', 'cam1 motion');
    assertEqual(cam1.duration, 2, 'cam1 duration');

    const cam2 = shot.timeline[2].commands[0] as CameraCommand;
    assertEqual(cam2.cameraType, 'medium', 'cam2 type');
    assertEqual(cam2.motion, 'pan-left', 'cam2 motion');
    assertEqual(cam2.duration, 1.5, 'cam2 duration');

    // Transition with duration
    assertEqual(shot.transition.type, 'dissolve', 'transition type');
    assertEqual(shot.transition.duration, 0.5, 'transition duration');
  });
}

// 5. Enter and Move commands
function testEnterAndMove(): void {
  test('Enter and Move commands', () => {
    const dsl = `shot "entrance":
  duration: 6s
  set: "hallway"

  place guard at right facing left

  at 0s:
    camera wide

  at 1s:
    hero enter-from far-left to center facing right

  at 3s:
    hero move to right 2s

  transition: cut
`;
    const shot = parseShot(dsl);

    const enterEvent = shot.timeline[1];
    assertEqual(enterEvent.time, 1, 'enter time');
    const enter = enterEvent.commands[0] as EnterCommand;
    assertEqual(enter.type, 'enter', 'enter type');
    assertEqual(enter.character, 'hero', 'enter character');
    assertEqual(enter.from.semantic, 'far-left', 'enter from');
    assertEqual(enter.to.semantic, 'center', 'enter to');
    assertEqual(enter.facing, 'right', 'enter facing');

    const moveEvent = shot.timeline[2];
    assertEqual(moveEvent.time, 3, 'move time');
    const move = moveEvent.commands[0] as MoveCommand;
    assertEqual(move.type, 'move', 'move type');
    assertEqual(move.character, 'hero', 'move character');
    assertEqual(move.to.semantic, 'right', 'move to');
    assertEqual(move.duration, 2, 'move duration');
  });
}

// 6. SFX, VFX, and Action commands
function testEffectsAndActions(): void {
  test('SFX, VFX, and Action commands', () => {
    const dsl = `shot "battle":
  duration: 8s
  set: "arena"

  place warrior at left facing right
  place mage at right facing left

  at 0s:
    camera wide
    warrior action slash target mage

  at 2s:
    sfx "sword_clash"
    vfx sparks at center

  at 4s:
    mage action cast

  transition: fade-white
`;
    const shot = parseShot(dsl);
    assertEqual(shot.placements.length, 2, 'placements');

    // Action with target
    const actionCmd = shot.timeline[0].commands[1] as ActionCommand;
    assertEqual(actionCmd.type, 'action', 'action type');
    assertEqual(actionCmd.character, 'warrior', 'action character');
    assertEqual(actionCmd.action, 'slash', 'action name');
    assertEqual(actionCmd.target, 'mage', 'action target');

    // SFX
    const sfxCmd = shot.timeline[1].commands[0] as SfxCommand;
    assertEqual(sfxCmd.type, 'sfx', 'sfx type');
    assertEqual(sfxCmd.sound, 'sword_clash', 'sfx sound');

    // VFX
    const vfxCmd = shot.timeline[1].commands[1] as VfxCommand;
    assertEqual(vfxCmd.type, 'vfx', 'vfx type');
    assertEqual(vfxCmd.effect, 'sparks', 'vfx effect');

    // Action without target
    const castCmd = shot.timeline[2].commands[0] as ActionCommand;
    assertEqual(castCmd.action, 'cast', 'cast action');
    assertEqual(castCmd.target, undefined, 'cast no target');
  });
}

// 7. BGM directive
function testBgm(): void {
  test('BGM directive', () => {
    const dsl = `shot "bgm_test":
  duration: 10s
  set: "tavern"
  bgm: "tavern_music" volume 0.8 fade-in 2s

  transition: cut
`;
    const shot = parseShot(dsl);
    assert(shot.bgm !== undefined, 'bgm should be defined');
    assertEqual(shot.bgm!.track, 'tavern_music', 'bgm track');
    assertEqual(shot.bgm!.volume, 0.8, 'bgm volume');
    assertEqual(shot.bgm!.fadeIn, 2, 'bgm fade-in');
  });
}

// 8. Error handling — invalid transition
function testErrorHandling(): void {
  test('Error handling — invalid transition type', () => {
    const dsl = `shot "error_test":
  duration: 5s
  set: "studio"
  transition: explode
`;
    let caught = false;
    try {
      parseShot(dsl);
    } catch (e: any) {
      caught = true;
      assert(e instanceof ParseError || e instanceof Error, 'Should throw ParseError');
      assert(e.message.includes('transition') || e.message.includes('explode'), 'Message should mention the problem');
    }
    assert(caught, 'Should have thrown an error');
  });
}

// 9. Roundtrip: parse → serialize → re-parse
function testRoundtrip(): void {
  test('Roundtrip: parse → serialize → re-parse', () => {
    const dsl = `shot "roundtrip":
  duration: 5s
  set: "test_scene"

  place hero at center facing right

  at 0s:
    camera wide
    hero expression happy

  at 2s:
    hero say "Hello world"

  transition: cut
`;
    const shot1 = parseShot(dsl);
    const serialized = serializeShot(shot1);
    const shot2 = parseShot(serialized);

    assertEqual(shot2.id, shot1.id, 'roundtrip id');
    assertEqual(shot2.duration, shot1.duration, 'roundtrip duration');
    assertEqual(shot2.set, shot1.set, 'roundtrip set');
    assertEqual(shot2.placements.length, shot1.placements.length, 'roundtrip placements');
    assertEqual(shot2.timeline.length, shot1.timeline.length, 'roundtrip timeline');
    assertEqual(shot2.transition.type, shot1.transition.type, 'roundtrip transition');

    // Deep check a few commands
    const expr1 = shot1.timeline[0].commands[1] as ExpressionCommand;
    const expr2 = shot2.timeline[0].commands[1] as ExpressionCommand;
    assertEqual(expr2.expression, expr1.expression, 'roundtrip expression');

    const say1 = shot1.timeline[1].commands[0] as SayCommand;
    const say2 = shot2.timeline[1].commands[0] as SayCommand;
    assertEqual(say2.text, say1.text, 'roundtrip say text');
  });
}

// 10. Validator — character not placed
function testValidatorCharNotPlaced(): void {
  test('Validator: character not placed', () => {
    const shot: Shot = {
      id: 'val_test',
      duration: 5,
      set: 'test',
      placements: [],
      timeline: [
        {
          time: 0,
          commands: [
            { type: 'say', character: 'ghost', text: 'boo' },
          ],
        },
      ],
      transition: { type: 'cut' },
    };
    const result = validateShot(shot);
    assertEqual(result.valid, false, 'should be invalid');
    assert(result.errors.length > 0, 'should have errors');
    assert(
      result.errors.some((e) => e.message.includes('ghost')),
      'error should mention "ghost"',
    );
  });
}

// 11. Validator — time exceeds duration
function testValidatorTimeExceedsDuration(): void {
  test('Validator: timeline event exceeds duration', () => {
    const shot: Shot = {
      id: 'time_test',
      duration: 3,
      set: 'test',
      placements: [
        { type: 'place', character: 'hero', position: { semantic: 'center' }, facing: 'right' },
      ],
      timeline: [
        {
          time: 5,
          commands: [
            { type: 'expression', character: 'hero', expression: 'sad' },
          ],
        },
      ],
      transition: { type: 'cut' },
    };
    const result = validateShot(shot);
    assertEqual(result.valid, false, 'should be invalid');
    assert(
      result.errors.some((e) => e.message.includes('exceeds')),
      'error should mention exceeding duration',
    );
  });
}

// 12. Multiple shots parsing
function testMultipleShots(): void {
  test('Multiple shots in one source', () => {
    const dsl = `shot "scene_01":
  duration: 3s
  set: "park"
  transition: cut

shot "scene_02":
  duration: 4s
  set: "office"
  transition: fade-black
`;
    const shots = parseShots(dsl);
    assertEqual(shots.length, 2, 'should have 2 shots');
    assertEqual(shots[0].id, 'scene_01', 'first shot id');
    assertEqual(shots[1].id, 'scene_02', 'second shot id');
    assertEqual(shots[1].transition.type, 'fade-black', 'second transition');
  });
}

// 13. Tokenizer — indent/dedent
function testTokenizerIndentation(): void {
  test('Tokenizer produces correct INDENT/DEDENT', () => {
    const dsl = `shot "t":
  duration: 1s
  at 0s:
    camera wide
  transition: cut
`;
    const tokens = tokenize(dsl);

    const types = tokens.map((t) => t.type);
    // Should contain at least: INDENT after shot header, INDENT after at 0s:, DEDENT to close at block, DEDENT to close shot
    assert(types.includes('INDENT'), 'should have INDENT');
    assert(types.includes('DEDENT'), 'should have DEDENT');
    assert(types.includes('EOF'), 'should end with EOF');

    // Count indents and dedents — should be balanced
    const indents = types.filter((t) => t === 'INDENT').length;
    const dedents = types.filter((t) => t === 'DEDENT').length;
    assertEqual(indents, dedents, 'INDENTs and DEDENTs should balance');
  });
}

// ─── Runner ─────────────────────────────────────────────────

export function runTests(): { passed: number; failed: number; failures: string[] } {
  console.log('\n=== panda-shot-engine DSL Parser Tests ===\n');

  passCount = 0;
  failCount = 0;
  failures.length = 0;

  testBasicShot();
  testPlacements();
  testMultiCharacterTimeline();
  testCameraCommands();
  testEnterAndMove();
  testEffectsAndActions();
  testBgm();
  testErrorHandling();
  testRoundtrip();
  testValidatorCharNotPlaced();
  testValidatorTimeExceedsDuration();
  testMultipleShots();
  testTokenizerIndentation();

  console.log(`\n─── Results: ${passCount} passed, ${failCount} failed ───\n`);

  if (failures.length > 0) {
    console.log('Failures:');
    for (const f of failures) {
      console.log(f);
    }
    console.log('');
  }

  return { passed: passCount, failed: failCount, failures: [...failures] };
}

// Auto-run when executed directly
runTests();
