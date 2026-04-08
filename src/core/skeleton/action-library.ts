/**
 * panda-shot-engine — Predefined Action Library
 *
 * Each action is an ActionDefinition with at least 3 keyframes of complete
 * bone-state data. Rotation values are in radians.
 *
 * Actions:
 *  1. idle          – gentle breathing sway
 *  2. walk          – walk cycle (loop)
 *  3. run           – run cycle (loop)
 *  4. nod           – head nod
 *  5. shake_head    – head shake
 *  6. wave          – wave hand
 *  7. punch         – throw a punch
 *  8. sword_slash   – sword slash
 *  9. knocked_back  – hit reaction / knockback
 * 10. bow           – polite bow
 */

import type { ActionDefinition, ActionKeyframe } from './types';

// Helpers
const d = (deg: number) => (deg * Math.PI) / 180;

// -------------------------------------------------------------------------
// 1. idle — subtle breathing oscillation
// -------------------------------------------------------------------------

export const idle: ActionDefinition = {
  id: 'idle',
  name: 'Idle',
  duration: 2.0,
  loop: true,
  easing: 'easeInOut',
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: 0, translateY: 0 },
        chest: { rotation: 0, translateY: 0 },
        head: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
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
      },
    },
  ],
};

// -------------------------------------------------------------------------
// 2. walk — walk cycle
// -------------------------------------------------------------------------

export const walk: ActionDefinition = {
  id: 'walk',
  name: 'Walk',
  duration: 0.8,
  loop: true,
  easing: 'easeInOut',
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

// -------------------------------------------------------------------------
// 3. run — faster run cycle with more exaggerated motion
// -------------------------------------------------------------------------

export const run: ActionDefinition = {
  id: 'run',
  name: 'Run',
  duration: 0.5,
  loop: true,
  easing: 'easeInOut',
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

// -------------------------------------------------------------------------
// 4. nod — head nods up/down
// -------------------------------------------------------------------------

export const nod: ActionDefinition = {
  id: 'nod',
  name: 'Nod',
  duration: 0.6,
  loop: false,
  easing: 'easeInOut',
  keyframes: [
    {
      time: 0,
      boneStates: {
        head: { rotation: 0 },
        neck: { rotation: 0 },
      },
    },
    {
      time: 0.3,
      boneStates: {
        head: { rotation: d(15) },
        neck: { rotation: d(5) },
      },
    },
    {
      time: 0.6,
      boneStates: {
        head: { rotation: d(-5) },
        neck: { rotation: d(-2) },
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

// -------------------------------------------------------------------------
// 5. shake_head — head turns left/right
// -------------------------------------------------------------------------

export const shakeHead: ActionDefinition = {
  id: 'shake_head',
  name: 'Shake Head',
  duration: 0.8,
  loop: false,
  easing: 'easeInOut',
  keyframes: [
    {
      time: 0,
      boneStates: {
        head: { rotation: 0 },
      },
    },
    {
      time: 0.2,
      boneStates: {
        head: { rotation: d(-20) },
      },
    },
    {
      time: 0.5,
      boneStates: {
        head: { rotation: d(20) },
      },
    },
    {
      time: 0.8,
      boneStates: {
        head: { rotation: d(-10) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        head: { rotation: 0 },
      },
    },
  ],
};

// -------------------------------------------------------------------------
// 6. wave — raise and wave right hand
// -------------------------------------------------------------------------

export const wave: ActionDefinition = {
  id: 'wave',
  name: 'Wave',
  duration: 1.2,
  loop: false,
  easing: 'easeInOut',
  keyframes: [
    {
      time: 0,
      boneStates: {
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
      },
    },
    {
      time: 0.2,
      boneStates: {
        upper_arm_r: { rotation: d(-120) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(15) },
      },
    },
    {
      time: 0.4,
      boneStates: {
        upper_arm_r: { rotation: d(-120) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(-20) },
      },
    },
    {
      time: 0.6,
      boneStates: {
        upper_arm_r: { rotation: d(-120) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(20) },
      },
    },
    {
      time: 0.8,
      boneStates: {
        upper_arm_r: { rotation: d(-120) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(-15) },
      },
    },
    {
      time: 1.0,
      boneStates: {
        upper_arm_r: { rotation: d(-10) },
        forearm_r: { rotation: 0 },
        hand_r: { rotation: 0 },
      },
    },
  ],
};

// -------------------------------------------------------------------------
// 7. punch — right-hand punch
// -------------------------------------------------------------------------

export const punch: ActionDefinition = {
  id: 'punch',
  name: 'Punch',
  duration: 0.4,
  loop: false,
  easing: 'easeOut',
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: d(-5) },
        chest: { rotation: d(-10) },
        upper_arm_r: { rotation: d(-30) },
        forearm_r: { rotation: d(-90) },
        hand_r: { rotation: 0 },
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
      },
    },
  ],
};

// -------------------------------------------------------------------------
// 8. sword_slash — diagonal slash with right arm
// -------------------------------------------------------------------------

export const swordSlash: ActionDefinition = {
  id: 'sword_slash',
  name: 'Sword Slash',
  duration: 0.6,
  loop: false,
  easing: 'easeOut',
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: d(-10) },
        chest: { rotation: d(-15) },
        upper_arm_r: { rotation: d(-140) },
        forearm_r: { rotation: d(-30) },
        hand_r: { rotation: d(-20) },
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
      },
    },
  ],
};

// -------------------------------------------------------------------------
// 9. knocked_back — hit reaction
// -------------------------------------------------------------------------

export const knockedBack: ActionDefinition = {
  id: 'knocked_back',
  name: 'Knocked Back',
  duration: 0.8,
  loop: false,
  easing: 'bounce',
  keyframes: [
    {
      time: 0,
      boneStates: {
        root: { translateX: 0, translateY: 0 },
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        head: { rotation: 0 },
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
        upper_leg_l: { rotation: 0 },
        upper_leg_r: { rotation: 0 },
      },
    },
  ],
};

// -------------------------------------------------------------------------
// 10. bow — polite bow
// -------------------------------------------------------------------------

export const bow: ActionDefinition = {
  id: 'bow',
  name: 'Bow',
  duration: 1.5,
  loop: false,
  easing: 'easeInOut',
  keyframes: [
    {
      time: 0,
      boneStates: {
        spine: { rotation: 0 },
        chest: { rotation: 0 },
        head: { rotation: 0 },
        upper_arm_l: { rotation: d(10) },
        upper_arm_r: { rotation: d(-10) },
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
      },
    },
  ],
};

// -------------------------------------------------------------------------
// Library registry
// -------------------------------------------------------------------------

export const ACTION_LIBRARY: Record<string, ActionDefinition> = {
  idle,
  walk,
  run,
  nod,
  shake_head: shakeHead,
  wave,
  punch,
  sword_slash: swordSlash,
  knocked_back: knockedBack,
  bow,
};

/**
 * Retrieve an action definition by id.
 * Returns `idle` as fallback for unknown ids.
 */
export function getAction(id: string): ActionDefinition {
  return ACTION_LIBRARY[id] ?? idle;
}
