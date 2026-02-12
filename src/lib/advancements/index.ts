export { ADVANCEMENTS, BATTLE_ARENA_REQUIRED_ADVANCEMENTS } from './definitions';
export { loadAdvancementState, saveAdvancementState, checkNewAdvancements, recordGameEnd, recordMultiplayerGameEnd, getUnlockedCount, checkLiveGameAdvancements, checkLiveMultiplayerAdvancements, saveLiveUnlocks, syncLoyaltyStats } from './storage';
export { initAuth, syncToFirestore, loadFromFirestore, mergeStates } from './firestore';
export type { PlayerStats, AdvancementState, AdvancementCategory, Advancement } from './types';
export type { GameEndStats, MultiplayerGameEndStats } from './storage';
