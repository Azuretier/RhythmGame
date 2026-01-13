// Atmospheric background shader with architectural silhouettes
// WGSL for WebGPU (desktop)

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vertexMain(@location(0) position: vec2<f32>) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(position, 0.0, 1.0);
  output.uv = position * 0.5 + 0.5;
  return output;
}

@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<uniform> resolution: vec2<f32>;

// Hash function for noise
fn hash21(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 2D noise
fn noise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  
  return mix(
    mix(hash21(i + vec2<f32>(0.0, 0.0)), hash21(i + vec2<f32>(1.0, 0.0)), u.x),
    mix(hash21(i + vec2<f32>(0.0, 1.0)), hash21(i + vec2<f32>(1.0, 1.0)), u.x),
    u.y
  );
}

// Fractal Brownian Motion for clouds/fog
fn fbm(p: vec2<f32>) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var uv = p;
  
  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(uv * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  
  return value;
}

// Building/architecture silhouette
fn building(p: vec2<f32>, seed: f32) -> f32 {
  let width = 0.05 + hash21(vec2<f32>(seed, 0.0)) * 0.1;
  let height = 0.3 + hash21(vec2<f32>(seed, 1.0)) * 0.5;
  
  let d = abs(p.x) - width;
  let h = max(0.0, p.y - height);
  
  return smoothstep(0.01, 0.0, max(d, h));
}

// City skyline
fn cityscape(p: vec2<f32>) -> f32 {
  var city = 0.0;
  
  for (var i = 0.0; i < 15.0; i += 1.0) {
    let offset = (i - 7.0) * 0.15;
    city = max(city, building(p - vec2<f32>(offset, -0.5), i));
  }
  
  return city;
}

@fragment
fn fragmentMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  // Adjust UV for aspect ratio
  let aspect = resolution.x / resolution.y;
  var p = (uv * 2.0 - 1.0) * vec2<f32>(aspect, 1.0);
  
  // Base gradient (sky)
  let skyColor1 = vec3<f32>(0.05, 0.1, 0.2);    // Dark blue
  let skyColor2 = vec3<f32>(0.2, 0.15, 0.3);    // Purple
  let skyColor3 = vec3<f32>(0.8, 0.3, 0.5);     // Pink horizon
  
  let gradientMix1 = smoothstep(-0.5, 0.5, p.y);
  let gradientMix2 = smoothstep(-0.8, 0.2, p.y);
  var color = mix(skyColor3, skyColor2, gradientMix2);
  color = mix(color, skyColor1, gradientMix1);
  
  // Animated clouds/fog
  let fogNoise = fbm(p * 2.0 + vec2<f32>(time * 0.05, time * 0.02));
  let fog = smoothstep(0.3, 0.7, fogNoise) * 0.3;
  color = mix(color, vec3<f32>(0.6, 0.5, 0.7), fog);
  
  // City silhouette
  let city = cityscape(p);
  let cityColor = vec3<f32>(0.02, 0.02, 0.05);
  color = mix(color, cityColor, city);
  
  // Window lights on buildings
  if (city > 0.5) {
    let windowNoise = hash21(floor(p * vec2<f32>(50.0, 20.0)));
    if (windowNoise > 0.7) {
      let lightColor = vec3<f32>(1.0, 0.9, 0.6);
      color += lightColor * 0.3 * (0.5 + 0.5 * sin(time * 2.0 + windowNoise * 10.0));
    }
  }
  
  // Atmospheric glow at horizon
  let horizonGlow = exp(-abs(p.y + 0.3) * 3.0) * 0.2;
  color += vec3<f32>(0.8, 0.4, 0.6) * horizonGlow;
  
  // Subtle bloom effect
  let bloom = smoothstep(0.0, 1.0, length(color)) * 0.1;
  color += bloom;
  
  // Vignette
  let vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.5;
  color *= vignette;
  
  return vec4<f32>(color, 1.0);
}
