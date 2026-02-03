// HeartbeatWebGPU.tsx
import React, { useEffect, useRef } from "react";

export function HeartbeatWebGPU() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    let destroyed = false;

    // 参照保持（cleanupで止める）
    let device: GPUDevice | null = null;

    (async () => {
      if (!navigator.gpu) {
        console.warn("WebGPU not supported");
        return;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error("No GPU adapter");
      device = await adapter.requestDevice();

      const ctx = canvas.getContext("webgpu");
      if (!ctx) throw new Error("No webgpu context");

      const format = navigator.gpu.getPreferredCanvasFormat();

      const resize = () => {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        // 見た目サイズはCSS、描画解像度はwidth/height
        const w = Math.floor(canvas.clientWidth * dpr);
        const h = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;

        ctx.configure({ device: device!, format, alphaMode: "premultiplied" });
      };

      resize();
      window.addEventListener("resize", resize);

      // uniforms: vec2 res + f32 t + pad
      const uBuf = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const shader = /* wgsl */ `
struct U {
  res : vec2<f32>,
  t   : f32,
  _pad: f32,
};
@group(0) @binding(0) var<uniform> u : U;

fn sdHeart(p0: vec2<f32>) -> f32 {
  var p = p0;
  p.y = p.y * 1.1;
  let x = p.x;
  let y = p.y;
  let a = x*x + y*y - 1.0;
  return a*a*a - x*x*y*y*y;
}

fn smoothEdge(d: f32, w: f32) -> f32 {
  return 1.0 - smoothstep(-w, w, d);
}

@vertex
fn vs(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4<f32> {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0)
  );
  return vec4<f32>(pos[vid], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let uv = fragCoord.xy / u.res;

  var p = (uv * 2.0 - 1.0);
  p.x = p.x * (u.res.x / u.res.y);

  // heart center
  p.y = p.y + 0.15;

  // heartbeat (two pulses)
  let t = u.t;
  let beat1 = exp(-8.0  * fract(t));
  let beat2 = exp(-10.0 * fract(t + 0.18));
  let beat  = 0.10 * beat1 + 0.16 * beat2;
  let s = 0.75 + beat;

  p = p / s;

  let d = sdHeart(p);
  let w = 2.0 / u.res.y;

  let inside = smoothEdge(d, w);

  let glow = smoothstep(0.7, 0.0, abs(d));
  let col  = vec3<f32>(1.0, 0.2, 0.45) * (0.7 + 0.6 * glow);

  let bg = vec3<f32>(0.04, 0.04, 0.06);
  var rgb = mix(bg, col, inside);

  let outer = smoothstep(0.25, 0.0, d);
  rgb = rgb + vec3<f32>(1.0, 0.2, 0.5) * outer * 0.15;

  return vec4<f32>(rgb, 1.0);
}
`;

      const module = device.createShaderModule({ code: shader });

      const bindGroupLayout = device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform" },
          },
        ],
      });

      const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      });

      const pipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint: "fs", targets: [{ format }] },
        primitive: { topology: "triangle-list" },
      });

      const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: uBuf } }],
      });

      const t0 = performance.now();

      const frame = () => {
        if (destroyed) return;
        resize();

        const t = (performance.now() - t0) / 1000;
        const u = new Float32Array([canvas.width, canvas.height, t, 0]);
        device!.queue.writeBuffer(uBuf, 0, u);

        const encoder = device!.createCommandEncoder();
        const view = ctx.getCurrentTexture().createView();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view,
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();

        device!.queue.submit([encoder.finish()]);
        raf = requestAnimationFrame(frame);
      };

      raf = requestAnimationFrame(frame);

      // cleanup
      return () => {};
    })().catch((e) => console.error(e));

    return () => {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      // WebGPUは明示destroyが少ないが、参照を切ればOK
      device = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}