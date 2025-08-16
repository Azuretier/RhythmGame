"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  children: React.ReactNode;
  isBackgroundLoaded: boolean; // 🔑 we pass this from RainEffect
};

export default function WipeTransition({ children, isBackgroundLoaded}: Props) {
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    if (isBackgroundLoaded) {
      // start wipe after background finishes loading
      const timer = setTimeout(() => {
        setShowOverlay(false);
      }, 500); // small delay before wipe starts
      return () => clearTimeout(timer);
    }
  }, [isBackgroundLoaded]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {children}

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: "-100%" }}
            exit={{ y: "-100%" }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="fixed inset-0 bg-black z-[9999]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
