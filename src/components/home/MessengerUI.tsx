"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  Users,
  Send,
  Plus,
  Smile,
  Bell,
  Pin,
  Search,
  Inbox,
  HelpCircle,
  ChevronDown,
  Mic,
  Gift,
  Sticker,
  Volume2,
  Settings,
  Headphones,
} from "lucide-react";
import { parseIntent, getAvailableDestinations } from "@/lib/intent/parser";
import ResponseCard from "./ResponseCard";
import type { IntentResult } from "@/lib/intent/parser";

export interface Message {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: Date;
  isOwner: boolean;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
}

interface Channel {
  id: string;
  name: string;
  type: "text" | "voice";
  unread?: boolean;
  active?: boolean;
}

interface ChannelCategory {
  name: string;
  channels: Channel[];
  collapsed?: boolean;
}

const SERVER_ICONS = [
  { emoji: "🌐", name: "Azuretier", color: "#5865f2", active: true },
  { emoji: "💬", name: "Discord Server", url: "https://discord.gg/TRFHTWCY4W" },
  { emoji: "🎮", name: "Gaming", color: "#57F287" },
  { emoji: "🎵", name: "Music", color: "#FEE75C" },
  { emoji: "💻", name: "Dev", color: "#EB459E" },
];

const CHANNEL_CATEGORIES: ChannelCategory[] = [
  {
    name: "INFORMATION",
    channels: [
      { id: "welcome", name: "welcome", type: "text", active: true },
      { id: "rules", name: "rules", type: "text" },
      { id: "announcements", name: "announcements", type: "text" },
    ],
  },
  {
    name: "SOCIAL LINKS",
    channels: [
      { id: "links", name: "find-me", type: "text" },
      { id: "portfolio", name: "portfolio", type: "text" },
    ],
  },
  {
    name: "VOICE CHANNELS",
    channels: [
      { id: "general-vc", name: "General", type: "voice" },
      { id: "music-vc", name: "Music Lounge", type: "voice" },
    ],
  },
];

const ONLINE_MEMBERS = [
  { name: "Azur", role: "owner", status: "online" as const, activity: "Building azuretier.net" },
  { name: "RhythmBot", role: "bot", status: "online" as const, activity: "Listening to /play" },
  { name: "Pixel", role: "mod", status: "idle" as const },
  { name: "Neon", role: "member", status: "online" as const, activity: "Playing RHYTHMIA" },
  { name: "Sakura", role: "member", status: "dnd" as const },
];

const OFFLINE_MEMBERS = [
  { name: "CloudWalker", role: "member", status: "offline" as const },
  { name: "StarDust", role: "member", status: "offline" as const },
  { name: "MoonByte", role: "member", status: "offline" as const },
];

function getStatusColor(status: "online" | "idle" | "dnd" | "offline") {
  switch (status) {
    case "online": return "bg-[#23a559]";
    case "idle": return "bg-[#f0b232]";
    case "dnd": return "bg-[#f23f43]";
    case "offline": return "bg-[#80848e]";
  }
}

function getRoleColor(role: string) {
  switch (role) {
    case "owner": return "text-[#f47fff]";
    case "bot": return "text-[#5865f2]";
    case "mod": return "text-[#57f287]";
    default: return "text-white";
  }
}

export default function MessengerUI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "sys-1",
      author: "System",
      content: "Welcome to #welcome! This is the start of the channel.",
      timestamp: new Date(Date.now() - 3600000),
      isOwner: false,
    },
    {
      id: "1",
      author: "Azur",
      content:
        "Hey! I'm Azur, creator of this site. Type a platform name like **Twitter**, **YouTube**, **Discord**, **GitHub**, or **Instagram** to visit my profiles. You can also say things like \"show me your YouTube\".",
      timestamp: new Date(),
      isOwner: true,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [intentResult, setIntentResult] = useState<IntentResult | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [activeChannelId, setActiveChannelId] = useState("welcome");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const addReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = msg.reactions || [];
        const existing = reactions.find((r) => r.emoji === emoji);
        if (existing) {
          return {
            ...msg,
            reactions: reactions.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
                : r
            ).filter((r) => r.count > 0),
          };
        }
        return {
          ...msg,
          reactions: [...reactions, { emoji, count: 1, reacted: true }],
        };
      })
    );
  };

  const toggleCategory = (name: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      author: "You",
      content: inputValue,
      timestamp: new Date(),
      isOwner: false,
    };

    setMessages((prev) => [...prev, userMessage]);

    const result = parseIntent(inputValue);
    setIntentResult(result);
    setInputValue("");

    // Show typing indicator
    setIsTyping(true);

    setTimeout(() => {
      if (result.type === "route" && result.destination) {
        setIsTyping(false);
        setShowResponse(true);
        setTimeout(() => {
          window.open(result.destination!.url, "_blank");
          setShowResponse(false);
        }, 2500);
      } else {
        setTimeout(() => {
          setIsTyping(false);
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            author: "Azur",
            content: result.message || "I can help you navigate!",
            timestamp: new Date(),
            isOwner: true,
          };
          setMessages((prev) => [...prev, botMessage]);

          const destinations = getAvailableDestinations();
          const destList: Message = {
            id: (Date.now() + 2).toString(),
            author: "Azur",
            content: destinations
              .map((d) => `${d.icon} **${d.name}**`)
              .join("\n"),
            timestamp: new Date(),
            isOwner: true,
          };
          setMessages((prev) => [...prev, destList]);
          setShowResponse(false);
        }, 1200);
      }
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeChannel = CHANNEL_CATEGORIES.flatMap((c) => c.channels).find(
    (c) => c.id === activeChannelId
  );

  const isSameAuthorGroup = (msg: Message, prevMsg: Message | undefined) => {
    if (!prevMsg) return false;
    if (msg.author !== prevMsg.author) return false;
    return msg.timestamp.getTime() - prevMsg.timestamp.getTime() < 5 * 60 * 1000;
  };

  return (
    <div className="w-full h-screen flex overflow-hidden">
      {/* Server sidebar */}
      <div className="hidden md:flex flex-col items-center gap-2 w-[72px] bg-[#1e1f22] py-3 flex-shrink-0">
        {SERVER_ICONS.map((server, i) => (
          <div key={i} className="relative group">
            {i === 1 && (
              <div className="h-0.5 bg-white/10 rounded-full w-8 mx-auto mb-2" />
            )}
            {server.active && (
              <motion.div
                layoutId="server-indicator"
                className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r-full"
              />
            )}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => server.url && window.open(server.url, "_blank")}
              className={`w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                server.active
                  ? "rounded-2xl bg-[#5865f2]"
                  : "rounded-full bg-[#313338] hover:rounded-2xl hover:bg-[#5865f2]"
              }`}
            >
              <span className="text-xl">{server.emoji}</span>
            </motion.div>
            {/* Tooltip */}
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-[#111214] text-white text-sm font-semibold rounded-md shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {server.name}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111214]" />
            </div>
          </div>
        ))}
      </div>

      {/* Channel sidebar */}
      <div className="hidden md:flex flex-col w-60 bg-[#2b2d31] flex-shrink-0">
        {/* Server header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#1f2023] shadow-sm cursor-pointer hover:bg-[#35373c] transition-colors">
          <h2 className="text-white font-semibold text-[15px] truncate">
            Azuretier
          </h2>
          <ChevronDown size={18} className="text-white/60" />
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto pt-4 px-2 space-y-0.5">
          {CHANNEL_CATEGORIES.map((category) => (
            <div key={category.name} className="mb-4">
              <button
                onClick={() => toggleCategory(category.name)}
                className="flex items-center gap-0.5 px-0.5 mb-1 text-[11px] font-bold text-[#949ba4] uppercase tracking-wide hover:text-[#dbdee1] transition-colors w-full text-left"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform ${
                    collapsedCategories.has(category.name) ? "-rotate-90" : ""
                  }`}
                />
                {category.name}
              </button>
              <AnimatePresence>
                {!collapsedCategories.has(category.name) &&
                  category.channels.map((channel) => (
                    <motion.button
                      key={channel.id}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onClick={() =>
                        channel.type === "text" &&
                        setActiveChannelId(channel.id)
                      }
                      className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-sm transition-colors group ${
                        channel.id === activeChannelId
                          ? "bg-[#404249] text-white"
                          : "text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#35373c]"
                      }`}
                    >
                      {channel.type === "text" ? (
                        <Hash size={18} className="opacity-60 flex-shrink-0" />
                      ) : (
                        <Volume2
                          size={18}
                          className="opacity-60 flex-shrink-0"
                        />
                      )}
                      <span className="truncate">{channel.name}</span>
                      {channel.unread && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-white" />
                      )}
                    </motion.button>
                  ))}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* User area */}
        <div className="h-[52px] px-2 flex items-center bg-[#232428] gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">Y</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#23a559] rounded-full border-2 border-[#232428]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold leading-tight truncate">
              You
            </div>
            <div className="text-[#949ba4] text-[11px] leading-tight truncate">
              Online
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 text-[#b5bac1] hover:text-white transition-colors rounded hover:bg-[#3b3d44]">
              <Mic size={18} />
            </button>
            <button className="p-1 text-[#b5bac1] hover:text-white transition-colors rounded hover:bg-[#3b3d44]">
              <Headphones size={18} />
            </button>
            <button className="p-1 text-[#b5bac1] hover:text-white transition-colors rounded hover:bg-[#3b3d44]">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-[#313338] min-w-0">
        {/* Chat header */}
        <div className="h-12 px-4 flex items-center gap-2 border-b border-[#1f2023] shadow-sm flex-shrink-0">
          <Hash size={20} className="text-[#80848e] flex-shrink-0" />
          <h2 className="text-white font-semibold text-[15px]">
            {activeChannel?.name || "welcome"}
          </h2>
          <div className="hidden sm:block h-6 w-px bg-[#3f4147] mx-2 flex-shrink-0" />
          <span className="hidden sm:block text-[#949ba4] text-[13px] truncate flex-1">
            Ask about social links and profiles
          </span>

          {/* Header actions */}
          <div className="flex items-center gap-3">
            <button className="text-[#b5bac1] hover:text-[#dbdee1] transition-colors hidden sm:block">
              <Bell size={20} />
            </button>
            <button className="text-[#b5bac1] hover:text-[#dbdee1] transition-colors hidden sm:block">
              <Pin size={20} />
            </button>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`transition-colors hidden md:block ${
                showMembers
                  ? "text-white"
                  : "text-[#b5bac1] hover:text-[#dbdee1]"
              }`}
            >
              <Users size={20} />
            </button>
            <div className="hidden lg:flex items-center bg-[#1e1f22] rounded px-1.5 py-1">
              <input
                type="text"
                placeholder="Search"
                className="bg-transparent text-[#dbdee1] placeholder-[#949ba4] text-[13px] w-28 outline-none"
              />
              <Search size={14} className="text-[#949ba4]" />
            </div>
            <button className="text-[#b5bac1] hover:text-[#dbdee1] transition-colors hidden sm:block">
              <Inbox size={20} />
            </button>
            <button className="text-[#b5bac1] hover:text-[#dbdee1] transition-colors hidden sm:block">
              <HelpCircle size={20} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {/* Welcome banner */}
              <div className="px-4 pt-8 pb-4">
                <div className="w-[68px] h-[68px] rounded-full bg-[#5865f2] flex items-center justify-center mb-4">
                  <Hash size={36} className="text-white" />
                </div>
                <h1 className="text-[32px] font-bold text-white mb-2">
                  Welcome to #{activeChannel?.name || "welcome"}
                </h1>
                <p className="text-[#949ba4] text-[15px]">
                  This is the start of the #{activeChannel?.name || "welcome"}{" "}
                  channel. Ask about social links and profiles here!
                </p>
                <div className="h-px bg-[#3f4147] mt-4" />
              </div>

              {/* Messages */}
              <div className="px-4 pb-6">
                {messages.map((message, index) => {
                  const prevMsg = index > 0 ? messages[index - 1] : undefined;
                  const isGrouped = isSameAuthorGroup(message, prevMsg);
                  const isSystem = message.author === "System";

                  if (isSystem) {
                    return (
                      <div key={message.id} className="flex items-center gap-2 py-2 px-4 my-2">
                        <div className="h-px bg-[#3f4147] flex-1" />
                        <span className="text-[#949ba4] text-xs font-semibold px-1 whitespace-nowrap">
                          {message.content}
                        </span>
                        <div className="h-px bg-[#3f4147] flex-1" />
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                      className={`relative group px-4 py-0.5 hover:bg-[#2e3035] transition-colors ${
                        !isGrouped ? "mt-4" : ""
                      }`}
                    >
                      {/* Hover actions */}
                      <AnimatePresence>
                        {hoveredMessageId === message.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute -top-4 right-4 flex items-center bg-[#2b2d31] border border-[#1f2023] rounded shadow-lg z-10"
                          >
                            {["😂", "❤️", "👍", "🎮"].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(message.id, emoji)}
                                className="px-2 py-1 hover:bg-[#36373d] transition-colors text-lg"
                              >
                                {emoji}
                              </button>
                            ))}
                            <button className="px-2 py-1 hover:bg-[#36373d] transition-colors">
                              <Smile
                                size={18}
                                className="text-[#b5bac1]"
                              />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-4">
                        {/* Avatar or timestamp gutter */}
                        {!isGrouped ? (
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.isOwner
                                ? "bg-gradient-to-br from-blue-500 to-purple-500"
                                : "bg-gradient-to-br from-emerald-500 to-teal-500"
                            }`}
                          >
                            <span className="text-white font-bold text-sm">
                              {message.author[0]}
                            </span>
                          </div>
                        ) : (
                          <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <span className="text-[#949ba4] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}

                        {/* Message content */}
                        <div className="flex-1 min-w-0">
                          {!isGrouped && (
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span
                                className={`font-semibold text-[15px] hover:underline cursor-pointer ${
                                  message.isOwner
                                    ? "text-[#f47fff]"
                                    : "text-white"
                                }`}
                              >
                                {message.author}
                              </span>
                              {message.isOwner && (
                                <span className="text-[10px] font-medium bg-[#5865f2] text-white px-1 py-px rounded leading-tight">
                                  OWNER
                                </span>
                              )}
                              <span className="text-[#949ba4] text-xs">
                                {message.timestamp.toLocaleDateString([], {
                                  month: "2-digit",
                                  day: "2-digit",
                                  year: "numeric",
                                })}{" "}
                                {message.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          )}
                          <p className="text-[#dbdee1] text-[15px] leading-[1.375rem] whitespace-pre-wrap break-words">
                            {message.content.split("**").map((part, i) =>
                              i % 2 === 0 ? (
                                part
                              ) : (
                                <strong key={i} className="font-bold text-white">
                                  {part}
                                </strong>
                              )
                            )}
                          </p>

                          {/* Reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {message.reactions.map((reaction) => (
                                <button
                                  key={reaction.emoji}
                                  onClick={() =>
                                    addReaction(message.id, reaction.emoji)
                                  }
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs transition-colors border ${
                                    reaction.reacted
                                      ? "bg-[#5865f2]/20 border-[#5865f2] text-[#dee0fc]"
                                      : "bg-[#2b2d31] border-[#3f4147] text-[#dbdee1] hover:border-[#5865f2]"
                                  }`}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span>{reaction.count}</span>
                                </button>
                              ))}
                              <button className="flex items-center px-1.5 py-0.5 rounded-md text-xs bg-[#2b2d31] border border-[#3f4147] text-[#b5bac1] hover:border-[#5865f2] hover:text-[#dbdee1] transition-colors">
                                <Smile size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Typing indicator */}
                <AnimatePresence>
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 px-4 py-1 mt-1"
                    >
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -4, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                            className="w-2 h-2 rounded-full bg-[#949ba4]"
                          />
                        ))}
                      </div>
                      <span className="text-[#949ba4] text-xs">
                        <strong className="text-[#dbdee1]">Azur</strong> is
                        typing...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input area */}
            <div className="px-4 pb-6 pt-0 flex-shrink-0">
              <div className="flex items-center bg-[#383a40] rounded-lg">
                <button className="p-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors flex-shrink-0">
                  <Plus size={20} />
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Message #${activeChannel?.name || "welcome"}`}
                  className="flex-1 bg-transparent text-[#dbdee1] placeholder-[#6d6f78] outline-none text-[15px] py-2.5 min-w-0"
                />
                <div className="flex items-center gap-0.5 pr-2 flex-shrink-0">
                  <button className="p-2 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
                    <Gift size={20} />
                  </button>
                  <button className="p-2 text-[#b5bac1] hover:text-[#dbdee1] transition-colors hidden sm:block">
                    <Sticker size={20} />
                  </button>
                  <button className="p-2 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
                    <Smile size={20} />
                  </button>
                  {inputValue.trim() ? (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSend}
                      className="p-2 text-white hover:text-[#5865f2] transition-colors"
                    >
                      <Send size={20} />
                    </motion.button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Member sidebar */}
          <AnimatePresence>
            {showMembers && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-[#2b2d31] overflow-hidden flex-shrink-0 hidden md:block"
              >
                <div className="w-60 p-4 overflow-y-auto h-full">
                  {/* Online */}
                  <h3 className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wide mb-2 px-1">
                    Online — {ONLINE_MEMBERS.length}
                  </h3>
                  <div className="space-y-0.5 mb-6">
                    {ONLINE_MEMBERS.map((member) => (
                      <div
                        key={member.name}
                        className="flex items-center gap-3 p-1.5 rounded hover:bg-[#35373c] cursor-pointer group"
                      >
                        <div className="relative flex-shrink-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              member.role === "owner"
                                ? "bg-gradient-to-br from-blue-500 to-purple-500"
                                : member.role === "bot"
                                ? "bg-[#5865f2]"
                                : "bg-[#5c5e66]"
                            }`}
                          >
                            <span className="text-white text-xs font-bold">
                              {member.name[0]}
                            </span>
                          </div>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#2b2d31] ${getStatusColor(
                              member.status
                            )}`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-sm font-medium truncate ${getRoleColor(
                                member.role
                              )} group-hover:text-white transition-colors`}
                            >
                              {member.name}
                            </span>
                            {member.role === "bot" && (
                              <span className="text-[9px] font-bold bg-[#5865f2] text-white px-1 py-px rounded leading-tight flex-shrink-0">
                                BOT
                              </span>
                            )}
                          </div>
                          {member.activity && (
                            <div className="text-[11px] text-[#949ba4] truncate">
                              {member.activity}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Offline */}
                  <h3 className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wide mb-2 px-1">
                    Offline — {OFFLINE_MEMBERS.length}
                  </h3>
                  <div className="space-y-0.5">
                    {OFFLINE_MEMBERS.map((member) => (
                      <div
                        key={member.name}
                        className="flex items-center gap-3 p-1.5 rounded hover:bg-[#35373c] cursor-pointer group opacity-40"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-[#5c5e66] flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {member.name[0]}
                            </span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#2b2d31] bg-[#80848e]" />
                        </div>
                        <span className="text-[#949ba4] text-sm truncate">
                          {member.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
