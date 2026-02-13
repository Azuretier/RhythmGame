/**
 * Floating version switcher button for the home page
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ArrowRight, Check, Layers } from 'lucide-react';
import { useVersion } from '@/lib/version/context';
import { VERSIONS, type AppVersion } from '@/lib/version/types';
import { useRouter } from 'next/navigation';

export default function FloatingVersionSwitcher() {
  const router = useRouter();
  const { currentVersion, setVersion } = useVersion();
  const [isOpen, setIsOpen] = useState(false);

  const handleVersionChange = (version: AppVersion) => {
    setVersion(version);
    setIsOpen(false);
    
    // Navigate to the appropriate page
    // Use window.location.href for full reload to ensure clean state
    if (version === '1.0.0') {
      window.location.href = '/';
    } else if (version === '1.0.1') {
      window.location.href = '/current';
    } else if (version === '1.0.2') {
      window.location.href = '/';
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-2xl flex items-center justify-center hover:shadow-purple-500/50 transition-shadow"
        title="Version Settings"
      >
        <Settings className="text-white" size={24} />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-6">
                <div className="flex items-center gap-3">
                  <Layers className="text-white" size={32} />
                  <div>
                    <h2 className="text-2xl font-black text-white">Version Selection</h2>
                    <p className="text-white/80 text-sm">Choose your preferred interface</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {Object.values(VERSIONS).map((version) => {
                  const isSelected = currentVersion === version.id;
                  
                  return (
                    <motion.button
                      key={version.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleVersionChange(version.id)}
                      className={`
                        w-full p-5 rounded-xl border-2 transition-all text-left
                        ${isSelected 
                          ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-400 shadow-xl'
                          : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-blue-400" />
                          <span className="text-purple-300 font-mono font-bold text-sm">
                            v{version.id}
                          </span>
                          {isSelected && (
                            <div className="flex items-center gap-1 bg-purple-500/20 px-2 py-0.5 rounded-full">
                              <Check size={12} className="text-purple-300" />
                              <span className="text-purple-300 text-xs font-medium">Active</span>
                            </div>
                          )}
                        </div>
                        {!isSelected && (
                          <ArrowRight className="text-white/40" size={20} />
                        )}
                      </div>
                      
                      <h3 className="text-white font-bold text-lg mb-2">
                        {version.name}
                      </h3>
                      <p className="text-white/60 text-sm">
                        {version.description}
                      </p>
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-6 bg-white/5 border-t border-white/10">
                <p className="text-white/40 text-xs text-center">
                  Changing the version will reload the page with the selected interface.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
