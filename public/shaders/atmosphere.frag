#ifdef GL_ES
precision highp float;
#endif

varying vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;

// Noise function for atmospheric effects
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal Brownian Motion for layered noise
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(st * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// City silhouette function
float cityBuilding(vec2 uv, float seed) {
    float width = 0.05 + random(vec2(seed, 0.0)) * 0.08;
    float height = 0.15 + random(vec2(seed, 1.0)) * 0.35;
    
    float building = step(abs(uv.x), width) * step(uv.y, height);
    
    // Windows
    vec2 windowUv = fract(uv * vec2(50.0, 30.0));
    float windows = step(0.3, windowUv.x) * step(windowUv.x, 0.7) * 
                    step(0.2, windowUv.y) * step(windowUv.y, 0.8);
    windows *= step(0.0, uv.y) * step(uv.y, height);
    
    float windowGlow = windows * (0.5 + 0.5 * sin(u_time * 0.5 + seed * 10.0));
    
    return building + windowGlow * 0.3;
}

// Create city skyline
float citySkyline(vec2 uv) {
    float skyline = 0.0;
    
    for (float i = -10.0; i < 10.0; i++) {
        vec2 buildingPos = uv - vec2(i * 0.15, -0.3);
        skyline = max(skyline, cityBuilding(buildingPos, i * 17.34));
    }
    
    return skyline;
}

// Fog layers
float fogLayer(vec2 uv, float speed, float scale) {
    vec2 fogUv = uv * scale;
    fogUv.x += u_time * speed;
    return fbm(fogUv);
}

void main() {
    vec2 uv = vUv;
    vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Base atmospheric gradient - deep blue to purple
    vec3 skyColor = vec3(0.05, 0.08, 0.15); // Deep blue-black
    vec3 horizonColor = vec3(0.15, 0.08, 0.25); // Purple horizon
    
    float gradientMix = smoothstep(-0.5, 0.3, st.y);
    vec3 baseColor = mix(horizonColor, skyColor, gradientMix);
    
    // Add subtle color variation
    float colorNoise = fbm(st * 2.0 + u_time * 0.05);
    baseColor += vec3(0.02, 0.01, 0.03) * colorNoise;
    
    // Fog layers for depth
    float fog1 = fogLayer(st, 0.02, 1.5);
    float fog2 = fogLayer(st, -0.03, 2.0);
    float fog3 = fogLayer(st, 0.015, 2.5);
    
    vec3 fogColor = vec3(0.2, 0.15, 0.3);
    float fogIntensity = fog1 * 0.3 + fog2 * 0.2 + fog3 * 0.15;
    fogIntensity *= smoothstep(0.2, -0.2, st.y); // More fog at horizon
    
    baseColor = mix(baseColor, fogColor, fogIntensity * 0.4);
    
    // City silhouette
    float city = citySkyline(st);
    vec3 cityColor = vec3(0.05, 0.05, 0.08); // Dark silhouette
    vec3 cityGlow = vec3(0.8, 0.6, 0.3); // Warm window glow
    
    vec3 cityFinal = mix(cityColor, cityGlow, city * 0.3);
    baseColor = mix(baseColor, cityFinal, step(0.01, city));
    
    // Atmospheric particles/dust
    float particles = noise(st * 100.0 + u_time * 0.1);
    particles *= noise(st * 50.0 - u_time * 0.05);
    particles = pow(particles, 5.0);
    baseColor += vec3(0.4, 0.3, 0.5) * particles * 0.1;
    
    // Subtle vignette
    float vignette = 1.0 - length(st * 0.5);
    vignette = smoothstep(0.3, 1.0, vignette);
    baseColor *= vignette * 0.7 + 0.3;
    
    // Color grading - cinematic look
    baseColor = pow(baseColor, vec3(1.1)); // Slight contrast
    baseColor *= 1.2; // Brightness
    
    // Film grain
    float grain = random(st + u_time) * 0.015;
    baseColor += grain;
    
    gl_FragColor = vec4(baseColor, 0.95);
}
