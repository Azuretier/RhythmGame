'use client';

import { useEffect, useRef } from 'react';
import styles from './rhythmia.module.css';

export default function WebGPUStage() {
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
        // Request adapter and device
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          console.log('No WebGPU adapter found');
          return;
        }

        const device = await adapter.requestDevice();
        if (!mounted) {
          return;
        }

        deviceRef.current = device;

        // Configure canvas
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

        // Shader code
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

          fn hash(p: vec2<f32>) -> f32 {
            let p3 = fract(vec3<f32>(p.xyx) * 0.13);
            let p3_shifted = p3 + dot(p3, vec3<f32>(p3.yzx) + 3.333);
            return fract((p3_shifted.x + p3_shifted.y) * p3_shifted.z);
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

          @fragment
          fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
            let uv = input.uv;
            let time = uniforms.time;
            let resolution = uniforms.resolution;
            
            // Aspect ratio correction
            var coord = uv;
            coord.x *= resolution.x / resolution.y;
            let aspectRatio = resolution.x / resolution.y;
            
            // Heartbeat pulse
            let bpm = 90.0;
            let beatsPerSecond = 1.5; 
            let beatTime = time * beatsPerSecond;
            let pulse = sin(beatTime * 6.28318) * 0.5 + 0.5;
            let strongPulse = pow(pulse, 3.0);
            
            // Animated grid - CHANGED TO VAR
            let gridScale = 20.0;
            var gridCoord = coord * gridScale;
            gridCoord.y += time * 2.0; 
            
            let grid = fract(gridCoord);
            // gridLines MUST BE VAR to use *= later
            var gridLines = smoothstep(0.02, 0.0, min(grid.x, grid.y)) +
                          smoothstep(0.02, 0.0, min(1.0 - grid.x, 1.0 - grid.y));
            
            let centerCoord = vec2<f32>(0.5 * aspectRatio, 0.5);
            let centerDist = length(coord - centerCoord);
            let gridFade = smoothstep(1.5, 0.3, centerDist);
            
            // This was causing your error
            gridLines *= gridFade;
            
            let glow1Pos = vec2<f32>(0.2, 0.2) + vec2<f32>(sin(time * 0.5), cos(time * 0.3)) * 0.1;
            let glow1 = exp(-length(uv - glow1Pos) * 3.0) * strongPulse;
            
            let glow2Pos = vec2<f32>(0.8, 0.8) + vec2<f32>(cos(time * 0.4), sin(time * 0.6)) * 0.1;
            let glow2 = exp(-length(uv - glow2Pos) * 3.0) * strongPulse;
            
            let glow3Pos = vec2<f32>(0.5, 0.5) + vec2<f32>(sin(time * 0.3), cos(time * 0.5)) * 0.15;
            let glow3 = exp(-length(uv - glow3Pos) * 2.5) * pulse * 0.5;
            
            let noiseVal = noise(coord * 5.0 + time * 0.5) * 0.05;
            
            let neonPink = vec3<f32>(1.0, 0.42, 0.62);   
            let neonCyan = vec3<f32>(0.31, 0.8, 0.77);   
            let neonPurple = vec3<f32>(0.64, 0.61, 1.0); 
            
            var color = vec3<f32>(0.0);
            color += gridLines * neonCyan * 0.3;
            color += glow1 * neonPink * 0.4;
            color += glow2 * neonCyan * 0.4;
            color += glow3 * neonPurple * 0.3;
            color += noiseVal;
            
            let intensity = 0.6;
            color *= intensity;
            
            return vec4<f32>(color, 1.0);
          }
        `;

        // Create shader module
        const shaderModule = device.createShaderModule({
          code: shaderCode,
        });

        // Create uniform buffer
        const uniformBuffer = device.createBuffer({
          size: 16, // time (4 bytes) + padding (4 bytes) + resolution (8 bytes)
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        uniformBufferRef.current = uniformBuffer;

        // Create bind group layout
        const bindGroupLayout = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.FRAGMENT,
              buffer: { type: 'uniform' },
            },
          ],
        });

        // Create bind group
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

        // Create pipeline
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

        // Handle resize
        const handleResize = () => {
          if (!canvas || !mounted) return;
          const dpr = window.devicePixelRatio || 1;
          canvas.width = canvas.clientWidth * dpr;
          canvas.height = canvas.clientHeight * dpr;
          resolutionRef.current = { width: canvas.width, height: canvas.height };
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        
        // Store cleanup function
        cleanupResize = () => {
          window.removeEventListener('resize', handleResize);
        };

        // Animation loop
        const render = () => {
          if (!mounted || !device || !context || !pipeline || !uniformBuffer || !bindGroup) {
            return;
          }

          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          
          // Update uniforms (only time changes per frame, resolution cached)
          const uniformData = new Float32Array([
            elapsed,
            0, // padding
            resolutionRef.current.width,
            resolutionRef.current.height,
          ]);
          device.queue.writeBuffer(uniformBuffer, 0, uniformData);

          // Render
          const commandEncoder = device.createCommandEncoder();
          const textureView = context.getCurrentTexture().createView();

          const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [
              {
                view: textureView,
                clearValue: { r: 0.04, g: 0.04, b: 0.07, a: 1.0 }, // Dark background
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

        // Start rendering
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
      // WebGPU resources cleanup: buffers and contexts are released when no longer referenced
      // Device loses itself automatically on page unload
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
