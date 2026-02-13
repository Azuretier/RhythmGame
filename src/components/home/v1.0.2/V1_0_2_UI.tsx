"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import styles from "./V1_0_2_UI.module.css";

const MinecraftPanorama = dynamic(() => import("./MinecraftPanorama"), {
  ssr: false,
});

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
 * Features the classic rotating panorama background with console edition button layout
 */
export default function V1_0_2_UI() {
  const [splash] = useState(
    () => SPLASH_TEXTS[Math.floor(Math.random() * SPLASH_TEXTS.length)]
  );

  const menuItems = [
    {
      label: "Play Game",
      primary: true,
      href: "/rhythmia",
    },
    {
      label: "Minigames",
      href: "/rhythmia",
    },
    {
      label: "Store",
      href: "#",
      disabled: true,
    },
    {
      label: "How to Play",
      href: "/blog",
    },
    {
      label: "Settings",
      href: "#",
      disabled: true,
    },
  ];

  const handleClick = (href: string, disabled?: boolean) => {
    if (disabled) return;
    if (href === "#") return;
    window.location.href = href;
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Panorama background */}
      <MinecraftPanorama />

      {/* Vignette overlay */}
      <div className={styles.vignette} />
      <div className={styles.gradientOverlay} />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
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
            onClick={() => handleClick(menuItems[0].href)}
          >
            {menuItems[0].label}
          </button>

          {/* Minigames | Store */}
          <div className={styles.menuRow}>
            <button
              className={styles.mcButton}
              onClick={() => handleClick(menuItems[1].href)}
            >
              {menuItems[1].label}
            </button>
            <button
              className={styles.mcButton}
              disabled={menuItems[2].disabled}
              onClick={() => handleClick(menuItems[2].href, menuItems[2].disabled)}
            >
              {menuItems[2].label}
            </button>
          </div>

          {/* How to Play | Settings */}
          <div className={styles.menuRow}>
            <button
              className={styles.mcButton}
              onClick={() => handleClick(menuItems[3].href)}
            >
              {menuItems[3].label}
            </button>
            <button
              className={styles.mcButton}
              disabled={menuItems[4].disabled}
              onClick={() => handleClick(menuItems[4].href, menuItems[4].disabled)}
            >
              {menuItems[4].label}
            </button>
          </div>
        </motion.div>
      </div>

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
