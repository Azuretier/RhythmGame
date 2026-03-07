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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestAdapter(options?: any): Promise<GPUAdapter | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPreferredCanvasFormat(): any;
}

interface GPUAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestDevice(descriptor?: any): Promise<GPUDevice>;
}

interface GPUDevice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBuffer(descriptor: any): GPUBuffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createShaderModule(descriptor: any): GPUShaderModule;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRenderPipeline(descriptor: any): GPURenderPipeline;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPipelineLayout(descriptor: any): GPUPipelineLayout;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBindGroupLayout(descriptor: any): GPUBindGroupLayout;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GPUShaderModule {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GPURenderPipeline {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GPUPipelineLayout {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GPUBindGroupLayout {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GPUBindGroup {}

interface GPUCommandEncoder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beginRenderPass(descriptor: any): GPURenderPassEncoder;
  finish(): GPUCommandBuffer;
}

interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup): void;
  draw(vertexCount: number): void;
  end(): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GPUCommandBuffer {}

interface GPUQueue {
  submit(commandBuffers: GPUCommandBuffer[]): void;
  writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: ArrayBuffer | ArrayBufferView): void;
}

interface GPUCanvasContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configure(configuration: any): void;
  getCurrentTexture(): GPUTexture;
}

interface GPUTexture {
  createView(): GPUTextureView;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GPUTextureView {}
// Spark SDK types (for Discord community features)
interface SparkSDK {
  llm(prompt: string, model: string, json?: boolean): Promise<string>;
  kv: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
  };
}

interface Window {
  spark?: SparkSDK;
}
