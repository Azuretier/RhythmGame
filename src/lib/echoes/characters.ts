// =============================================================================
// ECHOES OF ETERNITY — Character Definitions & System
// キャラクターシステム (定義・生成・成長)
// =============================================================================

import type {
  CharacterDefinition,
  CharacterInstance,
  CharacterStats,
  CharacterRole,
  CharacterRarity,
  Element,
  CharacterSkill,
  PassiveAbility,
  ArtifactSet,
} from '@/types/echoes';
import { expForLevel } from './combat';

// ---------------------------------------------------------------------------
// Character Definitions — Starter Roster (8 elements × multiple roles)
// ---------------------------------------------------------------------------

export const CHARACTER_DEFINITIONS: CharacterDefinition[] = [
  // =========================================================================
  // ★★★★★ 5-Star Characters
  // =========================================================================
  {
    id: 'aether_flame',
    name: 'Aether',
    nameJa: 'エーテル',
    title: 'Keeper of Eternal Flame',
    titleJa: '永遠の炎の守護者',
    lore: 'A wanderer from a forgotten timeline, wielding flames that burn across dimensions.',
    loreJa: '忘れ去られた時間軸からの放浪者。次元を超えて燃え上がる炎を操る。',
    element: 'fire',
    role: 'dps',
    rarity: 5,
    baseStats: { hp: 1200, maxHp: 1200, mp: 100, maxMp: 100, atk: 85, def: 45, speed: 70, critRate: 0.15, critDamage: 2.0, accuracy: 0.95, evasion: 0.1, elementalMastery: 50 },
    growthStats: { hp: 120, maxHp: 120, mp: 5, maxMp: 5, atk: 8, def: 4, speed: 2, critRate: 0.002, critDamage: 0.02, accuracy: 0, evasion: 0, elementalMastery: 3 },
    skills: [
      {
        id: 'aether_normal', name: 'Flame Slash', nameJa: '炎斬',
        description: 'A swift sword strike imbued with fire', descriptionJa: '炎を纏った素早い剣撃',
        element: 'fire', cooldown: 0, manaCost: 0, damageMultiplier: 1.2,
        range: 1, aoeRadius: 0, skillType: 'normal', targetType: 'enemy',
        rhythmDifficulty: 'easy',
      },
      {
        id: 'aether_skill', name: 'Crimson Vortex', nameJa: '紅蓮渦',
        description: 'Unleash a spiraling inferno that pulls enemies in', descriptionJa: '敵を引き寄せる螺旋の業火を放つ',
        element: 'fire', cooldown: 3, manaCost: 30, damageMultiplier: 2.8,
        range: 3, aoeRadius: 2, skillType: 'skill', targetType: 'area',
        rhythmDifficulty: 'hard',
        statusEffects: [{ type: 'burn', chance: 0.7, duration: 30, value: 0.05 }],
      },
      {
        id: 'aether_burst', name: 'Eternal Conflagration', nameJa: '永劫の大火',
        description: 'Summon the flames of eternity, scorching all foes', descriptionJa: '永遠の炎を召喚し、全ての敵を焼き尽くす',
        element: 'fire', cooldown: 8, manaCost: 80, damageMultiplier: 5.0,
        range: 5, aoeRadius: 4, skillType: 'burst', targetType: 'all_enemies',
        rhythmDifficulty: 'master',
        statusEffects: [{ type: 'burn', chance: 1.0, duration: 50, value: 0.08 }],
        comboLinks: ['aether_skill'],
      },
    ],
    passives: [
      {
        id: 'aether_passive1', name: 'Burning Resolve', nameJa: '燃える決意',
        description: 'ATK +20% when HP below 50%', descriptionJa: 'HP50%以下時、攻撃力+20%',
        trigger: 'low_hp',
        effect: { statModifiers: { atk: 0.2 } },
      },
      {
        id: 'aether_passive2', name: 'Flame Resonance', nameJa: '炎の共鳴',
        description: 'Fire reactions deal 30% more damage', descriptionJa: '炎反応のダメージ+30%',
        trigger: 'on_combo',
        effect: { statModifiers: { elementalMastery: 30 } },
      },
    ],
    icon: 'aether_icon',
    splashArt: 'aether_splash',
    chibiSprite: 'aether_chibi',
  },
  {
    id: 'luna_frost',
    name: 'Luna',
    nameJa: 'ルナ',
    title: 'Moonlit Sovereign',
    titleJa: '月光の主',
    lore: 'Born under the eternal moon, Luna commands ice that freezes time itself.',
    loreJa: '永遠の月の下に生まれ、時を凍らせる氷を操る。',
    element: 'ice',
    role: 'support',
    rarity: 5,
    baseStats: { hp: 1400, maxHp: 1400, mp: 130, maxMp: 130, atk: 55, def: 55, speed: 65, critRate: 0.1, critDamage: 1.8, accuracy: 0.9, evasion: 0.05, elementalMastery: 80 },
    growthStats: { hp: 140, maxHp: 140, mp: 8, maxMp: 8, atk: 5, def: 5, speed: 2, critRate: 0.001, critDamage: 0.01, accuracy: 0, evasion: 0, elementalMastery: 5 },
    skills: [
      {
        id: 'luna_normal', name: 'Frost Touch', nameJa: '凍触',
        description: 'A gentle touch that crystallizes enemies', descriptionJa: '敵を結晶化させる優しい触れ方',
        element: 'ice', cooldown: 0, manaCost: 0, damageMultiplier: 0.8,
        range: 2, aoeRadius: 0, skillType: 'normal', targetType: 'enemy',
        rhythmDifficulty: 'easy',
        statusEffects: [{ type: 'slow', chance: 0.3, duration: 20, value: 0.2 }],
      },
      {
        id: 'luna_skill', name: 'Lunar Blessing', nameJa: '月の祝福',
        description: 'Heal all allies and grant ice shield', descriptionJa: '全味方を回復し氷の盾を付与',
        element: 'ice', cooldown: 4, manaCost: 40, damageMultiplier: 0,
        range: 0, aoeRadius: 0, skillType: 'skill', targetType: 'all_allies',
        rhythmDifficulty: 'normal',
        statusEffects: [{ type: 'shield', chance: 1.0, duration: 60, value: 200 }, { type: 'regen', chance: 1.0, duration: 30, value: 0.05 }],
      },
      {
        id: 'luna_burst', name: 'Absolute Zero', nameJa: '絶対零度',
        description: 'Freeze the battlefield, immobilizing all enemies', descriptionJa: '戦場を凍結し、全ての敵を行動不能に',
        element: 'ice', cooldown: 10, manaCost: 100, damageMultiplier: 3.0,
        range: 5, aoeRadius: 5, skillType: 'burst', targetType: 'all_enemies',
        rhythmDifficulty: 'expert',
        statusEffects: [{ type: 'freeze', chance: 0.8, duration: 30, value: 1 }],
      },
    ],
    passives: [
      {
        id: 'luna_passive1', name: 'Moonlight Aura', nameJa: '月光のオーラ',
        description: 'Allies near Luna gain 15% DEF', descriptionJa: 'ルナ付近の味方の防御力+15%',
        trigger: 'always',
        effect: { statModifiers: { def: 0.15 } },
      },
    ],
    icon: 'luna_icon',
    splashArt: 'luna_splash',
    chibiSprite: 'luna_chibi',
  },
  {
    id: 'raijin_storm',
    name: 'Raijin',
    nameJa: '雷神',
    title: 'Thunder Emperor',
    titleJa: '雷帝',
    lore: 'An ancient deity reborn, channeling lightning from the heart of storms.',
    loreJa: '嵐の中心から雷を引き出す、転生した古代の神。',
    element: 'thunder',
    role: 'dps',
    rarity: 5,
    baseStats: { hp: 1000, maxHp: 1000, mp: 90, maxMp: 90, atk: 95, def: 35, speed: 90, critRate: 0.2, critDamage: 2.2, accuracy: 0.92, evasion: 0.15, elementalMastery: 40 },
    growthStats: { hp: 100, maxHp: 100, mp: 5, maxMp: 5, atk: 10, def: 3, speed: 3, critRate: 0.003, critDamage: 0.03, accuracy: 0, evasion: 0.001, elementalMastery: 2 },
    skills: [
      {
        id: 'raijin_normal', name: 'Lightning Jab', nameJa: '雷撃突き',
        description: 'A blindingly fast electrified strike', descriptionJa: '目にも止まらぬ速さの帯電突き',
        element: 'thunder', cooldown: 0, manaCost: 0, damageMultiplier: 1.3,
        range: 1, aoeRadius: 0, skillType: 'normal', targetType: 'enemy',
        rhythmDifficulty: 'normal',
      },
      {
        id: 'raijin_skill', name: 'Chain Lightning', nameJa: '連鎖雷',
        description: 'Lightning arcs between multiple enemies', descriptionJa: '複数の敵の間を雷が飛び交う',
        element: 'thunder', cooldown: 2, manaCost: 25, damageMultiplier: 1.8,
        range: 4, aoeRadius: 3, skillType: 'skill', targetType: 'all_enemies',
        rhythmDifficulty: 'hard',
        statusEffects: [{ type: 'shock', chance: 0.5, duration: 20, value: 0.3 }],
      },
      {
        id: 'raijin_burst', name: 'Divine Thunder', nameJa: '神鳴り',
        description: 'Call down the wrath of heaven upon all enemies', descriptionJa: '天の怒りを全ての敵に降らせる',
        element: 'thunder', cooldown: 7, manaCost: 70, damageMultiplier: 4.5,
        range: 5, aoeRadius: 5, skillType: 'burst', targetType: 'all_enemies',
        rhythmDifficulty: 'master',
        statusEffects: [{ type: 'stun', chance: 0.4, duration: 15, value: 1 }],
      },
    ],
    passives: [
      {
        id: 'raijin_passive1', name: 'Storm Momentum', nameJa: '嵐の勢い',
        description: 'Each hit increases speed by 3%, stacks 10 times', descriptionJa: '攻撃命中ごとにスピード+3%、10回まで重複',
        trigger: 'on_hit',
        effect: { statModifiers: { speed: 0.03 } },
      },
      {
        id: 'raijin_passive2', name: 'Critical Flash', nameJa: '閃光一撃',
        description: 'Critical hits restore 5 MP', descriptionJa: 'クリティカル時MP5回復',
        trigger: 'on_hit',
        effect: { manaRestore: 5 },
      },
    ],
    icon: 'raijin_icon',
    splashArt: 'raijin_splash',
    chibiSprite: 'raijin_chibi',
  },
  {
    id: 'eclipse_void',
    name: 'Eclipse',
    nameJa: 'エクリプス',
    title: 'Herald of the Void',
    titleJa: '虚空の先触れ',
    lore: 'Neither light nor dark, Eclipse walks the boundary between existence and oblivion.',
    loreJa: '光でも闇でもなく、存在と虚無の境界を歩む者。',
    element: 'dark',
    role: 'utility',
    rarity: 5,
    baseStats: { hp: 1100, maxHp: 1100, mp: 120, maxMp: 120, atk: 75, def: 50, speed: 80, critRate: 0.18, critDamage: 1.9, accuracy: 0.93, evasion: 0.2, elementalMastery: 70 },
    growthStats: { hp: 110, maxHp: 110, mp: 7, maxMp: 7, atk: 7, def: 4, speed: 3, critRate: 0.002, critDamage: 0.02, accuracy: 0, evasion: 0.002, elementalMastery: 4 },
    skills: [
      {
        id: 'eclipse_normal', name: 'Shadow Rend', nameJa: '影裂き',
        description: 'Strike from the shadows, ignoring 20% DEF', descriptionJa: '影から攻撃し、防御の20%を無視',
        element: 'dark', cooldown: 0, manaCost: 0, damageMultiplier: 1.1,
        range: 2, aoeRadius: 0, skillType: 'normal', targetType: 'enemy',
        rhythmDifficulty: 'normal',
      },
      {
        id: 'eclipse_skill', name: 'Void Step', nameJa: '虚空歩',
        description: 'Teleport behind the enemy and strike. Grants stealth for 2 turns', descriptionJa: '敵の背後にテレポートして攻撃。2ターン透明化',
        element: 'dark', cooldown: 3, manaCost: 35, damageMultiplier: 2.2,
        range: 5, aoeRadius: 0, skillType: 'skill', targetType: 'enemy',
        rhythmDifficulty: 'hard',
        statusEffects: [{ type: 'stealth', chance: 1.0, duration: 20, value: 1 }],
      },
      {
        id: 'eclipse_burst', name: 'Event Horizon', nameJa: '事象の地平線',
        description: 'Create a singularity that corrupts all enemies over time', descriptionJa: '全ての敵を時間経過で侵蝕する特異点を生成',
        element: 'dark', cooldown: 9, manaCost: 90, damageMultiplier: 3.5,
        range: 5, aoeRadius: 5, skillType: 'burst', targetType: 'all_enemies',
        rhythmDifficulty: 'expert',
        statusEffects: [
          { type: 'corrupt', chance: 1.0, duration: 40, value: 0.1 },
          { type: 'def_down', chance: 0.6, duration: 30, value: 0.25 },
        ],
      },
    ],
    passives: [
      {
        id: 'eclipse_passive1', name: 'Shadow Dance', nameJa: '影踊り',
        description: 'Evasion +10% when stealthed', descriptionJa: '透明化中、回避率+10%',
        trigger: 'always',
        effect: { statModifiers: { evasion: 0.1 } },
      },
      {
        id: 'eclipse_passive2', name: 'Void Hunger', nameJa: '虚空の飢え',
        description: 'Killing an enemy restores 20% HP', descriptionJa: '敵を倒すとHP20%回復',
        trigger: 'on_kill',
        effect: { healPercent: 0.2 },
      },
    ],
    icon: 'eclipse_icon',
    splashArt: 'eclipse_splash',
    chibiSprite: 'eclipse_chibi',
  },

  // =========================================================================
  // ★★★★ 4-Star Characters
  // =========================================================================
  {
    id: 'terra_shield',
    name: 'Terra',
    nameJa: 'テラ',
    title: 'Ironclad Guardian',
    titleJa: '鉄壁の守護者',
    lore: 'A steadfast warrior who draws power from the earth beneath her feet.',
    loreJa: '足元の大地から力を引き出す堅実な戦士。',
    element: 'earth',
    role: 'tank',
    rarity: 4,
    baseStats: { hp: 1800, maxHp: 1800, mp: 80, maxMp: 80, atk: 50, def: 80, speed: 40, critRate: 0.05, critDamage: 1.5, accuracy: 0.85, evasion: 0.02, elementalMastery: 30 },
    growthStats: { hp: 180, maxHp: 180, mp: 4, maxMp: 4, atk: 4, def: 8, speed: 1, critRate: 0.001, critDamage: 0.01, accuracy: 0, evasion: 0, elementalMastery: 2 },
    skills: [
      {
        id: 'terra_normal', name: 'Rock Slam', nameJa: '岩叩き',
        description: 'Slam the ground with a stone hammer', descriptionJa: '石のハンマーで地面を叩く',
        element: 'earth', cooldown: 0, manaCost: 0, damageMultiplier: 1.0,
        range: 1, aoeRadius: 0, skillType: 'normal', targetType: 'enemy',
        rhythmDifficulty: 'easy',
      },
      {
        id: 'terra_skill', name: 'Stone Bulwark', nameJa: '石壁',
        description: 'Raise a wall of stone, granting party-wide shields', descriptionJa: '石の壁を起こし、全味方にシールド付与',
        element: 'earth', cooldown: 4, manaCost: 35, damageMultiplier: 0,
        range: 0, aoeRadius: 0, skillType: 'skill', targetType: 'all_allies',
        rhythmDifficulty: 'normal',
        statusEffects: [{ type: 'shield', chance: 1.0, duration: 50, value: 300 }, { type: 'def_up', chance: 1.0, duration: 30, value: 0.2 }],
      },
      {
        id: 'terra_burst', name: 'Tectonic Fury', nameJa: '地殻の怒り',
        description: 'Shatter the ground beneath all enemies', descriptionJa: '全ての敵の足元の地面を砕く',
        element: 'earth', cooldown: 7, manaCost: 60, damageMultiplier: 3.0,
        range: 3, aoeRadius: 3, skillType: 'burst', targetType: 'all_enemies',
        rhythmDifficulty: 'hard',
        statusEffects: [{ type: 'stun', chance: 0.3, duration: 10, value: 1 }],
      },
    ],
    passives: [
      {
        id: 'terra_passive1', name: 'Unyielding', nameJa: '不屈',
        description: 'Reduce damage taken by 10% when HP above 70%', descriptionJa: 'HP70%以上時、被ダメージ-10%',
        trigger: 'full_hp',
        effect: { statModifiers: { def: 0.1 } },
      },
    ],
    icon: 'terra_icon',
    splashArt: 'terra_splash',
    chibiSprite: 'terra_chibi',
  },
  {
    id: 'zephyr_wind',
    name: 'Zephyr',
    nameJa: 'ゼファー',
    title: 'Wandering Gale',
    titleJa: '放浪の疾風',
    lore: 'A free-spirited bard who rides the wind and sings songs of old.',
    loreJa: '風に乗り、古の歌を歌う自由奔放な吟遊詩人。',
    element: 'wind',
    role: 'support',
    rarity: 4,
    baseStats: { hp: 1000, maxHp: 1000, mp: 110, maxMp: 110, atk: 60, def: 40, speed: 85, critRate: 0.1, critDamage: 1.6, accuracy: 0.9, evasion: 0.15, elementalMastery: 60 },
    growthStats: { hp: 100, maxHp: 100, mp: 6, maxMp: 6, atk: 5, def: 3, speed: 3, critRate: 0.001, critDamage: 0.01, accuracy: 0, evasion: 0.001, elementalMastery: 4 },
    skills: [
      {
        id: 'zephyr_normal', name: 'Wind Blade', nameJa: '風刃',
        description: 'Launch a crescent of compressed air', descriptionJa: '圧縮空気の三日月を飛ばす',
        element: 'wind', cooldown: 0, manaCost: 0, damageMultiplier: 1.0,
        range: 3, aoeRadius: 0, skillType: 'normal', targetType: 'enemy',
        rhythmDifficulty: 'easy',
      },
      {
        id: 'zephyr_skill', name: 'Harmony of Winds', nameJa: '風の調和',
        description: 'Speed up all allies and swirl nearby elements', descriptionJa: '全味方の速度上昇＋周囲の元素を拡散',
        element: 'wind', cooldown: 3, manaCost: 30, damageMultiplier: 0.5,
        range: 0, aoeRadius: 3, skillType: 'skill', targetType: 'all_allies',
        rhythmDifficulty: 'normal',
        statusEffects: [{ type: 'speed_up', chance: 1.0, duration: 30, value: 0.25 }],
      },
      {
        id: 'zephyr_burst', name: 'Tempest Requiem', nameJa: '嵐のレクイエム',
        description: 'Summon a massive tornado that absorbs and swirls all elements', descriptionJa: '全ての元素を吸収し拡散する巨大竜巻を召喚',
        element: 'wind', cooldown: 8, manaCost: 75, damageMultiplier: 2.5,
        range: 5, aoeRadius: 4, skillType: 'burst', targetType: 'all_enemies',
        rhythmDifficulty: 'expert',
      },
    ],
    passives: [
      {
        id: 'zephyr_passive1', name: 'Melodic Flow', nameJa: '旋律の流れ',
        description: 'Rhythm accuracy above 80% grants +15% Elemental Mastery to party', descriptionJa: 'リズム精度80%以上で全味方の元素熟知+15%',
        trigger: 'on_perfect',
        effect: { statModifiers: { elementalMastery: 15 } },
      },
    ],
    icon: 'zephyr_icon',
    splashArt: 'zephyr_splash',
    chibiSprite: 'zephyr_chibi',
  },
  {
    id: 'aqua_tide',
    name: 'Aqua',
    nameJa: 'アクア',
    title: 'Tidal Priestess',
    titleJa: '潮流の巫女',
    lore: 'A healer from the coastal temples, commanding the ocean\'s embrace.',
    loreJa: '海岸の神殿の治癒師。海の抱擁を操る。',
    element: 'water',
    role: 'support',
    rarity: 4,
    baseStats: { hp: 1300, maxHp: 1300, mp: 140, maxMp: 140, atk: 45, def: 50, speed: 55, critRate: 0.08, critDamage: 1.5, accuracy: 0.88, evasion: 0.05, elementalMastery: 70 },
    growthStats: { hp: 130, maxHp: 130, mp: 8, maxMp: 8, atk: 4, def: 4, speed: 2, critRate: 0.001, critDamage: 0.01, accuracy: 0, evasion: 0, elementalMastery: 5 },
    skills: [
      {
        id: 'aqua_normal', name: 'Water Bolt', nameJa: '水弾',
        description: 'Fire a pressurized stream of water', descriptionJa: '加圧した水流を発射',
        element: 'water', cooldown: 0, manaCost: 0, damageMultiplier: 0.9,
        range: 3, aoeRadius: 0, skillType: 'normal', targetType: 'enemy',
        rhythmDifficulty: 'easy',
      },
      {
        id: 'aqua_skill', name: 'Ocean\'s Grace', nameJa: '海の恩寵',
        description: 'Heal all allies for 25% of Aqua\'s max HP', descriptionJa: 'アクアの最大HPの25%分、全味方を回復',
        element: 'water', cooldown: 3, manaCost: 40, damageMultiplier: 0,
        range: 0, aoeRadius: 0, skillType: 'skill', targetType: 'all_allies',
        rhythmDifficulty: 'normal',
        statusEffects: [{ type: 'regen', chance: 1.0, duration: 30, value: 0.06 }],
      },
      {
        id: 'aqua_burst', name: 'Tidal Surge', nameJa: '大潮の波動',
        description: 'Summon a massive tidal wave, damaging and hydrating the field', descriptionJa: '巨大な波を召喚し、ダメージと水元素を付与',
        element: 'water', cooldown: 7, manaCost: 65, damageMultiplier: 2.8,
        range: 5, aoeRadius: 4, skillType: 'burst', targetType: 'all_enemies',
        rhythmDifficulty: 'hard',
      },
    ],
    passives: [
      {
        id: 'aqua_passive1', name: 'Cleansing Waters', nameJa: '浄化の水',
        description: 'Healing skills have 30% chance to remove 1 debuff', descriptionJa: '回復スキル使用時30%でデバフ1つ解除',
        trigger: 'on_hit',
        effect: {},
      },
    ],
    icon: 'aqua_icon',
    splashArt: 'aqua_splash',
    chibiSprite: 'aqua_chibi',
  },
  {
    id: 'solaris_light',
    name: 'Solaris',
    nameJa: 'ソラリス',
    title: 'Dawn Bringer',
    titleJa: '黎明の使者',
    lore: 'A paladin who carries the light of the first dawn, dispelling all darkness.',
    loreJa: '最初の夜明けの光を持つ聖騎士。全ての闇を払う。',
    element: 'light',
    role: 'tank',
    rarity: 4,
    baseStats: { hp: 1600, maxHp: 1600, mp: 90, maxMp: 90, atk: 60, def: 70, speed: 50, critRate: 0.08, critDamage: 1.6, accuracy: 0.9, evasion: 0.05, elementalMastery: 40 },
    growthStats: { hp: 160, maxHp: 160, mp: 5, maxMp: 5, atk: 5, def: 7, speed: 1, critRate: 0.001, critDamage: 0.01, accuracy: 0, evasion: 0, elementalMastery: 3 },
    skills: [
      {
        id: 'solaris_normal', name: 'Holy Strike', nameJa: '聖撃',
        description: 'A radiant sword blow', descriptionJa: '輝く剣の一撃',
        element: 'light', cooldown: 0, manaCost: 0, damageMultiplier: 1.1,
        range: 1, aoeRadius: 0, skillType: 'normal', targetType: 'enemy',
        rhythmDifficulty: 'easy',
      },
      {
        id: 'solaris_skill', name: 'Divine Aegis', nameJa: '神盾',
        description: 'Grant invincibility to one ally for 1 turn', descriptionJa: '味方1人に1ターン無敵付与',
        element: 'light', cooldown: 5, manaCost: 50, damageMultiplier: 0,
        range: 3, aoeRadius: 0, skillType: 'skill', targetType: 'ally',
        rhythmDifficulty: 'hard',
        statusEffects: [{ type: 'invincible', chance: 1.0, duration: 10, value: 1 }],
      },
      {
        id: 'solaris_burst', name: 'Radiant Dawn', nameJa: '光輝の暁',
        description: 'Purify all allies of debuffs and deal light damage to all enemies', descriptionJa: '全味方のデバフを浄化し、全敵に光ダメージ',
        element: 'light', cooldown: 8, manaCost: 80, damageMultiplier: 2.5,
        range: 5, aoeRadius: 5, skillType: 'burst', targetType: 'all_enemies',
        rhythmDifficulty: 'expert',
        statusEffects: [{ type: 'atk_up', chance: 1.0, duration: 30, value: 0.2 }],
      },
    ],
    passives: [
      {
        id: 'solaris_passive1', name: 'Beacon of Hope', nameJa: '希望の灯',
        description: 'When an ally falls below 30% HP, auto-heal 10% HP (once per battle)', descriptionJa: '味方のHPが30%以下時、自動で10%回復(戦闘中1回)',
        trigger: 'on_damaged',
        effect: { healPercent: 0.1 },
      },
    ],
    icon: 'solaris_icon',
    splashArt: 'solaris_splash',
    chibiSprite: 'solaris_chibi',
  },
];

// ---------------------------------------------------------------------------
// Character Registry
// ---------------------------------------------------------------------------

const characterMap = new Map<string, CharacterDefinition>();
for (const def of CHARACTER_DEFINITIONS) {
  characterMap.set(def.id, def);
}

/**
 * Get a character definition by ID
 */
export function getCharacterDefinition(id: string): CharacterDefinition | undefined {
  return characterMap.get(id);
}

/**
 * Get all character definitions
 */
export function getAllCharacters(): CharacterDefinition[] {
  return CHARACTER_DEFINITIONS;
}

/**
 * Get characters by element
 */
export function getCharactersByElement(element: Element): CharacterDefinition[] {
  return CHARACTER_DEFINITIONS.filter((c) => c.element === element);
}

/**
 * Get characters by role
 */
export function getCharactersByRole(role: CharacterRole): CharacterDefinition[] {
  return CHARACTER_DEFINITIONS.filter((c) => c.role === role);
}

/**
 * Get characters by rarity
 */
export function getCharactersByRarity(rarity: CharacterRarity): CharacterDefinition[] {
  return CHARACTER_DEFINITIONS.filter((c) => c.rarity === rarity);
}

// ---------------------------------------------------------------------------
// Character Instance Creation
// ---------------------------------------------------------------------------

/**
 * Create a new character instance from a definition
 */
export function createCharacterInstance(
  definition: CharacterDefinition,
  level: number = 1
): CharacterInstance {
  const stats = calculateStatsForLevel(definition, level);

  return {
    definitionId: definition.id,
    level,
    experience: 0,
    experienceToNext: expForLevel(level),
    constellation: 0,
    stats,
    equippedWeapon: null,
    equippedArtifacts: {} as ArtifactSet,
    statusEffects: [],
    skillCooldowns: {},
    currentElement: definition.element,
    isAlive: true,
    position: { x: 0, y: 0 },
    comboCount: 0,
    rhythmAccuracy: 0,
  };
}

/**
 * Calculate stats for a given level based on base + growth
 */
export function calculateStatsForLevel(
  definition: CharacterDefinition,
  level: number
): CharacterStats {
  const growth = level - 1;

  return {
    hp: definition.baseStats.hp + Math.floor(definition.growthStats.hp * growth),
    maxHp: definition.baseStats.maxHp + Math.floor(definition.growthStats.maxHp * growth),
    mp: definition.baseStats.mp + Math.floor(definition.growthStats.mp * growth),
    maxMp: definition.baseStats.maxMp + Math.floor(definition.growthStats.maxMp * growth),
    atk: definition.baseStats.atk + Math.floor(definition.growthStats.atk * growth),
    def: definition.baseStats.def + Math.floor(definition.growthStats.def * growth),
    speed: definition.baseStats.speed + Math.floor(definition.growthStats.speed * growth),
    critRate: Math.min(1, definition.baseStats.critRate + definition.growthStats.critRate * growth),
    critDamage: definition.baseStats.critDamage + definition.growthStats.critDamage * growth,
    accuracy: Math.min(1, definition.baseStats.accuracy + definition.growthStats.accuracy * growth),
    evasion: Math.min(1, definition.baseStats.evasion + definition.growthStats.evasion * growth),
    elementalMastery: definition.baseStats.elementalMastery + Math.floor(definition.growthStats.elementalMastery * growth),
  };
}

/**
 * Apply constellation bonuses to character instance
 */
export function applyConstellation(instance: CharacterInstance, constellation: number): void {
  instance.constellation = Math.min(6, constellation);

  // Each constellation grants flat bonuses
  const bonusPerConstellation: Partial<CharacterStats> = {
    atk: 5,
    def: 3,
    hp: 50,
    maxHp: 50,
    critRate: 0.01,
    elementalMastery: 10,
  };

  for (let i = 0; i < instance.constellation; i++) {
    for (const [key, value] of Object.entries(bonusPerConstellation)) {
      const k = key as keyof CharacterStats;
      if (typeof instance.stats[k] === 'number' && typeof value === 'number') {
        (instance.stats as unknown as Record<string, number>)[k] += value;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Party Composition Helpers
// ---------------------------------------------------------------------------

export interface PartyAnalysis {
  elements: Element[];
  roles: CharacterRole[];
  hasHealer: boolean;
  hasTank: boolean;
  hasDPS: boolean;
  elementCoverage: number; // how many elements covered
  synergyScore: number; // 0-100
  warnings: string[];
}

/**
 * Analyze a party composition and provide feedback
 */
export function analyzeParty(characters: CharacterDefinition[]): PartyAnalysis {
  const elements = [...new Set(characters.map((c) => c.element))];
  const roles = [...new Set(characters.map((c) => c.role))];
  const hasHealer = characters.some((c) => c.role === 'support');
  const hasTank = characters.some((c) => c.role === 'tank');
  const hasDPS = characters.some((c) => c.role === 'dps');

  const warnings: string[] = [];
  if (!hasHealer) warnings.push('No support character — healing will be limited');
  if (!hasTank) warnings.push('No tank character — party may be fragile');
  if (!hasDPS) warnings.push('No DPS character — damage output may be low');
  if (elements.length === 1) warnings.push('Single element party — vulnerable to resistance');

  // Synergy score based on element diversity + role coverage
  let synergy = 0;
  synergy += Math.min(40, elements.length * 10); // element diversity (max 40)
  synergy += Math.min(30, roles.length * 10); // role diversity (max 30)
  if (hasHealer && hasTank && hasDPS) synergy += 20; // balanced comp bonus
  if (elements.length >= 3) synergy += 10; // multi-element reaction potential

  return {
    elements,
    roles,
    hasHealer,
    hasTank,
    hasDPS,
    elementCoverage: elements.length,
    synergyScore: Math.min(100, synergy),
    warnings,
  };
}
