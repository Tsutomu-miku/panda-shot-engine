// ============================================================
// panda-shot-engine — Demo Project Data
// A complete 3-shot "客栈相遇" (Inn Encounter) story
// ============================================================

// ─── Demo Character Definitions ─────────────────────────────

export interface DemoCharacter {
  id: string;
  name: string;
  color: string;
  expressions: string[];
  skeletonType: 'humanoid' | 'beast' | 'chibi';
  description: string;
}

export const DEMO_CHARACTERS: DemoCharacter[] = [
  {
    id: 'hero',
    name: '张三',
    color: '#4caf50',
    expressions: ['neutral', 'happy', 'angry', 'shocked', 'smirk', 'crying'],
    skeletonType: 'humanoid',
    description: '主角，一位游历四方的熊猫侠客',
  },
  {
    id: 'villain',
    name: '赤蛟',
    color: '#f44336',
    expressions: ['neutral', 'angry', 'smirk', 'shocked', 'happy', 'crying'],
    skeletonType: 'humanoid',
    description: '反派，江湖上令人闻风丧胆的恶人',
  },
  {
    id: 'sidekick',
    name: '李四',
    color: '#2196f3',
    expressions: ['neutral', 'happy', 'shocked', 'crying', 'angry', 'smirk'],
    skeletonType: 'humanoid',
    description: '张三的好友，客栈常客',
  },
  {
    id: 'elder',
    name: '白长老',
    color: '#9c27b0',
    expressions: ['neutral', 'happy', 'angry', 'shocked', 'smirk', 'crying'],
    skeletonType: 'humanoid',
    description: '隐居客栈的武林前辈',
  },
  {
    id: 'merchant',
    name: '王掌柜',
    color: '#ff9800',
    expressions: ['neutral', 'happy', 'shocked', 'angry', 'smirk', 'crying'],
    skeletonType: 'chibi',
    description: '客栈掌柜，热情好客',
  },
];

// ─── Demo Scene Definitions ─────────────────────────────────

export interface DemoScene {
  id: string;
  name: string;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  description: string;
  floorY: number;
}

export const DEMO_SCENES: DemoScene[] = [
  {
    id: 'inn_interior',
    name: '客栈内景',
    color: '#795548',
    gradientStart: '#3e2723',
    gradientEnd: '#1a0e0a',
    description: '温暖的客栈大堂，烛火摇曳',
    floorY: 0.78,
  },
  {
    id: 'street_ancient',
    name: '古街',
    color: '#8d6e63',
    gradientStart: '#5d4037',
    gradientEnd: '#2c1810',
    description: '古代街道，青石板路',
    floorY: 0.80,
  },
  {
    id: 'throne_room',
    name: '大殿',
    color: '#fdd835',
    gradientStart: '#4a1a00',
    gradientEnd: '#1a0800',
    description: '金碧辉煌的宫殿大殿',
    floorY: 0.82,
  },
  {
    id: 'forest_night',
    name: '夜林',
    color: '#1b5e20',
    gradientStart: '#0d2818',
    gradientEnd: '#050f08',
    description: '月光下的竹林',
    floorY: 0.76,
  },
  {
    id: 'mountain_top',
    name: '山巅',
    color: '#546e7a',
    gradientStart: '#37474f',
    gradientEnd: '#1a2530',
    description: '云雾缭绕的高山之巅',
    floorY: 0.74,
  },
  {
    id: 'marketplace',
    name: '集市',
    color: '#e65100',
    gradientStart: '#6d3200',
    gradientEnd: '#2a1400',
    description: '热闹的集市，摊位林立',
    floorY: 0.80,
  },
];

// ─── Demo DSL Text ──────────────────────────────────────────

/** Shot 1: 客栈内景 — 李四在客栈喝酒，张三走进来 */
export const SHOT_1_DSL = `shot "客栈相遇_001":
  duration: 8s
  set: "inn_interior"
  bgm: "inn_ambient" volume 0.6 fade-in 2s

  place sidekick at left-third facing right scale 1.0
  place merchant at far-right facing left scale 0.85

  at 0s:
    camera wide
    sidekick expression happy
    merchant expression neutral
    sfx "inn_ambience"

  at 1s:
    sidekick say "掌柜的，再来一壶好酒！" voice "sidekick_cheerful"
    sidekick expression happy

  at 2.5s:
    merchant say "好嘞！客官稍等！" voice "merchant_warm"
    merchant expression happy
    sfx "pouring_wine"

  at 4s:
    camera medium
    sfx "door_open"
    hero enter-from far-left to center-left facing right action walk
    sidekick expression shocked

  at 5.5s:
    camera close-up hero
    hero expression neutral
    hero say "李四，好久不见。" voice "hero_calm"

  at 7s:
    camera wide
    sidekick expression happy
    sidekick say "张三！你终于来了！" voice "sidekick_excited"

  transition: dissolve 0.5s`;

/** Shot 2: 对话 — 两人对话，各种表情变化，镜头切换 */
export const SHOT_2_DSL = `shot "客栈相遇_002":
  duration: 12s
  set: "inn_interior"

  place hero at center-left facing right
  place sidekick at center-right facing left
  place merchant at far-right facing left scale 0.8

  at 0s:
    camera medium
    hero expression neutral
    sidekick expression happy
    merchant expression neutral

  at 1s:
    camera close-up sidekick
    sidekick say "这些日子你去了哪里？我们都很担心你。" voice "sidekick_worried"
    sidekick expression crying

  at 3s:
    camera close-up hero
    hero expression smirk
    hero say "去了一趟北疆，遇到了些麻烦。" voice "hero_calm"

  at 5s:
    camera medium
    sidekick expression shocked
    sidekick say "北疆？那里不是赤蛟的地盘吗！" voice "sidekick_shocked"
    sfx "dramatic_sting"

  at 7s:
    camera close-up hero
    hero expression angry
    hero say "没错，我与他交过手，他武功确实了得。" voice "hero_serious"

  at 9s:
    camera wide
    sfx "thunder_rumble"
    merchant expression shocked
    sidekick expression shocked

  at 10s:
    sidekick say "他…他不会追到这里来吧？" voice "sidekick_nervous"
    sidekick expression crying

  at 11s:
    hero expression neutral
    hero say "放心，我已经甩掉了他。" voice "hero_reassuring"

  transition: cut`;

/** Shot 3: 打斗 — 突然闯入反派，张三拔剑迎战 */
export const SHOT_3_DSL = `shot "客栈相遇_003":
  duration: 10s
  set: "inn_interior"

  place hero at center-left facing right
  place sidekick at left-third facing right

  at 0s:
    camera wide
    sfx "door_slam"
    sfx "dramatic_impact"
    hero expression shocked
    sidekick expression shocked

  at 0.5s:
    villain enter-from far-right to right-third facing left action walk
    camera medium
    vfx dust_cloud at right-third

  at 1.5s:
    camera close-up villain
    villain expression smirk
    villain say "张三，你以为逃得掉吗？" voice "villain_menacing"
    sfx "villain_laugh"

  at 3s:
    camera wide
    hero expression angry
    hero say "赤蛟！你竟敢追到这里！" voice "hero_angry"
    hero action sword_draw

  at 4.5s:
    sidekick expression shocked
    sidekick say "快跑！" voice "sidekick_panic"
    sidekick action dodge
    sfx "chair_crash"

  at 5.5s:
    camera close-up hero
    hero action sword_slash target villain
    sfx "sword_swing"
    vfx slash_effect at center
    camera wide shake 0.3s

  at 6.5s:
    villain expression angry
    villain action block
    villain say "就凭你？" voice "villain_taunt"
    sfx "metal_clash"
    vfx spark_effect at center

  at 8s:
    camera wide shake 0.5s
    hero action kick target villain
    villain action dodge
    sfx "whoosh"
    vfx dust_cloud at center

  at 9s:
    camera close-up hero
    hero expression angry
    hero say "今日，必分高下！" voice "hero_determined"
    sfx "dramatic_music_hit"

  transition: fade-black 1s`;

/** Complete DSL combining all 3 shots */
export const FULL_DEMO_DSL = [SHOT_1_DSL, SHOT_2_DSL, SHOT_3_DSL].join('\n\n');

// ─── Utility: Find scene by ID ──────────────────────────────

export function findScene(id: string): DemoScene | undefined {
  return DEMO_SCENES.find((s) => s.id === id);
}

// ─── Utility: Find character by ID ──────────────────────────

export function findCharacter(id: string): DemoCharacter | undefined {
  return DEMO_CHARACTERS.find((c) => c.id === id);
}

// ─── Scene Rendering Presets ────────────────────────────────

export interface SceneRenderPreset {
  bgGradientStart: string;
  bgGradientEnd: string;
  floorColor: string;
  floorHighlight: string;
  ambientParticles: boolean;
  lightingColor: string;
  lightingIntensity: number;
}

export const SCENE_RENDER_PRESETS: Record<string, SceneRenderPreset> = {
  inn_interior: {
    bgGradientStart: '#3e2723',
    bgGradientEnd: '#1a0e0a',
    floorColor: '#4e342e',
    floorHighlight: '#6d4c41',
    ambientParticles: true,
    lightingColor: '#ffab40',
    lightingIntensity: 0.3,
  },
  street_ancient: {
    bgGradientStart: '#455a64',
    bgGradientEnd: '#1c2a33',
    floorColor: '#607d8b',
    floorHighlight: '#78909c',
    ambientParticles: false,
    lightingColor: '#b0bec5',
    lightingIntensity: 0.2,
  },
  throne_room: {
    bgGradientStart: '#4a1a00',
    bgGradientEnd: '#1a0800',
    floorColor: '#5d4037',
    floorHighlight: '#8d6e63',
    ambientParticles: true,
    lightingColor: '#ffd54f',
    lightingIntensity: 0.5,
  },
  forest_night: {
    bgGradientStart: '#1b3a1b',
    bgGradientEnd: '#050f08',
    floorColor: '#2e4a2e',
    floorHighlight: '#3a5a3a',
    ambientParticles: true,
    lightingColor: '#b2dfdb',
    lightingIntensity: 0.15,
  },
  mountain_top: {
    bgGradientStart: '#37474f',
    bgGradientEnd: '#1a2530',
    floorColor: '#546e7a',
    floorHighlight: '#78909c',
    ambientParticles: true,
    lightingColor: '#e0e0e0',
    lightingIntensity: 0.25,
  },
  marketplace: {
    bgGradientStart: '#6d3200',
    bgGradientEnd: '#2a1400',
    floorColor: '#795548',
    floorHighlight: '#a1887f',
    ambientParticles: false,
    lightingColor: '#ffe0b2',
    lightingIntensity: 0.4,
  },
};

export function getScenePreset(sceneId: string): SceneRenderPreset {
  return SCENE_RENDER_PRESETS[sceneId] ?? SCENE_RENDER_PRESETS['inn_interior'];
}
