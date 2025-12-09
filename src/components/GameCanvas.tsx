"use client";
import { useEffect, useRef } from "react";
import { useGpu } from "@/components/GpuProvider";
import { createRenderer } from "@/lib/effects";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { device } = useGpu();

  useEffect(() => {
    if (!canvasRef.current || !device) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const context = canvas.getContext("webgpu") as any;

    if (context) {
      context.configure({ 
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied"
      });
    }

    const renderer = createRenderer(device, canvas.width, canvas.height);
    let raf: number;

    const render = () => {
      renderer.render(context);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(raf);
  }, [device]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
}
