"use client";

import { motion } from "framer-motion";
import styles from "./V1_0_2_UI.module.css";

interface BlogPost {
  id: number;
  title: string;
  date: string;
  description: string;
  tag: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    title: "Welcome to azuretier.net",
    date: "2026-01-14",
    description:
      "Hey everyone! Welcome to my personal space on the web. I'm working on some exciting projects, and I'll be sharing updates here. Stay tuned for new features and content!",
    tag: "Announcements",
  },
  {
    id: 2,
    title: "New Discord Bot Features",
    date: "2026-01-13",
    description:
      "I've been working on some amazing new features for the Discord bot. Check out the rank card system, role selection features, and new community tools.",
    tag: "Discord",
  },
  {
    id: 3,
    title: "GPU-Rendered Backgrounds",
    date: "2026-01-12",
    description:
      "The new WebGL/WebGPU background renderer is live! It creates stunning atmospheric effects with city silhouettes and dynamic fog layers using custom shaders.",
    tag: "Graphics",
  },
  {
    id: 4,
    title: "Rhythmia: Battle Update",
    date: "2026-01-10",
    description:
      "Multiplayer battles are here! Challenge your friends in ranked matchmaking with the new tier system. Climb from Bronze to Azure tier.",
    tag: "Rhythmia",
  },
  {
    id: 5,
    title: "Building a Next.js Portfolio",
    date: "2025-12-25",
    description:
      "A deep dive into building this portfolio with Next.js 16, TypeScript, Three.js, and Tailwind CSS. Covering architecture decisions and performance tips.",
    tag: "Dev",
  },
];

interface MinecraftBlogPageProps {
  onBack: () => void;
}

/**
 * Blog page styled as a Minecraft: Console Edition sub-screen.
 * Renders as a centered panel over the panorama background.
 */
export default function MinecraftBlogPage({ onBack }: MinecraftBlogPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 flex flex-col items-center h-full py-8 px-4"
    >
      {/* Panel container */}
      <div className={styles.mcPanel}>
        {/* Panel title bar */}
        <div className={styles.mcPanelHeader}>
          <h2 className={styles.mcPanelTitle}>How to Play</h2>
        </div>

        {/* Scrollable content area */}
        <div className={styles.mcPanelContent}>
          {BLOG_POSTS.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.06 }}
              className={styles.mcBlogPost}
            >
              <div className={styles.mcBlogPostHeader}>
                <span className={styles.mcBlogTag}>{post.tag}</span>
                <span className={styles.mcBlogDate}>{post.date}</span>
              </div>
              <h3 className={styles.mcBlogPostTitle}>{post.title}</h3>
              <p className={styles.mcBlogPostDesc}>{post.description}</p>
            </motion.article>
          ))}
        </div>

        {/* Bottom button bar */}
        <div className={styles.mcPanelFooter}>
          <button
            className={styles.mcButton}
            onClick={onBack}
            style={{ minWidth: 200 }}
          >
            Done
          </button>
        </div>
      </div>
    </motion.div>
  );
}
