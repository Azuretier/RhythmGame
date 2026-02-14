// ===== Character Definitions =====
// NPCs that appear in the game world. Each character provides story dialogue
// and a skill loadout (Q/W/E/R) based on their role.

import type { CharacterDefinition } from './types';

export const CHARACTERS: CharacterDefinition[] = [
  // ===== Aria — Guide NPC (appears in all worlds) =====
  {
    id: 'aria',
    name: 'Aria',
    nameJa: 'アリア',
    role: 'guide',
    icon: '🧚',
    color: '#A29BFE',
    glowColor: '#C5BFFF',
    description: 'A luminous guide who watches over the rhythm worlds.',
    descriptionJa: 'リズムの世界を見守る光の案内人。',
    worldAppearance: [],  // All worlds
    position: { x: -3, z: -3 },
    skillLoadout: ['guide_q', 'guide_w', 'guide_e', 'guide_r'],
    dialogues: [
      {
        id: 'aria_intro',
        lines: [
          {
            speaker: 'Aria',
            speakerJa: 'アリア',
            text: 'Welcome, Traveler. The rhythm of this world flows through every block you place.',
            textJa: 'ようこそ、旅人。この世界のリズムは、あなたが置くすべてのブロックに宿ります。',
          },
          {
            speaker: 'Aria',
            speakerJa: 'アリア',
            text: 'I can lend you my power. Use Q, W, E, R to cast skills in battle.',
            textJa: '私の力をお貸しします。Q、W、E、Rでスキルを発動できます。',
          },
          {
            speaker: 'Aria',
            speakerJa: 'アリア',
            text: 'Destroy the terrain, collect materials, and forge your path forward.',
            textJa: '地形を破壊し、素材を集め、前へ進む道を切り開いてください。',
          },
        ],
        repeatable: false,
        priority: 100,
        trigger: { type: 'game_start' },
      },
      {
        id: 'aria_world1',
        lines: [
          {
            speaker: 'Aria',
            speakerJa: 'アリア',
            text: 'Harmonia... The tides of sound grow stronger here. Stay on beat.',
            textJa: 'ハーモニア...音の波がここでは強くなります。リズムに乗って。',
          },
        ],
        repeatable: false,
        priority: 80,
        trigger: { type: 'world_enter', worldIdx: 1 },
      },
      {
        id: 'aria_world2',
        lines: [
          {
            speaker: 'Aria',
            speakerJa: 'アリア',
            text: 'Crescenda burns bright. The tempo quickens — do not fall behind.',
            textJa: 'クレシェンダが輝く。テンポが速くなる — 遅れてはいけません。',
          },
        ],
        repeatable: false,
        priority: 80,
        trigger: { type: 'world_enter', worldIdx: 2 },
      },
      {
        id: 'aria_world3',
        lines: [
          {
            speaker: 'Aria',
            speakerJa: 'アリア',
            text: 'Fortissimo! The flames of sound rage. Your skills will be tested.',
            textJa: 'フォルティッシモ！音の炎が荒れ狂う。あなたの腕が試されます。',
          },
        ],
        repeatable: false,
        priority: 80,
        trigger: { type: 'world_enter', worldIdx: 3 },
      },
      {
        id: 'aria_world4',
        lines: [
          {
            speaker: 'Aria',
            speakerJa: 'アリア',
            text: 'The Silence... The final threshold. Everything you have learned leads here.',
            textJa: '静寂の間...最後の閾値。学んだすべてがここに集約されます。',
          },
        ],
        repeatable: false,
        priority: 90,
        trigger: { type: 'world_enter', worldIdx: 4 },
      },
      {
        id: 'aria_low_hp',
        lines: [
          {
            speaker: 'Aria',
            speakerJa: 'アリア',
            text: 'Your tower weakens! Use my healing skills — press Q for Insight, E for Inspire.',
            textJa: 'タワーが弱っています！回復スキルを使って — Qで洞察、Eで鼓舞。',
          },
        ],
        repeatable: true,
        priority: 95,
        trigger: { type: 'health_low', threshold: 30 },
      },
      {
        id: 'aria_interact',
        lines: [
          {
            speaker: 'Aria',
            speakerJa: 'アリア',
            text: 'The rhythm guides us all. Keep placing blocks on the beat for maximum power.',
            textJa: 'リズムが私たちを導きます。ビートに合わせてブロックを置けば最大の力に。',
          },
          {
            speaker: 'Aria',
            speakerJa: 'アリア',
            text: 'My skills are yours to command. Use them wisely — mana flows from your score.',
            textJa: '私のスキルはあなたのもの。賢く使って — マナはスコアから流れます。',
          },
        ],
        repeatable: true,
        priority: 50,
        trigger: { type: 'interact' },
      },
    ],
  },

  // ===== Kael — Warrior NPC (appears in worlds 2-4) =====
  {
    id: 'kael',
    name: 'Kael',
    nameJa: 'カエル',
    role: 'warrior',
    icon: '⚔️',
    color: '#FF4444',
    glowColor: '#FF8888',
    description: 'A battle-hardened warrior who thrives in the heat of combat.',
    descriptionJa: '戦いに鍛えられし勇士。',
    worldAppearance: [2, 3, 4],
    position: { x: 4, z: -2 },
    skillLoadout: ['warrior_q', 'warrior_w', 'warrior_e', 'warrior_r'],
    dialogues: [
      {
        id: 'kael_intro',
        lines: [
          {
            speaker: 'Kael',
            speakerJa: 'カエル',
            text: 'You have proven yourself in the gentler worlds. Now, face true battle.',
            textJa: '穏やかな世界で実力を示した。今こそ真の戦いに臨め。',
          },
          {
            speaker: 'Kael',
            speakerJa: 'カエル',
            text: 'My blade skills are unmatched. Q to strike, W to empower, E to slam the ground.',
            textJa: '我が剣技に並ぶ者なし。Qで斬撃、Wで強化、Eで地砕き。',
          },
          {
            speaker: 'Kael',
            speakerJa: 'カエル',
            text: 'And when all seems lost... R unleashes Cataclysm. Use it to turn the tide.',
            textJa: 'そして全てが失われたと思った時...Rで天変地異。戦況を覆せ。',
          },
        ],
        repeatable: false,
        priority: 90,
        trigger: { type: 'world_enter', worldIdx: 2 },
      },
      {
        id: 'kael_interact',
        lines: [
          {
            speaker: 'Kael',
            speakerJa: 'カエル',
            text: 'Strike fast, strike hard. My Blade Strike cuts through the toughest foes.',
            textJa: '素早く、強く斬れ。我が剣撃は最強の敵をも貫く。',
          },
          {
            speaker: 'Kael',
            speakerJa: 'カエル',
            text: 'Ground Slam pushes enemies back. Buy yourself time when overwhelmed.',
            textJa: '地砕きは敵を押し戻す。圧倒された時に時間を稼げ。',
          },
        ],
        repeatable: true,
        priority: 50,
        trigger: { type: 'interact' },
      },
    ],
  },

  // ===== Luna — Mage NPC (appears in worlds 1-3) =====
  {
    id: 'luna',
    name: 'Luna',
    nameJa: 'ルナ',
    role: 'mage',
    icon: '🔮',
    color: '#7B68EE',
    glowColor: '#9B8BFF',
    description: 'A mystical mage who commands frost and arcane forces.',
    descriptionJa: '霜と秘術を操る神秘の魔術師。',
    worldAppearance: [1, 2, 3],
    position: { x: -4, z: 2 },
    skillLoadout: ['mage_q', 'mage_w', 'mage_e', 'mage_r'],
    dialogues: [
      {
        id: 'luna_intro',
        lines: [
          {
            speaker: 'Luna',
            speakerJa: 'ルナ',
            text: 'The currents of Harmonia respond to magic. Let me show you.',
            textJa: 'ハーモニアの流れは魔法に応える。お見せしましょう。',
          },
          {
            speaker: 'Luna',
            speakerJa: 'ルナ',
            text: 'Arcane Bolt damages and slows. Frost Ring freezes groups. Use them together.',
            textJa: '秘術弾はダメージと減速。氷結陣は集団を凍結。組み合わせて使って。',
          },
          {
            speaker: 'Luna',
            speakerJa: 'ルナ',
            text: 'When desperation calls, Meteor Storm rains destruction upon all who oppose you.',
            textJa: '絶望の時、流星雨が全ての敵に破壊の雨を降らせる。',
          },
        ],
        repeatable: false,
        priority: 90,
        trigger: { type: 'world_enter', worldIdx: 1 },
      },
      {
        id: 'luna_interact',
        lines: [
          {
            speaker: 'Luna',
            speakerJa: 'ルナ',
            text: 'Seismic Wave can clear terrain blocks directly. Useful when you need a shortcut.',
            textJa: '地震波で地形を直接破壊できます。近道が必要な時に便利。',
          },
          {
            speaker: 'Luna',
            speakerJa: 'ルナ',
            text: 'Magic is fueled by your score. The better you play, the more power you have.',
            textJa: '魔法はスコアで燃料となる。上手にプレイすればするほど力が増す。',
          },
        ],
        repeatable: true,
        priority: 50,
        trigger: { type: 'interact' },
      },
    ],
  },

  // ===== Soleil — Healer NPC (appears in all worlds) =====
  {
    id: 'soleil',
    name: 'Soleil',
    nameJa: 'ソレイユ',
    role: 'healer',
    icon: '🌟',
    color: '#FFD700',
    glowColor: '#FFECB3',
    description: 'A radiant healer who mends both tower and spirit.',
    descriptionJa: 'タワーと精神を癒す光の癒し手。',
    worldAppearance: [],  // All worlds
    position: { x: 3, z: 3 },
    skillLoadout: ['healer_q', 'healer_w', 'healer_e', 'healer_r'],
    dialogues: [
      {
        id: 'soleil_intro',
        lines: [
          {
            speaker: 'Soleil',
            speakerJa: 'ソレイユ',
            text: 'Greetings. I sense the tower needs mending. Allow me to help.',
            textJa: 'ごあいさつ。タワーに修復が必要ですね。お手伝いさせてください。',
          },
          {
            speaker: 'Soleil',
            speakerJa: 'ソレイユ',
            text: 'My Mending Light restores health. Divine Shield reduces incoming harm.',
            textJa: '治癒光でHPを回復。聖盾で受けるダメージを軽減します。',
          },
        ],
        repeatable: false,
        priority: 85,
        trigger: { type: 'game_start' },
      },
      {
        id: 'soleil_low_hp',
        lines: [
          {
            speaker: 'Soleil',
            speakerJa: 'ソレイユ',
            text: 'The tower falters! Press Q now — my healing light will restore it!',
            textJa: 'タワーが危ない！今すぐQを押して — 治癒光で回復します！',
          },
        ],
        repeatable: true,
        priority: 96,
        trigger: { type: 'health_low', threshold: 25 },
      },
      {
        id: 'soleil_interact',
        lines: [
          {
            speaker: 'Soleil',
            speakerJa: 'ソレイユ',
            text: 'Remember, Resurrection is my ultimate power. It fully restores the tower.',
            textJa: '復活の祈りは究極の力。タワーを完全回復します。',
          },
          {
            speaker: 'Soleil',
            speakerJa: 'ソレイユ',
            text: 'But it requires great mana. Build your score to fuel it.',
            textJa: 'でも大量のマナが必要。スコアを積み上げて燃料にしてください。',
          },
        ],
        repeatable: true,
        priority: 50,
        trigger: { type: 'interact' },
      },
    ],
  },

  // ===== Rook — Merchant NPC (appears in worlds 0, 1, 2) =====
  {
    id: 'rook',
    name: 'Rook',
    nameJa: 'ルーク',
    role: 'merchant',
    icon: '🏪',
    color: '#FFA500',
    glowColor: '#FFD280',
    description: 'A shrewd merchant who trades in gold and combat supplies.',
    descriptionJa: '金と戦闘物資を扱う抜け目ない商人。',
    worldAppearance: [0, 1, 2],
    position: { x: 5, z: 0 },
    skillLoadout: ['merchant_q', 'merchant_w', 'merchant_e', 'merchant_r'],
    dialogues: [
      {
        id: 'rook_intro',
        lines: [
          {
            speaker: 'Rook',
            speakerJa: 'ルーク',
            text: 'Ah, a customer! Gold makes the world turn, friend. Let me show you.',
            textJa: 'おや、お客さん！金が世界を回すのさ。見せてやろう。',
          },
          {
            speaker: 'Rook',
            speakerJa: 'ルーク',
            text: 'My skills are... unconventional. Gold Toss damages enemies. Supply Drop heals.',
            textJa: '俺のスキルは...型破りだ。ゴールド投げでダメージ。補給投下で回復。',
          },
        ],
        repeatable: false,
        priority: 75,
        trigger: { type: 'world_enter', worldIdx: 0 },
      },
      {
        id: 'rook_first_craft',
        lines: [
          {
            speaker: 'Rook',
            speakerJa: 'ルーク',
            text: 'Your first weapon! Fine craftsmanship. Visit the shop for more — press L.',
            textJa: '最初の武器！見事な出来だ。ショップにもっとあるぞ — Lキーで開く。',
          },
        ],
        repeatable: false,
        priority: 70,
        trigger: { type: 'first_craft' },
      },
      {
        id: 'rook_interact',
        lines: [
          {
            speaker: 'Rook',
            speakerJa: 'ルーク',
            text: 'Every enemy you defeat adds to your gold. Spend wisely at the shop.',
            textJa: '倒した敵の分だけ金が増える。ショップで賢く使え。',
          },
          {
            speaker: 'Rook',
            speakerJa: 'ルーク',
            text: 'Market Crash is devastating. It hits everyone and slows them down.',
            textJa: '暴落は壊滅的だ。全員にヒットして減速させる。',
          },
        ],
        repeatable: true,
        priority: 50,
        trigger: { type: 'interact' },
      },
    ],
  },
];

export const CHARACTER_MAP: Record<string, CharacterDefinition> = Object.fromEntries(
  CHARACTERS.map(c => [c.id, c])
);

/** Get characters visible in a given world index */
export function getCharactersForWorld(worldIdx: number): CharacterDefinition[] {
  return CHARACTERS.filter(
    c => c.worldAppearance.length === 0 || c.worldAppearance.includes(worldIdx)
  );
}
