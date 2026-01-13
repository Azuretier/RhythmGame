"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Hash, Users, Settings } from "lucide-react";
import { parseIntent, getAvailableDestinations, IntentResult } from "@/lib/intent/parser";
import RoutingCard from "./RoutingCard";

interface Message {
  id: string;
  content: string;
  sender: "user" | "azur" | "system";
  timestamp: Date;
}

export default function MessengerUI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hey! 👋 Welcome to my personal hub. I'm Azur!\n\nYou can chat with me here, or try mentioning one of my social platforms to visit them.",
      sender: "azur",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [routingIntent, setRoutingIntent] = useState<IntentResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    // Parse intent
    const intent = parseIntent(inputValue);

    setTimeout(() => {
      if (intent.type === "route" && intent.destination) {
        // Show routing card
        setRoutingIntent(intent);
      } else {
        // Show help message
        const helpMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: intent.message || "I can help you navigate!",
          sender: "system",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, helpMessage]);

        // Add destinations list
        const destinations = getAvailableDestinations();
        const destList: Message = {
          id: (Date.now() + 2).toString(),
          content: destinations
            .map((d) => `${d.icon} **${d.name}** - ${d.url}`)
            .join("\n"),
          sender: "system",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, destList]);
      }
    }, 500);
  };

  const handleNavigate = () => {
    if (routingIntent?.destination) {
      // Use window.location for same-tab external navigation
      window.location.href = routingIntent.destination.url;
    }
  };

  return (
    <div className="fixed inset-0 flex bg-[#313338]">
      {/* Sidebar */}
      <div className="w-60 bg-[#2b2d31] flex flex-col">
        {/* Server list */}
        <div className="w-16 bg-[#1e1f22] flex flex-col items-center py-3 gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-[#5865f2] flex items-center justify-center text-white font-bold text-xl"
          >
            A
          </motion.button>
          <div className="w-8 h-[2px] bg-[#35363c] rounded-full" />
          <motion.a
            href="https://discord.gg/TRFHTWCY4W"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-[#313338] hover:bg-[#5865f2] hover:rounded-2xl flex items-center justify-center text-[#06c167] hover:text-white transition-all duration-300"
          >
            <Users size={24} />
          </motion.a>
        </div>

        {/* Channels */}
        <div className="flex-1 px-2 py-3">
          <div className="mb-4">
            <div className="text-xs font-semibold text-[#949ba4] uppercase px-2 mb-1">
              Text Channels
            </div>
            <motion.div
              whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-[#949ba4] hover:text-[#dbdee1] cursor-pointer"
            >
              <Hash size={20} />
              <span className="text-sm font-medium">general</span>
            </motion.div>
          </div>

          <div className="mb-4">
            <div className="text-xs font-semibold text-[#949ba4] uppercase px-2 mb-1">
              Direct Messages
            </div>
            <motion.div
              whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              className="flex items-center gap-3 px-2 py-1.5 rounded text-white bg-[#404249] cursor-pointer mb-1"
            >
              <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white font-semibold text-sm">
                AZ
              </div>
              <span className="text-sm font-medium">Azur</span>
            </motion.div>
            {["Friend 1", "Friend 2", "Friend 3"].map((friend, i) => (
              <motion.div
                key={i}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                className="flex items-center gap-3 px-2 py-1.5 rounded text-[#949ba4] hover:text-[#dbdee1] cursor-pointer mb-1"
              >
                <div className="w-8 h-8 rounded-full bg-[#313338] flex items-center justify-center text-[#949ba4] font-semibold text-sm">
                  {friend[0]}
                </div>
                <span className="text-sm font-medium">{friend}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* User settings */}
        <div className="h-14 bg-[#232428] px-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white font-semibold text-sm">
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">You</div>
              <div className="text-xs text-[#949ba4]">Online</div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="text-[#b5bac1] hover:text-[#dbdee1]"
          >
            <Settings size={18} />
          </motion.button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="h-12 border-b border-[#1e1f22] px-4 flex items-center">
          <Hash size={24} className="text-[#80848e] mr-2" />
          <span className="text-white font-semibold">general</span>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mb-4 hover:bg-[#2e3035] -mx-2 px-2 py-1 rounded"
              >
                <div className="flex gap-3">
                  {message.sender === "azur" && (
                    <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center text-white font-semibold flex-shrink-0">
                      AZ
                    </div>
                  )}
                  {message.sender === "user" && (
                    <div className="w-10 h-10 rounded-full bg-[#949ba4] flex items-center justify-center text-white font-semibold flex-shrink-0">
                      U
                    </div>
                  )}
                  {message.sender === "system" && (
                    <div className="w-10 h-10 rounded-full bg-[#5865f2]/50 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      🤖
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">
                        {message.sender === "azur"
                          ? "Azur"
                          : message.sender === "user"
                          ? "You"
                          : "Assistant"}
                      </span>
                      <span className="text-xs text-[#949ba4]">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-[#dbdee1] text-sm whitespace-pre-wrap break-words">
                      {message.content.split("**").map((part, i) =>
                        i % 2 === 0 ? (
                          part
                        ) : (
                          <strong key={i} className="font-bold">
                            {part}
                          </strong>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4">
          <div className="bg-[#383a40] rounded-lg flex items-center px-4 py-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Message in general"
              className="flex-1 bg-transparent text-[#dbdee1] placeholder-[#6d6f78] outline-none text-sm"
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="ml-2 text-[#b5bac1] hover:text-white disabled:opacity-30 disabled:hover:text-[#b5bac1]"
            >
              <Send size={20} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Routing card overlay */}
      <AnimatePresence>
        {routingIntent?.destination && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <RoutingCard
              destination={routingIntent.destination}
              onNavigate={handleNavigate}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
