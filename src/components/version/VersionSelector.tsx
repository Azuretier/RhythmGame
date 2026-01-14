"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UIVersion, VERSION_METADATA, UI_VERSIONS } from "@/lib/version/types";
import { MessageCircle, Heart } from "lucide-react";

interface VersionSelectorProps {
  onSelect: (version: UIVersion) => void;
}

export default function VersionSelector({ onSelect }: VersionSelectorProps) {
  const getIcon = (version: UIVersion) => {
    switch (version) {
      case "1.0.0":
        return <MessageCircle className="w-12 h-12" />;
      case "1.0.1":
        return <Heart className="w-12 h-12" />;
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
          className="relative max-w-4xl mx-4 p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl"
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-2xl pointer-events-none" />
          <div className="absolute inset-0 backdrop-blur-3xl rounded-2xl pointer-events-none" />

          <div className="relative z-10">
            <motion.h2
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            >
              Choose Your Experience
            </motion.h2>

            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-400 text-center mb-8"
            >
              Select the interface that suits your style. You can change this
              later.
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {UI_VERSIONS.map((version, index) => {
                const metadata = VERSION_METADATA[version];
                return (
                  <motion.button
                    key={version}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelect(version)}
                    className="group relative p-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-300 overflow-hidden"
                  >
                    {/* Hover gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300" />

                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                      {/* Icon */}
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full text-blue-400 group-hover:text-blue-300 transition-colors"
                      >
                        {getIcon(version)}
                      </motion.div>

                      {/* Title */}
                      <h3 className="text-2xl font-bold text-white">
                        {metadata.name}
                      </h3>

                      {/* Version */}
                      <span className="text-sm text-gray-500 font-mono">
                        v{metadata.version}
                      </span>

                      {/* Description */}
                      <p className="text-gray-400 text-sm">
                        {metadata.description}
                      </p>

                      {/* Select indicator */}
                      <div className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Select
                      </div>
                    </div>

                    {/* Shine effect */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      initial={false}
                      animate={{
                        background: [
                          "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
                          "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
                        ],
                        backgroundPosition: ["-200% 0", "200% 0"],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
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
