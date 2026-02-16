'use client';

import { motion, AnimatePresence } from "framer-motion";
import { UIVersion, VERSION_METADATA, UI_VERSIONS } from "@/lib/version/types";
import { MessageCircle, Heart, Gamepad2, Grid3x3 } from "lucide-react";

interface VersionSelectorProps {
  onSelect: (version: UIVersion) => void;
}

export default function VersionSelector({ onSelect }: VersionSelectorProps) {
  const getIcon = (version: UIVersion) => {
    switch (version) {
      case "current":
        return <Gamepad2 className="w-12 h-12" />;
      case "1.0.0":
        return <MessageCircle className="w-12 h-12" />;
      case "1.0.1":
        return <Heart className="w-12 h-12" />;
      case "1.0.2":
        return <Grid3x3 className="w-12 h-12" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ delay: 0.1 }}
          className="relative w-full max-w-3xl mx-4 p-8 bg-[#1a1b1e] rounded-2xl border border-white/10 shadow-2xl"
        >
          <div className="relative z-10">
            <motion.h2
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-center mb-2 text-white"
            >
              Choose Your Experience
            </motion.h2>

            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/40 text-center mb-8 text-sm"
            >
              Select the interface that suits your style. You can change this
              later in settings.
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UI_VERSIONS.map((version, index) => {
                const metadata = VERSION_METADATA[version];
                return (
                  <motion.button
                    key={version}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.08 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(version)}
                    className="group relative flex items-center gap-4 p-5 bg-white/[0.03] rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.06] transition-all text-left"
                  >
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/5 group-hover:bg-white/10 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                      {VERSION_ICONS[version]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-white">
                          {metadata.name}
                        </h3>
                        <span className="text-[10px] font-mono text-white/25">
                          {version === 'current' ? 'latest' : `v${version}`}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">
                        {metadata.description}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
