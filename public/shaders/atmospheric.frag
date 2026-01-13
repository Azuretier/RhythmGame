#ifdef GL_ES
precision highp float;
#endif

uniform float u_time;
uniform vec2 u_resolution;

varying vec2 vUv;

// Hash function for noise
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 2D noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  return mix(
    mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Fractal Brownian Motion
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  
  return value;
}

// Building silhouette
float building(vec2 p, float seed) {
  float width = 0.05 + hash21(vec2(seed, 0.0)) * 0.1;
  float height = 0.3 + hash21(vec2(seed, 1.0)) * 0.5;
  
  float d = abs(p.x) - width;
  float h = max(0.0, p.y - height);
  
  return smoothstep(0.01, 0.0, max(d, h));
}

// City skyline
float cityscape(vec2 p) {
  float city = 0.0;
  
  for (float i = 0.0; i < 15.0; i += 1.0) {
    float offset = (i - 7.0) * 0.15;
    city = max(city, building(p - vec2(offset, -0.5), i));
  }
  
  return city;
}

void main() {
  // Adjust UV for aspect ratio
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (vUv * 2.0 - 1.0) * vec2(aspect, 1.0);
  
  // Base gradient (sky)
  vec3 skyColor1 = vec3(0.05, 0.1, 0.2);    // Dark blue
  vec3 skyColor2 = vec3(0.2, 0.15, 0.3);    // Purple
  vec3 skyColor3 = vec3(0.8, 0.3, 0.5);     // Pink horizon
  
  float gradientMix1 = smoothstep(-0.5, 0.5, p.y);
  float gradientMix2 = smoothstep(-0.8, 0.2, p.y);
  vec3 color = mix(skyColor3, skyColor2, gradientMix2);
  color = mix(color, skyColor1, gradientMix1);
  
  // Animated clouds/fog
  float fogNoise = fbm(p * 2.0 + vec2(u_time * 0.05, u_time * 0.02));
  float fog = smoothstep(0.3, 0.7, fogNoise) * 0.3;
  color = mix(color, vec3(0.6, 0.5, 0.7), fog);
  
  // City silhouette
  float city = cityscape(p);
  vec3 cityColor = vec3(0.02, 0.02, 0.05);
  color = mix(color, cityColor, city);
  
  // Window lights on buildings
  if (city > 0.5) {
    float windowNoise = hash21(floor(p * vec2(50.0, 20.0)));
    if (windowNoise > 0.7) {
      vec3 lightColor = vec3(1.0, 0.9, 0.6);
      color += lightColor * 0.3 * (0.5 + 0.5 * sin(u_time * 2.0 + windowNoise * 10.0));
    }
  }
  
  // Atmospheric glow at horizon
  float horizonGlow = exp(-abs(p.y + 0.3) * 3.0) * 0.2;
  color += vec3(0.8, 0.4, 0.6) * horizonGlow;
  
  // Subtle bloom effect
  float bloom = smoothstep(0.0, 1.0, length(color)) * 0.1;
  color += bloom;
  
  // Vignette
  float vignette = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 0.5;
  color *= vignette;
  
  gl_FragColor = vec4(color, 1.0);
}
