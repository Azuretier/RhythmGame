precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    // Simple vertical streak animation
    float rain = fract(uv.y * 20.0 + u_time * 5.0);
    float alpha = smoothstep(0.98, 1.0, rain);

    if (alpha < 0.1) discard; // no rain, stay transparent

    gl_FragColor = vec4(vec3(0.7, 0.8, 1.0), alpha); // bluish rain
}
