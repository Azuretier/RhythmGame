export interface WebGpuContext {
  device: GPUDevice;
  adapter: GPUAdapter;
}

export async function initWebGPU(): Promise<WebGpuContext> {
  if (!navigator.gpu) throw new Error("WebGPU not supported");
  
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance"
  })!;
  
  const device = await adapter!.requestDevice({
    requiredFeatures: ["shader-f16", "texture-compression-bc"]
  });

  return { device, adapter: adapter! };
}

// Minecraft-style post-processing shaders (WGSL)
export const shaders = {
  bloomExtract: `
    @fragment
    fn main(@location(0) in: vec2f) -> @location(0) vec4f {
      let color = textureSample(sceneTex, sampler, in);
      let bright = max(dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722)) - 1.0, 0.0);
      return vec4f(color.rgb * bright, 1.0);
    }
  `,
  volumetricFog: `
    @compute @workgroup_size(16, 16)
    fn main(@builtin(global_invocation_id) gid: vec3u) {
      // Raymarch fog implementation from previous example
    }
  `,
  // ... other shaders (godrays, final composite)
};
