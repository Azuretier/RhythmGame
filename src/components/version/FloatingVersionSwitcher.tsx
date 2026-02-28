'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, MessageCircle, Heart, Box, Palette, Check } from 'lucide-react';
import { useState } from 'react';
import { useVersion } from '@/lib/version/context';
import {
  VERSION_METADATA,
  UI_VERSIONS,
  ACCENT_COLOR_METADATA,
  ACCENT_COLORS,
  type UIVersion,
  type AccentColor,
} from '@/lib/version/types';

const VERSION_ICONS: Record<UIVersion, React.ReactNode> = {
  current: <Gamepad2 size={14} />,
  '1.0.0': <MessageCircle size={14} />,
  '1.0.1': <Heart size={14} />,
  '1.0.2': <Box size={14} />,
};

export default function FloatingVersionSwitcher() {
  const { currentVersion, setVersion, accentColor, setAccentColor } = useVersion();
  const [showColors, setShowColors] = useState(false);

  const handleVersionChange = (version: UIVersion) => {
    if (version === currentVersion) return;
    setVersion(version);
    window.location.href = '/';
  };

  const handleAccentChange = (color: AccentColor) => {
    setAccentColor(color);
  };

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.35, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
    >
      <div className="mx-auto max-w-xl px-3 pb-3 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl">
          {/* Main bar: version tabs + accent dot */}
          <div className="flex items-center gap-0.5 px-1.5 py-1.5">
            {/* Version tabs */}
            {UI_VERSIONS.map((versionId) => {
              const meta = VERSION_METADATA[versionId];
              const isActive = currentVersion === versionId;

              return (
                <button
                  key={versionId}
                  onClick={() => handleVersionChange(versionId)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white/[0.12] text-white shadow-sm'
                      : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                    {VERSION_ICONS[versionId]}
                  </span>
                  <span className="hidden sm:inline">{meta.name}</span>
                  <span className="sm:hidden">
                    {versionId === 'current' ? 'Latest' : meta.name.split(':')[0].split(' ')[0]}
                  </span>
                </button>
              );
            })}

            {/* Divider */}
            <div className="w-px h-5 bg-white/[0.08] mx-1 flex-shrink-0" />

            {/* Accent color button */}
            <button
              onClick={() => setShowColors((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-2 rounded-xl text-white/35 hover:text-white/60 hover:bg-white/[0.04] transition-all flex-shrink-0"
              aria-label="Accent color"
            >
              <Palette size={13} className="opacity-60" />
              <div
                className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: ACCENT_COLOR_METADATA[accentColor].value }}
              />
            </button>
          </div>

          {/* Accent color picker — collapsible */}
          <AnimatePresence>
            {showColors && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-center gap-2.5 px-4 pb-2.5 pt-1">
                  {ACCENT_COLORS.map((colorId) => {
                    const meta = ACCENT_COLOR_METADATA[colorId];
                    const isActive = accentColor === colorId;

                    return (
                      <button
                        key={colorId}
                        onClick={() => handleAccentChange(colorId)}
                        title={meta.name}
                        className={`relative w-7 h-7 rounded-full transition-all ${
                          isActive
                            ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-black/60 scale-110'
                            : 'hover:scale-110 opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: meta.value }}
                      >
                        {isActive && (
                          <Check
                            size={13}
                            className="absolute inset-0 m-auto text-white drop-shadow-md"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
