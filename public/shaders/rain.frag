precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_brightness;
uniform float u_speed;
uniform float u_intensity;

varying vec2 vUv;

// Hash & noise helpers
float hash(float n) { return fract(sin(n) * 43758.5453123); }
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i.x + i.y*57.0), hash(i.x+1.0 + i.y*57.0), f.x),
               mix(hash(i.x + (i.y+1.0)*57.0), hash(i.x+1.0 + (i.y+1.0)*57.0), f.x), f.y);
}

void main() {
    vec2 uv = vUv * u_resolution.xy / min(u_resolution.x, u_resolution.y);

    // Move rain downward
    float t = u_time * u_speed * 60.0;
    uv.y += t;

    // Create multiple layers of rain
    float drops = 0.0;
    for (float i = 0.0; i < 3.0; i++) {
        vec2 p = uv * (1.5 + i * 0.5);
        p.y += i * 100.0; // layer offset
        float n = noise(p);
        drops += smoothstep(0.8, 1.0, n) * (1.0 - i * 0.3);
    }

    // Apply intensity & brightness
    vec3 col = vec3(drops * u_intensity) * u_brightness;

    gl_FragColor = vec4(col, drops);
}
