"use client";
import { useState } from "react";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between p-6 bg-black/50 backdrop-blur-md border-b border-white/20">
      <h1 className="text-2xl font-bold text-white">Minecraft Shader Demo</h1>
      <div className="flex gap-4 text-white/80">
        <a href="#about" className="hover:text-white transition-colors">About</a>
        <a href="#contact" className="hover:text-white transition-colors">Contact</a>
      </div>
    </nav>
  );
}
