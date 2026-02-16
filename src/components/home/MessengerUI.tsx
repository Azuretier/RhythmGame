"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Users, Send } from "lucide-react";
import { parseIntent, getAvailableDestinations } from "@/lib/intent/parser";
import ResponseCard from "./ResponseCard";
import type { IntentResult } from "@/lib/intent/parser";

export interface Message {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  isOwner: boolean;
}

export default function MessengerUI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      author: "Azur",
      content: "Hey! I'm Azur, creator of this site. Type a platform name like **Twitter**, **YouTube**, **Discord**, **GitHub**, or **Instagram** to visit my profiles. You can also say things like \"show me your YouTube\".",
      timestamp: new Date(),
      isOwner: true,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [intentResult, setIntentResult] = useState<IntentResult | null>(null);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      author: "You",
      content: inputValue,
      timestamp: new Date(),
      isOwner: false,
    };

    setMessages((prev) => [...prev, userMessage]);

    // Parse intent
    const result = parseIntent(inputValue);
    setIntentResult(result);

    // Clear input
    setInputValue("");

    // Show response card after a short delay
    setTimeout(() => {
      setShowResponse(true);

      // Auto-navigate if there's a URL
      if (result.type === "route" && result.destination) {
        setTimeout(() => {
          window.open(result.destination!.url, "_blank");
          setShowResponse(false);
        }, 2500);
      } else {
        // Add bot response for help
        setTimeout(() => {
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            author: "Azur",
            content: result.message || "I can help you navigate!",
            timestamp: new Date(),
            isOwner: true,
          };
          setMessages((prev) => [...prev, botMessage]);
          
          // Add destinations list
          const destinations = getAvailableDestinations();
          const destList: Message = {
            id: (Date.now() + 2).toString(),
            author: "Azur",
            content: destinations.map((d) => `${d.icon} **${d.name}**`).join("\n"),
            timestamp: new Date(),
            isOwner: true,
          };
          setMessages((prev) => [...prev, destList]);
          setShowResponse(false);
        }, 2000);
      }
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full h-screen flex">
      {/* Server sidebar */}
      <div className="hidden md:flex flex-col gap-2 w-20 bg-[#1e1f22] p-3">
        {/* Home server */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 bg-[#5865f2] rounded-2xl hover:rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer"
        >
          <Users size={28} className="text-white" />
        </motion.div>

        {/* Separator */}
        <div className="h-0.5 bg-white/10 rounded-full my-1" />

        {/* Discord server */}
        <motion.a
          href="https://discord.gg/TRFHTWCY4W"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 bg-[#313338] rounded-full hover:rounded-xl hover:bg-[#5865f2] transition-all duration-200 flex items-center justify-center cursor-pointer group"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">
            💬
          </span>
        </motion.a>

        {/* Dummy servers */}
        {["🎮", "🎵", "💻"].map((emoji, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 bg-[#313338] rounded-full hover:rounded-xl hover:bg-[#5865f2] transition-all duration-200 flex items-center justify-center cursor-pointer group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">
              {emoji}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-[#313338]">
        {/* Chat header */}
        <div className="h-12 px-4 flex items-center gap-2 border-b border-black/20 bg-[#313338]">
          <Hash size={20} className="text-[#80848e] flex-shrink-0" />
          <h2 className="text-white font-semibold">welcome</h2>
          <div className="hidden sm:block h-5 w-px bg-white/10 mx-1 flex-shrink-0" />
          <span className="hidden sm:block text-[#80848e] text-xs truncate">
            Ask about social links and profiles
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex gap-3"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {message.author[0]}
                </span>
              </div>

              {/* Message content */}
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-white font-semibold text-sm">
                    {message.author}
                  </span>
                  <span className="text-[#80848e] text-xs">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-[#dbdee1] text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content.split("**").map((part, i) =>
                    i % 2 === 0 ? (
                      part
                    ) : (
                      <strong key={i} className="font-bold">
                        {part}
                      </strong>
                    )
                  )}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input area */}
        <div className="p-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#383a40] rounded-lg">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Try: Twitter, YouTube, Discord..."
              className="flex-1 bg-transparent text-white placeholder-[#80848e] outline-none text-sm"
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="text-[#80848e] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Response card overlay */}
      <AnimatePresence>
        {showResponse && intentResult && (
          <ResponseCard result={intentResult} />
        )}
      </AnimatePresence>
    </div>
  );
}
