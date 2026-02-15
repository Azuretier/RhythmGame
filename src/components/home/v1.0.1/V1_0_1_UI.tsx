"use client";

import { motion } from "framer-motion";
import { Heart, Instagram, Github, Youtube, Twitter, ExternalLink } from "lucide-react";
import { FaDiscord } from "react-icons/fa";

/**
 * v1.0.1 UI - Patreon-style creator layout
 * Features a profile card, content feed, and social links sidebar
 */
export default function V1_0_1_UI() {
  const socialLinks = [
    { icon: <Twitter />, label: "X (Twitter)", url: "https://x.com/c2c546", color: "hover:text-blue-400" },
    { icon: <Youtube />, label: "YouTube", url: "https://www.youtube.com/@azuretya", color: "hover:text-red-500" },
    { icon: <FaDiscord />, label: "Discord", url: "https://discord.gg/TRFHTWCY4W", color: "hover:text-indigo-400" },
    { icon: <Instagram />, label: "Instagram", url: "https://www.instagram.com/azuqun1", color: "hover:text-pink-500" },
    { icon: <Github />, label: "GitHub", url: "https://github.com/Azuretier", color: "hover:text-gray-300" },
  ];

  const posts = [
    {
      id: 1,
      title: "Welcome to Azuret.me",
      content: "Hey everyone! Welcome to my personal space on the web. I'm working on some exciting projects, and I'll be sharing updates here. Stay tuned!",
      date: "2026-01-14",
      likes: 42,
    },
    {
      id: 2,
      title: "New Discord Bot Features",
      content: "I've been working on some amazing new features for the Discord bot. Check out the rank card system and role selection features!",
      date: "2026-01-13",
      likes: 28,
    },
    {
      id: 3,
      title: "GPU-Rendered Backgrounds",
      content: "The new WebGL/WebGPU background renderer is live! It creates stunning atmospheric effects with city silhouettes and fog layers.",
      date: "2026-01-12",
      likes: 35,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Profile Card */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4 xl:col-span-3"
          >
            <div className="sticky top-8 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6 space-y-6">
              {/* Profile Image */}
              <div className="flex justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative"
                >
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-1">
                    <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                      <img
                        src="/profile_image/Switch_Edition.png"
                        alt="Azur"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-800"></div>
                </motion.div>
              </div>

              {/* Name and Title */}
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white">Azur</h1>
                <p className="text-gray-400 text-sm mt-1">Creator & Developer</p>
              </div>

              {/* Bio */}
              <p className="text-gray-300 text-sm text-center leading-relaxed">
                Creator of RHYTHMIA, a rhythm-powered puzzle game. Building web experiences
                with Next.js, TypeScript, and Discord bots. Use the settings button
                at the bottom right to switch between different UI themes.
              </p>

              {/* Support Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/50 transition-shadow"
              >
                <Heart className="w-5 h-5" />
                Support Me
              </motion.button>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">42</div>
                  <div className="text-xs text-gray-400">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">1.2k</div>
                  <div className="text-xs text-gray-400">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">89</div>
                  <div className="text-xs text-gray-400">Posts</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Center - Content Feed */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-8 xl:col-span-6 space-y-6"
          >
            <h2 className="text-3xl font-bold text-white mb-6">Recent Posts</h2>
            
            {posts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{post.title}</h3>
                  <span className="text-sm text-gray-500">{post.date}</span>
                </div>
                <p className="text-gray-300 mb-4">{post.content}</p>
                <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Heart className="w-5 h-5" />
                    <span className="text-sm">{post.likes}</span>
                  </motion.button>
                </div>
              </motion.article>
            ))}
          </motion.div>

          {/* Right Sidebar - Social Links */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-12 xl:col-span-3"
          >
            <div className="sticky top-8 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Connect With Me</h3>
              <div className="space-y-3">
                {socialLinks.map((link, index) => (
                  <motion.a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    whileHover={{ x: 5 }}
                    className={`flex items-center gap-3 p-3 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 text-gray-300 ${link.color} transition-all`}
                  >
                    <div className="w-6 h-6">{link.icon}</div>
                    <span className="text-sm font-medium flex-1">{link.label}</span>
                    <ExternalLink size={14} className="opacity-30" />
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
