'use client';

import { useEffect, useRef } from 'react';
import styles from './rhythmia.module.css';

/**
 * WebGPU Forest Campfire Scene
 * Low-poly forest environment with animated campfire and depth blur
 */
export default function ForestCampfireScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const deviceRef = useRef<GPUDevice | null>(null);
  const contextRef = useRef<GPUCanvasContext | null>(null);
  const pipelineRef = useRef<GPURenderPipeline | null>(null);
  const uniformBufferRef = useRef<GPUBuffer | null>(null);
  const bindGroupRef = useRef<GPUBindGroup | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const resolutionRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mounted = true;
    let cleanupResize: (() => void) | null = null;

    const init = async () => {
      // Check for WebGPU support
      if (!navigator.gpu) {
        console.log('WebGPU not supported, using CSS fallback');
        return;
      }

      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          console.log('No WebGPU adapter found');
          return;
        }

        const device = await adapter.requestDevice();
        if (!mounted) return;

        deviceRef.current = device;

        const context = canvas.getContext('webgpu');
        if (!context) {
          console.log('Could not get WebGPU context');
          return;
        }
        contextRef.current = context;

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
          device,
          format: presentationFormat,
          alphaMode: 'premultiplied',
        });

        // Forest Campfire Shader with Low-Poly Aesthetics and Depth Blur
        const shaderCode = `
          struct Uniforms {
            time: f32,
            _padding: f32,
            resolution: vec2<f32>,
          }
          @binding(0) @group(0) var<uniform> uniforms: Uniforms;

          struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) uv: vec2<f32>,
          }

          @vertex
          fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
            var pos = array<vec2<f32>, 6>(
              vec2<f32>(-1.0, -1.0),
              vec2<f32>(1.0, -1.0),
              vec2<f32>(-1.0, 1.0),
              vec2<f32>(-1.0, 1.0),
              vec2<f32>(1.0, -1.0),
              vec2<f32>(1.0, 1.0)
            );

            var output: VertexOutput;
            output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
            output.uv = pos[vertexIndex] * 0.5 + 0.5;
            return output;
          }

          // Noise functions for procedural generation
          fn hash(p: vec2<f32>) -> f32 {
            let p3 = fract(vec3<f32>(p.xyx) * 0.13);
            let p3_shifted = p3 + dot(p3, vec3<f32>(p3.yzx) + 3.333);
            return fract((p3_shifted.x + p3_shifted.y) * p3_shifted.z);
          }

          fn hash2(p: vec2<f32>) -> vec2<f32> {
            return vec2<f32>(hash(p), hash(p + vec2<f32>(127.1, 311.7)));
          }

          fn noise(p: vec2<f32>) -> f32 {
            let i = floor(p);
            let f = fract(p);
            let u = f * f * (3.0 - 2.0 * f);
            
            let a = hash(i);
            let b = hash(i + vec2<f32>(1.0, 0.0));
            let c = hash(i + vec2<f32>(0.0, 1.0));
            let d = hash(i + vec2<f32>(1.0, 1.0));
            
            return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
          }

          fn fbm(p: vec2<f32>) -> f32 {
            var value = 0.0;
            var amplitude = 0.5;
            var freq = 1.0;
            var pos = p;
            for (var i = 0; i < 4; i++) {
              value += amplitude * noise(pos * freq);
              freq *= 2.0;
              amplitude *= 0.5;
            }
            return value;
          }

          // Low-poly triangle wave for stylized terrain
          fn lowPolyNoise(p: vec2<f32>, scale: f32) -> f32 {
            let sp = p * scale;
            let i = floor(sp);
            let f = fract(sp);
            
            // Create triangulated pattern
            let tri = select(f.x + f.y, 2.0 - f.x - f.y, f.x + f.y > 1.0);
            let h1 = hash(i);
            let h2 = hash(i + vec2<f32>(1.0, 0.0));
            let h3 = hash(i + vec2<f32>(0.0, 1.0));
            
            return mix(mix(h1, h2, f.x), h3, f.y) * 0.5 + tri * 0.1;
          }

          // Tree silhouette function (low-poly cone shape)
          fn tree(uv: vec2<f32>, pos: vec2<f32>, height: f32, width: f32) -> f32 {
            let p = (uv - pos) / vec2<f32>(width, height);
            // Cone shape
            let cone = 1.0 - abs(p.x) * 2.0 - p.y;
            // Trunk
            let trunk = step(abs(p.x), 0.1) * step(p.y, 0.0) * step(-0.3, p.y);
            return max(step(0.0, cone) * step(0.0, p.y) * step(p.y, 1.0), trunk);
          }

          // Fire particle effect
          fn fire(uv: vec2<f32>, time: f32) -> vec3<f32> {
            let firePos = vec2<f32>(0.5, 0.18);
            var p = uv - firePos;
            p.x *= 2.5;
            
            // Fire shape with turbulence
            let n1 = fbm(vec2<f32>(p.x * 5.0, p.y * 3.0 - time * 2.0));
            let n2 = fbm(vec2<f32>(p.x * 8.0 + 100.0, p.y * 4.0 - time * 3.0));
            
            p.x += (n1 - 0.5) * 0.15;
            p.x += (n2 - 0.5) * 0.08;
            
            // Fire envelope
            let fireHeight = 0.12;
            let fireWidth = 0.08;
            let dist = length(p / vec2<f32>(fireWidth, fireHeight));
            
            // Flame intensity
            var flame = 1.0 - smoothstep(0.0, 1.0, dist);
            flame = pow(flame, 1.5);
            
            // Add flickering
            let flicker = 0.8 + 0.2 * sin(time * 15.0) * sin(time * 23.0);
            flame *= flicker;
            
            // Color gradient (hot white core to orange to red)
            let core = vec3<f32>(1.0, 0.95, 0.8);
            let mid = vec3<f32>(1.0, 0.5, 0.1);
            let outer = vec3<f32>(0.8, 0.2, 0.05);
            
            var fireColor = mix(outer, mid, smoothstep(0.0, 0.5, flame));
            fireColor = mix(fireColor, core, smoothstep(0.5, 1.0, flame));
            
            return fireColor * flame;
          }

          // Ember particles
          fn embers(uv: vec2<f32>, time: f32) -> vec3<f32> {
            var total = vec3<f32>(0.0);
            let firePos = vec2<f32>(0.5, 0.18);
            
            for (var i = 0; i < 8; i++) {
              let fi = f32(i);
              let seed = hash2(vec2<f32>(fi, fi * 1.7));
              
              // Rising motion with drift
              let lifetime = fract(time * 0.3 + seed.x);
              let yPos = firePos.y + lifetime * 0.25;
              let xDrift = sin(time * 2.0 + fi * 2.5) * 0.02 * lifetime;
              let xPos = firePos.x + (seed.y - 0.5) * 0.08 + xDrift;
              
              let emberPos = vec2<f32>(xPos, yPos);
              let dist = length(uv - emberPos);
              
              // Fade out as it rises
              let fade = (1.0 - lifetime) * (1.0 - lifetime);
              let ember = smoothstep(0.008, 0.0, dist) * fade;
              
              total += vec3<f32>(1.0, 0.6, 0.2) * ember;
            }
            
            return total;
          }

          // Bokeh blur simulation for background
          fn bokeh(uv: vec2<f32>, center: vec2<f32>, radius: f32, softness: f32) -> f32 {
            let dist = length(uv - center);
            return smoothstep(radius + softness, radius - softness, dist);
          }

          // Ground with low-poly styling
          fn ground(uv: vec2<f32>, time: f32) -> vec3<f32> {
            let groundLevel = 0.15;
            if (uv.y > groundLevel) {
              return vec3<f32>(0.0);
            }
            
            // Low-poly terrain height variation
            let terrainNoise = lowPolyNoise(vec2<f32>(uv.x, 0.0), 8.0);
            let localGround = groundLevel - 0.02 + terrainNoise * 0.04;
            
            if (uv.y > localGround) {
              return vec3<f32>(0.0);
            }
            
            // Ground colors with faceted shading
            let cellId = floor(uv.x * 15.0);
            let shade = hash(vec2<f32>(cellId, 0.0)) * 0.3 + 0.7;
            
            // Warm earth tones lit by fire
            let fireDist = abs(uv.x - 0.5);
            let fireLight = exp(-fireDist * 4.0) * 0.5;
            
            let baseColor = vec3<f32>(0.15, 0.1, 0.08);
            let litColor = vec3<f32>(0.4, 0.2, 0.1);
            
            return mix(baseColor, litColor, fireLight) * shade;
          }

          // Forest background with blur
          fn forest(uv: vec2<f32>, time: f32, blur: f32) -> vec3<f32> {
            var color = vec3<f32>(0.0);
            
            // Sky gradient (night sky)
            let skyGrad = mix(
              vec3<f32>(0.02, 0.03, 0.08),
              vec3<f32>(0.08, 0.06, 0.12),
              uv.y
            );
            color = skyGrad;
            
            // Stars (only visible in sharp areas)
            if (blur < 0.3) {
              for (var i = 0; i < 20; i++) {
                let fi = f32(i);
                let starSeed = hash2(vec2<f32>(fi * 13.7, fi * 7.3));
                let starPos = vec2<f32>(starSeed.x, starSeed.y * 0.5 + 0.5); // Upper half only
                let twinkle = 0.5 + 0.5 * sin(time * (2.0 + fi * 0.5));
                let star = smoothstep(0.003, 0.0, length(uv - starPos)) * twinkle;
                color += vec3<f32>(0.8, 0.85, 1.0) * star * (1.0 - blur);
              }
            }
            
            // Background trees (blurred)
            let treePositions = array<vec2<f32>, 8>(
              vec2<f32>(0.08, 0.15),
              vec2<f32>(0.18, 0.15),
              vec2<f32>(0.28, 0.15),
              vec2<f32>(0.72, 0.15),
              vec2<f32>(0.82, 0.15),
              vec2<f32>(0.92, 0.15),
              vec2<f32>(0.15, 0.15),
              vec2<f32>(0.85, 0.15)
            );
            
            let treeHeights = array<f32, 8>(0.25, 0.3, 0.22, 0.28, 0.24, 0.26, 0.2, 0.23);
            
            for (var i = 0; i < 8; i++) {
              let treeMask = tree(uv, treePositions[i], treeHeights[i], 0.08);
              // Darker trees with distance fade and blur
              let depth = abs(treePositions[i].x - 0.5);
              let treeColor = vec3<f32>(0.03, 0.05, 0.03) * (1.0 - depth * 0.5);
              
              // Apply blur by softening the tree edges
              let blurredMask = smoothstep(0.0, blur * 0.5 + 0.01, treeMask);
              color = mix(color, treeColor, blurredMask * 0.9);
            }
            
            // Fire glow on sky
            let glowDist = length(uv - vec2<f32>(0.5, 0.2));
            let fireGlow = exp(-glowDist * 3.0) * 0.15;
            color += vec3<f32>(1.0, 0.4, 0.1) * fireGlow;
            
            return color;
          }

          // Rocks around campfire (low-poly)
          fn rocks(uv: vec2<f32>) -> vec3<f32> {
            var color = vec3<f32>(0.0);
            
            let rockPositions = array<vec2<f32>, 5>(
              vec2<f32>(0.42, 0.14),
              vec2<f32>(0.46, 0.13),
              vec2<f32>(0.54, 0.13),
              vec2<f32>(0.58, 0.14),
              vec2<f32>(0.50, 0.12)
            );
            
            for (var i = 0; i < 5; i++) {
              let rockPos = rockPositions[i];
              let toRock = uv - rockPos;
              
              // Faceted rock shape
              let angle = atan2(toRock.y, toRock.x);
              let facets = 6.0;
              let facetAngle = floor(angle * facets / 6.28318) / facets * 6.28318;
              let rockShape = 0.015 + 0.005 * sin(facetAngle * 3.0);
              
              if (length(toRock) < rockShape) {
                let shade = 0.6 + 0.4 * sin(facetAngle * 2.0);
                // Lit by fire
                let fireLit = 0.3 + 0.7 * exp(-length(rockPos - vec2<f32>(0.5, 0.18)) * 10.0);
                color = vec3<f32>(0.2, 0.15, 0.12) * shade * fireLit;
              }
            }
            
            return color;
          }

          // Log silhouettes
          fn logs(uv: vec2<f32>) -> vec3<f32> {
            var color = vec3<f32>(0.0);
            
            // Two crossed logs
            let log1Start = vec2<f32>(0.44, 0.15);
            let log1End = vec2<f32>(0.56, 0.17);
            let log2Start = vec2<f32>(0.56, 0.15);
            let log2End = vec2<f32>(0.44, 0.17);
            
            // Simple line distance
            let toLog1 = uv - log1Start;
            let log1Dir = normalize(log1End - log1Start);
            let log1Proj = clamp(dot(toLog1, log1Dir), 0.0, length(log1End - log1Start));
            let log1Dist = length(toLog1 - log1Dir * log1Proj);
            
            let toLog2 = uv - log2Start;
            let log2Dir = normalize(log2End - log2Start);
            let log2Proj = clamp(dot(toLog2, log2Dir), 0.0, length(log2End - log2Start));
            let log2Dist = length(toLog2 - log2Dir * log2Proj);
            
            let logThickness = 0.012;
            if (log1Dist < logThickness) {
              color = vec3<f32>(0.25, 0.12, 0.05);
            }
            if (log2Dist < logThickness) {
              color = vec3<f32>(0.22, 0.1, 0.04);
            }
            
            return color;
          }

          @fragment
          fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
            let uv = input.uv;
            let time = uniforms.time;
            
            // Calculate depth-based blur
            // Foreground (fire area) is sharp, background gets bokeh blur
            let focalPoint = vec2<f32>(0.5, 0.2);
            let focalDepth = length(uv - focalPoint);
            let blurAmount = smoothstep(0.15, 0.5, focalDepth) * 0.8;
            
            // Render layers
            var color = vec3<f32>(0.0);
            
            // Background forest with blur
            color = forest(uv, time, blurAmount);
            
            // Ground (sharp in foreground, blurred in distance)
            let groundColor = ground(uv, time);
            if (length(groundColor) > 0.01) {
              let groundBlur = smoothstep(0.4, 0.6, abs(uv.x - 0.5)) * 0.3;
              color = mix(color, groundColor, 1.0 - groundBlur * 0.5);
            }
            
            // Rocks and logs (foreground, sharp)
            let rockColor = rocks(uv);
            if (length(rockColor) > 0.01) {
              color = rockColor;
            }
            
            let logColor = logs(uv);
            if (length(logColor) > 0.01) {
              color = logColor;
            }
            
            // Fire (always sharp and bright)
            let fireColor = fire(uv, time);
            color += fireColor;
            
            // Embers
            let emberColor = embers(uv, time);
            color += emberColor;
            
            // Overall fire ambient light
            let ambientFire = exp(-length(uv - vec2<f32>(0.5, 0.18)) * 2.5) * 0.08;
            color += vec3<f32>(1.0, 0.5, 0.2) * ambientFire;
            
            // Vignette
            let vignette = 1.0 - length(uv - 0.5) * 0.8;
            color *= vignette;
            
            // Tone mapping
            color = color / (color + 0.5);
            
            return vec4<f32>(color, 1.0);
          }
        `;

        const shaderModule = device.createShaderModule({
          code: shaderCode,
        });

        const uniformBuffer = device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        uniformBufferRef.current = uniformBuffer;

        const bindGroupLayout = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.FRAGMENT,
              buffer: { type: 'uniform' },
            },
          ],
        });

        const bindGroup = device.createBindGroup({
          layout: bindGroupLayout,
          entries: [
            {
              binding: 0,
              resource: { buffer: uniformBuffer },
            },
          ],
        });
        bindGroupRef.current = bindGroup;

        const pipeline = device.createRenderPipeline({
          layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
          }),
          vertex: {
            module: shaderModule,
            entryPoint: 'vertexMain',
          },
          fragment: {
            module: shaderModule,
            entryPoint: 'fragmentMain',
            targets: [
              {
                format: presentationFormat,
                blend: {
                  color: {
                    srcFactor: 'src-alpha',
                    dstFactor: 'one-minus-src-alpha',
                    operation: 'add',
                  },
                  alpha: {
                    srcFactor: 'one',
                    dstFactor: 'one-minus-src-alpha',
                    operation: 'add',
                  },
                },
              },
            ],
          },
          primitive: {
            topology: 'triangle-list',
          },
        });
        pipelineRef.current = pipeline;

        const handleResize = () => {
          if (!canvas || !mounted) return;
          const dpr = window.devicePixelRatio || 1;
          canvas.width = canvas.clientWidth * dpr;
          canvas.height = canvas.clientHeight * dpr;
          resolutionRef.current = { width: canvas.width, height: canvas.height };
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        cleanupResize = () => {
          window.removeEventListener('resize', handleResize);
        };

        const render = () => {
          if (!mounted || !device || !context || !pipeline || !uniformBuffer || !bindGroup) {
            return;
          }

          const elapsed = (Date.now() - startTimeRef.current) / 1000;

          const uniformData = new Float32Array([
            elapsed,
            0,
            resolutionRef.current.width,
            resolutionRef.current.height,
          ]);
          device.queue.writeBuffer(uniformBuffer, 0, uniformData);

          const commandEncoder = device.createCommandEncoder();
          const textureView = context.getCurrentTexture().createView();

          const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [
              {
                view: textureView,
                clearValue: { r: 0.02, g: 0.03, b: 0.05, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          });

          renderPass.setPipeline(pipeline);
          renderPass.setBindGroup(0, bindGroup);
          renderPass.draw(6);
          renderPass.end();

          device.queue.submit([commandEncoder.finish()]);

          animationFrameRef.current = requestAnimationFrame(render);
        };

        render();
      } catch (error) {
        console.error('WebGPU initialization failed:', error);
      }
    };

    init();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (cleanupResize) {
        cleanupResize();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.webgpuStage}
      aria-hidden="true"
    />
  );
}
