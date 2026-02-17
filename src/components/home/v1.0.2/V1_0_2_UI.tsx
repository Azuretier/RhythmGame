"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./V1_0_2_UI.module.css";
import MinecraftBlogPage from "./MinecraftBlogPage";

const MinecraftPanorama = dynamic(() => import("./MinecraftPanorama"), {
  ssr: false,
});

type Screen = "main" | "blog";

const SPLASH_TEXTS = [
  "Also try Terraria!",
  "Techno never dies!",
  "100% Azure!",
  "Now with more pixels!",
  "Built with Next.js!",
  "Blocks and code!",
  "Open source!",
  "TypeScript edition!",
];

/**
 * v1.0.2 UI - Minecraft: Switch Edition style menu
 * Features the classic rotating panorama background with console edition button layout.
 * Sub-screens (blog, etc.) render as in-app panels over the panorama.
 */
export default function V1_0_2_UI() {
  const [screen, setScreen] = useState<Screen>("main");
  const [splash] = useState(
    () => SPLASH_TEXTS[Math.floor(Math.random() * SPLASH_TEXTS.length)]
  );

  const handleNavigate = (href: string, disabled?: boolean) => {
    if (disabled) return;
    if (href === "#") return;
    // In-app screens
    if (href === "blog") {
      setScreen("blog");
      return;
    }
    // External routes
    window.location.href = href;
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Panorama background */}
      <MinecraftPanorama />

      {/* Vignette overlay */}
      <div className={styles.vignette} />
      <div className={styles.gradientOverlay} />

      {/* Screen content */}
      <AnimatePresence mode="wait">
        {screen === "main" && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 flex flex-col items-center justify-center h-full"
          >
            {/* Title section */}
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center mb-8"
            >
              <h1 className={styles.mcTitle}>MINECRAFT</h1>
              <div className="relative mt-1">
                <span className={styles.mcSubtitle}>Switch Edition</span>
                {/* Splash text */}
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4, type: "spring" }}
                  className={styles.splashText}
                  style={{
                    position: "absolute",
                    left: "110%",
                    top: "-12px",
                  }}
                >
                  {splash}
                </motion.span>
              </div>
            </motion.div>

            {/* Menu buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className={styles.menuContainer}
            >
              {/* Play Game - full width primary button */}
              <button
                className={styles.mcButtonPrimary}
                style={{ width: "100%" }}
                onClick={() => handleNavigate("/rhythmia")}
              >
                Play Game
              </button>

              {/* Minigames | Store */}
              <div className={styles.menuRow}>
                <button
                  className={styles.mcButton}
                  onClick={() => handleNavigate("/rhythmia")}
                >
                  Minigames
                </button>
                <button
                  className={styles.mcButton}
                  disabled
                >
                  Store
                </button>
              </div>

              {/* How to Play | Settings */}
              <div className={styles.menuRow}>
                <button
                  className={styles.mcButton}
                  onClick={() => handleNavigate("blog")}
                >
                  How to Play
                </button>
                <button
                  className={styles.mcButton}
                  disabled
                >
                  Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {screen === "blog" && (
          <MinecraftBlogPage
            key="blog"
            onBack={() => setScreen("main")}
          />
        )}
      </AnimatePresence>

      {/* Bottom info bar */}
      <div className={styles.bottomBar}>
        <span className={styles.bottomBarText}>
          azuretier.net v1.0.2
        </span>
        <span className={styles.bottomBarText}>
          TU76 / 1.95 / CU64
        </span>
      </div>
    </div>
  );
}
