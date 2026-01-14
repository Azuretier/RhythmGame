/**
 * Version selector component
 * Displays after loading screen to let user choose between app versions
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { VERSIONS, type AppVersion } from '@/lib/version/types';
import { useState } from 'react';

interface VersionSelectorProps {
  onSelect: (version: AppVersion) => void;
}

export default function VersionSelector({ onSelect }: VersionSelectorProps) {
  const [selectedVersion, setSelectedVersion] = useState<AppVersion | null>(null);
  const [hoveredVersion, setHoveredVersion] = useState<AppVersion | null>(null);

  const handleSelect = (version: AppVersion) => {
    setSelectedVersion(version);
    // Small delay for animation before transitioning
    setTimeout(() => {
      onSelect(version);
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
    >
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 max-w-5xl w-full mx-auto px-8">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="text-purple-400" size={40} />
            <h1 className="text-5xl font-black text-white">Select Version</h1>
            <Sparkles className="text-blue-400" size={40} />
          </div>
          <p className="text-white/60 text-lg">
            Choose your preferred experience
          </p>
        </motion.div>

        {/* Version Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.values(VERSIONS).map((version, index) => {
            const isHovered = hoveredVersion === version.id;
            const isSelected = selectedVersion === version.id;

            return (
              <motion.button
                key={version.id}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(version.id)}
                onMouseEnter={() => setHoveredVersion(version.id)}
                onMouseLeave={() => setHoveredVersion(null)}
                className={`
                  relative p-8 rounded-2xl border-2 transition-all duration-300
                  ${isSelected
                    ? 'bg-gradient-to-br from-purple-500/30 to-blue-500/30 border-purple-400 shadow-2xl shadow-purple-500/50'
                    : isHovered
                    ? 'bg-white/10 border-white/40 shadow-xl'
                    : 'bg-white/5 border-white/20 hover:border-white/30'
                  }
                  backdrop-blur-sm
                `}
              >
                {/* Version badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 animate-pulse" />
                    <span className="text-purple-300 font-mono font-bold text-sm">
                      v{version.id}
                    </span>
                  </div>
                  
                  <AnimatePresence>
                    {isHovered && !isSelected && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                      >
                        <ArrowRight className="text-white" size={24} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: 360 }}
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center"
                      >
                        <Sparkles className="text-white" size={16} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Content */}
                <div className="text-left">
                  <h2 className="text-3xl font-black text-white mb-4">
                    {version.name}
                  </h2>
                  <p className="text-white/70 text-base leading-relaxed">
                    {version.description}
                  </p>
                </div>

                {/* Glow effect on hover */}
                {isHovered && (
                  <motion.div
                    layoutId="version-glow"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-xl -z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-white/40 text-sm mt-12"
        >
          You can change your selection later in settings
        </motion.p>
      </div>
    </motion.div>
  );
}
