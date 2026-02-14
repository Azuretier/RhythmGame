'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Check, Gamepad2, MessageCircle, Heart, Palette, Box } from 'lucide-react';
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
  current: <Gamepad2 size={20} />,
  '1.0.0': <MessageCircle size={20} />,
  '1.0.1': <Heart size={20} />,
  '1.0.2': <Box size={20} />,
};

export default function FloatingVersionSwitcher() {
  const { currentVersion, setVersion, accentColor, setAccentColor } = useVersion();
  const [isOpen, setIsOpen] = useState(false);

  const handleVersionChange = (version: UIVersion) => {
    if (version === currentVersion) return;
    setVersion(version);
    setIsOpen(false);

    // Full reload to ensure clean state when switching versions
    window.location.href = '/';
  };

  const handleAccentChange = (color: AccentColor) => {
    setAccentColor(color);
  };

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors shadow-lg"
        aria-label="Site settings"
      >
        <Settings size={20} />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />

            {/* Settings drawer — slides up on mobile, centered modal on desktop */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:fixed md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:right-auto"
            >
              <div className="bg-[#1a1b1e] rounded-t-2xl md:rounded-2xl border-t border-white/10 md:border shadow-2xl max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white">Site Settings</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* ── Version Section ── */}
                  <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
                      Site Version
                    </h4>
                    <div className="space-y-2">
                      {UI_VERSIONS.map((versionId) => {
                        const meta = VERSION_METADATA[versionId];
                        const isActive = currentVersion === versionId;

                        return (
                          <button
                            key={versionId}
                            onClick={() => handleVersionChange(versionId)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                              isActive
                                ? 'bg-white/10 border-white/20'
                                : 'bg-white/[0.03] border-transparent hover:bg-white/[0.06] hover:border-white/10'
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                                isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40'
                              }`}
                            >
                              {VERSION_ICONS[versionId]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white truncate">
                                  {meta.name}
                                </span>
                                <span className="text-[10px] font-mono text-white/30">
                                  {versionId === 'current' ? 'latest' : `v${versionId}`}
                                </span>
                              </div>
                              <p className="text-xs text-white/40 truncate">{meta.description}</p>
                            </div>
                            {isActive && (
                              <Check size={16} className="flex-shrink-0 text-emerald-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* ── Appearance Section ── */}
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Palette size={14} className="text-white/40" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                        Accent Color
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {ACCENT_COLORS.map((colorId) => {
                        const meta = ACCENT_COLOR_METADATA[colorId];
                        const isActive = accentColor === colorId;

                        return (
                          <button
                            key={colorId}
                            onClick={() => handleAccentChange(colorId)}
                            title={meta.name}
                            className={`relative w-10 h-10 rounded-full transition-all ${
                              isActive
                                ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-[#1a1b1e] scale-110'
                                : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: meta.value }}
                          >
                            {isActive && (
                              <Check size={16} className="absolute inset-0 m-auto text-white drop-shadow-md" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-white/5">
                  <p className="text-[11px] text-white/25 text-center">
                    Settings are saved locally in your browser.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
