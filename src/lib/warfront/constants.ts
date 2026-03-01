// Re-export constants from types for convenience
export {
  WF_TICK_RATE,
  WF_MAX_PLAYERS,
  WF_MIN_PLAYERS,
  WF_TERRITORY_GRID,
  WF_TERRITORY_SIZE,
  WF_DEFAULT_DURATION,
  WF_COUNTDOWN_SECONDS,
  WF_POSITION_BROADCAST_RATE,
  WF_TERRITORY_BROADCAST_INTERVAL,
  WF_RESOURCE_BROADCAST_INTERVAL,
  WF_CAPTURE_RATE,
  WF_CAPTURE_THRESHOLD,
  WF_TERRITORY_MAX_HEALTH,
  WF_TERRITORY_MAX_FORTIFICATION,
  WF_RESPAWN_DELAY,
  WF_TEAM_COLORS,
  WF_PLAYER_COLORS,
  WF_INITIAL_RESOURCES,
} from '@/types/warfront';

// Commander ability costs
export const COMMANDER_COSTS = {
  scan: { energy: 30 },
  shield_generator: { iron: 50 },
  rally: { energy: 20 },
  emp: { energy: 40, diamond: 20 },
} as const;

// Effect durations in ms
export const EFFECT_DURATIONS = {
  shield_boost: 3000,
  score_bonus: 5000,
  build_speed: 5000,
  vision_reveal: 8000,
  debuff_slow: 8000,
  energy_pulse: 0, // instant
  rhythm_power: 8000,
  ammo_resupply: 0, // instant
  resource_grant: 0, // instant
  territory_heal: 0, // instant
  territory_damage: 0, // instant
  fortification_buff: 0, // permanent
} as const;

// Effect magnitudes
export const EFFECT_VALUES = {
  line_clear_heal: 5,
  line_clear_shield: 0.3, // 30% damage reduction
  combo_energy: 10,
  tspin_build_speed: 0.5, // 50% faster
  tetris_territory_damage: 15,
  kill_score_bonus: 1.5, // 1.5x multiplier
  kill_territory_damage: 10,
  capture_stone: 20,
  capture_iron: 10,
  headshot_vision_duration: 5000,
  ammo_resupply_percent: 0.5, // 50%
  fortification_capture_slow: 0.25, // 25% per level
} as const;
