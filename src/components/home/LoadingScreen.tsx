"use client";

import { motion } from "framer-motion";

interface LoadingScreenProps {
  progress: number;
  status: string;
}

export default function LoadingScreen({ progress, status }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Status chip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
        >
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-sm text-white/90 font-medium">{status}</span>
        </motion.div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Welcome
          </h1>
          <p className="text-white/60 text-sm md:text-base">
            Initializing experience...
          </p>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="w-64 md:w-80 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </motion.div>

        {/* Progress percentage */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="text-white/40 text-xs font-mono"
        >
          {Math.round(progress)}%
        </motion.div>
      </div>
    </motion.div>
  );
}
