/**
 * panda-shot-engine — Predefined Action Library (Expanded)
 *
 * 19 actions, each with at least 3 keyframes of complete bone-state data.
 * Rotation values are in radians.
 *
 * Actions:
 *   1. idle           – gentle breathing sway
 *   2. walk_right     – walk cycle facing right (loop)
 *   3. walk_left      – walk cycle facing left (loop)
 *   4. run_right      – run cycle (loop)
 *   5. punch          – throw a punch
 *   6. kick           – front kick
 *   7. sword_slash    – diagonal slash with right arm
 *   8. bow            – polite bow
 *   9. nod            – head nod
 *  10. shake_head     – head shake
 *  11. wave           – wave hand
 *  12. sit_down       – sit down on ground
 *  13. stand_up       – stand up from sitting
 *  14. knocked_back   – hit reaction / knockback
 *  15. jump           – jump in place
 *  16. cast_spell     – spell casting gesture
 *  17. drink          – drinking motion
 *  18. pat_shoulder   – pat someone's shoulder
 *  19. point          – point forward
 */

import type { ActionDefinition } from './types';

// Helper: degrees to radians
const d = (deg: number) => (deg * Math.PI) / 180;

// =========================================================================
// 1. idle — subtle breathing oscillation
// =========================================================================

export const idle: ActionDefinition = {
  id: 'idle',
  name: 'Idle',
  category: 'idle',
  tags: ['breathing', 'rest', 'standing'],
  description: 'Gentle breathing sway while standing still',
  targetSkeleton: 'humanoid',
  duration: 2.0,
  loop: true,
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: 0, translateY: 0 },
        chest: { rotation: 0, translateY: 0 },
        head: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
        forearm_l: { rotation: d(5) },
        forearm_r: { rotation: d(-5) },
      },
    },
    {
      time: 0.5,
      boneStates: {
        spine: { rotation: d(-1), translateY: -2 },
        chest: { rotation: d(1), translateY: -1 },
        head: { rotation: d(2) },
        upper_arm_l: { rotation: d(12) },
        upper_arm_r: { rotation: d(-12) },
        forearm_l: { rotation: d(6) },
        forearm_r: { rotation: d(-6) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        spine: { rotation: 0, translateY: 0 },
        chest: { rotation: 0, translateY: 0 },
        head: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
        forearm_l: { rotation: d(5) },
        forearm_r: { rotation: d(-5) },
      },
    },
  ],
};

// =========================================================================
// 2. walk_right — walk cycle (also used as generic "walk")
// =========================================================================

export const walk_right: ActionDefinition = {
  id: 'walk_right',
  name: 'Walk Right',
  category: 'movement',
  tags: ['walk', 'locomotion', 'right'],
  description: 'Walking cycle facing right',
  targetSkeleton: 'humanoid',
  duration: 0.8,
  loop: true,
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: d(2) },
        upper_arm_l: { rotation: d(30) },
        upper_arm_r: { rotation: d(-30) },
        forearm_l: { rotation: d(-10) },
        forearm_r: { rotation: d(10) },
        upper_leg_l: { rotation: d(-25) },
        upper_leg_r: { rotation: d(25) },
        lower_leg_l: { rotation: d(15) },
        lower_leg_r: { rotation: d(-5) },
      },
    },
    {
      time: 0.25,
      boneStates: {
        spine: { rotation: d(0) },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
        forearm_l: { rotation: d(-5) },
        forearm_r: { rotation: d(5) },
        upper_leg_l: { rotation: d(0) },
        upper_leg_r: { rotation: d(0) },
        lower_leg_l: { rotation: d(0) },
        lower_leg_r: { rotation: d(0) },
      },
    },
    {
      time: 0.5,
      boneStates: {
        spine: { rotation: d(-2) },
        upper_arm_l: { rotation: d(-30) },
        upper_arm_r: { rotation: d(30) },
        forearm_l: { rotation: d(10) },
        forearm_r: { rotation: d(-10) },
        upper_leg_l: { rotation: d(25) },
        upper_leg_r: { rotation: d(-25) },
        lower_leg_l: { rotation: d(-5) },
        lower_leg_r: { rotation: d(15) },
      },
    },
    {
      time: 0.75,
      boneStates: {
        spine: { rotation: d(0) },
        upper_arm_l: { rotation: d(-10) },
        upper_arm_r: { rotation: d(10) },
        forearm_l: { rotation: d(5) },
        forearm_r: { rotation: d(-5) },
        upper_leg_l: { rotation: d(0) },
        upper_leg_r: { rotation: d(0) },
        lower_leg_l: { rotation: d(0) },
        lower_leg_r: { rotation: d(0) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        spine: { rotation: d(2) },
        upper_arm_l: { rotation: d(30) },
        upper_arm_r: { rotation: d(-30) },
        forearm_l: { rotation: d(-10) },
        forearm_r: { rotation: d(10) },
        upper_leg_l: { rotation: d(-25) },
        upper_leg_r: { rotation: d(25) },
        lower_leg_l: { rotation: d(15) },
        lower_leg_r: { rotation: d(-5) },
      },
    },
  ],
};

// =========================================================================
// 3. walk_left — mirrored walk cycle
// =========================================================================

export const walk_left: ActionDefinition = {
  id: 'walk_left',
  name: 'Walk Left',
  category: 'movement',
  tags: ['walk', 'locomotion', 'left'],
  description: 'Walking cycle facing left',
  targetSkeleton: 'humanoid',
  duration: 0.8,
  loop: true,
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: d(-2) },
        upper_arm_l: { rotation: d(-30) },
        upper_arm_r: { rotation: d(30) },
        forearm_l: { rotation: d(10) },
        forearm_r: { rotation: d(-10) },
        upper_leg_l: { rotation: d(25) },
        upper_leg_r: { rotation: d(-25) },
        lower_leg_l: { rotation: d(-5) },
        lower_leg_r: { rotation: d(15) },
      },
    },
    {
      time: 0.25,
      boneStates: {
        spine: { rotation: d(0) },
        upper_arm_l: { rotation: d(-10) },
        upper_arm_r: { rotation: d(10) },
        forearm_l: { rotation: d(5) },
        forearm_r: { rotation: d(-5) },
        upper_leg_l: { rotation: d(0) },
        upper_leg_r: { rotation: d(0) },
        lower_leg_l: { rotation: d(0) },
        lower_leg_r: { rotation: d(0) },
      },
    },
    {
      time: 0.5,
      boneStates: {
        spine: { rotation: d(2) },
        upper_arm_l: { rotation: d(30) },
        upper_arm_r: { rotation: d(-30) },
        forearm_l: { rotation: d(-10) },
        forearm_r: { rotation: d(10) },
        upper_leg_l: { rotation: d(-25) },
        upper_leg_r: { rotation: d(25) },
        lower_leg_l: { rotation: d(15) },
        lower_leg_r: { rotation: d(-5) },
      },
    },
    {
      time: 0.75,
      boneStates: {
        spine: { rotation: d(0) },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
        forearm_l: { rotation: d(-5) },
        forearm_r: { rotation: d(5) },
        upper_leg_l: { rotation: d(0) },
        upper_leg_r: { rotation: d(0) },
        lower_leg_l: { rotation: d(0) },
        lower_leg_r: { rotation: d(0) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        spine: { rotation: d(-2) },
        upper_arm_l: { rotation: d(-30) },
        upper_arm_r: { rotation: d(30) },
        forearm_l: { rotation: d(10) },
        forearm_r: { rotation: d(-10) },
        upper_leg_l: { rotation: d(25) },
        upper_leg_r: { rotation: d(-25) },
        lower_leg_l: { rotation: d(-5) },
        lower_leg_r: { rotation: d(15) },
      },
    },
  ],
};

// =========================================================================
// 4. run_right — fast run cycle with exaggerated motion
// =========================================================================

export const run_right: ActionDefinition = {
  id: 'run_right',
  name: 'Run Right',
  category: 'movement',
  tags: ['run', 'fast', 'locomotion'],
  description: 'Running cycle facing right',
  targetSkeleton: 'humanoid',
  duration: 0.5,
  loop: true,
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: d(8), translateY: -5 },
        chest: { rotation: d(-4) },
        upper_arm_l: { rotation: d(50) },
        upper_arm_r: { rotation: d(-50) },
        forearm_l: { rotation: d(-40) },
        forearm_r: { rotation: d(20) },
        upper_leg_l: { rotation: d(-40) },
        upper_leg_r: { rotation: d(40) },
        lower_leg_l: { rotation: d(30) },
        lower_leg_r: { rotation: d(-10) },
      },
    },
    {
      time: 0.25,
      boneStates: {
        spine: { rotation: d(5), translateY: 0 },
        chest: { rotation: d(0) },
        upper_arm_l: { rotation: d(0) },
        upper_arm_r: { rotation: d(0) },
        forearm_l: { rotation: d(-20) },
        forearm_r: { rotation: d(-20) },
        upper_leg_l: { rotation: d(5) },
        upper_leg_r: { rotation: d(-5) },
        lower_leg_l: { rotation: d(-15) },
        lower_leg_r: { rotation: d(-15) },
      },
    },
    {
      time: 0.5,
      boneStates: {
        spine: { rotation: d(8), translateY: -5 },
        chest: { rotation: d(4) },
        upper_arm_l: { rotation: d(-50) },
        upper_arm_r: { rotation: d(50) },
        forearm_l: { rotation: d(20) },
        forearm_r: { rotation: d(-40) },
        upper_leg_l: { rotation: d(40) },
        upper_leg_r: { rotation: d(-40) },
        lower_leg_l: { rotation: d(-10) },
        lower_leg_r: { rotation: d(30) },
      },
    },
    {
      time: 0.75,
      boneStates: {
        spine: { rotation: d(5), translateY: 0 },
        chest: { rotation: d(0) },
        upper_arm_l: { rotation: d(0) },
        upper_arm_r: { rotation: d(0) },
        forearm_l: { rotation: d(-20) },
        forearm_r: { rotation: d(-20) },
        upper_leg_l: { rotation: d(-5) },
        upper_leg_r: { rotation: d(5) },
        lower_leg_l: { rotation: d(-15) },
        lower_leg_r: { rotation: d(-15) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        spine: { rotation: d(8), translateY: -5 },
        chest: { rotation: d(-4) },
        upper_arm_l: { rotation: d(50) },
        upper_arm_r: { rotation: d(-50) },
        forearm_l: { rotation: d(-40) },
        forearm_r: { rotation: d(20) },
        upper_leg_l: { rotation: d(-40) },
        upper_leg_r: { rotation: d(40) },
        lower_leg_l: { rotation: d(30) },
        lower_leg_r: { rotation: d(-10) },
      },
    },
  ],
};

// =========================================================================
// 5. punch — right-hand punch
// =========================================================================

export const punch: ActionDefinition = {
  id: 'punch',
  name: 'Punch',
  category: 'combat',
  tags: ['attack', 'melee', 'fist'],
  description: 'Throw a forward punch',
  targetSkeleton: 'humanoid',
  duration: 0.4,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: d(-5) },
        chest: { rotation: d(-10) },
        upper_arm_r: { rotation: d(-30) },
        forearm_r: { rotation: d(-90) },
        hand_r: { rotation: 0 },
        upper_arm_l: { rotation: d(15) },
        forearm_l: { rotation: d(10) },
      },
    },
    {
      time: 0.15,
      boneStates: {
        spine: { rotation: d(-8) },
        chest: { rotation: d(-15) },
        upper_arm_r: { rotation: d(-50) },
        forearm_r: { rotation: d(-100) },
        hand_r: { rotation: d(-5) },
        upper_arm_l: { rotation: d(20) },
        forearm_l: { rotation: d(15) },
      },
    },
    {
      time: 0.35,
      boneStates: {
        spine: { rotation: d(10) },
        chest: { rotation: d(15) },
        upper_arm_r: { rotation: d(60) },
        forearm_r: { rotation: d(-10) },
        hand_r: { rotation: d(5) },
        upper_arm_l: { rotation: d(-10) },
        forearm_l: { rotation: d(5) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        forearm_l: { rotation: d(5) },
      },
    },
  ],
};

// =========================================================================
// 6. kick — front kick with right leg
// =========================================================================

export const kick: ActionDefinition = {
  id: 'kick',
  name: 'Kick',
  category: 'combat',
  tags: ['attack', 'melee', 'leg'],
  description: 'Front kick attack',
  targetSkeleton: 'humanoid',
  duration: 0.5,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: d(-3) },
        chest: { rotation: d(-5) },
        upper_leg_r: { rotation: d(-10) },
        lower_leg_r: { rotation: d(-20) },
        foot_r: { rotation: d(90) },
        upper_arm_l: { rotation: d(20) },
        upper_arm_r: { rotation: d(-20) },
      },
    },
    {
      time: 0.15,
      boneStates: {
        spine: { rotation: d(-8) },
        chest: { rotation: d(-10) },
        upper_leg_r: { rotation: d(-40) },
        lower_leg_r: { rotation: d(-60) },
        foot_r: { rotation: d(80) },
        upper_arm_l: { rotation: d(30) },
        upper_arm_r: { rotation: d(-30) },
      },
    },
    {
      time: 0.35,
      boneStates: {
        spine: { rotation: d(5) },
        chest: { rotation: d(8) },
        upper_leg_r: { rotation: d(50) },
        lower_leg_r: { rotation: d(10) },
        foot_r: { rotation: d(70) },
        upper_arm_l: { rotation: d(-15) },
        upper_arm_r: { rotation: d(15) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        upper_leg_r: { rotation: 0 },
        lower_leg_r: { rotation: 0 },
        foot_r: { rotation: d(90) },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
      },
    },
  ],
};

// =========================================================================
// 7. sword_slash — diagonal slash with right arm
// =========================================================================

export const sword_slash: ActionDefinition = {
  id: 'sword_slash',
  name: 'Sword Slash',
  category: 'combat',
  tags: ['attack', 'weapon', 'sword'],
  description: 'Diagonal slash with right arm',
  targetSkeleton: 'humanoid',
  duration: 0.6,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: d(-10) },
        chest: { rotation: d(-15) },
        upper_arm_r: { rotation: d(-140) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(-20) },
        upper_arm_l: { rotation: d(20) },
        forearm_l: { rotation: d(15) },
      },
    },
    {
      time: 0.15,
      boneStates: {
        spine: { rotation: d(-12) },
        chest: { rotation: d(-18) },
        upper_arm_r: { rotation: d(-150) },
        forearm_r: { rotation: d(-20) },
        hand_r: { rotation: d(-30) },
        upper_arm_l: { rotation: d(25) },
        forearm_l: { rotation: d(20) },
      },
    },
    {
      time: 0.4,
      boneStates: {
        spine: { rotation: d(15) },
        chest: { rotation: d(20) },
        upper_arm_r: { rotation: d(40) },
        forearm_r: { rotation: d(10) },
        hand_r: { rotation: d(25) },
        upper_arm_l: { rotation: d(-10) },
        forearm_l: { rotation: d(5) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        forearm_l: { rotation: d(5) },
      },
    },
  ],
};

// =========================================================================
// 8. bow — polite bow
// =========================================================================

export const bow: ActionDefinition = {
  id: 'bow',
  name: 'Bow',
  category: 'gesture',
  tags: ['greeting', 'respect', 'polite'],
  description: 'Polite forward bow',
  targetSkeleton: 'humanoid',
  duration: 1.5,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        head: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
        forearm_l: { rotation: d(5) },
        forearm_r: { rotation: d(-5) },
      },
    },
    {
      time: 0.3,
      boneStates: {
        spine: { rotation: d(35) },
        chest: { rotation: d(15) },
        head: { rotation: d(10) },
        upper_arm_l: { rotation: d(-5) },
        upper_arm_r: { rotation: d(5) },
        forearm_l: { rotation: d(15) },
        forearm_r: { rotation: d(-15) },
      },
    },
    {
      time: 0.7,
      boneStates: {
        spine: { rotation: d(35) },
        chest: { rotation: d(15) },
        head: { rotation: d(10) },
        upper_arm_l: { rotation: d(-5) },
        upper_arm_r: { rotation: d(5) },
        forearm_l: { rotation: d(15) },
        forearm_r: { rotation: d(-15) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        head: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
        forearm_l: { rotation: d(5) },
        forearm_r: { rotation: d(-5) },
      },
    },
  ],
};

// =========================================================================
// 9. nod — head nods up/down
// =========================================================================

export const nod: ActionDefinition = {
  id: 'nod',
  name: 'Nod',
  category: 'gesture',
  tags: ['agree', 'yes', 'head'],
  description: 'Head nod gesture',
  targetSkeleton: 'humanoid',
  duration: 0.6,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        head: { rotation: 0 },
        neck: { rotation: 0 },
        spine: { rotation: 0 },
      },
    },
    {
      time: 0.2,
      boneStates: {
        head: { rotation: d(15) },
        neck: { rotation: d(5) },
        spine: { rotation: d(2) },
      },
    },
    {
      time: 0.5,
      boneStates: {
        head: { rotation: d(-5) },
        neck: { rotation: d(-2) },
        spine: { rotation: d(-1) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        head: { rotation: 0 },
        neck: { rotation: 0 },
        spine: { rotation: 0 },
      },
    },
  ],
};

// =========================================================================
// 10. shake_head — head turns left/right
// =========================================================================

export const shake_head: ActionDefinition = {
  id: 'shake_head',
  name: 'Shake Head',
  category: 'gesture',
  tags: ['disagree', 'no', 'head'],
  description: 'Head shake left and right',
  targetSkeleton: 'humanoid',
  duration: 0.8,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        head: { rotation: 0 },
        neck: { rotation: 0 },
      },
    },
    {
      time: 0.15,
      boneStates: {
        head: { rotation: d(-20) },
        neck: { rotation: d(-5) },
      },
    },
    {
      time: 0.4,
      boneStates: {
        head: { rotation: d(20) },
        neck: { rotation: d(5) },
      },
    },
    {
      time: 0.65,
      boneStates: {
        head: { rotation: d(-12) },
        neck: { rotation: d(-3) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        head: { rotation: 0 },
        neck: { rotation: 0 },
      },
    },
  ],
};

// =========================================================================
// 11. wave — raise and wave right hand
// =========================================================================

export const wave: ActionDefinition = {
  id: 'wave',
  name: 'Wave',
  category: 'gesture',
  tags: ['greeting', 'hello', 'hand'],
  description: 'Wave hand greeting',
  targetSkeleton: 'humanoid',
  duration: 1.2,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
        head: { rotation: 0 },
      },
    },
    {
      time: 0.15,
      boneStates: {
        upper_arm_r: { rotation: d(-120) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(15) },
        head: { rotation: d(5) },
      },
    },
    {
      time: 0.35,
      boneStates: {
        upper_arm_r: { rotation: d(-120) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(-20) },
        head: { rotation: d(-3) },
      },
    },
    {
      time: 0.55,
      boneStates: {
        upper_arm_r: { rotation: d(-120) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(20) },
        head: { rotation: d(3) },
      },
    },
    {
      time: 0.75,
      boneStates: {
        upper_arm_r: { rotation: d(-120) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(-15) },
        head: { rotation: d(-2) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
        head: { rotation: 0 },
      },
    },
  ],
};

// =========================================================================
// 12. sit_down — sit down on ground
// =========================================================================

export const sit_down: ActionDefinition = {
  id: 'sit_down',
  name: 'Sit Down',
  category: 'idle',
  tags: ['sit', 'rest', 'down'],
  description: 'Sit down on the ground',
  targetSkeleton: 'humanoid',
  duration: 1.0,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        root: { translateY: 0 },
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        upper_leg_l: { rotation: 0 },
        upper_leg_r: { rotation: 0 },
        lower_leg_l: { rotation: 0 },
        lower_leg_r: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
      },
    },
    {
      time: 0.4,
      boneStates: {
        root: { translateY: 20 },
        spine: { rotation: d(10) },
        chest: { rotation: d(5) },
        upper_leg_l: { rotation: d(-45) },
        upper_leg_r: { rotation: d(-45) },
        lower_leg_l: { rotation: d(60) },
        lower_leg_r: { rotation: d(60) },
        upper_arm_l: { rotation: d(30) },
        upper_arm_r: { rotation: d(-30) },
      },
    },
    {
      time: 0.7,
      boneStates: {
        root: { translateY: 45 },
        spine: { rotation: d(15) },
        chest: { rotation: d(8) },
        upper_leg_l: { rotation: d(-80) },
        upper_leg_r: { rotation: d(-80) },
        lower_leg_l: { rotation: d(90) },
        lower_leg_r: { rotation: d(90) },
        upper_arm_l: { rotation: d(15) },
        upper_arm_r: { rotation: d(-15) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        root: { translateY: 55 },
        spine: { rotation: d(5) },
        chest: { rotation: d(3) },
        upper_leg_l: { rotation: d(-90) },
        upper_leg_r: { rotation: d(-90) },
        lower_leg_l: { rotation: d(100) },
        lower_leg_r: { rotation: d(100) },
        upper_arm_l: { rotation: d(5) },
        upper_arm_r: { rotation: d(-5) },
        forearm_l: { rotation: d(-20) },
        forearm_r: { rotation: d(20) },
      },
    },
  ],
};

// =========================================================================
// 13. stand_up — stand up from sitting
// =========================================================================

export const stand_up: ActionDefinition = {
  id: 'stand_up',
  name: 'Stand Up',
  category: 'movement',
  tags: ['stand', 'rise', 'up'],
  description: 'Stand up from sitting position',
  targetSkeleton: 'humanoid',
  duration: 0.8,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        root: { translateY: 55 },
        spine: { rotation: d(5) },
        chest: { rotation: d(3) },
        upper_leg_l: { rotation: d(-90) },
        upper_leg_r: { rotation: d(-90) },
        lower_leg_l: { rotation: d(100) },
        lower_leg_r: { rotation: d(100) },
        upper_arm_l: { rotation: d(5) },
        upper_arm_r: { rotation: d(-5) },
      },
    },
    {
      time: 0.3,
      boneStates: {
        root: { translateY: 30 },
        spine: { rotation: d(15) },
        chest: { rotation: d(10) },
        upper_leg_l: { rotation: d(-45) },
        upper_leg_r: { rotation: d(-45) },
        lower_leg_l: { rotation: d(50) },
        lower_leg_r: { rotation: d(50) },
        upper_arm_l: { rotation: d(25) },
        upper_arm_r: { rotation: d(-25) },
      },
    },
    {
      time: 0.6,
      boneStates: {
        root: { translateY: 10 },
        spine: { rotation: d(5) },
        chest: { rotation: d(3) },
        upper_leg_l: { rotation: d(-10) },
        upper_leg_r: { rotation: d(-10) },
        lower_leg_l: { rotation: d(10) },
        lower_leg_r: { rotation: d(10) },
        upper_arm_l: { rotation: d(15) },
        upper_arm_r: { rotation: d(-15) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        root: { translateY: 0 },
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        upper_leg_l: { rotation: 0 },
        upper_leg_r: { rotation: 0 },
        lower_leg_l: { rotation: 0 },
        lower_leg_r: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
      },
    },
  ],
};

// =========================================================================
// 14. knocked_back — hit reaction
// =========================================================================

export const knocked_back: ActionDefinition = {
  id: 'knocked_back',
  name: 'Knocked Back',
  category: 'combat',
  tags: ['hit', 'reaction', 'damage'],
  description: 'Hit reaction / knockback',
  targetSkeleton: 'humanoid',
  duration: 0.8,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        root: { translateX: 0, translateY: 0 },
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        head: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
      },
    },
    {
      time: 0.15,
      boneStates: {
        root: { translateX: -30, translateY: -15 },
        spine: { rotation: d(-20) },
        chest: { rotation: d(-10) },
        head: { rotation: d(15) },
        upper_arm_l: { rotation: d(40) },
        upper_arm_r: { rotation: d(-40) },
        forearm_l: { rotation: d(20) },
        forearm_r: { rotation: d(-20) },
      },
    },
    {
      time: 0.5,
      boneStates: {
        root: { translateX: -50, translateY: 0 },
        spine: { rotation: d(-30) },
        chest: { rotation: d(-15) },
        head: { rotation: d(20) },
        upper_arm_l: { rotation: d(60) },
        upper_arm_r: { rotation: d(-60) },
        forearm_l: { rotation: d(30) },
        forearm_r: { rotation: d(-30) },
        upper_leg_l: { rotation: d(15) },
        upper_leg_r: { rotation: d(-15) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        root: { translateX: -40, translateY: 0 },
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        head: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
        forearm_l: { rotation: d(5) },
        forearm_r: { rotation: d(-5) },
        upper_leg_l: { rotation: 0 },
        upper_leg_r: { rotation: 0 },
      },
    },
  ],
};

// =========================================================================
// 15. jump — jump in place
// =========================================================================

export const jump: ActionDefinition = {
  id: 'jump',
  name: 'Jump',
  category: 'movement',
  tags: ['jump', 'leap', 'air'],
  description: 'Jump in place',
  targetSkeleton: 'humanoid',
  duration: 0.7,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        root: { translateY: 0 },
        spine: { rotation: 0 },
        upper_leg_l: { rotation: 0 },
        upper_leg_r: { rotation: 0 },
        lower_leg_l: { rotation: 0 },
        lower_leg_r: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
      },
    },
    {
      time: 0.15,
      boneStates: {
        root: { translateY: 10 },
        spine: { rotation: d(5) },
        upper_leg_l: { rotation: d(-20) },
        upper_leg_r: { rotation: d(-20) },
        lower_leg_l: { rotation: d(30) },
        lower_leg_r: { rotation: d(30) },
        upper_arm_l: { rotation: d(25) },
        upper_arm_r: { rotation: d(-25) },
      },
    },
    {
      time: 0.35,
      boneStates: {
        root: { translateY: -40 },
        spine: { rotation: d(-3) },
        upper_leg_l: { rotation: d(10) },
        upper_leg_r: { rotation: d(10) },
        lower_leg_l: { rotation: d(-10) },
        lower_leg_r: { rotation: d(-10) },
        upper_arm_l: { rotation: d(-30) },
        upper_arm_r: { rotation: d(30) },
        forearm_l: { rotation: d(-20) },
        forearm_r: { rotation: d(20) },
      },
    },
    {
      time: 0.55,
      boneStates: {
        root: { translateY: -35 },
        spine: { rotation: d(-2) },
        upper_leg_l: { rotation: d(5) },
        upper_leg_r: { rotation: d(5) },
        lower_leg_l: { rotation: d(-5) },
        lower_leg_r: { rotation: d(-5) },
        upper_arm_l: { rotation: d(-15) },
        upper_arm_r: { rotation: d(15) },
        forearm_l: { rotation: d(-10) },
        forearm_r: { rotation: d(10) },
      },
    },
    {
      time: 0.8,
      boneStates: {
        root: { translateY: 5 },
        spine: { rotation: d(3) },
        upper_leg_l: { rotation: d(-10) },
        upper_leg_r: { rotation: d(-10) },
        lower_leg_l: { rotation: d(15) },
        lower_leg_r: { rotation: d(15) },
        upper_arm_l: { rotation: d(15) },
        upper_arm_r: { rotation: d(-15) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        root: { translateY: 0 },
        spine: { rotation: 0 },
        upper_leg_l: { rotation: 0 },
        upper_leg_r: { rotation: 0 },
        lower_leg_l: { rotation: 0 },
        lower_leg_r: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
      },
    },
  ],
};

// =========================================================================
// 16. cast_spell — magical gesture with both arms
// =========================================================================

export const cast_spell: ActionDefinition = {
  id: 'cast_spell',
  name: 'Cast Spell',
  category: 'combat',
  tags: ['magic', 'spell', 'cast'],
  description: 'Spell casting gesture with raised arms',
  targetSkeleton: 'humanoid',
  duration: 1.2,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        head: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
        forearm_l: { rotation: d(5) },
        forearm_r: { rotation: d(-5) },
      },
    },
    {
      time: 0.2,
      boneStates: {
        spine: { rotation: d(-5) },
        chest: { rotation: d(-8) },
        head: { rotation: d(-5) },
        upper_arm_l: { rotation: d(-60) },
        upper_arm_r: { rotation: d(60) },
        forearm_l: { rotation: d(-40) },
        forearm_r: { rotation: d(40) },
        hand_l: { rotation: d(15) },
        hand_r: { rotation: d(-15) },
      },
    },
    {
      time: 0.5,
      boneStates: {
        spine: { rotation: d(5), translateY: -5 },
        chest: { rotation: d(5) },
        head: { rotation: d(-10) },
        upper_arm_l: { rotation: d(-90) },
        upper_arm_r: { rotation: d(90) },
        forearm_l: { rotation: d(-60) },
        forearm_r: { rotation: d(60) },
        hand_l: { rotation: d(25) },
        hand_r: { rotation: d(-25) },
      },
    },
    {
      time: 0.7,
      boneStates: {
        spine: { rotation: d(10), translateY: -3 },
        chest: { rotation: d(10) },
        head: { rotation: d(5) },
        upper_arm_l: { rotation: d(-40) },
        upper_arm_r: { rotation: d(40) },
        forearm_l: { rotation: d(-20) },
        forearm_r: { rotation: d(20) },
        hand_l: { rotation: d(10) },
        hand_r: { rotation: d(-10) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        spine: { rotation: 0, translateY: 0 },
        chest: { rotation: 0 },
        head: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
        forearm_l: { rotation: d(5) },
        forearm_r: { rotation: d(-5) },
        hand_l: { rotation: 0 },
        hand_r: { rotation: 0 },
      },
    },
  ],
};

// =========================================================================
// 17. drink — drinking motion with right hand
// =========================================================================

export const drink: ActionDefinition = {
  id: 'drink',
  name: 'Drink',
  category: 'gesture',
  tags: ['drink', 'cup', 'hand'],
  description: 'Drinking motion with cup',
  targetSkeleton: 'humanoid',
  duration: 1.5,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
        head: { rotation: 0 },
        spine: { rotation: 0 },
      },
    },
    {
      time: 0.2,
      boneStates: {
        upper_arm_r: { rotation: d(-70) },
        forearm_r: { rotation: d(-80) },
        hand_r: { rotation: d(10) },
        head: { rotation: d(3) },
        spine: { rotation: d(-2) },
      },
    },
    {
      time: 0.4,
      boneStates: {
        upper_arm_r: { rotation: d(-90) },
        forearm_r: { rotation: d(-110) },
        hand_r: { rotation: d(20) },
        head: { rotation: d(-15) },
        spine: { rotation: d(-5) },
        neck: { rotation: d(-10) },
      },
    },
    {
      time: 0.7,
      boneStates: {
        upper_arm_r: { rotation: d(-90) },
        forearm_r: { rotation: d(-110) },
        hand_r: { rotation: d(25) },
        head: { rotation: d(-20) },
        spine: { rotation: d(-5) },
        neck: { rotation: d(-12) },
      },
    },
    {
      time: 0.85,
      boneStates: {
        upper_arm_r: { rotation: d(-70) },
        forearm_r: { rotation: d(-80) },
        hand_r: { rotation: d(10) },
        head: { rotation: d(-5) },
        spine: { rotation: d(-2) },
        neck: { rotation: d(-3) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
        head: { rotation: 0 },
        spine: { rotation: 0 },
        neck: { rotation: 0 },
      },
    },
  ],
};

// =========================================================================
// 18. pat_shoulder — reach out and pat with right hand
// =========================================================================

export const pat_shoulder: ActionDefinition = {
  id: 'pat_shoulder',
  name: 'Pat Shoulder',
  category: 'gesture',
  tags: ['comfort', 'touch', 'friendly'],
  description: 'Pat someone on the shoulder',
  targetSkeleton: 'humanoid',
  duration: 1.0,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
        spine: { rotation: 0 },
        chest: { rotation: 0 },
      },
    },
    {
      time: 0.2,
      boneStates: {
        upper_arm_r: { rotation: d(30) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(-10) },
        spine: { rotation: d(5) },
        chest: { rotation: d(8) },
      },
    },
    {
      time: 0.4,
      boneStates: {
        upper_arm_r: { rotation: d(50) },
        forearm_r: { rotation: d(-20) },
        hand_r: { rotation: d(-5) },
        spine: { rotation: d(8) },
        chest: { rotation: d(10) },
      },
    },
    {
      time: 0.55,
      boneStates: {
        upper_arm_r: { rotation: d(48) },
        forearm_r: { rotation: d(-22) },
        hand_r: { rotation: d(5) },
        spine: { rotation: d(7) },
        chest: { rotation: d(10) },
      },
    },
    {
      time: 0.7,
      boneStates: {
        upper_arm_r: { rotation: d(50) },
        forearm_r: { rotation: d(-20) },
        hand_r: { rotation: d(-5) },
        spine: { rotation: d(8) },
        chest: { rotation: d(10) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
        spine: { rotation: 0 },
        chest: { rotation: 0 },
      },
    },
  ],
};

// =========================================================================
// 19. point — point forward with right hand
// =========================================================================

export const point: ActionDefinition = {
  id: 'point',
  name: 'Point',
  category: 'gesture',
  tags: ['point', 'direct', 'finger'],
  description: 'Point forward with index finger',
  targetSkeleton: 'humanoid',
  duration: 0.8,
  loop: false,
  keyframes: [
    {
      time: 0,
      boneStates: {
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        head: { rotation: 0 },
      },
    },
    {
      time: 0.25,
      boneStates: {
        upper_arm_r: { rotation: d(40) },
        forearm_r: { rotation: d(-15) },
        hand_r: { rotation: d(10) },
        spine: { rotation: d(5) },
        chest: { rotation: d(8) },
        head: { rotation: d(3) },
      },
    },
    {
      time: 0.5,
      boneStates: {
        upper_arm_r: { rotation: d(60) },
        forearm_r: { rotation: d(-5) },
        hand_r: { rotation: d(15) },
        spine: { rotation: d(8) },
        chest: { rotation: d(10) },
        head: { rotation: d(5) },
      },
    },
    {
      time: 0.75,
      boneStates: {
        upper_arm_r: { rotation: d(60) },
        forearm_r: { rotation: d(-5) },
        hand_r: { rotation: d(15) },
        spine: { rotation: d(8) },
        chest: { rotation: d(10) },
        head: { rotation: d(5) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        head: { rotation: 0 },
      },
    },
  ],
};

// =========================================================================
// Library registry
// =========================================================================

export const ACTION_LIBRARY: Record<string, ActionDefinition> = {
  idle,
  walk: walk_right,
  walk_right,
  walk_left,
  run: run_right,
  run_right,
  punch,
  kick,
  sword_slash,
  bow,
  nod,
  shake_head,
  wave,
  sit_down,
  stand_up,
  knocked_back,
  jump,
  cast_spell,
  drink,
  pat_shoulder,
  point,
};

/**
 * Retrieve an action definition by id.
 * Returns `idle` as fallback for unknown ids.
 */
export function getAction(id: string): ActionDefinition {
  return ACTION_LIBRARY[id] ?? idle;
}

/**
 * Get all available action ids.
 */
export function getActionIds(): string[] {
  return Object.keys(ACTION_LIBRARY);
}

/**
 * Check if an action exists in the library.
 */
export function hasAction(id: string): boolean {
  return id in ACTION_LIBRARY;
}


// =========================================================================
// BUILTIN_ACTIONS array (for ActionManager)
// =========================================================================

export const BUILTIN_ACTIONS: ActionDefinition[] = Object.values(ACTION_LIBRARY);

/**
 * Get actions filtered by category
 */
export function getActionsByCategory(category: string): ActionDefinition[] {
  return BUILTIN_ACTIONS.filter((a) => a.category === category);
}

/**
 * Search actions by name, tags, or description
 */
export function searchActions(query: string): ActionDefinition[] {
  const q = query.toLowerCase();
  return BUILTIN_ACTIONS.filter((a) => {
    if (a.name.toLowerCase().includes(q)) return true;
    if (a.id.toLowerCase().includes(q)) return true;
    if (a.description && a.description.toLowerCase().includes(q)) return true;
    if (a.tags && a.tags.some((t) => t.toLowerCase().includes(q))) return true;
    return false;
  });
}
