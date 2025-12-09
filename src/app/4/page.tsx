"use client";
import { GameCanvas } from "@/components/GameCanvas";
import { Navbar } from "@/components/Navbar"; // HTML UI overlay
import { GpuProvider } from "@/components/GpuProvider";

export default function Home() {
  return (
    <>
      <GpuProvider>
      {/* Fullscreen WebGPU background */}
      <GameCanvas />
      
      {/* HTML overlay UI */}
      <div className="relative z-10">
        <Navbar />
        <main className="p-8 text-white">
          <h1 className="text-4xl font-bold">Minecraft Shader Demo</h1>
          {/* Your website content */}
        </main>
      </div>
      </GpuProvider>
    </>
  );
}
