"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useVersion } from "@/lib/version/context";
import styles from "./MinecraftPanoramaUI.module.css";
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
  "Woo, azuretier.net!",
  "Isn't this cool?",
  "Pumpkin pie!",
  "HURNERJSANSEN!",
  "Also try Minecraft!",
  "Singleplayer!",
  "minecraftforum.net!",
];

/**
 * Minecraft: Nintendo Switch Edition — Title Screen
 * Faithful recreation of the console edition main menu with rotating panorama,
 * 3D stone-carved logo, console-style buttons, and controller button hints.
 */
export default function MinecraftPanoramaUI() {
  const { setVersion } = useVersion();
  const [screen, setScreen] = useState<Screen>("main");
  const [splash] = useState(
    () => SPLASH_TEXTS[Math.floor(Math.random() * SPLASH_TEXTS.length)]
  );

  const handlePlayGame = () => {
    setVersion("current");
    window.location.href = "/";
  };

  return (
    <div className={styles.titleScreen}>
      {/* Rotating panorama background */}
      <MinecraftPanorama />

      {/* Console edition overlays */}
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
            transition={{ duration: 0.3 }}
            className={styles.mainScreen}
          >
            {/* Logo section */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={styles.logoSection}
            >
              <h1 className={styles.minecraftLogo}>MINECRAFT</h1>
              <p className={styles.editionSubtitle}>Nintendo Switch Edition</p>

              {/* Splash text */}
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4, type: "spring" }}
                className={styles.splashText}
              >
                {splash}
              </motion.span>
            </motion.div>

            {/* Console edition menu buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className={styles.menuContainer}
            >
              {/* Play Game — full width green primary button */}
              <button
                className={`${styles.switchBtn} ${styles.switchBtnPrimary}`}
                onClick={handlePlayGame}
              >
                Play Game
              </button>

              {/* Minigames | Store */}
              <div className={styles.menuRow}>
                <button className={styles.switchBtn} onClick={handlePlayGame}>
                  Minigames
                </button>
                <button className={styles.switchBtn} disabled>
                  Store
                </button>
              </div>

              {/* How to Play | Settings */}
              <div className={styles.menuRow}>
                <button
                  className={styles.switchBtn}
                  onClick={() => setScreen("blog")}
                >
                  How to Play
                </button>
                <button className={styles.switchBtn} disabled>
                  Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {screen === "blog" && (
          <MinecraftBlogPage key="blog" onBack={() => setScreen("main")} />
        )}
      </AnimatePresence>

      {/* Bottom bar — copyright, version, credits */}
      <div className={styles.bottomBar}>
        <span className={styles.bottomText}>&copy;Mojang AB</span>
        <span className={styles.bottomText}>azuretier.net v1.0.2</span>
        <span className={styles.bottomText}>4J Studios</span>
      </div>

      {/* Controller button hints */}
      <div className={styles.controllerHints}>
        <div className={styles.hintItem}>
          <span className={styles.btnIcon}>A</span>
          <span className={styles.hintLabel}>Select</span>
        </div>
        <div className={styles.hintItem}>
          <span className={styles.btnIcon}>B</span>
          <span className={styles.hintLabel}>Back</span>
        </div>
      </div>
    </div>
  );
}
