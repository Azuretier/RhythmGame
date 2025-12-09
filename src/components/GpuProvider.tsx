"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { initWebGPU } from "@/lib/webgpu";

const GpuContext = createContext<null | {
  device: GPUDevice;
  adapter: GPUAdapter;
}>(null);

export function GpuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gpu, setGpu] = useState<null | {
    device: GPUDevice;
    adapter: GPUAdapter;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    initWebGPU().then((ctx) => {
      if (!cancelled) setGpu(ctx);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <GpuContext.Provider value={gpu}>
      {children}
    </GpuContext.Provider>
  );
}

export const useGpu = () => {
  const ctx = useContext(GpuContext);
  if (!ctx) throw new Error("useGpu must be used within GpuProvider");
  return ctx;
};
