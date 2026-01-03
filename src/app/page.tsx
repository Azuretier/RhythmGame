import React from 'react';
import { Github, Youtube, Instagram, MessageSquare, ExternalLink } from 'lucide-react';

const SNS_LINKS = [
  { name: 'GitHub', icon: <Github />, url: 'https://github.com/Azuretier', color: 'hover:text-white' },
  { name: 'YouTube', icon: <Youtube />, url: 'https://youtube.com/@azuret', color: 'hover:text-red-500' },
  { name: 'Instagram', icon: <Instagram />, url: '#', color: 'hover:text-pink-500' },
  { name: 'Discord', icon: <MessageSquare />, url: '#', color: 'hover:text-indigo-400' },
];

export default function AzuretPortfolio() {
  return (
    <main className="relative min-h-screen w-full bg-[#030712] flex items-center justify-center overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-azure-500/10 rounded-full blur-[120px]" />

      <section className="relative z-10 w-full max-w-2xl px-6">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          
          {/* Header */}
          <header className="text-center mb-10">
            <h1 className="text-6xl font-extrabold tracking-tighter bg-gradient-to-b from-white to-blue-400 bg-clip-text text-transparent">
              AZURET
            </h1>
            <p className="mt-4 text-gray-400 font-light text-lg">
              Full-stack Developer & Digital Architect
            </p>
          </header>

          {/* Social Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SNS_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                className={`group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 transition-all duration-300 hover:bg-white/10 hover:border-blue-500/50 ${link.color}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 group-hover:scale-110 transition-transform">
                    {link.icon}
                  </span>
                  <span className="font-medium tracking-wide">{link.name}</span>
                </div>
                <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>

          {/* Footer/Discord Tag */}
          <footer className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-blue-300 font-mono">Discord: azure_dev</span>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}