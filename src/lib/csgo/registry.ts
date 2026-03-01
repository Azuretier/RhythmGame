import type { CsgoWeaponDefinition, CsgoWeaponCategory, CsgoBuyMenuSection } from '@/types/csgo';

// =============================================================================
// CS:GO WEAPON REGISTRY
// =============================================================================

const WEAPONS: CsgoWeaponDefinition[] = [
    // ── Pistols ──────────────────────────────────────────────────────

    {
        id: 'glock_18', name: 'Glock-18', nameJa: 'グロック18',
        category: 'pistol', slot: 'secondary', team: 'terrorist',
        price: 200, killReward: 300,
        stats: {
            damage: 30, armorPenetration: 0.47, fireRate: 400,
            reloadTime: 2.25, magazineSize: 20, reserveAmmo: 120,
            moveSpeed: 240, range: 28, accuracy: 0.78, recoilControl: 0.80,
        },
        skinGrade: 'consumer', color: '#8B8B8B', glowColor: '#A0A0A0',
        description: 'T-side default pistol. High ammo capacity with a burst-fire option.',
        descriptionJa: 'T側デフォルトピストル。大容量マガジンとバースト射撃機能を持つ。',
        icon: '🔫',
    },
    {
        id: 'usp_s', name: 'USP-S', nameJa: 'USP-S',
        category: 'pistol', slot: 'secondary', team: 'counter_terrorist',
        price: 200, killReward: 300,
        stats: {
            damage: 35, armorPenetration: 0.505, fireRate: 352,
            reloadTime: 2.17, magazineSize: 12, reserveAmmo: 24,
            moveSpeed: 240, range: 31, accuracy: 0.90, recoilControl: 0.88,
        },
        skinGrade: 'consumer', color: '#90A4AE', glowColor: '#B0BEC5',
        description: 'CT-side silenced pistol. Exceptional accuracy with a detachable suppressor.',
        descriptionJa: 'CT側サイレンサー付きピストル。優れた精度と着脱可能なサプレッサー。',
        icon: '🔫',
    },
    {
        id: 'p2000', name: 'P2000', nameJa: 'P2000',
        category: 'pistol', slot: 'secondary', team: 'counter_terrorist',
        price: 200, killReward: 300,
        stats: {
            damage: 35, armorPenetration: 0.505, fireRate: 352,
            reloadTime: 2.20, magazineSize: 13, reserveAmmo: 52,
            moveSpeed: 240, range: 29, accuracy: 0.85, recoilControl: 0.82,
        },
        skinGrade: 'consumer', color: '#78909C', glowColor: '#90A4AE',
        description: 'CT-side alternate pistol. Reliable with a larger ammo reserve.',
        descriptionJa: 'CT側予備ピストル。大きな弾薬予備量で安定した性能。',
        icon: '🔫',
    },
    {
        id: 'dual_berettas', name: 'Dual Berettas', nameJa: 'デュアルベレッタ',
        category: 'pistol', slot: 'secondary', team: 'both',
        price: 300, killReward: 300,
        stats: {
            damage: 38, armorPenetration: 0.52, fireRate: 500,
            reloadTime: 3.80, magazineSize: 30, reserveAmmo: 120,
            moveSpeed: 240, range: 22, accuracy: 0.70, recoilControl: 0.65,
        },
        skinGrade: 'industrial', color: '#5D9CEC', glowColor: '#82B1FF',
        description: 'Akimbo pistols with massive magazine. Style over substance.',
        descriptionJa: '二丁拳銃。大容量マガジンだが精度は劣る。スタイル重視。',
        icon: '🔫',
    },
    {
        id: 'p250', name: 'P250', nameJa: 'P250',
        category: 'pistol', slot: 'secondary', team: 'both',
        price: 300, killReward: 300,
        stats: {
            damage: 38, armorPenetration: 0.64, fireRate: 352,
            reloadTime: 2.20, magazineSize: 13, reserveAmmo: 26,
            moveSpeed: 240, range: 25, accuracy: 0.82, recoilControl: 0.78,
        },
        skinGrade: 'industrial', color: '#7986CB', glowColor: '#9FA8DA',
        description: 'Budget-friendly pistol with solid armor penetration.',
        descriptionJa: '低価格ながら優れた貫通力を持つピストル。',
        icon: '🔫',
    },
    {
        id: 'five_seven', name: 'Five-SeveN', nameJa: 'Five-SeveN',
        category: 'pistol', slot: 'secondary', team: 'counter_terrorist',
        price: 500, killReward: 300,
        stats: {
            damage: 32, armorPenetration: 0.912, fireRate: 400,
            reloadTime: 2.20, magazineSize: 20, reserveAmmo: 100,
            moveSpeed: 240, range: 28, accuracy: 0.80, recoilControl: 0.75,
        },
        skinGrade: 'mil_spec', color: '#4169E1', glowColor: '#5C6BC0',
        description: 'High armor penetration pistol exclusive to CT side.',
        descriptionJa: 'CT側専用。高い装甲貫通力を持つピストル。',
        icon: '🔫',
    },
    {
        id: 'tec_9', name: 'Tec-9', nameJa: 'テック9',
        category: 'pistol', slot: 'secondary', team: 'terrorist',
        price: 500, killReward: 300,
        stats: {
            damage: 33, armorPenetration: 0.906, fireRate: 500,
            reloadTime: 2.30, magazineSize: 18, reserveAmmo: 90,
            moveSpeed: 240, range: 22, accuracy: 0.72, recoilControl: 0.68,
        },
        skinGrade: 'mil_spec', color: '#5C6BC0', glowColor: '#7986CB',
        description: 'High fire-rate T-side pistol. Effective in rushing strategies.',
        descriptionJa: 'T側専用高速ピストル。ラッシュ戦術に有効。',
        icon: '🔫',
    },
    {
        id: 'cz75_auto', name: 'CZ75-Auto', nameJa: 'CZ75オート',
        category: 'pistol', slot: 'secondary', team: 'both',
        price: 500, killReward: 100,
        stats: {
            damage: 33, armorPenetration: 0.776, fireRate: 600,
            reloadTime: 2.80, magazineSize: 12, reserveAmmo: 12,
            moveSpeed: 240, range: 21, accuracy: 0.70, recoilControl: 0.60,
        },
        skinGrade: 'mil_spec', color: '#7E57C2', glowColor: '#9575CD',
        description: 'Fully automatic pocket pistol. Deadly up close, low ammo reserve.',
        descriptionJa: 'フルオートポケットピストル。近距離で致命的だが弾薬は少ない。',
        icon: '🔫',
    },
    {
        id: 'desert_eagle', name: 'Desert Eagle', nameJa: 'デザートイーグル',
        category: 'pistol', slot: 'secondary', team: 'both',
        price: 700, killReward: 300,
        stats: {
            damage: 63, armorPenetration: 0.932, fireRate: 267,
            reloadTime: 2.20, magazineSize: 7, reserveAmmo: 35,
            moveSpeed: 230, range: 35, accuracy: 0.86, recoilControl: 0.45,
        },
        skinGrade: 'restricted', color: '#8847FF', glowColor: '#B388FF',
        description: 'Hand cannon capable of one-shot headshots. High skill ceiling.',
        descriptionJa: 'ハンドキャノン。ヘッドショット一撃の火力。高スキル武器。',
        icon: '🔫',
    },
    {
        id: 'r8_revolver', name: 'R8 Revolver', nameJa: 'R8リボルバー',
        category: 'pistol', slot: 'secondary', team: 'both',
        price: 600, killReward: 300,
        stats: {
            damage: 86, armorPenetration: 0.932, fireRate: 120,
            reloadTime: 2.30, magazineSize: 8, reserveAmmo: 8,
            moveSpeed: 220, range: 38, accuracy: 0.92, recoilControl: 0.35,
        },
        skinGrade: 'restricted', color: '#9575CD', glowColor: '#B39DDB',
        description: 'Devastating revolver with a trigger delay. Patience rewarded.',
        descriptionJa: '破壊的リボルバー。トリガー遅延あり。忍耐が報われる。',
        icon: '🔫',
    },

    // ── SMGs ─────────────────────────────────────────────────────────

    {
        id: 'mac_10', name: 'MAC-10', nameJa: 'MAC-10',
        category: 'smg', slot: 'primary', team: 'terrorist',
        price: 1050, killReward: 600,
        stats: {
            damage: 29, armorPenetration: 0.575, fireRate: 800,
            reloadTime: 3.14, magazineSize: 30, reserveAmmo: 100,
            moveSpeed: 240, range: 18, accuracy: 0.60, recoilControl: 0.55,
        },
        skinGrade: 'industrial', color: '#4DB6AC', glowColor: '#80CBC4',
        description: 'Cheap and fast T-side SMG. Excellent for anti-eco rounds.',
        descriptionJa: '低価格高速T側SMG。アンチエコラウンドに最適。',
        icon: '🔧',
    },
    {
        id: 'mp9', name: 'MP9', nameJa: 'MP9',
        category: 'smg', slot: 'primary', team: 'counter_terrorist',
        price: 1250, killReward: 600,
        stats: {
            damage: 26, armorPenetration: 0.60, fireRate: 857,
            reloadTime: 2.13, magazineSize: 30, reserveAmmo: 120,
            moveSpeed: 240, range: 18, accuracy: 0.65, recoilControl: 0.58,
        },
        skinGrade: 'industrial', color: '#4DD0E1', glowColor: '#80DEEA',
        description: 'High fire-rate CT-side SMG. Compact and effective.',
        descriptionJa: 'CT側高速SMG。コンパクトで効果的。',
        icon: '🔧',
    },
    {
        id: 'mp7', name: 'MP7', nameJa: 'MP7',
        category: 'smg', slot: 'primary', team: 'both',
        price: 1500, killReward: 600,
        stats: {
            damage: 29, armorPenetration: 0.625, fireRate: 750,
            reloadTime: 3.13, magazineSize: 30, reserveAmmo: 120,
            moveSpeed: 220, range: 20, accuracy: 0.70, recoilControl: 0.65,
        },
        skinGrade: 'mil_spec', color: '#4FC3F7', glowColor: '#81D4FA',
        description: 'Versatile SMG with good armor penetration for its class.',
        descriptionJa: '汎用SMG。クラス内で優れた装甲貫通力。',
        icon: '🔧',
    },
    {
        id: 'ump_45', name: 'UMP-45', nameJa: 'UMP-45',
        category: 'smg', slot: 'primary', team: 'both',
        price: 1200, killReward: 600,
        stats: {
            damage: 35, armorPenetration: 0.65, fireRate: 667,
            reloadTime: 3.50, magazineSize: 25, reserveAmmo: 100,
            moveSpeed: 230, range: 22, accuracy: 0.72, recoilControl: 0.70,
        },
        skinGrade: 'mil_spec', color: '#42A5F5', glowColor: '#64B5F6',
        description: 'Hard-hitting SMG. Best damage per bullet in its class.',
        descriptionJa: '高威力SMG。クラス内で最高の弾丸ダメージ。',
        icon: '🔧',
    },
    {
        id: 'p90', name: 'P90', nameJa: 'P90',
        category: 'smg', slot: 'primary', team: 'both',
        price: 2350, killReward: 300,
        stats: {
            damage: 26, armorPenetration: 0.69, fireRate: 857,
            reloadTime: 3.31, magazineSize: 50, reserveAmmo: 100,
            moveSpeed: 230, range: 21, accuracy: 0.68, recoilControl: 0.60,
        },
        skinGrade: 'restricted', color: '#AB47BC', glowColor: '#CE93D8',
        description: 'Premium SMG with a massive 50-round magazine. Run and gun.',
        descriptionJa: 'プレミアムSMG。50発大容量マガジン。走りながら撃て。',
        icon: '🔧',
    },
    {
        id: 'pp_bizon', name: 'PP-Bizon', nameJa: 'PP-Bizon',
        category: 'smg', slot: 'primary', team: 'both',
        price: 1400, killReward: 600,
        stats: {
            damage: 27, armorPenetration: 0.575, fireRate: 750,
            reloadTime: 2.43, magazineSize: 64, reserveAmmo: 120,
            moveSpeed: 240, range: 17, accuracy: 0.62, recoilControl: 0.58,
        },
        skinGrade: 'industrial', color: '#26A69A', glowColor: '#4DB6AC',
        description: 'Massive 64-round helical magazine. Low damage but overwhelming volume.',
        descriptionJa: '64発ヘリカルマガジン。低威力だが圧倒的な弾幕。',
        icon: '🔧',
    },
    {
        id: 'mp5_sd', name: 'MP5-SD', nameJa: 'MP5-SD',
        category: 'smg', slot: 'primary', team: 'both',
        price: 1500, killReward: 600,
        stats: {
            damage: 27, armorPenetration: 0.575, fireRate: 750,
            reloadTime: 3.13, magazineSize: 30, reserveAmmo: 120,
            moveSpeed: 235, range: 19, accuracy: 0.72, recoilControl: 0.70,
        },
        skinGrade: 'mil_spec', color: '#5C6BC0', glowColor: '#7986CB',
        description: 'Integrated suppressor SMG. Silent and accurate at mid-range.',
        descriptionJa: 'サプレッサー内蔵SMG。中距離で静かかつ正確。',
        icon: '🔧',
    },

    // ── Rifles ───────────────────────────────────────────────────────

    {
        id: 'galil_ar', name: 'Galil AR', nameJa: 'ガリル AR',
        category: 'rifle', slot: 'primary', team: 'terrorist',
        price: 1800, killReward: 300,
        stats: {
            damage: 30, armorPenetration: 0.775, fireRate: 667,
            reloadTime: 3.0, magazineSize: 35, reserveAmmo: 90,
            moveSpeed: 215, range: 40, accuracy: 0.74, recoilControl: 0.62,
        },
        skinGrade: 'mil_spec', color: '#66BB6A', glowColor: '#81C784',
        description: 'Budget T-side rifle. Reliable with a large magazine.',
        descriptionJa: '低価格T側ライフル。大容量マガジンで安定。',
        icon: '🎯',
    },
    {
        id: 'famas', name: 'FAMAS', nameJa: 'ファマス',
        category: 'rifle', slot: 'primary', team: 'counter_terrorist',
        price: 2050, killReward: 300,
        stats: {
            damage: 30, armorPenetration: 0.70, fireRate: 667,
            reloadTime: 3.30, magazineSize: 25, reserveAmmo: 90,
            moveSpeed: 220, range: 38, accuracy: 0.76, recoilControl: 0.65,
        },
        skinGrade: 'mil_spec', color: '#26C6DA', glowColor: '#4DD0E1',
        description: 'Budget CT-side rifle with a 3-round burst mode option.',
        descriptionJa: '低価格CT側ライフル。3点バーストモード搭載。',
        icon: '🎯',
    },
    {
        id: 'ak_47', name: 'AK-47', nameJa: 'AK-47',
        category: 'rifle', slot: 'primary', team: 'terrorist',
        price: 2700, killReward: 300,
        stats: {
            damage: 36, armorPenetration: 0.775, fireRate: 600,
            reloadTime: 2.50, magazineSize: 30, reserveAmmo: 90,
            moveSpeed: 215, range: 48, accuracy: 0.80, recoilControl: 0.55,
        },
        skinGrade: 'covert', color: '#EB4B4B', glowColor: '#FF6E6E',
        description: 'Iconic assault rifle. One-tap headshot potential at any range.',
        descriptionJa: '象徴的アサルトライフル。全距離でヘッドショット一撃の火力。',
        icon: '🎯',
    },
    {
        id: 'm4a4', name: 'M4A4', nameJa: 'M4A4',
        category: 'rifle', slot: 'primary', team: 'counter_terrorist',
        price: 3100, killReward: 300,
        stats: {
            damage: 33, armorPenetration: 0.70, fireRate: 667,
            reloadTime: 3.07, magazineSize: 30, reserveAmmo: 90,
            moveSpeed: 225, range: 45, accuracy: 0.82, recoilControl: 0.62,
        },
        skinGrade: 'covert', color: '#EF5350', glowColor: '#EF9A9A',
        description: 'CT-side workhorse rifle. Balanced accuracy and fire rate.',
        descriptionJa: 'CT側主力ライフル。精度と連射速度のバランスが良い。',
        icon: '🎯',
    },
    {
        id: 'm4a1_s', name: 'M4A1-S', nameJa: 'M4A1-S',
        category: 'rifle', slot: 'primary', team: 'counter_terrorist',
        price: 2900, killReward: 300,
        stats: {
            damage: 38, armorPenetration: 0.70, fireRate: 600,
            reloadTime: 3.07, magazineSize: 20, reserveAmmo: 40,
            moveSpeed: 225, range: 46, accuracy: 0.88, recoilControl: 0.72,
        },
        skinGrade: 'covert', color: '#E53935', glowColor: '#EF5350',
        description: 'Silenced CT rifle. Superior accuracy with reduced magazine size.',
        descriptionJa: 'サイレンサー付きCTライフル。高精度だがマガジンは小さい。',
        icon: '🎯',
    },
    {
        id: 'sg_553', name: 'SG 553', nameJa: 'SG 553',
        category: 'rifle', slot: 'primary', team: 'terrorist',
        price: 3000, killReward: 300,
        stats: {
            damage: 30, armorPenetration: 1.0, fireRate: 667,
            reloadTime: 2.80, magazineSize: 30, reserveAmmo: 90,
            moveSpeed: 210, range: 52, accuracy: 0.85, recoilControl: 0.58,
        },
        skinGrade: 'classified', color: '#D32CE6', glowColor: '#E040FB',
        description: 'Scoped T-side rifle with full armor penetration.',
        descriptionJa: 'スコープ付きT側ライフル。完全な装甲貫通力。',
        icon: '🎯',
    },
    {
        id: 'aug', name: 'AUG', nameJa: 'AUG',
        category: 'rifle', slot: 'primary', team: 'counter_terrorist',
        price: 3300, killReward: 300,
        stats: {
            damage: 28, armorPenetration: 0.90, fireRate: 667,
            reloadTime: 3.80, magazineSize: 30, reserveAmmo: 90,
            moveSpeed: 220, range: 50, accuracy: 0.86, recoilControl: 0.64,
        },
        skinGrade: 'classified', color: '#E040FB', glowColor: '#EA80FC',
        description: 'Scoped CT-side rifle. Precision optics for long-range engagements.',
        descriptionJa: 'スコープ付きCT側ライフル。遠距離戦用精密照準器。',
        icon: '🎯',
    },
    {
        id: 'ssg_08', name: 'SSG 08', nameJa: 'SSG 08',
        category: 'rifle', slot: 'primary', team: 'both',
        price: 1700, killReward: 300,
        stats: {
            damage: 88, armorPenetration: 0.85, fireRate: 48,
            reloadTime: 3.70, magazineSize: 10, reserveAmmo: 90,
            moveSpeed: 230, range: 70, accuracy: 0.95, recoilControl: 0.50,
        },
        skinGrade: 'restricted', color: '#7C4DFF', glowColor: '#B388FF',
        description: 'Budget bolt-action scout rifle. Lethal headshots while mobile.',
        descriptionJa: '低価格ボルトアクションスカウト。移動中でも致命的なヘッドショット。',
        icon: '🎯',
    },
    {
        id: 'awp', name: 'AWP', nameJa: 'AWP',
        category: 'rifle', slot: 'primary', team: 'both',
        price: 4750, killReward: 100,
        stats: {
            damage: 115, armorPenetration: 0.975, fireRate: 41,
            reloadTime: 3.67, magazineSize: 5, reserveAmmo: 30,
            moveSpeed: 200, range: 90, accuracy: 0.98, recoilControl: 0.30,
        },
        skinGrade: 'contraband', color: '#E4AE39', glowColor: '#FFD54F',
        description: 'The legendary one-shot sniper. Dominates with a single bullet.',
        descriptionJa: '伝説的ワンショットスナイパー。一発で戦場を支配する。',
        icon: '🎯',
    },
    {
        id: 'scar_20', name: 'SCAR-20', nameJa: 'SCAR-20',
        category: 'rifle', slot: 'primary', team: 'counter_terrorist',
        price: 5000, killReward: 300,
        stats: {
            damage: 80, armorPenetration: 0.825, fireRate: 240,
            reloadTime: 3.10, magazineSize: 20, reserveAmmo: 90,
            moveSpeed: 215, range: 80, accuracy: 0.90, recoilControl: 0.40,
        },
        skinGrade: 'classified', color: '#F06292', glowColor: '#F48FB1',
        description: 'CT semi-auto sniper. Rapid follow-up shots at extreme range.',
        descriptionJa: 'CTセミオートスナイパー。超遠距離で素早い追撃射撃。',
        icon: '🎯',
    },
    {
        id: 'g3sg1', name: 'G3SG1', nameJa: 'G3SG1',
        category: 'rifle', slot: 'primary', team: 'terrorist',
        price: 5000, killReward: 300,
        stats: {
            damage: 80, armorPenetration: 0.825, fireRate: 240,
            reloadTime: 4.70, magazineSize: 20, reserveAmmo: 90,
            moveSpeed: 215, range: 80, accuracy: 0.90, recoilControl: 0.38,
        },
        skinGrade: 'classified', color: '#EC407A', glowColor: '#F06292',
        description: 'T-side semi-auto sniper. Sustained fire at long range.',
        descriptionJa: 'T側セミオートスナイパー。遠距離での持続射撃。',
        icon: '🎯',
    },

    // ── Heavy ────────────────────────────────────────────────────────

    {
        id: 'nova', name: 'Nova', nameJa: 'ノヴァ',
        category: 'heavy', slot: 'primary', team: 'both',
        price: 1050, killReward: 900,
        stats: {
            damage: 26, armorPenetration: 0.50, fireRate: 68,
            reloadTime: 0.55, magazineSize: 8, reserveAmmo: 32,
            moveSpeed: 220, range: 12, accuracy: 0.60, recoilControl: 0.45,
        },
        skinGrade: 'industrial', color: '#8D6E63', glowColor: '#BCAAA4',
        description: 'Budget pump-action shotgun. Huge kill reward compensates.',
        descriptionJa: '低価格ポンプアクションショットガン。高額キル報酬。',
        icon: '💥',
    },
    {
        id: 'xm1014', name: 'XM1014', nameJa: 'XM1014',
        category: 'heavy', slot: 'primary', team: 'both',
        price: 2000, killReward: 900,
        stats: {
            damage: 20, armorPenetration: 0.50, fireRate: 171,
            reloadTime: 0.50, magazineSize: 7, reserveAmmo: 32,
            moveSpeed: 215, range: 14, accuracy: 0.55, recoilControl: 0.50,
        },
        skinGrade: 'mil_spec', color: '#A1887F', glowColor: '#BCAAA4',
        description: 'Semi-auto shotgun. Rapid close-range devastation.',
        descriptionJa: 'セミオートショットガン。近距離での高速連射。',
        icon: '💥',
    },
    {
        id: 'mag_7', name: 'MAG-7', nameJa: 'MAG-7',
        category: 'heavy', slot: 'primary', team: 'counter_terrorist',
        price: 1300, killReward: 900,
        stats: {
            damage: 30, armorPenetration: 0.75, fireRate: 71,
            reloadTime: 0.55, magazineSize: 5, reserveAmmo: 32,
            moveSpeed: 225, range: 11, accuracy: 0.58, recoilControl: 0.48,
        },
        skinGrade: 'mil_spec', color: '#795548', glowColor: '#A1887F',
        description: 'CT magazine-fed shotgun. One-shot potential at point blank.',
        descriptionJa: 'CTマガジン式ショットガン。至近距離で一撃必殺の可能性。',
        icon: '💥',
    },
    {
        id: 'sawed_off', name: 'Sawed-Off', nameJa: 'ソードオフ',
        category: 'heavy', slot: 'primary', team: 'terrorist',
        price: 1100, killReward: 900,
        stats: {
            damage: 32, armorPenetration: 0.75, fireRate: 68,
            reloadTime: 0.55, magazineSize: 7, reserveAmmo: 32,
            moveSpeed: 210, range: 8, accuracy: 0.50, recoilControl: 0.40,
        },
        skinGrade: 'industrial', color: '#6D4C41', glowColor: '#8D6E63',
        description: 'T-side sawed-off shotgun. Extreme close-range power.',
        descriptionJa: 'T側ソードオフショットガン。超近距離の破壊力。',
        icon: '💥',
    },
    {
        id: 'm249', name: 'M249', nameJa: 'M249',
        category: 'heavy', slot: 'primary', team: 'both',
        price: 5200, killReward: 300,
        stats: {
            damage: 32, armorPenetration: 0.80, fireRate: 750,
            reloadTime: 5.70, magazineSize: 100, reserveAmmo: 200,
            moveSpeed: 195, range: 35, accuracy: 0.68, recoilControl: 0.45,
        },
        skinGrade: 'restricted', color: '#FF8A65', glowColor: '#FFAB91',
        description: 'Belt-fed light machine gun. 100 rounds of suppressive fire.',
        descriptionJa: 'ベルト給弾式軽機関銃。100発の制圧射撃。',
        icon: '💥',
    },
    {
        id: 'negev', name: 'Negev', nameJa: 'ネゲヴ',
        category: 'heavy', slot: 'primary', team: 'both',
        price: 1700, killReward: 300,
        stats: {
            damage: 35, armorPenetration: 0.75, fireRate: 1000,
            reloadTime: 5.70, magazineSize: 150, reserveAmmo: 300,
            moveSpeed: 150, range: 30, accuracy: 0.40, recoilControl: 0.25,
        },
        skinGrade: 'restricted', color: '#FF7043', glowColor: '#FF8A65',
        description: 'Ultra-high fire rate LMG. Becomes a laser beam after the initial burst.',
        descriptionJa: '超高速連射LMG。初弾後はレーザービームのような精度に。',
        icon: '💥',
    },

    // ── Equipment ────────────────────────────────────────────────────

    {
        id: 'knife', name: 'Knife', nameJa: 'ナイフ',
        category: 'equipment', slot: 'melee', team: 'both',
        price: 0, killReward: 1500,
        stats: {
            damage: 40, armorPenetration: 0.85, fireRate: 120,
            reloadTime: 0, magazineSize: 0, reserveAmmo: 0,
            moveSpeed: 250, range: 2, accuracy: 1.0, recoilControl: 1.0,
        },
        skinGrade: 'contraband', color: '#FFD54F', glowColor: '#FFF176',
        description: 'Always available melee weapon. Humiliating and rewarding.',
        descriptionJa: '常時装備の近接武器。屈辱的だが高報酬。',
        icon: '🗡️',
    },
    {
        id: 'zeus_x27', name: 'Zeus x27', nameJa: 'ゼウス x27',
        category: 'equipment', slot: 'melee', team: 'both',
        price: 200, killReward: 0,
        stats: {
            damage: 195, armorPenetration: 1.0, fireRate: 0,
            reloadTime: 0, magazineSize: 1, reserveAmmo: 0,
            moveSpeed: 220, range: 3, accuracy: 1.0, recoilControl: 1.0,
        },
        skinGrade: 'mil_spec', color: '#29B6F6', glowColor: '#4FC3F7',
        description: 'One-use taser. Guaranteed kill on contact. Maximum disrespect.',
        descriptionJa: '使い捨てテーザー。接触で確定キル。最大の侮辱。',
        icon: '⚡',
    },
    {
        id: 'he_grenade', name: 'HE Grenade', nameJa: 'HEグレネード',
        category: 'equipment', slot: 'grenade', team: 'both',
        price: 300, killReward: 300,
        stats: {
            damage: 98, armorPenetration: 0.575, fireRate: 0,
            reloadTime: 0, magazineSize: 1, reserveAmmo: 0,
            moveSpeed: 245, range: 15, accuracy: 1.0, recoilControl: 1.0,
        },
        skinGrade: 'consumer', color: '#FF5252', glowColor: '#FF8A80',
        description: 'Explosive fragmentation grenade. Area damage on detonation.',
        descriptionJa: '破片榴弾。爆発時に範囲ダメージ。',
        icon: '💣',
    },
    {
        id: 'flashbang', name: 'Flashbang', nameJa: 'フラッシュバン',
        category: 'equipment', slot: 'grenade', team: 'both',
        price: 200, killReward: 0,
        stats: {
            damage: 0, armorPenetration: 0, fireRate: 0,
            reloadTime: 0, magazineSize: 1, reserveAmmo: 1,
            moveSpeed: 245, range: 15, accuracy: 1.0, recoilControl: 1.0,
        },
        skinGrade: 'consumer', color: '#FFFFFF', glowColor: '#FFF9C4',
        description: 'Blinds and deafens enemies caught in its radius.',
        descriptionJa: '範囲内の敵を閃光で盲目にし耳を聞こえなくする。',
        icon: '💫',
    },
    {
        id: 'smoke_grenade', name: 'Smoke Grenade', nameJa: 'スモークグレネード',
        category: 'equipment', slot: 'grenade', team: 'both',
        price: 300, killReward: 0,
        stats: {
            damage: 0, armorPenetration: 0, fireRate: 0,
            reloadTime: 0, magazineSize: 1, reserveAmmo: 0,
            moveSpeed: 245, range: 20, accuracy: 1.0, recoilControl: 1.0,
        },
        skinGrade: 'consumer', color: '#B0BEC5', glowColor: '#CFD8DC',
        description: 'Deploys a 18-second smoke screen. Blocks line of sight.',
        descriptionJa: '18秒間のスモークスクリーンを展開。視線を遮断する。',
        icon: '🌫️',
    },
    {
        id: 'molotov', name: 'Molotov', nameJa: 'モロトフ',
        category: 'equipment', slot: 'grenade', team: 'terrorist',
        price: 400, killReward: 300,
        stats: {
            damage: 40, armorPenetration: 1.0, fireRate: 0,
            reloadTime: 0, magazineSize: 1, reserveAmmo: 0,
            moveSpeed: 245, range: 18, accuracy: 1.0, recoilControl: 1.0,
        },
        skinGrade: 'industrial', color: '#FF6E40', glowColor: '#FF9E80',
        description: 'T-side incendiary that creates a fire zone denying area access.',
        descriptionJa: 'T側焼夷弾。炎のゾーンで侵入を阻止する。',
        icon: '🔥',
    },
    {
        id: 'incendiary_grenade', name: 'Incendiary Grenade', nameJa: 'インセンディアリーグレネード',
        category: 'equipment', slot: 'grenade', team: 'counter_terrorist',
        price: 600, killReward: 300,
        stats: {
            damage: 40, armorPenetration: 1.0, fireRate: 0,
            reloadTime: 0, magazineSize: 1, reserveAmmo: 0,
            moveSpeed: 245, range: 18, accuracy: 1.0, recoilControl: 1.0,
        },
        skinGrade: 'industrial', color: '#FF3D00', glowColor: '#FF6E40',
        description: 'CT-side incendiary grenade. Area denial through fire.',
        descriptionJa: 'CT側焼夷グレネード。炎によるエリア制圧。',
        icon: '🔥',
    },
    {
        id: 'decoy', name: 'Decoy Grenade', nameJa: 'デコイグレネード',
        category: 'equipment', slot: 'grenade', team: 'both',
        price: 50, killReward: 300,
        stats: {
            damage: 1, armorPenetration: 0, fireRate: 0,
            reloadTime: 0, magazineSize: 1, reserveAmmo: 0,
            moveSpeed: 245, range: 15, accuracy: 1.0, recoilControl: 1.0,
        },
        skinGrade: 'consumer', color: '#A5D6A7', glowColor: '#C8E6C9',
        description: 'Emulates gunfire sounds to distract enemies. Cheap and sneaky.',
        descriptionJa: '銃声を模擬して敵を撹乱する。安くて狡猾。',
        icon: '🎭',
    },
];

// ===== Registry Lookups =====

/** All weapon definitions indexed by ID. */
export const CSGO_WEAPON_REGISTRY: Record<string, CsgoWeaponDefinition> = Object.fromEntries(
    WEAPONS.map(weapon => [weapon.id, weapon])
);

/** Get a weapon definition by ID, or undefined if not found. */
export function getCsgoWeapon(id: string): CsgoWeaponDefinition | undefined {
    return CSGO_WEAPON_REGISTRY[id];
}

/** All weapons grouped by category. */
export const WEAPONS_BY_CATEGORY: Record<CsgoWeaponCategory, CsgoWeaponDefinition[]> = {
    pistol: WEAPONS.filter(w => w.category === 'pistol'),
    smg: WEAPONS.filter(w => w.category === 'smg'),
    rifle: WEAPONS.filter(w => w.category === 'rifle'),
    heavy: WEAPONS.filter(w => w.category === 'heavy'),
    equipment: WEAPONS.filter(w => w.category === 'equipment'),
};

/** All weapons as a flat array. */
export const ALL_CSGO_WEAPONS = WEAPONS;

/** Weapons available for a given team. */
export function getWeaponsForTeam(team: 'terrorist' | 'counter_terrorist'): CsgoWeaponDefinition[] {
    return WEAPONS.filter(w => w.team === 'both' || w.team === team);
}

/** Buy menu sections in order. */
export const BUY_MENU_SECTIONS: CsgoBuyMenuSection[] = [
    {
        category: 'pistol',
        label: 'Pistols',
        labelJa: 'ピストル',
        weapons: WEAPONS_BY_CATEGORY.pistol.map(w => w.id),
    },
    {
        category: 'heavy',
        label: 'Heavy',
        labelJa: 'ヘビー',
        weapons: WEAPONS_BY_CATEGORY.heavy.map(w => w.id),
    },
    {
        category: 'smg',
        label: 'SMGs',
        labelJa: 'サブマシンガン',
        weapons: WEAPONS_BY_CATEGORY.smg.map(w => w.id),
    },
    {
        category: 'rifle',
        label: 'Rifles',
        labelJa: 'ライフル',
        weapons: WEAPONS_BY_CATEGORY.rifle.map(w => w.id),
    },
    {
        category: 'equipment',
        label: 'Equipment',
        labelJa: '装備',
        weapons: WEAPONS_BY_CATEGORY.equipment.map(w => w.id),
    },
];
