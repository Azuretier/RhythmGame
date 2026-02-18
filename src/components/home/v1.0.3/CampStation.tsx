'use client';

import { motion } from 'framer-motion';

interface CampStationProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  badge?: string;
  onClick: () => void;
  locked?: boolean;
  lockMessage?: string;
  delay?: number;
  size?: 'normal' | 'large';
}

export default function CampStation({
  icon,
  name,
  description,
  badge,
  onClick,
  locked = false,
  lockMessage,
  delay = 0,
  size = 'normal',
}: CampStationProps) {
  const isLarge = size === 'large';

  return (
    <motion.button
      onClick={locked ? undefined : onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={locked ? {} : { y: -5, scale: 1.04 }}
      whileTap={locked ? {} : { scale: 0.96 }}
      className={`
        relative flex flex-col items-center gap-2 rounded-xl
        border backdrop-blur-sm transition-all duration-300 cursor-pointer
        ${isLarge ? 'px-6 py-5' : 'px-4 py-4'}
        ${locked
          ? 'bg-black/20 border-white/5 opacity-50 cursor-not-allowed grayscale'
          : 'bg-black/30 border-white/10 hover:border-amber-400/30 hover:shadow-[0_0_24px_rgba(255,160,40,0.2)]'
        }
      `}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Badge */}
      {badge && (
        <span className={`
          absolute -top-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider
          ${locked
            ? 'bg-white/5 text-white/30'
            : 'bg-amber-500/20 text-amber-300/90 border border-amber-500/20'
          }
        `}>
          {badge}
        </span>
      )}

      {/* Lock overlay */}
      {locked && lockMessage && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/40">
          <svg className="w-5 h-5 text-white/40 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[9px] text-white/40 text-center px-2 leading-tight">
            {lockMessage}
          </span>
        </div>
      )}

      {/* Icon */}
      <div className={`
        flex items-center justify-center rounded-full
        ${isLarge ? 'w-14 h-14' : 'w-10 h-10'}
        ${locked
          ? 'bg-white/5 text-white/30'
          : 'bg-amber-500/15 text-amber-200 shadow-[0_0_12px_rgba(255,160,40,0.15)]'
        }
      `}>
        {icon}
      </div>

      {/* Name */}
      <span className={`
        font-bold tracking-wide
        ${isLarge ? 'text-sm' : 'text-xs'}
        ${locked ? 'text-white/30' : 'text-white/90'}
      `}>
        {name}
      </span>

      {/* Description */}
      <span className={`
        text-[10px] leading-tight text-center
        ${locked ? 'text-white/20' : 'text-white/40'}
      `}>
        {description}
      </span>
    </motion.button>
  );
}
