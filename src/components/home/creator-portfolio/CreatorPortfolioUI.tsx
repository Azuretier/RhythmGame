"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Instagram,
  Github,
  Youtube,
  Twitter,
  ExternalLink,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  TrendingUp,
  Users,
  Star,
  Clock,
  Image as ImageIcon,
  ChevronRight,
  Bell,
  Coffee,
  Zap,
  Crown,
  Check,
} from "lucide-react";
import { FaDiscord } from "react-icons/fa";

type Tab = "posts" | "about" | "membership";

interface Post {
  id: number;
  title: string;
  content: string;
  date: string;
  likes: number;
  comments: number;
  category: string;
  categoryColor: string;
  pinned?: boolean;
  hasImage?: boolean;
}

const socialLinks = [
  {
    icon: <Twitter size={18} />,
    label: "X (Twitter)",
    handle: "@c2c546",
    url: "https://x.com/c2c546",
    color: "hover:bg-gray-700/60",
    iconColor: "text-gray-400",
    hoverIcon: "group-hover:text-white",
  },
  {
    icon: <Youtube size={18} />,
    label: "YouTube",
    handle: "@azuretya",
    url: "https://www.youtube.com/@azuretya",
    color: "hover:bg-red-500/10",
    iconColor: "text-gray-400",
    hoverIcon: "group-hover:text-red-500",
  },
  {
    icon: <FaDiscord size={18} />,
    label: "Discord",
    handle: "Join Server",
    url: "https://discord.gg/TRFHTWCY4W",
    color: "hover:bg-indigo-500/10",
    iconColor: "text-gray-400",
    hoverIcon: "group-hover:text-indigo-400",
  },
  {
    icon: <Instagram size={18} />,
    label: "Instagram",
    handle: "@azuqun1",
    url: "https://www.instagram.com/azuqun1",
    color: "hover:bg-pink-500/10",
    iconColor: "text-gray-400",
    hoverIcon: "group-hover:text-pink-500",
  },
  {
    icon: <Github size={18} />,
    label: "GitHub",
    handle: "Azuretier",
    url: "https://github.com/Azuretier",
    color: "hover:bg-gray-600/30",
    iconColor: "text-gray-400",
    hoverIcon: "group-hover:text-white",
  },
];

const posts: Post[] = [
  {
    id: 0,
    title: "RHYTHMIA is Now Live!",
    content:
      "The moment we've all been waiting for — RHYTHMIA, the rhythm-powered puzzle game, is officially playable! Features include solo mode, 1v1 multiplayer battles, ranked matchmaking, and a 9-player arena mode. Jump in and show us your best scores!",
    date: "2026-01-15",
    likes: 67,
    comments: 12,
    category: "Announcement",
    categoryColor: "bg-blue-500/20 text-blue-400",
    pinned: true,
    hasImage: true,
  },
  {
    id: 1,
    title: "Welcome to Azuret.me",
    content:
      "Hey everyone! Welcome to my personal space on the web. I'm working on some exciting projects, and I'll be sharing updates here. Stay tuned!",
    date: "2026-01-14",
    likes: 42,
    comments: 8,
    category: "Update",
    categoryColor: "bg-emerald-500/20 text-emerald-400",
  },
  {
    id: 2,
    title: "New Discord Bot Features",
    content:
      "I've been working on some amazing new features for the Discord bot. Check out the rank card system and role selection features! The rank cards now support custom backgrounds, XP tracking, and animated level-up effects.",
    date: "2026-01-13",
    likes: 28,
    comments: 5,
    category: "Dev Log",
    categoryColor: "bg-purple-500/20 text-purple-400",
  },
  {
    id: 3,
    title: "GPU-Rendered Backgrounds",
    content:
      "The new WebGL/WebGPU background renderer is live! It creates stunning atmospheric effects with city silhouettes and fog layers. We're pushing the boundaries of what's possible in a web browser.",
    date: "2026-01-12",
    likes: 35,
    comments: 3,
    category: "Dev Log",
    categoryColor: "bg-purple-500/20 text-purple-400",
    hasImage: true,
  },
];

const membershipTiers = [
  {
    name: "Supporter",
    price: "Free",
    icon: <Coffee size={20} />,
    color: "from-gray-600 to-gray-700",
    borderColor: "border-gray-600",
    benefits: ["Access to public posts", "Community chat", "Project updates"],
    current: true,
  },
  {
    name: "Creator",
    price: "$5/mo",
    icon: <Zap size={20} />,
    color: "from-blue-600 to-blue-700",
    borderColor: "border-blue-500",
    benefits: [
      "All Supporter benefits",
      "Early access to features",
      "Dev log & behind-the-scenes",
      "Priority bug reports",
    ],
  },
  {
    name: "Champion",
    price: "$15/mo",
    icon: <Crown size={20} />,
    color: "from-amber-600 to-orange-600",
    borderColor: "border-amber-500",
    benefits: [
      "All Creator benefits",
      "Custom in-game profile badge",
      "Name in credits",
      "Direct message access",
      "Vote on upcoming features",
    ],
  },
];

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CreatorPortfolioUI() {
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
  const [expandedPost, setExpandedPost] = useState<number | null>(null);

  const toggleLike = (postId: number) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const toggleSave = (postId: number) => {
    setSavedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "posts", label: "Posts", icon: <MessageCircle size={16} /> },
    { id: "about", label: "About", icon: <Users size={16} /> },
    { id: "membership", label: "Membership", icon: <Star size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Cover Banner */}
      <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-purple-600/30 to-pink-600/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute top-20 right-20 w-60 h-60 rounded-full bg-purple-500 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-40 rounded-full bg-pink-500 blur-3xl" />
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl -mt-20 relative z-10">
        {/* Profile Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row items-start gap-5 mb-8"
        >
          {/* Avatar */}
          <motion.div whileHover={{ scale: 1.03 }} className="relative flex-shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-[3px] shadow-xl shadow-purple-500/20">
              <div className="w-full h-full rounded-[13px] bg-[#12121a] overflow-hidden">
                <img
                  src="/profile_image/Switch_Edition.png"
                  alt="Azur"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#23a559] rounded-lg border-[3px] border-[#0a0a0f] flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          </motion.div>

          {/* Name, title, and actions */}
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  Azur
                  <span className="text-xs font-medium bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                    Creator
                  </span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  Creator of RHYTHMIA — building rhythm-powered games & web experiences
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-orange-500/30 transition-shadow"
                >
                  <Heart size={16} />
                  Support
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Bell size={18} />
                </motion.button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-6 mt-4">
              {[
                { label: "Projects", value: "42", icon: <TrendingUp size={14} /> },
                { label: "Followers", value: "1.2k", icon: <Users size={14} /> },
                { label: "Posts", value: String(posts.length), icon: <MessageCircle size={14} /> },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-1.5 text-sm">
                  <span className="text-gray-500">{stat.icon}</span>
                  <span className="font-bold text-white">{stat.value}</span>
                  <span className="text-gray-500">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="border-b border-white/5 mb-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === "posts" && (
                <motion.div
                  key="posts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {posts.map((post, index) => {
                    const isLiked = likedPosts.has(post.id);
                    const isSaved = savedPosts.has(post.id);
                    const isExpanded = expandedPost === post.id;

                    return (
                      <motion.article
                        key={post.id}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.08 }}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/10 transition-colors"
                      >
                        {/* Post header */}
                        <div className="px-5 pt-5 pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">A</span>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-white font-semibold text-sm">
                                    Azur
                                  </span>
                                  <span
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${post.categoryColor}`}
                                  >
                                    {post.category}
                                  </span>
                                  {post.pinned && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                                      Pinned
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                                  <Clock size={11} />
                                  <span>{formatRelativeDate(post.date)}</span>
                                </div>
                              </div>
                            </div>
                            <button className="text-gray-500 hover:text-gray-300 transition-colors p-1 flex-shrink-0">
                              <MoreHorizontal size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Post content */}
                        <div className="px-5 py-3">
                          <h3 className="text-lg font-bold text-white mb-2">
                            {post.title}
                          </h3>
                          <p className="text-gray-400 text-sm leading-relaxed">
                            {post.content}
                          </p>
                        </div>

                        {/* Post image placeholder */}
                        {post.hasImage && (
                          <div className="mx-5 mb-3 h-44 rounded-lg bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 flex items-center justify-center">
                            <ImageIcon size={28} className="text-gray-600" />
                          </div>
                        )}

                        {/* Post actions */}
                        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => toggleLike(post.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                                isLiked
                                  ? "text-red-400 bg-red-500/10"
                                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                              }`}
                            >
                              <Heart
                                size={16}
                                className={isLiked ? "fill-current" : ""}
                              />
                              <span>
                                {post.likes + (isLiked ? 1 : 0)}
                              </span>
                            </motion.button>
                            <button
                              onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                            >
                              <MessageCircle size={16} />
                              <span>{post.comments}</span>
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                              <Share2 size={16} />
                            </button>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => toggleSave(post.id)}
                            className={`p-1.5 rounded-lg transition-all ${
                              isSaved
                                ? "text-blue-400 bg-blue-500/10"
                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                            }`}
                          >
                            <Bookmark
                              size={18}
                              className={isSaved ? "fill-current" : ""}
                            />
                          </motion.button>
                        </div>

                        {/* Comment section (expandable) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
                                <div className="flex gap-3">
                                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[10px] font-bold">
                                      N
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-white text-xs font-semibold">
                                        Neon
                                      </span>
                                      <span className="text-gray-600 text-[10px]">
                                        2h ago
                                      </span>
                                    </div>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                      This is amazing! Can&apos;t wait for more updates.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[10px] font-bold">
                                      Y
                                    </span>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Write a comment..."
                                    className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500/30 transition-colors"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.article>
                    );
                  })}
                </motion.div>
              )}

              {activeTab === "about" && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">
                      About Azur
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                      Creator of RHYTHMIA, a rhythm-powered puzzle game. I build
                      web experiences with Next.js, TypeScript, Three.js, and
                      WebGL/WebGPU. When I&apos;m not coding, I&apos;m designing game
                      mechanics or tinkering with Discord bots.
                    </p>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      This site features multiplayer rhythm battles, ranked
                      matchmaking, a 9-player arena mode, a Minecraft-style
                      board game, interactive stories, and much more. Use the
                      settings button at the bottom right to explore different
                      UI themes!
                    </p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">
                      What I&apos;m Working On
                    </h3>
                    <div className="space-y-4">
                      {[
                        {
                          label: "RHYTHMIA Arena Mode",
                          progress: 85,
                          color: "from-blue-500 to-cyan-500",
                        },
                        {
                          label: "Minecraft Board Game",
                          progress: 60,
                          color: "from-emerald-500 to-green-500",
                        },
                        {
                          label: "Story Mode Chapters",
                          progress: 40,
                          color: "from-purple-500 to-pink-500",
                        },
                      ].map((project) => (
                        <div key={project.label}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-300">
                              {project.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {project.progress}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${project.progress}%` }}
                              transition={{
                                duration: 1,
                                delay: 0.3,
                                ease: "easeOut",
                              }}
                              className={`h-full bg-gradient-to-r ${project.color} rounded-full`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">
                      Tech Stack
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Next.js",
                        "React",
                        "TypeScript",
                        "Tailwind CSS",
                        "Three.js",
                        "WebGL",
                        "Socket.IO",
                        "Firebase",
                        "Framer Motion",
                        "Radix UI",
                      ].map((tech) => (
                        <span
                          key={tech}
                          className="px-3 py-1 text-xs font-medium bg-white/5 border border-white/5 rounded-full text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "membership" && (
                <motion.div
                  key="membership"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-bold text-white mb-2">
                      Support the Project
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Your support helps keep RHYTHMIA free to play and enables
                      new features, game modes, and content. Pick a tier that
                      works for you!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {membershipTiers.map((tier, index) => (
                      <motion.div
                        key={tier.name}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 + index * 0.1 }}
                        className={`bg-white/[0.03] border rounded-xl p-5 flex flex-col ${
                          tier.current
                            ? "border-green-500/30"
                            : "border-white/[0.06] hover:border-white/10"
                        } transition-colors`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4`}
                        >
                          {tier.icon}
                        </div>
                        <h4 className="text-white font-bold text-lg">
                          {tier.name}
                        </h4>
                        <p className="text-2xl font-bold text-white mt-1 mb-4">
                          {tier.price}
                        </p>
                        <ul className="space-y-2 flex-1">
                          {tier.benefits.map((benefit) => (
                            <li
                              key={benefit}
                              className="flex items-start gap-2 text-sm text-gray-400"
                            >
                              <ChevronRight
                                size={14}
                                className="text-gray-600 mt-0.5 flex-shrink-0"
                              />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                        <button
                          className={`mt-4 w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                            tier.current
                              ? "bg-green-500/10 text-green-400 border border-green-500/20 cursor-default"
                              : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                          }`}
                        >
                          {tier.current ? "Current Tier" : "Join"}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-4 space-y-4"
          >
            {/* Social Links */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
                Connect
              </h3>
              <div className="space-y-1">
                {socialLinks.map((link, index) => (
                  <motion.a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ x: 10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.35 + index * 0.04 }}
                    className={`flex items-center gap-3 p-2.5 rounded-lg ${link.color} transition-all group`}
                  >
                    <div
                      className={`${link.iconColor} ${link.hoverIcon} transition-colors flex-shrink-0`}
                    >
                      {link.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">
                        {link.label}
                      </div>
                      <div className="text-[11px] text-gray-600 truncate">
                        {link.handle}
                      </div>
                    </div>
                    <ExternalLink
                      size={12}
                      className="text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0"
                    />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Community Goal */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
                Community Goal
              </h3>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white font-medium">
                    Discord Members
                  </span>
                  <span className="text-xs text-gray-500">245 / 500</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "49%" }}
                    transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                When we reach 500 members, a special community event will be
                unlocked!
              </p>
            </div>

            {/* Quick Links */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
                Quick Links
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Play RHYTHMIA", desc: "Jump into the game" },
                  { label: "Join Discord", desc: "Chat with the community" },
                  { label: "View Wiki", desc: "Game documentation" },
                ].map((link) => (
                  <button
                    key={link.label}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
                  >
                    <div>
                      <div className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">
                        {link.label}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        {link.desc}
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-gray-600 group-hover:text-gray-400 transition-colors"
                    />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
