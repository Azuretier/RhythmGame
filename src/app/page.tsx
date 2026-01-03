import React from 'react';
import { Github, Youtube, Instagram, MessageSquare, ExternalLink } from 'lucide-react';
import { AZURET_DATA } from './data';

export default function AzuretPortfolio() {
  return (
    <main className="relative min-h-screen w-full bg-[#030712] flex items-center justify-center">
      <section className="relative z-10 w-full max-w-2xl px-6">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          <header className="text-center mb-10">
            <h1 className="text-6xl font-extrabold tracking-tighter bg-gradient-to-b from-white to-blue-400 bg-clip-text text-transparent uppercase">
              {AZURET_DATA.name}
            </h1>
            <p className="mt-4 text-gray-400 font-light text-lg">
              {AZURET_DATA.role}
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {AZURET_DATA.socials.map((link) => (
              <a
                key={link.name}
                href={link.url}
                className={`group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 transition-all duration-300 hover:bg-white/10 hover:border-blue-500/50 ${link.color}`}
              >
                <div className="flex items-center gap-4">
                  {/* Note: In React, icons from data are rendered as components */}
                  <link.icon size={24} className="text-gray-400 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col">
                    <span className="font-medium tracking-wide">{link.name}</span>
                    <span className="text-xs text-gray-500">{link.username}</span>
                  </div>
                </div>
                <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>

          <footer className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-blue-300 font-mono">
                Discord: {AZURET_DATA.discord.tag}
              </span>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}