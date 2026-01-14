"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X } from "lucide-react";
import { UIVersion, VERSION_METADATA, UI_VERSIONS } from "@/lib/version/types";
import { setSelectedVersion, getSelectedVersion } from "@/lib/version/storage";

export default function VersionSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const currentVersion = getSelectedVersion();

  const handleVersionChange = (version: UIVersion) => {
    setSelectedVersion(version);
    setIsOpen(false);
    // Reload the page to apply the new version
    window.location.reload();
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.1, rotate: 180 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-shadow"
        aria-label="Version Switcher"
      >
        <Settings className="w-6 h-6 text-white" />
      </motion.button>

      {/* Modal/Drawer */}
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

            {/* Mobile drawer (bottom) / Desktop modal (center) */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:fixed md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto md:right-auto md:w-full md:max-w-md"
            >
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-t-3xl md:rounded-2xl border-t border-gray-700 md:border shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                  <h3 className="text-xl font-bold text-white">
                    Switch UI Version
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Version options */}
                <div className="p-6 space-y-3">
                  {UI_VERSIONS.map((version, index) => {
                    const metadata = VERSION_METADATA[version];
                    const isActive = currentVersion === version;

                    return (
                      <motion.button
                        key={version}
                        onClick={() => handleVersionChange(version)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-4 rounded-xl border transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50"
                            : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-white">
                                {metadata.name}
                              </h4>
                              {isActive && (
                                <span className="text-xs px-2 py-1 bg-blue-500/30 text-blue-300 rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              {metadata.description}
                            </p>
                            <span className="text-xs text-gray-500 font-mono mt-2 block">
                              v{metadata.version}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Footer note */}
                <div className="p-6 border-t border-gray-700">
                  <p className="text-sm text-gray-500 text-center">
                    Switching versions will reload the page
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
