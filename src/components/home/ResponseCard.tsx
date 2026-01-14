"use client";

import { motion } from "framer-motion";
import type { IntentResult } from "@/lib/intent/parser";

interface ResponseCardProps {
  result: IntentResult;
}

export default function ResponseCard({ result }: ResponseCardProps) {
  if (!result.destination) return null;

  const getGradient = () => {
    const name = result.destination?.name || "";
    if (name.includes("X") || name.includes("Twitter")) {
      return "from-black via-gray-900 to-blue-900";
    }
    if (name.includes("YouTube")) {
      return "from-red-600 via-red-700 to-black";
    }
    if (name.includes("Discord")) {
      return "from-indigo-600 via-purple-600 to-pink-600";
    }
    if (name.includes("GitHub")) {
      return "from-gray-900 via-purple-900 to-violet-900";
    }
    if (name.includes("Instagram")) {
      return "from-purple-600 via-pink-600 to-orange-500";
    }
    return "from-blue-600 via-purple-600 to-pink-600";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-[90%] max-w-md"
      >
        {/* Animated background glow */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`absolute inset-0 bg-gradient-to-br ${getGradient()} blur-3xl rounded-3xl`}
        />

        {/* Card content */}
        <div className="relative bg-[#1e1f22] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center gap-6">
            {/* Icon */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getGradient()} flex items-center justify-center shadow-lg text-4xl`}
            >
              {result.destination.icon}
            </motion.div>

            {/* Message */}
            <div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white mb-2"
              >
                Opening {result.destination.name}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-gray-400"
              >
                Redirecting in a moment...
              </motion.p>
            </div>

            {/* Loading indicator */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5, ease: "linear" }}
              className={`h-1 bg-gradient-to-r ${getGradient()} rounded-full`}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
