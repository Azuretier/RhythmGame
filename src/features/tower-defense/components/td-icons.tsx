'use client';

import type { TowerType, EnemyType } from '@/types/tower-defense';
import { TOWER_DEFS, ENEMY_DEFS } from '@/types/tower-defense';

// === Tower Icons ===

function ArcherSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3L12 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M7 8L12 3L17 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 21L16 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 18L14 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CannonSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 21L12 6L18 21Z" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 14Q10 11 12 14Q14 11 16 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="5" r="2" fill={color} fillOpacity={0.6} />
    </svg>
  );
}

function FrostSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="5.1" y1="5.1" x2="18.9" y2="18.9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18.9" y1="5.1" x2="5.1" y2="18.9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="2" x2="9.5" y2="4.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="2" x2="14.5" y2="4.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="22" x2="9.5" y2="19.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="22" x2="14.5" y2="19.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="4.5" y2="9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="4.5" y2="14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="12" x2="19.5" y2="9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="12" x2="19.5" y2="14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LightningSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14H11L10 22L20 10H13L13 2Z" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function SniperSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill={color} />
      <line x1="12" y1="1" x2="12" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="23" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="12" x2="6" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="12" x2="23" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FlameSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C12 2 7 8 7 13C7 16.5 9.2 19.5 12 21C14.8 19.5 17 16.5 17 13C17 8 12 2 12 2Z"
        fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" strokeLinejoin="round"
      />
      <path
        d="M12 10C12 10 10 13 10 15C10 16.5 10.9 17.5 12 18C13.1 17.5 14 16.5 14 15C14 13 12 10 12 10Z"
        fill={color} fillOpacity={0.6}
      />
    </svg>
  );
}

function ArcaneSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="5" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill={color} fillOpacity={0.6} />
      <circle cx="12" cy="3" r="1.5" fill={color} fillOpacity={0.7} />
      <circle cx="19" cy="7.5" r="1.5" fill={color} fillOpacity={0.5} />
      <circle cx="19" cy="16.5" r="1.5" fill={color} fillOpacity={0.5} />
      <circle cx="12" cy="21" r="1.5" fill={color} fillOpacity={0.7} />
      <circle cx="5" cy="16.5" r="1.5" fill={color} fillOpacity={0.5} />
      <circle cx="5" cy="7.5" r="1.5" fill={color} fillOpacity={0.5} />
    </svg>
  );
}

const TOWER_SVG_MAP: Record<TowerType, React.FC<{ color: string; size: number }>> = {
  archer: ArcherSVG,
  cannon: CannonSVG,
  frost: FrostSVG,
  lightning: LightningSVG,
  sniper: SniperSVG,
  flame: FlameSVG,
  arcane: ArcaneSVG,
};

export function TowerIcon({ type, size = 32 }: { type: TowerType; size?: number }) {
  const def = TOWER_DEFS[type];
  const SvgComponent = TOWER_SVG_MAP[type];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${def.color}33`,
        border: `2px solid ${def.color}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <SvgComponent color={def.color} size={size} />
    </div>
  );
}

// === Enemy Icons ===

function PigSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" />
      <ellipse cx="12" cy="14" rx="4" ry="3" fill={color} fillOpacity={0.4} stroke={color} strokeWidth="1.5" />
      <circle cx="10.5" cy="13.5" r="0.8" fill={color} />
      <circle cx="13.5" cy="13.5" r="0.8" fill={color} />
      <circle cx="9" cy="9" r="1" fill={color} fillOpacity={0.8} />
      <circle cx="15" cy="9" r="1" fill={color} fillOpacity={0.8} />
    </svg>
  );
}

function ChickenSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="13" rx="7" ry="8" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" />
      <path d="M7 11L3 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M17 11L21 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M10.5 15L12 17L13.5 15" fill={color} fillOpacity={0.6} stroke={color} strokeWidth="1" />
      <circle cx="10" cy="11" r="1" fill={color} />
      <circle cx="14" cy="11" r="1" fill={color} />
    </svg>
  );
}

function CowSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="6" width="14" height="14" rx="3" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" />
      <rect x="7" y="9" width="10" height="8" rx="2" fill={color} fillOpacity={0.15} stroke={color} strokeWidth="1" />
      <circle cx="10" cy="12" r="1" fill={color} />
      <circle cx="14" cy="12" r="1" fill={color} />
      <path d="M5 8L3 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M19 8L21 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BeeSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="14" rx="6" ry="7" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" />
      <path d="M6 5L10 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 5L14 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="7" cy="4" rx="3" ry="2" fill={color} fillOpacity={0.2} stroke={color} strokeWidth="1" />
      <ellipse cx="17" cy="4" rx="3" ry="2" fill={color} fillOpacity={0.2} stroke={color} strokeWidth="1" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1.5" />
      <line x1="8" y1="15" x2="16" y2="15" stroke={color} strokeWidth="1.5" />
      <circle cx="10" cy="10" r="0.8" fill={color} />
      <circle cx="14" cy="10" r="0.8" fill={color} />
    </svg>
  );
}

function CatSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="14" r="8" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" />
      <path d="M5 10L3 3L8 7" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={color} fillOpacity={0.3} />
      <path d="M19 10L21 3L16 7" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={color} fillOpacity={0.3} />
      <line x1="8" y1="16" x2="12" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="16" x2="16" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9.5" cy="13" r="1" fill={color} />
      <circle cx="14.5" cy="13" r="1" fill={color} />
    </svg>
  );
}

function HorseSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 18L8 10L12 6L16 10L19 18Z" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 6L12 2L16 6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity={0.4} />
      <circle cx="10" cy="13" r="1" fill={color} />
      <circle cx="14" cy="13" r="1" fill={color} />
      <line x1="10" y1="16" x2="14" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function RabbitSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="15" r="7" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" />
      <ellipse cx="9" cy="5" rx="2" ry="5" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="1.5" />
      <ellipse cx="15" cy="5" rx="2" ry="5" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="1.5" />
      <circle cx="10" cy="14" r="1" fill={color} />
      <circle cx="14" cy="14" r="1" fill={color} />
      <ellipse cx="12" cy="16.5" rx="1.5" ry="1" fill={color} fillOpacity={0.5} />
    </svg>
  );
}

function WolfSVG({ color, size }: { color: string; size: number }) {
  const s = size * 0.55;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 18L8 8L12 12L16 8L20 18Z" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 18L8 8L6 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 18L16 8L18 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="13" r="1" fill={color} />
      <circle cx="14" cy="13" r="1" fill={color} />
      <path d="M10 16L12 17.5L14 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ENEMY_SVG_MAP: Record<EnemyType, React.FC<{ color: string; size: number }>> = {
  grunt: PigSVG,
  fast: ChickenSVG,
  tank: CowSVG,
  flying: BeeSVG,
  healer: CatSVG,
  boss: HorseSVG,
  swarm: RabbitSVG,
  shield: WolfSVG,
};

export function EnemyIcon({ type, size = 32 }: { type: EnemyType; size?: number }) {
  const def = ENEMY_DEFS[type];
  const SvgComponent = ENEMY_SVG_MAP[type];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${def.color}33`,
        border: `2px solid ${def.color}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <SvgComponent color={def.color} size={size} />
    </div>
  );
}

// === Effect Icons (small inline SVGs) ===

function SnowflakeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="2" x2="12" y2="22" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="22" y2="12" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="5.1" y1="5.1" x2="18.9" y2="18.9" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18.9" y1="5.1" x2="5.1" y2="18.9" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BurnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 7 8 7 13C7 16.5 9.2 19.5 12 21C14.8 19.5 17 16.5 17 13C17 8 12 2 12 2Z" fill="#ef4444" fillOpacity={0.5} stroke="#ef4444" strokeWidth="2" />
    </svg>
  );
}

function StunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L14.5 9L22 9.5L16 14.5L18 22L12 17.5L6 22L8 14.5L2 9.5L9.5 9Z" fill="#eab308" fillOpacity={0.5} stroke="#eab308" strokeWidth="1.5" />
    </svg>
  );
}

function PoisonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="10" r="7" fill="#a855f7" fillOpacity={0.3} stroke="#a855f7" strokeWidth="2" />
      <line x1="8" y1="8" x2="10" y2="12" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="8" x2="14" y2="12" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 15Q12 19 15 15" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AmplifyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill="#f472b6" fillOpacity={0.4} stroke="#f472b6" strokeWidth="1.5" />
      <path d="M12 2L13 5L12 4L11 5Z" fill="#f472b6" />
      <path d="M22 12L19 13L20 12L19 11Z" fill="#f472b6" />
      <path d="M12 22L11 19L12 20L13 19Z" fill="#f472b6" />
      <path d="M2 12L5 11L4 12L5 13Z" fill="#f472b6" />
      <path d="M19 5L17 7L18 6L17 6Z" fill="#f472b6" />
      <path d="M5 5L7 7L6 6L7 6Z" fill="#f472b6" />
      <path d="M5 19L7 17L6 18L6 17Z" fill="#f472b6" />
      <path d="M19 19L17 17L18 18L18 17Z" fill="#f472b6" />
    </svg>
  );
}

export const EFFECT_LABELS: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  slow: { label: 'Slowed', color: '#38bdf8', icon: <SnowflakeIcon /> },
  burn: { label: 'Burning', color: '#ef4444', icon: <BurnIcon /> },
  stun: { label: 'Stunned', color: '#eab308', icon: <StunIcon /> },
  poison: { label: 'Poisoned', color: '#a855f7', icon: <PoisonIcon /> },
  amplify: { label: 'Amplified', color: '#f472b6', icon: <AmplifyIcon /> },
};

export const ABILITY_LABELS: Record<string, { label: string; description: string; color: string }> = {
  heal_aura: { label: 'Heal Aura', description: 'Heals nearby allies over time', color: '#4ade80' },
  shield_aura: { label: 'Shield Aura', description: 'Grants armor to nearby allies', color: '#60a5fa' },
  split: { label: 'Split', description: 'Splits into smaller enemies on death', color: '#fbbf24' },
  teleport: { label: 'Teleport', description: 'Blinks forward along the path', color: '#c084fc' },
  stealth: { label: 'Stealth', description: 'Becomes invisible to non-detector towers', color: '#94a3b8' },
};
