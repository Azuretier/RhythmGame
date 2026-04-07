import { createLocalStorageItem } from './storage-utils';

const SHOW_ALL_ATTACK_TRAILS_KEY = 'tetris99_show_all_attack_trails';
const attackTrailStorage = createLocalStorageItem(SHOW_ALL_ATTACK_TRAILS_KEY);

export function loadTetris99ShowAllAttackTrails() {
  return attackTrailStorage.get() === 'true';
}

export function saveTetris99ShowAllAttackTrails(value: boolean) {
  attackTrailStorage.set(value ? 'true' : 'false');
}

export function shouldShowTetris99AttackTrail(sourceId: string, targetId: string, showAllTrails: boolean) {
  return showAllTrails || sourceId === 'player' || targetId === 'player';
}
