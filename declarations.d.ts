// declarations.d.ts
declare module '*.frag' {
  const value: string;
  export default value;
}
declare module '*.glsl' {
  const value: string;
  export default value;
}
declare module '*.wgsl' {
  const value: string;
  export default value;
}

// Extend HTMLCanvasElement to support webgpu context
interface HTMLCanvasElement {
  getContext(contextId: "webgpu"): GPUCanvasContext | null;
}

// WebGL/WebGPU type definitions (minimal subset for compatibility)
// Note: Currently using WebGL for rendering, WebGPU types included for future upgrade
interface Navigator {
  gpu?: GPU;
}

interface GPU {
  requestAdapter(options?: any): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat(): any;
}

interface GPUAdapter {
  requestDevice(descriptor?: any): Promise<GPUDevice>;
}

interface GPUDevice {
  createBuffer(descriptor: any): GPUBuffer;
  createShaderModule(descriptor: any): GPUShaderModule;
  createRenderPipeline(descriptor: any): GPURenderPipeline;
  createPipelineLayout(descriptor: any): GPUPipelineLayout;
  createBindGroupLayout(descriptor: any): GPUBindGroupLayout;
  createBindGroup(descriptor: any): GPUBindGroup;
  createCommandEncoder(): GPUCommandEncoder;
  queue: GPUQueue;
}

interface GPUBuffer {
  size: number;
  usage: number;
}

declare const GPUBufferUsage: {
  UNIFORM: number;
  COPY_DST: number;
  VERTEX: number;
  INDEX: number;
  STORAGE: number;
  COPY_SRC: number;
};

declare const GPUShaderStage: {
  VERTEX: number;
  FRAGMENT: number;
  COMPUTE: number;
};

interface GPUShaderModule {}
interface GPURenderPipeline {}
interface GPUPipelineLayout {}
interface GPUBindGroupLayout {}
interface GPUBindGroup {}

interface GPUCommandEncoder {
  beginRenderPass(descriptor: any): GPURenderPassEncoder;
  finish(): GPUCommandBuffer;
}

interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup): void;
  draw(vertexCount: number): void;
  end(): void;
}

interface GPUCommandBuffer {}

interface GPUQueue {
  submit(commandBuffers: GPUCommandBuffer[]): void;
  writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: ArrayBuffer | ArrayBufferView): void;
}

interface GPUCanvasContext {
  configure(configuration: any): void;
  getCurrentTexture(): GPUTexture;
}

interface GPUTexture {
  createView(): GPUTextureView;
}

interface GPUTextureView {}