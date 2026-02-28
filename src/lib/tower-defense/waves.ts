import type { Wave, EnemyType } from '@/types/tower-defense';

function wave(
  number: number,
  groups: { type: EnemyType; count: number; delay?: number; start?: number; hpMult?: number; speedMult?: number }[],
  reward: number,
): Wave {
  return {
    number,
    reward,
    groups: groups.map(g => ({
      enemyType: g.type,
      count: g.count,
      spawnDelay: g.delay ?? 1,
      startDelay: g.start ?? 0,
      hpMultiplier: g.hpMult,
      speedMultiplier: g.speedMult,
    })),
  };
}

export const WAVES: Wave[] = [
  // Early game: simple introductions
  wave(1, [{ type: 'grunt', count: 8, delay: 1.2 }], 20),
  wave(2, [{ type: 'grunt', count: 10, delay: 1 }], 25),
  wave(3, [{ type: 'fast', count: 8, delay: 0.8 }], 30),
  wave(4, [
    { type: 'grunt', count: 6, delay: 1 },
    { type: 'fast', count: 6, delay: 0.7, start: 3 },
  ], 35),
  wave(5, [
    { type: 'tank', count: 3, delay: 2 },
    { type: 'grunt', count: 8, delay: 0.9, start: 2 },
  ], 50),

  // Mid-early: introduce flying + mixed
  wave(6, [{ type: 'flying', count: 10, delay: 0.8 }], 40),
  wave(7, [
    { type: 'grunt', count: 10, delay: 0.8, hpMult: 1.3 },
    { type: 'flying', count: 5, delay: 1, start: 4 },
  ], 45),
  wave(8, [
    { type: 'swarm', count: 20, delay: 0.3 },
  ], 40),
  wave(9, [
    { type: 'tank', count: 5, delay: 1.8, hpMult: 1.5 },
    { type: 'fast', count: 8, delay: 0.6, start: 3 },
  ], 55),
  wave(10, [
    { type: 'boss', count: 1, delay: 0 },
    { type: 'grunt', count: 6, delay: 1.2, start: 3 },
  ], 100),

  // Mid game: harder combos
  wave(11, [
    { type: 'healer', count: 3, delay: 2 },
    { type: 'tank', count: 5, delay: 1.5, start: 1 },
  ], 60),
  wave(12, [
    { type: 'fast', count: 15, delay: 0.5, hpMult: 1.5 },
  ], 55),
  wave(13, [
    { type: 'shield', count: 4, delay: 2 },
    { type: 'grunt', count: 10, delay: 0.7, start: 2 },
  ], 65),
  wave(14, [
    { type: 'flying', count: 12, delay: 0.6, hpMult: 1.5 },
    { type: 'swarm', count: 15, delay: 0.3, start: 4 },
  ], 60),
  wave(15, [
    { type: 'boss', count: 1, delay: 0, hpMult: 1.5 },
    { type: 'healer', count: 2, delay: 3, start: 2 },
    { type: 'tank', count: 4, delay: 1.5, start: 5 },
  ], 120),

  // Late-mid: scaling difficulty
  wave(16, [
    { type: 'grunt', count: 20, delay: 0.5, hpMult: 2 },
  ], 70),
  wave(17, [
    { type: 'shield', count: 6, delay: 1.5, hpMult: 1.5 },
    { type: 'healer', count: 3, delay: 2, start: 3 },
  ], 80),
  wave(18, [
    { type: 'fast', count: 20, delay: 0.4, hpMult: 2, speedMult: 1.3 },
  ], 75),
  wave(19, [
    { type: 'tank', count: 8, delay: 1.2, hpMult: 2 },
    { type: 'flying', count: 10, delay: 0.7, start: 3, hpMult: 1.8 },
  ], 85),
  wave(20, [
    { type: 'boss', count: 2, delay: 5, hpMult: 2 },
    { type: 'shield', count: 4, delay: 1.5, start: 3 },
    { type: 'swarm', count: 20, delay: 0.25, start: 6 },
  ], 150),

  // Late game: intense waves
  wave(21, [
    { type: 'swarm', count: 40, delay: 0.2, hpMult: 2 },
  ], 80),
  wave(22, [
    { type: 'tank', count: 10, delay: 1, hpMult: 3 },
    { type: 'healer', count: 5, delay: 1.5, start: 2 },
  ], 100),
  wave(23, [
    { type: 'flying', count: 15, delay: 0.5, hpMult: 2.5 },
    { type: 'fast', count: 15, delay: 0.4, start: 3, hpMult: 2.5 },
  ], 95),
  wave(24, [
    { type: 'shield', count: 8, delay: 1.2, hpMult: 2 },
    { type: 'grunt', count: 15, delay: 0.5, start: 4, hpMult: 3 },
  ], 110),
  wave(25, [
    { type: 'boss', count: 3, delay: 4, hpMult: 2.5 },
    { type: 'healer', count: 4, delay: 2, start: 3 },
    { type: 'tank', count: 6, delay: 1.2, start: 6, hpMult: 2.5 },
  ], 200),

  // Final waves: endgame
  wave(26, [
    { type: 'fast', count: 30, delay: 0.3, hpMult: 3, speedMult: 1.5 },
  ], 100),
  wave(27, [
    { type: 'tank', count: 12, delay: 1, hpMult: 4 },
    { type: 'shield', count: 6, delay: 1.5, start: 3, hpMult: 3 },
    { type: 'healer', count: 4, delay: 2, start: 5 },
  ], 130),
  wave(28, [
    { type: 'flying', count: 20, delay: 0.4, hpMult: 3.5 },
    { type: 'swarm', count: 30, delay: 0.15, start: 4, hpMult: 3 },
  ], 120),
  wave(29, [
    { type: 'boss', count: 4, delay: 3, hpMult: 3 },
    { type: 'shield', count: 8, delay: 1, start: 2, hpMult: 3 },
    { type: 'healer', count: 6, delay: 1.5, start: 4 },
    { type: 'fast', count: 20, delay: 0.3, start: 6, hpMult: 3, speedMult: 1.3 },
  ], 250),
  wave(30, [
    { type: 'boss', count: 6, delay: 3, hpMult: 5 },
    { type: 'tank', count: 10, delay: 1, start: 2, hpMult: 5 },
    { type: 'shield', count: 8, delay: 1, start: 4, hpMult: 4 },
    { type: 'healer', count: 6, delay: 1.5, start: 6 },
    { type: 'swarm', count: 30, delay: 0.15, start: 8, hpMult: 4 },
  ], 500),
];
