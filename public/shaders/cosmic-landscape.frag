#ifdef GL_ES
precision highp float;
#endif

varying vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_cameraPos;

// ============================================================================
// NOISE FUNCTIONS
// ============================================================================

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

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

float fbm3d(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise3d(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// ============================================================================
// STAR FIELD
// ============================================================================

float starField(vec2 uv, float time) {
    float stars = 0.0;

    // Layer 1: dense small stars
    vec2 cell = floor(uv * 200.0);
    vec2 local = fract(uv * 200.0) - 0.5;
    float brightness = hash(cell);
    float twinkle = sin(time * (2.0 + brightness * 4.0) + brightness * 6.28) * 0.5 + 0.5;
    float dist = length(local - (vec2(hash(cell + 0.5), hash(cell + 1.5)) - 0.5) * 0.7);
    if (brightness > 0.92) {
        stars += smoothstep(0.06, 0.0, dist) * twinkle * 0.8;
    }

    // Layer 2: bright scattered stars
    cell = floor(uv * 80.0);
    local = fract(uv * 80.0) - 0.5;
    brightness = hash(cell + 100.0);
    twinkle = sin(time * (1.0 + brightness * 3.0) + brightness * 6.28) * 0.4 + 0.6;
    dist = length(local - (vec2(hash(cell + 100.5), hash(cell + 101.5)) - 0.5) * 0.6);
    if (brightness > 0.88) {
        float starGlow = smoothstep(0.1, 0.0, dist) * twinkle;
        stars += starGlow;
    }

    // Layer 3: rare brilliant stars with color
    cell = floor(uv * 30.0);
    local = fract(uv * 30.0) - 0.5;
    brightness = hash(cell + 200.0);
    dist = length(local - (vec2(hash(cell + 200.5), hash(cell + 201.5)) - 0.5) * 0.4);
    if (brightness > 0.96) {
        float glow = smoothstep(0.15, 0.0, dist);
        stars += glow * 1.5;
    }

    return stars;
}

// ============================================================================
// NEBULA / COSMIC CLOUDS
// ============================================================================

vec3 nebula(vec2 uv, float time) {
    vec3 color = vec3(0.0);

    // Large-scale nebula structure
    float n1 = fbm(uv * 1.5 + vec2(time * 0.008, time * 0.005));
    float n2 = fbm(uv * 2.5 - vec2(time * 0.01, -time * 0.007));
    float n3 = fbm(uv * 4.0 + vec2(-time * 0.006, time * 0.012));

    // Purple/magenta nebula cloud
    float nebMask1 = smoothstep(0.35, 0.7, n1);
    color += vec3(0.4, 0.1, 0.6) * nebMask1 * 0.6;

    // Cyan/teal rift
    float nebMask2 = smoothstep(0.4, 0.75, n2);
    color += vec3(0.05, 0.35, 0.55) * nebMask2 * 0.5;

    // Golden dust
    float nebMask3 = smoothstep(0.5, 0.8, n3) * smoothstep(0.3, 0.5, n1);
    color += vec3(0.6, 0.4, 0.1) * nebMask3 * 0.3;

    // Bright emission edges where nebulae overlap
    float edgeGlow = abs(n1 - n2);
    edgeGlow = smoothstep(0.02, 0.0, edgeGlow) * 0.8;
    color += vec3(0.8, 0.3, 0.9) * edgeGlow;

    return color;
}

// ============================================================================
// COSMIC RIFT — glowing fissures in space
// ============================================================================

vec3 cosmicRift(vec2 uv, float time) {
    vec3 riftColor = vec3(0.0);

    // Primary rift — sinusoidal path with noise distortion
    float riftLine = uv.y - sin(uv.x * 2.0 + time * 0.15) * 0.15
                          - cos(uv.x * 3.5 - time * 0.1) * 0.08;
    riftLine += (noise(uv * 8.0 + time * 0.05) - 0.5) * 0.08;

    float riftWidth = 0.003 + noise(uv * 12.0 + time * 0.1) * 0.004;
    float riftIntensity = smoothstep(riftWidth * 3.0, 0.0, abs(riftLine));
    float riftCore = smoothstep(riftWidth, 0.0, abs(riftLine));

    // Rift color — bright cyan core, purple glow
    riftColor += vec3(0.2, 0.8, 1.0) * riftCore * 2.0;
    riftColor += vec3(0.5, 0.2, 0.8) * riftIntensity * 0.8;

    // Energy tendrils along the rift
    float tendril = fbm(vec2(uv.x * 15.0 + time * 0.3, riftLine * 50.0));
    tendril = smoothstep(0.4, 0.8, tendril) * riftIntensity;
    riftColor += vec3(0.3, 0.6, 1.0) * tendril * 0.6;

    // Secondary diagonal rift
    float rift2 = uv.y - uv.x * 0.6 - 0.3
                  + sin(uv.x * 4.0 + time * 0.2) * 0.06
                  + (noise(uv * 10.0 - time * 0.08) - 0.5) * 0.05;
    float rift2Core = smoothstep(0.005, 0.0, abs(rift2));
    float rift2Glow = smoothstep(0.02, 0.0, abs(rift2));

    riftColor += vec3(1.0, 0.4, 0.2) * rift2Core * 1.5;
    riftColor += vec3(0.8, 0.2, 0.5) * rift2Glow * 0.5;

    return riftColor;
}

// ============================================================================
// VOLUMETRIC GOD RAYS
// ============================================================================

float volumetricRays(vec2 uv, vec2 lightPos, float time) {
    vec2 dir = uv - lightPos;
    float dist = length(dir);
    dir = normalize(dir);

    float rays = 0.0;
    for (int i = 0; i < 24; i++) {
        float t = float(i) / 24.0;
        vec2 samplePos = lightPos + dir * dist * t;
        float density = fbm(samplePos * 6.0 + vec2(time * 0.05, time * 0.03));
        rays += density * (1.0 - t) * 0.04;
    }

    rays *= smoothstep(1.5, 0.0, dist);
    return rays;
}

// ============================================================================
// MAIN
// ============================================================================

void main() {
    vec2 uv = vUv;
    vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float time = u_time;

    // === Deep space background ===
    vec3 bgTop = vec3(0.01, 0.01, 0.04);
    vec3 bgMid = vec3(0.02, 0.01, 0.06);
    vec3 bgBot = vec3(0.03, 0.02, 0.05);
    vec3 bg = mix(bgBot, bgMid, smoothstep(-0.5, 0.0, st.y));
    bg = mix(bg, bgTop, smoothstep(0.0, 0.5, st.y));

    // Subtle color variation
    bg += vec3(0.01, 0.005, 0.02) * fbm(st * 3.0 + time * 0.01);

    // === Star field ===
    float stars = starField(st + vec2(time * 0.002, time * 0.001), time);
    // Star color temperature
    vec3 starColor = mix(
        vec3(0.8, 0.85, 1.0),
        vec3(1.0, 0.9, 0.7),
        hash(floor(st * 80.0))
    );
    bg += starColor * stars;

    // === Nebula clouds ===
    vec3 nebColor = nebula(st, time);
    bg += nebColor;

    // === Cosmic rifts ===
    vec3 riftColor = cosmicRift(st, time);
    bg += riftColor;

    // === Volumetric light from a distant celestial body ===
    float lightAngle = time * 0.04;
    vec2 lightPos = vec2(cos(lightAngle) * 0.8, sin(lightAngle) * 0.3 + 0.15);

    // Light source glow
    float distToLight = length(st - lightPos);
    float lightGlow = exp(-distToLight * 3.5) * 0.6;
    bg += vec3(0.5, 0.3, 0.8) * lightGlow;

    // Light disk
    float lightDisk = smoothstep(0.06, 0.03, distToLight);
    bg += vec3(0.7, 0.5, 1.0) * lightDisk;

    // God rays
    float rays = volumetricRays(st, lightPos, time);
    bg += vec3(0.4, 0.2, 0.6) * rays * 2.0;

    // === Second light source — warm distant star ===
    vec2 lightPos2 = vec2(-0.5, 0.3 + sin(time * 0.03) * 0.1);
    float dist2 = length(st - lightPos2);
    bg += vec3(1.0, 0.6, 0.2) * exp(-dist2 * 5.0) * 0.3;
    bg += vec3(1.0, 0.8, 0.4) * smoothstep(0.04, 0.02, dist2) * 0.5;

    // === Post-processing ===

    // Bloom-like glow on bright regions
    vec3 bloomColor = max(bg - 0.5, vec3(0.0));
    bg += bloomColor * 0.3;

    // Chromatic aberration
    vec2 caOffset = (st - vec2(0.0)) * 0.003;
    float caR = fbm((st + caOffset) * 3.0 + time * 0.01);
    float caB = fbm((st - caOffset) * 3.0 + time * 0.01);
    bg.r += (caR - 0.5) * 0.015;
    bg.b += (caB - 0.5) * 0.015;

    // Vignette
    float vignette = 1.0 - length(st * 0.7);
    vignette = smoothstep(0.1, 0.9, vignette);
    bg *= vignette * 0.85 + 0.15;

    // Film grain
    float grain = hash(st * u_resolution.xy + time) * 0.025;
    bg += grain;

    // Tone mapping (simple Reinhard)
    bg = bg / (bg + vec3(1.0));

    // Gamma correction
    bg = pow(bg, vec3(0.9));

    bg = clamp(bg, 0.0, 1.0);
    gl_FragColor = vec4(bg, 1.0);
}
