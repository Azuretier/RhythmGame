// =============================================================================
// Minecraft Switch Advancements — Achievement Definitions & Checks
// Minecraft: Nintendo Switch Edition Clone
// =============================================================================
// Defines all Minecraft-style advancements organized by tab (story, nether,
// end, adventure, husbandry). Each advancement has criteria checks that
// evaluate against game state. Extends the existing advancement system
// patterns from @/lib/advancements.
// =============================================================================

import type {
  AdvancementCategory,
  AdvancementDefinition,
  PlayerState,
  PlayerInventory,
  InventorySlot,
  BlockId,
  Block,
} from '@/types/minecraft-switch';

// =============================================================================
// Game State for Advancement Checking
// =============================================================================

/**
 * Snapshot of relevant game state used for advancement evaluation.
 * Passed into checkAdvancement() to determine if criteria are met.
 */
export interface AdvancementGameState {
  /** Current player state. */
  player: PlayerState;
  /** Set of block types the player has mined this session. */
  blocksMined: Set<number>;
  /** Set of item IDs the player has crafted this session. */
  itemsCrafted: Set<string>;
  /** Set of item IDs the player has smelted. */
  itemsSmelted: Set<string>;
  /** Set of mob types killed. */
  mobsKilled: Set<string>;
  /** Set of mob types tamed. */
  mobsTamed: Set<string>;
  /** Set of mob types bred. */
  mobsBred: Set<string>;
  /** Set of food item IDs eaten. */
  foodEaten: Set<string>;
  /** Set of biome types visited. */
  biomesVisited: Set<string>;
  /** Whether a raid has been survived. */
  raidSurvived: boolean;
  /** Whether a projectile has been blocked with a shield. */
  projectileBlocked: boolean;
  /** Whether obsidian has been created (water + lava). */
  obsidianCreated: boolean;
  /** Whether a ghast was killed by its own fireball. */
  ghastReflected: boolean;
  /** Whether a nether fortress has been entered. */
  netherFortressEntered: boolean;
  /** Whether an end city has been found. */
  endCityFound: boolean;
  /** Whether the dragon egg has been collected. */
  dragonEggCollected: boolean;
  /** Whether the ender dragon has been killed. */
  enderDragonKilled: boolean;
  /** Farthest skeleton snipe distance (in blocks). */
  farthestSkeletonKill: number;
  /** Whether a ghast was rescued from the Nether (brought to overworld). */
  ghastRescued: boolean;
  /** Whether a diamond hoe has been fully used up. */
  diamondHoeUsedUp: boolean;
  /** Whether a fish has been caught. */
  fishCaught: boolean;
  /** Set of items in player's inventory (item IDs). */
  inventoryItems: Set<string>;
  /** Distance traveled by minecart in blocks. */
  minecartDistance: number;
  /** Whether the player has hit the center of a target block. */
  targetBlockHitCenter: boolean;
  /** Whether the player has planted a seed. */
  seedPlanted: boolean;
  /** Whether the Ender Dragon has been respawned. */
  dragonRespawned: boolean;
  /** Whether the player has escaped the End island. */
  endIslandEscaped: boolean;
  /** Whether the Wither has been summoned. */
  witherSummoned: boolean;
  /** Whether a beacon has been brought to full power. */
  beaconFullPower: boolean;
}

// =============================================================================
// Log Block IDs — convenience set for "Getting Wood" check
// =============================================================================

const LOG_BLOCK_IDS = new Set<number>([40, 50, 60, 70, 80, 90]); // OakLog=40, SpruceLog=50, BirchLog=60, JungleLog=70, AcaciaLog=80, DarkOakLog=90

const IRON_ARMOR_IDS = new Set(['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots']);
const DIAMOND_ARMOR_IDS = new Set(['diamond_helmet', 'diamond_chestplate', 'diamond_leggings', 'diamond_boots']);

const ALL_BIOMES = new Set([
  'plains', 'sunflower_plains', 'forest', 'flower_forest', 'birch_forest',
  'dark_forest', 'taiga', 'old_growth_pine_taiga', 'old_growth_spruce_taiga',
  'jungle', 'sparse_jungle', 'bamboo_jungle', 'savanna', 'savanna_plateau',
  'desert', 'swamp', 'mangrove_swamp', 'beach', 'stony_shore',
  'meadow', 'grove', 'snowy_slopes', 'frozen_peaks', 'jagged_peaks', 'stony_peaks',
  'river', 'frozen_river', 'ocean', 'deep_ocean', 'warm_ocean', 'lukewarm_ocean',
  'cold_ocean', 'frozen_ocean', 'deep_frozen_ocean', 'mushroom_fields',
  'badlands', 'eroded_badlands', 'wooded_badlands',
  'snowy_plains', 'ice_spikes',
]);

const ALL_FOOD_TYPES = new Set([
  'apple', 'golden_apple', 'enchanted_golden_apple', 'baked_potato', 'beetroot',
  'beetroot_soup', 'bread', 'cake', 'carrot', 'golden_carrot', 'chorus_fruit',
  'cooked_beef', 'cooked_chicken', 'cooked_cod', 'cooked_mutton', 'cooked_porkchop',
  'cooked_rabbit', 'cooked_salmon', 'cookie', 'dried_kelp', 'honey_bottle',
  'melon_slice', 'mushroom_stew', 'poisonous_potato', 'potato', 'pufferfish',
  'pumpkin_pie', 'rabbit_stew', 'raw_beef', 'raw_chicken', 'raw_cod', 'raw_mutton',
  'raw_porkchop', 'raw_rabbit', 'raw_salmon', 'rotten_flesh', 'spider_eye',
  'suspicious_stew', 'sweet_berries', 'tropical_fish',
]);

const ALL_BREEDABLE_MOBS = new Set([
  'cow', 'sheep', 'pig', 'chicken', 'rabbit', 'horse', 'donkey',
  'wolf', 'cat', 'fox', 'bee', 'turtle', 'panda', 'llama',
]);

// =============================================================================
// Advancement Definitions
// =============================================================================

export const MC_ADVANCEMENTS: AdvancementDefinition[] = [
  // =========================================================================
  // STORY TAB — Main progression
  // =========================================================================
  {
    id: 'mc_getting_wood',
    name: 'Getting Wood',
    nameJa: '木を手に入れよう',
    description: 'Mine a log',
    descriptionJa: '原木を手に入れる',
    category: 'story',
    parent: null,
    icon: 'oak_log',
    frame: 'task',
    criteria: { mine_log: { type: 'mine_block', conditions: { blockGroup: 'logs' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_getting_an_upgrade',
    name: 'Getting an Upgrade',
    nameJa: 'さらなる進化',
    description: 'Craft a stone pickaxe',
    descriptionJa: '石のツルハシをクラフトする',
    category: 'story',
    parent: 'mc_getting_wood',
    icon: 'stone_pickaxe',
    frame: 'task',
    criteria: { craft: { type: 'craft_item', conditions: { item: 'stone_pickaxe' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_acquire_hardware',
    name: 'Acquire Hardware',
    nameJa: '鉄のツルハシ入手',
    description: 'Smelt an iron ingot',
    descriptionJa: '鉄インゴットを精錬する',
    category: 'story',
    parent: 'mc_getting_an_upgrade',
    icon: 'iron_ingot',
    frame: 'task',
    criteria: { smelt: { type: 'smelt_item', conditions: { item: 'iron_ingot' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_suit_up',
    name: 'Suit Up',
    nameJa: '装備せよ',
    description: 'Craft any piece of iron armor',
    descriptionJa: '鉄の防具をクラフトする',
    category: 'story',
    parent: 'mc_acquire_hardware',
    icon: 'iron_chestplate',
    frame: 'task',
    criteria: { craft: { type: 'craft_item', conditions: { itemGroup: 'iron_armor' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_hot_stuff',
    name: 'Hot Stuff',
    nameJa: 'ホットスタッフ',
    description: 'Fill a bucket with lava',
    descriptionJa: 'バケツに溶岩を入れる',
    category: 'story',
    parent: 'mc_acquire_hardware',
    icon: 'lava_bucket',
    frame: 'task',
    criteria: { fill: { type: 'obtain_item', conditions: { item: 'lava_bucket' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_isnt_it_iron_pick',
    name: "Isn't It Iron Pick",
    nameJa: '鉄のツルハシじゃないの？',
    description: 'Craft an iron pickaxe',
    descriptionJa: '鉄のツルハシをクラフトする',
    category: 'story',
    parent: 'mc_acquire_hardware',
    icon: 'iron_pickaxe',
    frame: 'task',
    criteria: { craft: { type: 'craft_item', conditions: { item: 'iron_pickaxe' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_not_today_thank_you',
    name: 'Not Today, Thank You',
    nameJa: '今日はやめておきます',
    description: 'Block a projectile with a shield',
    descriptionJa: '盾で飛び道具を防ぐ',
    category: 'story',
    parent: 'mc_suit_up',
    icon: 'shield',
    frame: 'task',
    criteria: { block: { type: 'block_projectile', conditions: {} } },
    requireAll: true,
    experienceReward: 20,
    itemRewards: [],
  },
  {
    id: 'mc_diamonds',
    name: 'Diamonds!',
    nameJa: 'ダイヤモンド！',
    description: 'Acquire a diamond',
    descriptionJa: 'ダイヤモンドを手に入れる',
    category: 'story',
    parent: 'mc_isnt_it_iron_pick',
    icon: 'diamond',
    frame: 'task',
    criteria: { obtain: { type: 'obtain_item', conditions: { item: 'diamond' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_ice_bucket_challenge',
    name: 'Ice Bucket Challenge',
    nameJa: 'アイスバケツチャレンジ',
    description: 'Create obsidian by pouring water on lava',
    descriptionJa: '溶岩に水をかけて黒曜石を作る',
    category: 'story',
    parent: 'mc_hot_stuff',
    icon: 'obsidian',
    frame: 'task',
    criteria: { create: { type: 'create_obsidian', conditions: {} } },
    requireAll: true,
    experienceReward: 20,
    itemRewards: [],
  },
  {
    id: 'mc_we_need_to_go_deeper',
    name: 'We Need to Go Deeper',
    nameJa: 'さらに奥へ',
    description: 'Enter the Nether',
    descriptionJa: 'ネザーに入る',
    category: 'story',
    parent: 'mc_ice_bucket_challenge',
    icon: 'obsidian',
    frame: 'task',
    criteria: { enter: { type: 'enter_dimension', conditions: { dimension: 'nether' } } },
    requireAll: true,
    experienceReward: 30,
    itemRewards: [],
  },
  {
    id: 'mc_cover_me_with_diamonds',
    name: 'Cover Me With Diamonds',
    nameJa: 'ダイヤモンドで私を覆って',
    description: 'Craft a full set of diamond armor',
    descriptionJa: 'ダイヤモンドの防具一式をクラフトする',
    category: 'story',
    parent: 'mc_diamonds',
    icon: 'diamond_chestplate',
    frame: 'goal',
    criteria: {
      helmet: { type: 'craft_item', conditions: { item: 'diamond_helmet' } },
      chestplate: { type: 'craft_item', conditions: { item: 'diamond_chestplate' } },
      leggings: { type: 'craft_item', conditions: { item: 'diamond_leggings' } },
      boots: { type: 'craft_item', conditions: { item: 'diamond_boots' } },
    },
    requireAll: true,
    experienceReward: 50,
    itemRewards: [],
  },
  {
    id: 'mc_enchanter',
    name: 'Enchanter',
    nameJa: 'エンチャンター',
    description: 'Enchant an item',
    descriptionJa: 'アイテムにエンチャントする',
    category: 'story',
    parent: 'mc_diamonds',
    icon: 'enchanting_table',
    frame: 'task',
    criteria: { enchant: { type: 'enchant_item', conditions: {} } },
    requireAll: true,
    experienceReward: 20,
    itemRewards: [],
  },

  // =========================================================================
  // NETHER TAB
  // =========================================================================
  {
    id: 'mc_return_to_sender',
    name: 'Return to Sender',
    nameJa: '差出人に返送',
    description: 'Kill a ghast with its own fireball',
    descriptionJa: 'ガストを自身の火の玉で倒す',
    category: 'nether',
    parent: null,
    icon: 'fire_charge',
    frame: 'challenge',
    criteria: { reflect: { type: 'ghast_reflect_kill', conditions: {} } },
    requireAll: true,
    experienceReward: 50,
    itemRewards: [],
  },
  {
    id: 'mc_into_fire',
    name: 'Into Fire',
    nameJa: '炎の中へ',
    description: 'Collect a blaze rod',
    descriptionJa: 'ブレイズロッドを手に入れる',
    category: 'nether',
    parent: null,
    icon: 'blaze_rod',
    frame: 'task',
    criteria: { obtain: { type: 'obtain_item', conditions: { item: 'blaze_rod' } } },
    requireAll: true,
    experienceReward: 20,
    itemRewards: [],
  },
  {
    id: 'mc_a_terrible_fortress',
    name: 'A Terrible Fortress',
    nameJa: '恐ろしい要塞',
    description: 'Enter a nether fortress',
    descriptionJa: 'ネザー要塞に入る',
    category: 'nether',
    parent: null,
    icon: 'nether_bricks',
    frame: 'task',
    criteria: { enter: { type: 'enter_structure', conditions: { structure: 'nether_fortress' } } },
    requireAll: true,
    experienceReward: 30,
    itemRewards: [],
  },
  {
    id: 'mc_uneasy_alliance',
    name: 'Uneasy Alliance',
    nameJa: '不安な同盟',
    description: 'Rescue a ghast from the Nether and bring it safely home',
    descriptionJa: 'ネザーからガストを救出してオーバーワールドに連れ帰る',
    category: 'nether',
    parent: 'mc_return_to_sender',
    icon: 'ghast_tear',
    frame: 'challenge',
    criteria: { rescue: { type: 'ghast_rescue', conditions: {} } },
    requireAll: true,
    experienceReward: 100,
    itemRewards: [{ item: 'ghast_tear', count: 1 }],
  },

  // =========================================================================
  // END TAB
  // =========================================================================
  {
    id: 'mc_the_end_question',
    name: 'The End?',
    nameJa: 'おしまい？',
    description: 'Enter the End',
    descriptionJa: 'エンドに入る',
    category: 'end',
    parent: null,
    icon: 'ender_pearl',
    frame: 'task',
    criteria: { enter: { type: 'enter_dimension', conditions: { dimension: 'the_end' } } },
    requireAll: true,
    experienceReward: 30,
    itemRewards: [],
  },
  {
    id: 'mc_the_end_period',
    name: 'The End.',
    nameJa: 'おしまい。',
    description: 'Kill the Ender Dragon',
    descriptionJa: 'エンダードラゴンを倒す',
    category: 'end',
    parent: 'mc_the_end_question',
    icon: 'dragon_head',
    frame: 'goal',
    criteria: { kill: { type: 'kill_mob', conditions: { mob: 'ender_dragon' } } },
    requireAll: true,
    experienceReward: 100,
    itemRewards: [],
  },
  {
    id: 'mc_free_the_end',
    name: 'Free the End',
    nameJa: 'エンドの解放',
    description: 'Explore and find an end city',
    descriptionJa: 'エンドシティを探索して見つける',
    category: 'end',
    parent: 'mc_the_end_period',
    icon: 'purpur_block',
    frame: 'goal',
    criteria: { find: { type: 'enter_structure', conditions: { structure: 'end_city' } } },
    requireAll: true,
    experienceReward: 50,
    itemRewards: [],
  },
  {
    id: 'mc_the_next_generation',
    name: 'The Next Generation',
    nameJa: '次の世代',
    description: 'Collect the dragon egg',
    descriptionJa: 'ドラゴンの卵を手に入れる',
    category: 'end',
    parent: 'mc_the_end_period',
    icon: 'dragon_egg',
    frame: 'goal',
    criteria: { collect: { type: 'obtain_item', conditions: { item: 'dragon_egg' } } },
    requireAll: true,
    experienceReward: 100,
    itemRewards: [],
  },

  // =========================================================================
  // ADVENTURE TAB
  // =========================================================================
  {
    id: 'mc_monster_hunter',
    name: 'Monster Hunter',
    nameJa: 'モンスターハンター',
    description: 'Kill any hostile mob',
    descriptionJa: '敵対Mobを1体倒す',
    category: 'adventure',
    parent: null,
    icon: 'iron_sword',
    frame: 'task',
    criteria: { kill: { type: 'kill_hostile', conditions: {} } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_sniper_duel',
    name: 'Sniper Duel',
    nameJa: 'スナイパー対決',
    description: 'Kill a skeleton from 50+ blocks away',
    descriptionJa: '50ブロック以上離れたスケルトンを倒す',
    category: 'adventure',
    parent: 'mc_monster_hunter',
    icon: 'bow',
    frame: 'challenge',
    criteria: { snipe: { type: 'kill_at_distance', conditions: { mob: 'skeleton', minDistance: 50 } } },
    requireAll: true,
    experienceReward: 50,
    itemRewards: [],
  },
  {
    id: 'mc_adventuring_time',
    name: 'Adventuring Time',
    nameJa: '冒険の時間',
    description: 'Visit all overworld biomes',
    descriptionJa: 'すべてのオーバーワールドバイオームを訪れる',
    category: 'adventure',
    parent: 'mc_monster_hunter',
    icon: 'diamond_boots',
    frame: 'challenge',
    criteria: { visit: { type: 'visit_all_biomes', conditions: {} } },
    requireAll: true,
    experienceReward: 100,
    itemRewards: [],
  },
  {
    id: 'mc_hero_of_the_village',
    name: 'Hero of the Village',
    nameJa: '村の英雄',
    description: 'Survive a raid',
    descriptionJa: '襲撃を生き延びる',
    category: 'adventure',
    parent: 'mc_monster_hunter',
    icon: 'emerald',
    frame: 'goal',
    criteria: { survive: { type: 'survive_raid', conditions: {} } },
    requireAll: true,
    experienceReward: 50,
    itemRewards: [{ item: 'emerald', count: 8 }],
  },

  // =========================================================================
  // HUSBANDRY TAB
  // =========================================================================
  {
    id: 'mc_the_parrots_and_the_bats',
    name: 'The Parrots and the Bats',
    nameJa: 'オウムとコウモリ',
    description: 'Tame an animal',
    descriptionJa: '動物を手懐ける',
    category: 'husbandry',
    parent: null,
    icon: 'wheat',
    frame: 'task',
    criteria: { tame: { type: 'tame_animal', conditions: {} } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_best_friends_forever',
    name: 'Best Friends Forever',
    nameJa: '永遠の親友',
    description: 'Tame a wolf',
    descriptionJa: 'オオカミを手懐ける',
    category: 'husbandry',
    parent: 'mc_the_parrots_and_the_bats',
    icon: 'bone',
    frame: 'task',
    criteria: { tame: { type: 'tame_animal', conditions: { mob: 'wolf' } } },
    requireAll: true,
    experienceReward: 20,
    itemRewards: [],
  },
  {
    id: 'mc_fishy_business',
    name: 'Fishy Business',
    nameJa: '怪しいビジネス',
    description: 'Catch a fish',
    descriptionJa: '魚を釣る',
    category: 'husbandry',
    parent: 'mc_the_parrots_and_the_bats',
    icon: 'fishing_rod',
    frame: 'task',
    criteria: { fish: { type: 'catch_fish', conditions: {} } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_a_balanced_diet',
    name: 'A Balanced Diet',
    nameJa: 'バランスの取れた食事',
    description: 'Eat every type of food',
    descriptionJa: 'すべての種類の食べ物を食べる',
    category: 'husbandry',
    parent: 'mc_the_parrots_and_the_bats',
    icon: 'golden_apple',
    frame: 'challenge',
    criteria: { eat: { type: 'eat_all_foods', conditions: {} } },
    requireAll: true,
    experienceReward: 100,
    itemRewards: [],
  },
  {
    id: 'mc_two_by_two',
    name: 'Two by Two',
    nameJa: 'つがいで',
    description: 'Breed all breedable animal types',
    descriptionJa: 'すべての繁殖可能な動物を繁殖させる',
    category: 'husbandry',
    parent: 'mc_the_parrots_and_the_bats',
    icon: 'golden_carrot',
    frame: 'challenge',
    criteria: { breed: { type: 'breed_all_animals', conditions: {} } },
    requireAll: true,
    experienceReward: 100,
    itemRewards: [],
  },
  {
    id: 'mc_serious_dedication',
    name: 'Serious Dedication',
    nameJa: '真剣な献身',
    description: 'Completely use up a diamond hoe',
    descriptionJa: 'ダイヤモンドのクワを使い切る',
    category: 'husbandry',
    parent: 'mc_the_parrots_and_the_bats',
    icon: 'diamond_hoe',
    frame: 'challenge',
    criteria: { use: { type: 'break_tool', conditions: { item: 'diamond_hoe' } } },
    requireAll: true,
    experienceReward: 100,
    itemRewards: [],
  },

  // =========================================================================
  // ADDITIONAL STORY ADVANCEMENTS
  // =========================================================================
  {
    id: 'mc_benchmarking',
    name: 'Benchmarking',
    nameJa: 'ベンチマーキング',
    description: 'Craft a crafting table',
    descriptionJa: '作業台をクラフトする',
    category: 'story',
    parent: 'mc_getting_wood',
    icon: 'crafting_table',
    frame: 'task',
    criteria: { craft: { type: 'craft_item', conditions: { item: 'crafting_table' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_hot_topic',
    name: 'Hot Topic',
    nameJa: 'ホットトピック',
    description: 'Construct a furnace',
    descriptionJa: 'かまどをクラフトする',
    category: 'story',
    parent: 'mc_benchmarking',
    icon: 'furnace',
    frame: 'task',
    criteria: { craft: { type: 'craft_item', conditions: { item: 'furnace' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_time_to_mine',
    name: 'Time to Mine!',
    nameJa: '採掘の時間だ！',
    description: 'Craft a wooden pickaxe',
    descriptionJa: '木のツルハシをクラフトする',
    category: 'story',
    parent: 'mc_benchmarking',
    icon: 'wooden_pickaxe',
    frame: 'task',
    criteria: { craft: { type: 'craft_item', conditions: { item: 'wooden_pickaxe' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_time_to_strike',
    name: 'Time to Strike!',
    nameJa: '攻撃の時間だ！',
    description: 'Craft a wooden sword',
    descriptionJa: '木の剣をクラフトする',
    category: 'story',
    parent: 'mc_benchmarking',
    icon: 'wooden_sword',
    frame: 'task',
    criteria: { craft: { type: 'craft_item', conditions: { item: 'wooden_sword' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_time_to_farm',
    name: 'Time to Farm!',
    nameJa: '農業の時間だ！',
    description: 'Craft a wooden hoe',
    descriptionJa: '木のクワをクラフトする',
    category: 'story',
    parent: 'mc_benchmarking',
    icon: 'wooden_hoe',
    frame: 'task',
    criteria: { craft: { type: 'craft_item', conditions: { item: 'wooden_hoe' } } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },
  {
    id: 'mc_bake_bread',
    name: 'Bake Bread',
    nameJa: 'パンを焼く',
    description: 'Turn wheat into bread',
    descriptionJa: '小麦からパンをクラフトする',
    category: 'story',
    parent: 'mc_time_to_farm',
    icon: 'bread',
    frame: 'task',
    criteria: { craft: { type: 'craft_item', conditions: { item: 'bread' } } },
    requireAll: true,
    experienceReward: 15,
    itemRewards: [],
  },
  {
    id: 'mc_the_lie',
    name: 'The Lie',
    nameJa: '嘘',
    description: 'Craft a cake',
    descriptionJa: 'ケーキをクラフトする',
    category: 'story',
    parent: 'mc_bake_bread',
    icon: 'cake',
    frame: 'goal',
    criteria: { craft: { type: 'craft_item', conditions: { item: 'cake' } } },
    requireAll: true,
    experienceReward: 30,
    itemRewards: [],
  },
  {
    id: 'mc_cow_tipper',
    name: 'Cow Tipper',
    nameJa: 'ウシ狩り',
    description: 'Pick up leather',
    descriptionJa: '革を手に入れる',
    category: 'story',
    parent: 'mc_monster_hunter',
    icon: 'leather',
    frame: 'task',
    criteria: { obtain: { type: 'obtain_item', conditions: { item: 'leather' } } },
    requireAll: true,
    experienceReward: 15,
    itemRewards: [],
  },
  {
    id: 'mc_librarian',
    name: 'Librarian',
    nameJa: '司書',
    description: 'Craft a bookshelf',
    descriptionJa: '本棚をクラフトする',
    category: 'story',
    parent: 'mc_enchanter',
    icon: 'bookshelf',
    frame: 'task',
    criteria: { craft: { type: 'craft_item', conditions: { item: 'bookshelf' } } },
    requireAll: true,
    experienceReward: 20,
    itemRewards: [],
  },
  {
    id: 'mc_overpowered',
    name: 'Overpowered',
    nameJa: '最強',
    description: 'Eat an enchanted golden apple',
    descriptionJa: 'エンチャントされた金のリンゴを食べる',
    category: 'story',
    parent: 'mc_enchanter',
    icon: 'enchanted_golden_apple',
    frame: 'challenge',
    criteria: { eat: { type: 'eat_food', conditions: { item: 'enchanted_golden_apple' } } },
    requireAll: true,
    experienceReward: 50,
    itemRewards: [],
  },
  {
    id: 'mc_repopulation',
    name: 'Repopulation',
    nameJa: '再繁殖',
    description: 'Breed two cows with wheat',
    descriptionJa: '小麦で牛を2頭繁殖させる',
    category: 'story',
    parent: 'mc_cow_tipper',
    icon: 'wheat',
    frame: 'task',
    criteria: { breed: { type: 'breed_animal', conditions: { mob: 'cow' } } },
    requireAll: true,
    experienceReward: 15,
    itemRewards: [],
  },
  {
    id: 'mc_delicious_fish',
    name: 'Delicious Fish',
    nameJa: 'おいしい魚',
    description: 'Catch and cook a fish',
    descriptionJa: '魚を釣って焼く',
    category: 'story',
    parent: 'mc_hot_topic',
    icon: 'cooked_cod',
    frame: 'task',
    criteria: { cook: { type: 'cook_fish', conditions: {} } },
    requireAll: true,
    experienceReward: 15,
    itemRewards: [],
  },
  {
    id: 'mc_on_a_rail',
    name: 'On a Rail',
    nameJa: 'レールの上で',
    description: 'Travel 500 blocks by minecart',
    descriptionJa: 'トロッコで500ブロック移動する',
    category: 'story',
    parent: 'mc_acquire_hardware',
    icon: 'minecart',
    frame: 'challenge',
    criteria: { travel: { type: 'minecart_distance', conditions: { distance: 500 } } },
    requireAll: true,
    experienceReward: 40,
    itemRewards: [],
  },

  // =========================================================================
  // ADDITIONAL ADVENTURE ADVANCEMENTS
  // =========================================================================
  {
    id: 'mc_bullseye',
    name: 'Bullseye',
    nameJa: 'ブルズアイ',
    description: 'Hit the bullseye of a target block',
    descriptionJa: '的ブロックの中心に当てる',
    category: 'adventure',
    parent: 'mc_monster_hunter',
    icon: 'target',
    frame: 'challenge',
    criteria: { hit: { type: 'hit_target_center', conditions: {} } },
    requireAll: true,
    experienceReward: 50,
    itemRewards: [],
  },

  // =========================================================================
  // ADDITIONAL HUSBANDRY ADVANCEMENTS
  // =========================================================================
  {
    id: 'mc_a_seedy_place',
    name: 'A Seedy Place',
    nameJa: '種まき',
    description: 'Plant a seed',
    descriptionJa: '種を植える',
    category: 'husbandry',
    parent: 'mc_the_parrots_and_the_bats',
    icon: 'wheat_seeds',
    frame: 'task',
    criteria: { plant: { type: 'plant_seed', conditions: {} } },
    requireAll: true,
    experienceReward: 10,
    itemRewards: [],
  },

  // =========================================================================
  // ADDITIONAL END ADVANCEMENTS
  // =========================================================================
  {
    id: 'mc_you_need_a_mint',
    name: 'You Need a Mint',
    nameJa: 'ミントが必要',
    description: "Collect dragon's breath",
    descriptionJa: 'ドラゴンブレスを集める',
    category: 'end',
    parent: 'mc_the_end_period',
    icon: 'dragon_breath',
    frame: 'goal',
    criteria: { collect: { type: 'obtain_item', conditions: { item: 'dragon_breath' } } },
    requireAll: true,
    experienceReward: 30,
    itemRewards: [],
  },
  {
    id: 'mc_the_end_again',
    name: 'The End... Again...',
    nameJa: 'おしまい…また…',
    description: 'Respawn the Ender Dragon',
    descriptionJa: 'エンダードラゴンを復活させる',
    category: 'end',
    parent: 'mc_the_end_period',
    icon: 'end_crystal',
    frame: 'goal',
    criteria: { respawn: { type: 'respawn_dragon', conditions: {} } },
    requireAll: true,
    experienceReward: 50,
    itemRewards: [],
  },
  {
    id: 'mc_remote_getaway',
    name: 'Remote Getaway',
    nameJa: '遠隔脱出',
    description: 'Escape the End island via elytra or ender pearl',
    descriptionJa: 'エリトラやエンダーパールでエンド島から脱出する',
    category: 'end',
    parent: 'mc_free_the_end',
    icon: 'ender_pearl',
    frame: 'goal',
    criteria: { escape: { type: 'escape_end_island', conditions: {} } },
    requireAll: true,
    experienceReward: 50,
    itemRewards: [],
  },

  // =========================================================================
  // ADDITIONAL NETHER ADVANCEMENTS
  // =========================================================================
  {
    id: 'mc_spooky_scary_skeleton',
    name: 'Spooky Scary Skeleton',
    nameJa: '恐ろしいスケルトン',
    description: 'Obtain a Wither Skeleton skull',
    descriptionJa: 'ウィザースケルトンの頭を手に入れる',
    category: 'nether',
    parent: 'mc_a_terrible_fortress',
    icon: 'wither_skeleton_skull',
    frame: 'task',
    criteria: { obtain: { type: 'obtain_item', conditions: { item: 'wither_skeleton_skull' } } },
    requireAll: true,
    experienceReward: 30,
    itemRewards: [],
  },
  {
    id: 'mc_withering_heights',
    name: 'Withering Heights',
    nameJa: 'ウィザリング・ハイツ',
    description: 'Summon the Wither',
    descriptionJa: 'ウィザーを召喚する',
    category: 'nether',
    parent: 'mc_spooky_scary_skeleton',
    icon: 'nether_star',
    frame: 'goal',
    criteria: { summon: { type: 'summon_wither', conditions: {} } },
    requireAll: true,
    experienceReward: 50,
    itemRewards: [],
  },
  {
    id: 'mc_beaconator',
    name: 'Beaconator',
    nameJa: 'ビーコン使い',
    description: 'Bring a beacon to full power',
    descriptionJa: 'ビーコンのパワーを最大にする',
    category: 'nether',
    parent: 'mc_withering_heights',
    icon: 'beacon',
    frame: 'challenge',
    criteria: { power: { type: 'activate_beacon', conditions: { level: 4 } } },
    requireAll: true,
    experienceReward: 100,
    itemRewards: [],
  },
];

// =============================================================================
// Advancement Checking
// =============================================================================

/**
 * Check whether a specific advancement's criteria are met by the current
 * game state. Returns true if the advancement should be unlocked.
 */
export function checkAdvancement(id: string, gameState: AdvancementGameState): boolean {
  const advancement = MC_ADVANCEMENTS.find((adv) => adv.id === id);
  if (!advancement) return false;

  switch (id) {
    // --- Story ---
    case 'mc_getting_wood':
      return hasMinedAnyLog(gameState);
    case 'mc_getting_an_upgrade':
      return gameState.itemsCrafted.has('stone_pickaxe');
    case 'mc_acquire_hardware':
      return gameState.itemsSmelted.has('iron_ingot');
    case 'mc_suit_up':
      return hasAnyFromSet(gameState.itemsCrafted, IRON_ARMOR_IDS);
    case 'mc_hot_stuff':
      return hasItemInInventory(gameState.player.inventory, 'lava_bucket');
    case 'mc_isnt_it_iron_pick':
      return gameState.itemsCrafted.has('iron_pickaxe');
    case 'mc_not_today_thank_you':
      return gameState.projectileBlocked;
    case 'mc_diamonds':
      return hasItemInInventory(gameState.player.inventory, 'diamond');
    case 'mc_ice_bucket_challenge':
      return gameState.obsidianCreated;
    case 'mc_we_need_to_go_deeper':
      return gameState.player.dimension === 'nether';
    case 'mc_cover_me_with_diamonds':
      return hasAllFromSet(gameState.itemsCrafted, DIAMOND_ARMOR_IDS);
    case 'mc_enchanter':
      return gameState.inventoryItems.has('enchanted_item');

    // --- Nether ---
    case 'mc_return_to_sender':
      return gameState.ghastReflected;
    case 'mc_into_fire':
      return hasItemInInventory(gameState.player.inventory, 'blaze_rod');
    case 'mc_a_terrible_fortress':
      return gameState.netherFortressEntered;
    case 'mc_uneasy_alliance':
      return gameState.ghastRescued;

    // --- End ---
    case 'mc_the_end_question':
      return gameState.player.dimension === 'the_end';
    case 'mc_the_end_period':
      return gameState.enderDragonKilled;
    case 'mc_free_the_end':
      return gameState.endCityFound;
    case 'mc_the_next_generation':
      return gameState.dragonEggCollected;

    // --- Adventure ---
    case 'mc_monster_hunter':
      return gameState.mobsKilled.size > 0;
    case 'mc_sniper_duel':
      return gameState.farthestSkeletonKill >= 50;
    case 'mc_adventuring_time':
      return hasAllFromSet(gameState.biomesVisited, ALL_BIOMES);
    case 'mc_hero_of_the_village':
      return gameState.raidSurvived;

    // --- Husbandry ---
    case 'mc_the_parrots_and_the_bats':
      return gameState.mobsTamed.size > 0;
    case 'mc_best_friends_forever':
      return gameState.mobsTamed.has('wolf');
    case 'mc_fishy_business':
      return gameState.fishCaught;
    case 'mc_a_balanced_diet':
      return hasAllFromSet(gameState.foodEaten, ALL_FOOD_TYPES);
    case 'mc_two_by_two':
      return hasAllFromSet(gameState.mobsBred, ALL_BREEDABLE_MOBS);
    case 'mc_serious_dedication':
      return gameState.diamondHoeUsedUp;

    // --- Additional Story ---
    case 'mc_benchmarking':
      return gameState.itemsCrafted.has('crafting_table');
    case 'mc_hot_topic':
      return gameState.itemsCrafted.has('furnace');
    case 'mc_time_to_mine':
      return gameState.itemsCrafted.has('wooden_pickaxe');
    case 'mc_time_to_strike':
      return gameState.itemsCrafted.has('wooden_sword');
    case 'mc_time_to_farm':
      return gameState.itemsCrafted.has('wooden_hoe');
    case 'mc_bake_bread':
      return gameState.itemsCrafted.has('bread');
    case 'mc_the_lie':
      return gameState.itemsCrafted.has('cake');
    case 'mc_cow_tipper':
      return gameState.inventoryItems.has('leather');
    case 'mc_librarian':
      return gameState.itemsCrafted.has('bookshelf');
    case 'mc_overpowered':
      return gameState.foodEaten.has('enchanted_golden_apple');
    case 'mc_repopulation':
      return gameState.mobsBred.has('cow');
    case 'mc_delicious_fish':
      return gameState.fishCaught && gameState.itemsSmelted.has('cooked_cod');
    case 'mc_on_a_rail':
      return gameState.minecartDistance >= 500;

    // --- Additional Adventure ---
    case 'mc_bullseye':
      return gameState.targetBlockHitCenter;

    // --- Additional Husbandry ---
    case 'mc_a_seedy_place':
      return gameState.seedPlanted;

    // --- Additional End ---
    case 'mc_you_need_a_mint':
      return gameState.inventoryItems.has('dragon_breath');
    case 'mc_the_end_again':
      return gameState.dragonRespawned;
    case 'mc_remote_getaway':
      return gameState.endIslandEscaped;

    // --- Additional Nether ---
    case 'mc_spooky_scary_skeleton':
      return gameState.inventoryItems.has('wither_skeleton_skull');
    case 'mc_withering_heights':
      return gameState.witherSummoned;
    case 'mc_beaconator':
      return gameState.beaconFullPower;

    default:
      return false;
  }
}

/**
 * Check all advancements against the current game state.
 * Returns an array of advancement IDs that are newly qualified.
 */
export function checkAllAdvancements(
  gameState: AdvancementGameState,
  alreadyUnlocked: Set<string>
): string[] {
  const newlyUnlocked: string[] = [];

  for (const adv of MC_ADVANCEMENTS) {
    if (alreadyUnlocked.has(adv.id)) continue;
    if (checkAdvancement(adv.id, gameState)) {
      newlyUnlocked.push(adv.id);
    }
  }

  return newlyUnlocked;
}

// =============================================================================
// Advancement Tree
// =============================================================================

export interface AdvancementTreeNode {
  advancement: AdvancementDefinition;
  children: AdvancementTreeNode[];
}

/**
 * Build a tree structure for all advancements in a given category.
 * Returns the root nodes (advancements with no parent).
 */
export function getAdvancementTree(category?: AdvancementCategory): AdvancementTreeNode[] {
  const filtered = category
    ? MC_ADVANCEMENTS.filter((adv) => adv.category === category)
    : MC_ADVANCEMENTS;

  const nodeMap = new Map<string, AdvancementTreeNode>();
  for (const adv of filtered) {
    nodeMap.set(adv.id, { advancement: adv, children: [] });
  }

  const roots: AdvancementTreeNode[] = [];

  for (const adv of filtered) {
    const node = nodeMap.get(adv.id)!;
    if (adv.parent && nodeMap.has(adv.parent)) {
      nodeMap.get(adv.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Get all categories that have at least one advancement.
 */
export function getAdvancementCategories(): AdvancementCategory[] {
  const categories = new Set<AdvancementCategory>();
  for (const adv of MC_ADVANCEMENTS) {
    categories.add(adv.category);
  }
  return Array.from(categories);
}

/**
 * Get a single advancement by ID. Returns undefined if not found.
 */
export function getAdvancementById(id: string): AdvancementDefinition | undefined {
  return MC_ADVANCEMENTS.find((adv) => adv.id === id);
}

// =============================================================================
// MCSAdvancementManager — Class-based manager wrapping functional API
// =============================================================================

/**
 * Stateful advancement manager for a single player session.
 * Wraps the functional API with unlock tracking, serialization,
 * and batch criteria checking with parent-chain resolution.
 */
export class MCSAdvancementManager {
  definitions: AdvancementDefinition[];
  unlocked: Set<string>;

  constructor() {
    this.definitions = [...MC_ADVANCEMENTS];
    this.unlocked = new Set<string>();
  }

  /**
   * Check if a specific advancement's criteria are met given current state.
   */
  checkCriteria(advancementId: string, gameState: AdvancementGameState): boolean {
    // Verify parent is unlocked first
    const adv = this.definitions.find(a => a.id === advancementId);
    if (!adv) return false;
    if (adv.parent && !this.unlocked.has(adv.parent)) return false;

    return checkAdvancement(advancementId, gameState);
  }

  /**
   * Attempt to unlock an advancement. Returns the advancement and
   * whether it was newly unlocked.
   */
  unlock(advancementId: string): { advancement: AdvancementDefinition | null; isNew: boolean } {
    const adv = this.definitions.find(a => a.id === advancementId);
    if (!adv) return { advancement: null, isNew: false };
    if (this.unlocked.has(advancementId)) return { advancement: adv, isNew: false };

    this.unlocked.add(advancementId);
    return { advancement: adv, isNew: true };
  }

  /**
   * Check if a specific advancement is unlocked.
   */
  isUnlocked(advancementId: string): boolean {
    return this.unlocked.has(advancementId);
  }

  /**
   * Get overall progress across all advancements.
   */
  getProgress(): { total: number; unlocked: number; percentage: number } {
    const total = this.definitions.length;
    const unlocked = this.unlocked.size;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    return { total, unlocked, percentage };
  }

  /**
   * Build a tree structure for a specific category, suitable for UI display.
   * Wraps the functional getAdvancementTree with unlock status.
   */
  getTree(category: AdvancementCategory): (AdvancementTreeNode & { unlocked: boolean })[] {
    const roots = getAdvancementTree(category);

    const annotate = (node: AdvancementTreeNode): AdvancementTreeNode & { unlocked: boolean } => ({
      ...node,
      unlocked: this.unlocked.has(node.advancement.id),
      children: node.children.map(annotate),
    });

    return roots.map(annotate);
  }

  /**
   * Get all advancement definitions.
   */
  getAll(): AdvancementDefinition[] {
    return [...this.definitions];
  }

  /**
   * Serialize the unlocked state to a JSON string.
   */
  serialize(): string {
    return JSON.stringify({
      unlockedIds: Array.from(this.unlocked),
      version: 1,
    });
  }

  /**
   * Deserialize and restore unlocked state from a JSON string.
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data && Array.isArray(data.unlockedIds)) {
        this.unlocked = new Set<string>(data.unlockedIds);
      }
    } catch {
      this.unlocked = new Set<string>();
    }
  }

  /**
   * Check ALL advancements against current game state.
   * Uses multiple passes to resolve parent chains: unlocking a parent
   * in one pass may enable children in the next.
   * Returns an array of advancement IDs that were newly unlocked.
   */
  checkAllCriteria(gameState: AdvancementGameState): string[] {
    const newlyUnlocked: string[] = [];

    let changed = true;
    while (changed) {
      changed = false;
      for (const adv of this.definitions) {
        if (this.unlocked.has(adv.id)) continue;
        if (this.checkCriteria(adv.id, gameState)) {
          const result = this.unlock(adv.id);
          if (result.isNew) {
            newlyUnlocked.push(adv.id);
            changed = true;
          }
        }
      }
    }

    return newlyUnlocked;
  }
}

// =============================================================================
// Utility Helpers
// =============================================================================

function hasMinedAnyLog(state: AdvancementGameState): boolean {
  for (const blockId of state.blocksMined) {
    if (LOG_BLOCK_IDS.has(blockId)) return true;
  }
  return false;
}

function hasItemInInventory(inventory: PlayerInventory, itemId: string): boolean {
  const allSlots: (InventorySlot | null)[] = [
    ...inventory.main,
    ...inventory.hotbar,
    ...inventory.armor,
    inventory.offhand,
  ];

  for (const slot of allSlots) {
    if (slot && slot.item === itemId) return true;
  }
  return false;
}

function hasAnyFromSet(playerSet: Set<string>, requiredSet: Set<string>): boolean {
  for (const item of requiredSet) {
    if (playerSet.has(item)) return true;
  }
  return false;
}

function hasAllFromSet(playerSet: Set<string>, requiredSet: Set<string>): boolean {
  for (const item of requiredSet) {
    if (!playerSet.has(item)) return false;
  }
  return true;
}
