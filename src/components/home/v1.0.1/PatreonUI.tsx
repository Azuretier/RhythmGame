"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, ExternalLink } from "lucide-react";
import { getAvailableDestinations } from "@/lib/intent/parser";

interface Post {
  id: string;
  title: string;
  content: string;
  image?: string;
  timestamp: Date;
}

export default function PatreonUI() {
  const destinations = getAvailableDestinations();

  const posts: Post[] = [
    {
      id: "1",
      title: "Welcome to my creator space! 👋",
      content:
        "Hey there! I'm Azur, and I'm excited to share my work with you. Here you can find links to all my social media, check out my projects, and stay updated with what I'm working on.\n\nFeel free to explore and connect with me on your favorite platform!",
      timestamp: new Date(),
    },
    {
      id: "2",
      title: "Connect with me 🌐",
      content:
        "I'm active on several platforms! Check out the links below to follow my journey, see my latest projects, and join the community.",
      timestamp: new Date(Date.now() - 86400000),
    },
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#f96854] via-[#ff5e4d] to-[#fd8a5e]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Azur</h1>
                <p className="text-xs text-gray-600">Creator</p>
              </div>
            </div>
            <a
              href="https://discord.gg/TRFHTWCY4W"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#f96854] hover:bg-[#e85645] text-white rounded-full font-medium text-sm transition-colors shadow-md"
            >
              Join Community
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* About card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-2xl">A</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Azur
                  </h2>
                  <p className="text-gray-600 text-sm mb-3">
                    Creating amazing web experiences and Discord bots
                  </p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Welcome to my creator space! I build interactive web applications,
                Discord bots, and share my journey in web development. Join me as
                I create, learn, and grow!
              </p>
            </motion.div>

            {/* Posts */}
            {posts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold">A</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Azur</p>
                      <p className="text-xs text-gray-600">
                        {post.timestamp.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {post.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                </div>

                {/* Post actions */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-6">
                  <button className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors">
                    <Heart size={18} />
                    <span className="text-sm font-medium">Like</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
                    <MessageCircle size={18} />
                    <span className="text-sm font-medium">Comment</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
                    <Share2 size={18} />
                    <span className="text-sm font-medium">Share</span>
                  </button>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Social links card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 sticky top-24"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Connect with me
              </h3>
              <div className="space-y-3">
                {destinations.map((dest) => (
                  <motion.a
                    key={dest.name}
                    href={dest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group"
                  >
                    <div className="text-2xl">{dest.icon}</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {dest.name}
                      </p>
                    </div>
                    <ExternalLink
                      size={16}
                      className="text-gray-400 group-hover:text-gray-600 transition-colors"
                    />
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
