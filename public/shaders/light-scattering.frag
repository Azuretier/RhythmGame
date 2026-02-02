#ifdef GL_ES
precision highp float;
#endif

varying vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;

// ============================================================================
// NOISE FUNCTIONS
// ============================================================================

// Simple hash function for pseudo-random numbers
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2D Perlin-like noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    // Four corners
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    // Smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal Brownian Motion - layered noise for complexity
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// 3D noise for volumetric effects
float noise3d(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = i.x + i.y * 57.0 + i.z * 113.0;
    
    return mix(
        mix(mix(hash(vec2(n, 0.0)), hash(vec2(n + 1.0, 0.0)), f.x),
            mix(hash(vec2(n + 57.0, 0.0)), hash(vec2(n + 58.0, 0.0)), f.x), f.y),
        mix(mix(hash(vec2(n + 113.0, 0.0)), hash(vec2(n + 114.0, 0.0)), f.x),
            mix(hash(vec2(n + 170.0, 0.0)), hash(vec2(n + 171.0, 0.0)), f.x), f.y), f.z);
}

// ============================================================================
// LIGHT SCATTERING FUNCTIONS
// ============================================================================

// Rayleigh scattering phase function
float rayleighPhase(float cosTheta) {
    return (3.0 / (16.0 * 3.14159)) * (1.0 + cosTheta * cosTheta);
}

// Mie scattering phase function (approximation)
float miePhase(float cosTheta, float g) {
    float g2 = g * g;
    float phase = (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
    return phase / (4.0 * 3.14159);
}

// Volumetric light ray marching
float volumetricLight(vec2 uv, vec2 lightPos, float time) {
    vec2 dir = uv - lightPos;
    float dist = length(dir);
    dir = normalize(dir);
    
    float rayStrength = 0.0;
    float stepSize = 0.02;
    int numSteps = 32;
    
    for (int i = 0; i < 32; i++) {
        if (i >= numSteps) break;
        
        float t = float(i) / float(numSteps);
        vec2 pos = lightPos + dir * dist * t;
        
        // Sample 3D noise for density
        vec3 noisePos = vec3(pos * 3.0, time * 0.1);
        float density = noise3d(noisePos + vec3(time * 0.05));
        
        // Add turbulence
        density += noise3d(noisePos * 2.0 + vec3(time * 0.1)) * 0.5;
        density = clamp(density, 0.0, 1.0);
        
        // Accumulate light through volume
        float distanceFactor = 1.0 - t;
        rayStrength += density * stepSize * distanceFactor;
    }
    
    return rayStrength;
}

// God rays / light shafts
float godRays(vec2 uv, vec2 lightPos, float time) {
    vec2 dir = uv - lightPos;
    float dist = length(dir);
    
    // Radial blur
    float rays = 0.0;
    int numSamples = 16;
    
    for (int i = 0; i < 16; i++) {
        if (i >= numSamples) break;
        
        float t = float(i) / float(numSamples);
        vec2 samplePos = lightPos + dir * t;
        
        // Sample noise
        float noiseSample = fbm(samplePos * 5.0 + vec2(time * 0.1));
        rays += noiseSample * (1.0 - t);
    }
    
    rays /= float(numSamples);
    
    // Fade with distance
    rays *= smoothstep(1.5, 0.0, dist);
    
    return rays;
}

// Atmospheric fog with light scattering
vec3 atmosphericScattering(vec2 uv, vec2 lightDir, float time) {
    float altitude = uv.y + 0.5; // 0.0 to 1.0 from bottom to top
    
    // Base atmosphere density (higher at horizon)
    float density = exp(-altitude * 2.0);
    
    // Add noise for cloud-like structures
    float cloudNoise = fbm(uv * 3.0 + vec2(time * 0.02, 0.0));
    density += cloudNoise * 0.3;
    
    // Light scattering angle
    float cosTheta = dot(normalize(vec2(uv.x, uv.y) - lightDir), vec2(0.0, 1.0));
    
    // Combine Rayleigh and Mie scattering
    float rayleigh = rayleighPhase(cosTheta) * 0.7;
    float mie = miePhase(cosTheta, 0.76) * 0.3;
    
    float scattering = (rayleigh + mie) * density;
    
    // Color based on scattering type
    vec3 rayleighColor = vec3(0.4, 0.6, 1.0); // Blue for sky
    vec3 mieColor = vec3(1.0, 0.9, 0.7); // Warm for dust/haze
    
    return mix(rayleighColor, mieColor, mie / (rayleigh + mie)) * scattering;
}

// ============================================================================
// MAIN SHADER
// ============================================================================

void main() {
    // Normalized coordinates
    vec2 uv = vUv;
    vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Animated light source position (sun/moon moving across sky)
    float lightAngle = u_time * 0.1;
    vec2 lightPos = vec2(cos(lightAngle) * 0.6, sin(lightAngle) * 0.3 + 0.2);
    
    // ========================================================================
    // BASE ATMOSPHERE
    // ========================================================================
    
    // Sky gradient
    vec3 skyTop = vec3(0.05, 0.1, 0.25);
    vec3 skyHorizon = vec3(0.3, 0.4, 0.6);
    vec3 skyBase = mix(skyHorizon, skyTop, smoothstep(-0.3, 0.6, st.y));
    
    // Add time-based color variation
    float timeColorShift = sin(u_time * 0.05) * 0.5 + 0.5;
    skyBase += vec3(0.1, 0.05, 0.0) * timeColorShift;
    
    // ========================================================================
    // NOISE LAYERS
    // ========================================================================
    
    // Multiple noise layers for atmospheric depth
    float noise1 = fbm(st * 2.0 + vec2(u_time * 0.01, 0.0));
    float noise2 = fbm(st * 4.0 - vec2(u_time * 0.02, u_time * 0.01));
    float noise3 = fbm(st * 8.0 + vec2(0.0, u_time * 0.03));
    
    // Combine noise layers
    vec3 noiseColor = vec3(0.2, 0.25, 0.35) * noise1 * 0.3;
    noiseColor += vec3(0.15, 0.2, 0.3) * noise2 * 0.2;
    noiseColor += vec3(0.1, 0.15, 0.25) * noise3 * 0.1;
    
    skyBase += noiseColor;
    
    // ========================================================================
    // LIGHT SCATTERING EFFECTS
    // ========================================================================
    
    // Distance from light source
    float distToLight = length(st - lightPos);
    
    // Volumetric light rays
    float volumetric = volumetricLight(st, lightPos, u_time);
    vec3 volumetricColor = vec3(1.0, 0.9, 0.7) * volumetric * 0.5;
    
    // God rays emanating from light source
    float rays = godRays(st, lightPos, u_time);
    vec3 rayColor = vec3(1.0, 0.95, 0.8) * rays * 0.6;
    
    // Atmospheric scattering
    vec3 scattering = atmosphericScattering(st, lightPos, u_time);
    
    // Light source glow
    float lightGlow = exp(-distToLight * 4.0) * 0.8;
    vec3 glowColor = vec3(1.0, 0.95, 0.8) * lightGlow;
    
    // Add light disk
    float lightDisk = smoothstep(0.08, 0.05, distToLight);
    glowColor += vec3(1.0, 0.95, 0.85) * lightDisk;
    
    // ========================================================================
    // COMBINE ALL EFFECTS
    // ========================================================================
    
    vec3 finalColor = skyBase;
    
    // Add scattering
    finalColor += scattering * 0.8;
    
    // Add volumetric lighting
    finalColor += volumetricColor;
    
    // Add god rays
    finalColor += rayColor;
    
    // Add light source
    finalColor += glowColor;
    
    // ========================================================================
    // POST-PROCESSING
    // ========================================================================
    
    // Atmospheric particles/dust (using noise)
    float particles = noise(st * 80.0 + u_time * 0.2);
    particles *= noise(st * 50.0 - u_time * 0.1);
    particles = pow(particles, 6.0);
    finalColor += vec3(0.5, 0.4, 0.3) * particles * 0.15;
    
    // Vignette effect
    float vignette = 1.0 - length(st * 0.6);
    vignette = smoothstep(0.2, 1.0, vignette);
    finalColor *= vignette * 0.8 + 0.2;
    
    // Color grading
    finalColor = pow(finalColor, vec3(0.95)); // Slightly increase contrast
    
    // Subtle film grain
    float grain = hash(st + u_time) * 0.02;
    finalColor += grain;
    
    // Clamp to valid range
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, 0.98);
}
