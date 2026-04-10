/**
 * demo-project.ts
 * ===============
 * Demo data for the Panda-Head Meme Animation Editor.
 *
 * Exports:
 *   - DEMO_CHARACTERS  (CharacterAsset[])   – 8 playable characters
 *   - DEMO_SCENES       (SceneAsset[])       – 8 stage backgrounds
 *   - FULL_DEMO_DSL     (string)             – 8-shot story script
 *
 * Backward-compat type aliases:
 *   - DemoCharacter = CharacterAsset
 *   - DemoScene     = SceneAsset
 */

import type {
  CharacterAsset,
  SceneAsset,
  ExpressionSet,
  AppearanceItem,
  AppearancePreset,
} from '../core/project/types';

// ---------------------------------------------------------------------------
// Backward-compatible type aliases
// ---------------------------------------------------------------------------
export type DemoCharacter = CharacterAsset;
export type DemoScene = SceneAsset;

// ---------------------------------------------------------------------------
// SVG helper – produces a `data:image/svg+xml,…` URI from raw SVG markup.
// ---------------------------------------------------------------------------
function svgUri(svg: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ---------------------------------------------------------------------------
// Expression SVG generators (64 × 64 viewBox)
// ---------------------------------------------------------------------------

/** Wrap children in a 64×64 SVG root. */
function svg64(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${inner}</svg>`;
}

// ---- Eyes ----------------------------------------------------------------

function eyesNeutral(): string {
  // Two simple ellipses
  return svg64(
    `<ellipse cx="20" cy="32" rx="6" ry="7" fill="#333"/>` +
    `<ellipse cx="44" cy="32" rx="6" ry="7" fill="#333"/>`
  );
}

function eyesHappy(): string {
  // Upward arc "happy squint" eyes
  return svg64(
    `<path d="M12 34 Q20 24 28 34" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<path d="M36 34 Q44 24 52 34" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>`
  );
}

function eyesAngry(): string {
  // V-shape angry brows + small eyes
  return svg64(
    `<line x1="12" y1="24" x2="28" y2="30" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>` +
    `<ellipse cx="20" cy="36" rx="5" ry="5" fill="#333"/>` +
    `<line x1="52" y1="24" x2="36" y2="30" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>` +
    `<ellipse cx="44" cy="36" rx="5" ry="5" fill="#333"/>`
  );
}

function eyesSurprised(): string {
  // Large open circles
  return svg64(
    `<circle cx="20" cy="32" r="9" stroke="#333" stroke-width="2" fill="#fff"/>` +
    `<circle cx="20" cy="32" r="4" fill="#333"/>` +
    `<circle cx="44" cy="32" r="9" stroke="#333" stroke-width="2" fill="#fff"/>` +
    `<circle cx="44" cy="32" r="4" fill="#333"/>`
  );
}

function eyesSad(): string {
  // Downward arc sad eyes
  return svg64(
    `<path d="M12 30 Q20 40 28 30" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<path d="M36 30 Q44 40 52 30" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<circle cx="28" cy="42" r="2" fill="#5dade2" opacity="0.7"/>`
  );
}

function eyesSmirk(): string {
  // One raised brow (left normal, right raised)
  return svg64(
    `<ellipse cx="20" cy="34" rx="6" ry="6" fill="#333"/>` +
    `<line x1="36" y1="22" x2="52" y2="26" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>` +
    `<ellipse cx="44" cy="34" rx="6" ry="5" fill="#333"/>`
  );
}

// ---- Mouths --------------------------------------------------------------

function mouthNeutral(): string {
  return svg64(
    `<line x1="24" y1="44" x2="40" y2="44" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>`
  );
}

function mouthHappy(): string {
  // Smile curve
  return svg64(
    `<path d="M20 40 Q32 54 44 40" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
  );
}

function mouthAngry(): string {
  // Zigzag
  return svg64(
    `<polyline points="18,44 24,40 30,46 36,40 42,46 48,42" stroke="#c0392b" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function mouthSurprised(): string {
  // Big O
  return svg64(
    `<ellipse cx="32" cy="46" rx="8" ry="10" stroke="#333" stroke-width="2.5" fill="#fff"/>`
  );
}

function mouthSad(): string {
  // Frown
  return svg64(
    `<path d="M20 50 Q32 38 44 50" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
  );
}

function mouthSmirk(): string {
  // Half smile
  return svg64(
    `<path d="M22 44 Q28 44 34 48 Q38 50 44 46" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
  );
}

// ---------------------------------------------------------------------------
// Build a standard six-expression map
// ---------------------------------------------------------------------------
function makeExpressions(): Record<string, ExpressionSet> {
  return {
    neutral: {
      name: 'Neutral',
      eyesImage: svgUri(eyesNeutral()),
      mouthImage: svgUri(mouthNeutral()),
    },
    happy: {
      name: 'Happy',
      eyesImage: svgUri(eyesHappy()),
      mouthImage: svgUri(mouthHappy()),
    },
    angry: {
      name: 'Angry',
      eyesImage: svgUri(eyesAngry()),
      mouthImage: svgUri(mouthAngry()),
    },
    surprised: {
      name: 'Surprised',
      eyesImage: svgUri(eyesSurprised()),
      mouthImage: svgUri(mouthSurprised()),
    },
    sad: {
      name: 'Sad',
      eyesImage: svgUri(eyesSad()),
      mouthImage: svgUri(mouthSad()),
    },
    smirk: {
      name: 'Smirk',
      eyesImage: svgUri(eyesSmirk()),
      mouthImage: svgUri(mouthSmirk()),
    },
  };
}

// ---------------------------------------------------------------------------
// DEMO_CHARACTERS
// ---------------------------------------------------------------------------

/**
 * Eight characters with panda-head style, expressions, appearance items,
 * and appearance presets.
 */
export const DEMO_CHARACTERS: CharacterAsset[] = [
  // 1 ── Hero: 张三
  {
    id: 'hero',
    name: '张三',
    style: 'panda-default',
    parts: {},
    skeletonType: 'humanoid',
    color: '#4a90d9',
    description: 'A righteous wandering swordsman with a calm temperament.',
    expressions: makeExpressions(),
    appearanceItems: [
      { id: 'hero-robe', name: '蓝色长袍', category: 'outfit', image: '', zIndex: 1 },
      { id: 'hero-sword', name: '青锋剑', category: 'weapon', image: '', zIndex: 3 },
      { id: 'hero-headband', name: '束发带', category: 'accessory', image: '', zIndex: 4 },
    ] as AppearanceItem[],
    appearancePresets: [
      { id: 'hero-default', name: '行者装束', itemIds: ['hero-robe', 'hero-sword', 'hero-headband'] },
      { id: 'hero-casual', name: '便装', itemIds: ['hero-robe'] },
    ] as AppearancePreset[],
    activePresetId: 'hero-default',
  },

  // 2 ── Villain: 赤蛟
  {
    id: 'villain',
    name: '赤蛟',
    style: 'panda-default',
    parts: {},
    skeletonType: 'humanoid',
    color: '#c0392b',
    description: 'A ruthless warlord seeking an ancient relic of power.',
    expressions: makeExpressions(),
    appearanceItems: [
      { id: 'villain-armor', name: '赤甲', category: 'outfit', image: '', zIndex: 1 },
      { id: 'villain-cape', name: '暗红披风', category: 'accessory', image: '', zIndex: 2 },
      { id: 'villain-halberd', name: '血蛟戟', category: 'weapon', image: '', zIndex: 3 },
    ] as AppearanceItem[],
    appearancePresets: [
      { id: 'villain-default', name: '战甲全装', itemIds: ['villain-armor', 'villain-cape', 'villain-halberd'] },
      { id: 'villain-stealth', name: '潜行装', itemIds: ['villain-cape'] },
    ] as AppearancePreset[],
    activePresetId: 'villain-default',
  },

  // 3 ── Sidekick: 李四
  {
    id: 'sidekick',
    name: '李四',
    style: 'panda-default',
    parts: {},
    skeletonType: 'humanoid',
    color: '#27ae60',
    description: 'A cheerful, loyal friend who loves food and bad jokes.',
    expressions: makeExpressions(),
    appearanceItems: [
      { id: 'sk-vest', name: '绿马甲', category: 'outfit', image: '', zIndex: 1 },
      { id: 'sk-staff', name: '竹竿', category: 'weapon', image: '', zIndex: 3 },
    ] as AppearanceItem[],
    appearancePresets: [
      { id: 'sk-default', name: '标准装', itemIds: ['sk-vest', 'sk-staff'] },
    ] as AppearancePreset[],
    activePresetId: 'sk-default',
  },

  // 4 ── Elder: 白长老
  {
    id: 'elder',
    name: '白长老',
    style: 'panda-default',
    parts: {},
    skeletonType: 'humanoid',
    color: '#bdc3c7',
    description: 'The venerable elder of the Heavenly Bamboo Sect.',
    expressions: makeExpressions(),
    appearanceItems: [
      { id: 'elder-robe', name: '白袍', category: 'outfit', image: '', zIndex: 1 },
      { id: 'elder-staff', name: '龙头拐', category: 'weapon', image: '', zIndex: 3 },
      { id: 'elder-hat', name: '玉冠', category: 'accessory', image: '', zIndex: 4 },
      { id: 'elder-beard', name: '银须', category: 'accessory', image: '', zIndex: 2 },
    ] as AppearanceItem[],
    appearancePresets: [
      { id: 'elder-formal', name: '长老礼装', itemIds: ['elder-robe', 'elder-staff', 'elder-hat', 'elder-beard'] },
      { id: 'elder-simple', name: '素衣', itemIds: ['elder-robe', 'elder-beard'] },
    ] as AppearancePreset[],
    activePresetId: 'elder-formal',
  },

  // 5 ── Beast: 小黑
  {
    id: 'beast',
    name: '小黑',
    style: 'panda-default',
    parts: {},
    skeletonType: 'quadruped',
    color: '#2c3e50',
    description: 'A loyal panther companion with glowing emerald eyes.',
    expressions: makeExpressions(),
    appearanceItems: [
      { id: 'beast-collar', name: '兽环', category: 'accessory', image: '', zIndex: 2 },
      { id: 'beast-saddle', name: '轻鞍', category: 'outfit', image: '', zIndex: 1 },
    ] as AppearanceItem[],
    appearancePresets: [
      { id: 'beast-default', name: '默认', itemIds: ['beast-collar'] },
      { id: 'beast-mounted', name: '装鞍', itemIds: ['beast-collar', 'beast-saddle'] },
    ] as AppearancePreset[],
    activePresetId: 'beast-default',
  },

  // 6 ── Princess: 月灵
  {
    id: 'princess',
    name: '月灵',
    style: 'panda-default',
    parts: {},
    skeletonType: 'humanoid',
    color: '#9b59b6',
    description: 'A mysterious princess with mastery over lunar qi.',
    expressions: makeExpressions(),
    appearanceItems: [
      { id: 'pr-dress', name: '月白纱裙', category: 'outfit', image: '', zIndex: 1 },
      { id: 'pr-hairpin', name: '月牙簪', category: 'accessory', image: '', zIndex: 4 },
      { id: 'pr-fan', name: '银月扇', category: 'weapon', image: '', zIndex: 3 },
    ] as AppearanceItem[],
    appearancePresets: [
      { id: 'pr-default', name: '月宫装', itemIds: ['pr-dress', 'pr-hairpin', 'pr-fan'] },
      { id: 'pr-incognito', name: '民间装', itemIds: ['pr-dress'] },
    ] as AppearancePreset[],
    activePresetId: 'pr-default',
  },

  // 7 ── Thief: 飞燕
  {
    id: 'thief',
    name: '飞燕',
    style: 'panda-default',
    parts: {},
    skeletonType: 'humanoid',
    color: '#e67e22',
    description: 'A nimble rooftop thief with a heart of gold.',
    expressions: makeExpressions(),
    appearanceItems: [
      { id: 'th-suit', name: '夜行衣', category: 'outfit', image: '', zIndex: 1 },
      { id: 'th-mask', name: '半面具', category: 'accessory', image: '', zIndex: 4 },
      { id: 'th-daggers', name: '双短刃', category: 'weapon', image: '', zIndex: 3 },
    ] as AppearanceItem[],
    appearancePresets: [
      { id: 'th-default', name: '夜行装', itemIds: ['th-suit', 'th-mask', 'th-daggers'] },
    ] as AppearancePreset[],
    activePresetId: 'th-default',
  },

  // 8 ── Merchant: 老周
  {
    id: 'merchant',
    name: '老周',
    style: 'panda-default',
    parts: {},
    skeletonType: 'humanoid',
    color: '#f1c40f',
    description: 'A rotund travelling merchant who knows everyone\u2019s secrets.',
    expressions: makeExpressions(),
    appearanceItems: [
      { id: 'mc-robe', name: '锦缎袍', category: 'outfit', image: '', zIndex: 1 },
      { id: 'mc-abacus', name: '金算盘', category: 'weapon', image: '', zIndex: 3 },
      { id: 'mc-hat', name: '毡帽', category: 'accessory', image: '', zIndex: 4 },
      { id: 'mc-pouch', name: '钱袋', category: 'accessory', image: '', zIndex: 2 },
    ] as AppearanceItem[],
    appearancePresets: [
      { id: 'mc-default', name: '商旅装', itemIds: ['mc-robe', 'mc-abacus', 'mc-hat', 'mc-pouch'] },
      { id: 'mc-light', name: '便装', itemIds: ['mc-robe', 'mc-hat'] },
    ] as AppearancePreset[],
    activePresetId: 'mc-default',
  },
];

// ---------------------------------------------------------------------------
// DEMO_SCENES
// ---------------------------------------------------------------------------

/**
 * Eight scenes with atmospheric background colours.
 */
export const DEMO_SCENES: SceneAsset[] = [
  {
    id: 'inn_interior',
    name: '客栈大堂',
    filePath: '',
    backgroundColor: '#8B7355',
    description: 'A warm, lantern-lit tavern with wooden beams and the aroma of tea.',
  },
  {
    id: 'dark_forest',
    name: '暗黑森林',
    filePath: '',
    backgroundColor: '#1a3c1a',
    description: 'A dense, fog-laden forest where moonlight barely reaches the ground.',
  },
  {
    id: 'mountain_cliff',
    name: '悬崖峭壁',
    filePath: '',
    backgroundColor: '#5D6D7E',
    description: 'A windswept cliff edge overlooking an endless sea of clouds.',
  },
  {
    id: 'throne_room',
    name: '王座大殿',
    filePath: '',
    backgroundColor: '#6B2737',
    description: 'A grand hall with crimson pillars and a golden dragon throne.',
  },
  {
    id: 'village_square',
    name: '村庄广场',
    filePath: '',
    backgroundColor: '#C4A35A',
    description: 'A bustling village centre with market stalls and a stone well.',
  },
  {
    id: 'moonlit_lake',
    name: '月下湖畔',
    filePath: '',
    backgroundColor: '#1B2A4A',
    description: 'A serene lake reflecting a full moon, surrounded by weeping willows.',
  },
  {
    id: 'dungeon',
    name: '地牢',
    filePath: '',
    backgroundColor: '#2C2C2C',
    description: 'A damp, torch-lit dungeon with iron chains and dripping walls.',
  },
  {
    id: 'castle_garden',
    name: '城堡花园',
    filePath: '',
    backgroundColor: '#3E7C4E',
    description: 'A moonlit palace garden with blossoming plum trees and stone lanterns.',
  },
];

// ---------------------------------------------------------------------------
// FULL_DEMO_DSL – 8-shot story script
// ---------------------------------------------------------------------------

/**
 * An 8-shot wuxia meme short:
 *
 *   Shot 1 – Hero enters the tavern  (inn_interior)
 *   Shot 2 – Meets the sidekick       (inn_interior)
 *   Shot 3 – Villain appears           (inn_interior)
 *   Shot 4 – Confrontation             (inn_interior)
 *   Shot 5 – Elder intervenes          (village_square)
 *   Shot 6 – Chase into the forest     (dark_forest)
 *   Shot 7 – Battle on the cliff       (mountain_cliff)
 *   Shot 8 – Resolution at the lake    (moonlit_lake)
 */
export const FULL_DEMO_DSL: string = `
###############################################################################
# Panda-Head Meme Animation – 8-Shot Demo Script
# Generated demo DSL for the PSE animation editor.
###############################################################################

# =========================================================================
# Shot 1 – Hero Enters the Tavern
# =========================================================================
shot "hero_enters_tavern":
  duration 6s
  set inn_interior

  placements:
    merchant at 80%,70% scale 1.0

  timeline:
    at 0s:
      camera wide
      sfx "door_creak"
      expression merchant neutral

    at 0.5s:
      enter-from hero left to 30%,70%
      action hero walk_right
      expression hero neutral

    at 2s:
      action hero idle
      camera medium hero

    at 2.5s:
      expression hero happy
      say hero "终于到了……先来壶好茶！"

    at 4s:
      expression merchant happy
      say merchant "客官里边请！本店的龙井刚到货！"
      action merchant wave

    at 5.5s:
      transition fade 0.5s

# =========================================================================
# Shot 2 – Meets the Sidekick
# =========================================================================
shot "meets_sidekick":
  duration 6s
  set inn_interior

  placements:
    hero at 30%,70% scale 1.0
    merchant at 80%,70% scale 1.0

  timeline:
    at 0s:
      camera wide
      expression hero neutral
      action hero sit_down

    at 0.5s:
      enter-from sidekick left to 45%,70%
      action sidekick walk_right
      sfx "footsteps"

    at 2s:
      action sidekick idle
      expression sidekick happy
      say sidekick "张三哥！好久不见！"

    at 3s:
      expression hero happy
      say hero "李四？你怎么也在这？"
      action hero wave

    at 4.5s:
      expression sidekick smirk
      say sidekick "嘿嘿，哪里有热闹，哪里就有我。"

    at 5.5s:
      transition cut

# =========================================================================
# Shot 3 – Villain Appears
# =========================================================================
shot "villain_appears":
  duration 7s
  set inn_interior

  placements:
    hero at 25%,70% scale 1.0
    sidekick at 40%,70% scale 1.0
    merchant at 80%,70% scale 1.0

  timeline:
    at 0s:
      camera wide
      sfx "thunder_rumble"
      vfx "screen_shake" duration 0.8s

    at 1s:
      enter-from villain right to 70%,70%
      action villain walk_right
      expression villain smirk

    at 2.5s:
      action villain idle
      camera close-up villain
      expression villain angry
      say villain "把玉龙珠交出来，否则……"

    at 4s:
      sfx "crowd_gasp"
      expression merchant surprised
      expression sidekick surprised

    at 4.5s:
      camera medium hero
      expression hero angry
      say hero "赤蛟！你休想！"
      action hero nod

    at 6s:
      vfx "dramatic_zoom" duration 0.5s

    at 6.5s:
      transition fade 0.5s

# =========================================================================
# Shot 4 – Confrontation Inside the Tavern
# =========================================================================
shot "confrontation":
  duration 8s
  set inn_interior

  placements:
    hero at 30%,70% scale 1.0
    villain at 65%,70% scale 1.0
    sidekick at 15%,70% scale 0.9

  timeline:
    at 0s:
      camera wide
      expression villain angry
      expression hero angry
      sfx "tension_strings"

    at 1s:
      action villain sword_slash
      vfx "slash_trail" duration 0.4s

    at 1.8s:
      action hero sword_slash
      sfx "sword_clash"
      vfx "spark_burst" duration 0.3s

    at 3s:
      expression sidekick surprised
      say sidekick "小心！"
      action sidekick jump

    at 4s:
      action villain kick
      move hero to 20%,70% duration 0.4s
      sfx "impact_heavy"

    at 5s:
      expression hero sad
      say hero "可恶……"

    at 5.5s:
      expression villain smirk
      say villain "就这点本事？"

    at 7s:
      sfx "gong"
      vfx "flash_white" duration 0.3s

    at 7.5s:
      transition fade 0.5s

# =========================================================================
# Shot 5 – Elder Intervenes
# =========================================================================
shot "elder_intervenes":
  duration 7s
  set village_square

  placements:
    hero at 25%,70% scale 1.0
    villain at 65%,70% scale 1.0
    sidekick at 15%,70% scale 0.9

  timeline:
    at 0s:
      camera wide
      sfx "wind_gust"
      expression hero sad
      expression villain smirk

    at 1s:
      enter-from elder left to 45%,65%
      action elder walk_right
      sfx "mystical_chime"
      vfx "aura_glow" duration 1.5s

    at 2.5s:
      action elder idle
      camera close-up elder
      expression elder angry
      say elder "住手！老夫在此，谁敢造次！"
      action elder cast_spell

    at 4s:
      vfx "shockwave" duration 0.6s
      sfx "energy_blast"
      move villain to 85%,70% duration 0.5s
      expression villain surprised

    at 5s:
      say villain "白长老……哼，走着瞧！"
      expression villain angry

    at 6s:
      action villain walk_right
      move villain to 110%,70% duration 0.8s
      sfx "running_away"

    at 6.5s:
      transition wipe_left 0.5s

# =========================================================================
# Shot 6 – Chase Into the Forest
# =========================================================================
shot "forest_chase":
  duration 6s
  set dark_forest

  placements:
    villain at 75%,70% scale 1.0

  timeline:
    at 0s:
      camera wide
      action villain walk_right
      move villain to 85%,70% duration 2s
      sfx "forest_ambience"

    at 0.5s:
      enter-from hero left to 25%,70%
      action hero walk_right
      move hero to 55%,70% duration 2.5s

    at 1s:
      enter-from sidekick left to 10%,70%
      action sidekick walk_right
      move sidekick to 40%,70% duration 2.5s

    at 2.5s:
      enter-from beast left to 5%,65%
      action beast walk_right
      move beast to 35%,65% duration 1.5s
      sfx "panther_growl"

    at 3.5s:
      camera medium hero
      expression hero angry
      say hero "别让他跑了！"

    at 4.5s:
      expression sidekick happy
      say sidekick "小黑比我们快——上啊！"
      action beast jump

    at 5.5s:
      transition fade 0.5s

# =========================================================================
# Shot 7 – Battle on the Cliff
# =========================================================================
shot "cliff_battle":
  duration 8s
  set mountain_cliff

  placements:
    hero at 30%,65% scale 1.0
    villain at 65%,65% scale 1.0

  timeline:
    at 0s:
      camera wide
      sfx "wind_howl"
      expression hero angry
      expression villain angry

    at 0.5s:
      action hero sword_slash
      action villain sword_slash
      sfx "sword_clash"
      vfx "spark_burst" duration 0.3s

    at 1.5s:
      action villain kick
      action hero jump
      sfx "whoosh"

    at 2.5s:
      camera close-up hero
      action hero punch
      sfx "impact_heavy"
      vfx "impact_ring" duration 0.4s

    at 3.5s:
      move villain to 75%,65% duration 0.3s
      expression villain surprised
      say villain "不可能……"

    at 4.5s:
      enter-from princess right to 85%,60%
      action princess cast_spell
      vfx "moonbeam" duration 1s
      sfx "mystical_chime"
      expression princess neutral

    at 5.5s:
      camera wide
      say princess "够了。月灵在此，恩怨到此为止。"
      expression princess angry

    at 6.5s:
      expression villain sad
      action villain shake_head
      say villain "你们……赢了。"

    at 7.5s:
      transition fade 0.5s

# =========================================================================
# Shot 8 – Resolution at Moonlit Lake
# =========================================================================
shot "moonlit_resolution":
  duration 8s
  set moonlit_lake

  placements:
    hero at 30%,70% scale 1.0
    sidekick at 45%,72% scale 0.95
    princess at 55%,68% scale 1.0
    elder at 20%,68% scale 1.0

  timeline:
    at 0s:
      camera wide
      sfx "gentle_waves"
      expression hero neutral
      expression sidekick happy
      expression princess neutral
      expression elder neutral

    at 1s:
      camera medium hero
      expression hero happy
      say hero "终于结束了……多谢各位。"
      action hero bow

    at 3s:
      expression elder happy
      say elder "年轻人，记住：真正的力量不在剑上。"
      action elder nod

    at 4.5s:
      expression sidekick happy
      say sidekick "说得好！那……咱们去吃夜宵吧？"
      action sidekick wave

    at 5.5s:
      expression princess smirk
      say princess "你就知道吃。"

    at 6.5s:
      expression hero happy
      expression sidekick happy
      expression princess happy
      expression elder happy

    at 7s:
      camera wide
      vfx "sparkle_overlay" duration 1s
      sfx "ending_chime"

    at 7.5s:
      transition fade 0.5s

# === END ===
`;
